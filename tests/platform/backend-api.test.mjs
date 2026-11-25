import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../../server/index.mjs";
import { readConfig, validatePublicConfig } from "../../server/config.mjs";
import { LocalStore } from "../../server/store.mjs";
import { createAuth } from "../../server/auth.mjs";
import { createInitialState, actorFor } from "../../server/domain.mjs";
import { bootstrapLeadership } from "../../scripts/bootstrap-admin.mjs";
async function fixture(
  t,
  { state, mailService, config: overrides = {}, supabaseClient } = {},
) {
  const root = await mkdtemp(join(tmpdir(), "haagv-backend-"));
  await mkdir(join(root, "dist"));
  await writeFile(
    join(root, "dist/index.html"),
    "<!doctype html><h1>Haaglanden</h1>",
  );
  await writeFile(join(root, "private.env"), "RUNTIME_SECRET");
  const config = {
    ...readConfig({ root, env: { HAAGV_ENABLE_LOCAL_SESSION: "1" } }),
    ...overrides,
  };
  const store = new LocalStore({
    file: join(root, ".local/state.json"),
    initialState: state || createInitialState({ example: true }),
  });
  const server = await createServer({
    config,
    store,
    mailService,
    supabaseClient,
    logger: { error() {} },
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  async function request(path, options = {}) {
    const response = await fetch(origin + path, {
      ...options,
      headers: {
        Origin: config.origin,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { response, body };
  }
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true });
  });
  return { root, config, store, server, request, origin };
}
async function login(f) {
  const result = await f.request("/api/v1/local-session", {
    method: "POST",
    body: "{}",
  });
  assert.equal(result.response.status, 200);
  return result.response.headers.get("set-cookie").split(";")[0];
}

test("Public bootstrap, health and readiness expose no runtime secrets", async (t) => {
  const f = await fixture(t);
  const bootstrap = await f.request("/api/v1/bootstrap");
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.body.user, null);
  assert(!JSON.stringify(bootstrap.body).includes("relationCode"));
  const health = await f.request("/api/health");
  assert.equal(health.body.service, "haagv");
  assert.equal(health.body.environment, "local");
  assert.equal((await f.request("/api/ready")).body.mail, "unconfigured");
  assert.equal((await f.request("/private.env")).response.status, 404);
  assert.equal((await f.request("/.local/state.json")).response.status, 404);
});
test("Local development login is explicit, cookie-based and disabled in production/Supabase/nonloopback", async (t) => {
  const f = await fixture(t);
  const cookie = await login(f);
  assert(cookie.startsWith("haagv_local_session="));
  const current = await f.request("/api/v1/bootstrap", {
    headers: { Cookie: cookie },
  });
  assert.equal(current.body.activeMembership.role, "leadership");
  const disabled = createAuth({
    config: { ...f.config, production: true },
    store: f.store,
  });
  const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
  assert.equal(disabled.localAllowed(req), false);
  assert.equal(
    createAuth({
      config: { ...f.config, dataMode: "supabase" },
      store: f.store,
    }).localAllowed(req),
    false,
  );
  assert.equal(
    createAuth({ config: f.config, store: f.store }).localAllowed({
      ...req,
      socket: { remoteAddress: "192.0.2.1" },
    }),
    false,
  );
});
test("Commands reject unauthenticated writes, unsupported fields and cross-origin requests", async (t) => {
  const f = await fixture(t);
  const input = JSON.stringify({
    type: "club.upsert",
    payload: { name: "Nieuwe club" },
    requestId: "api-1",
  });
  assert.equal(
    (await f.request("/api/v1/commands", { method: "POST", body: input }))
      .response.status,
    401,
  );
  const cookie = await login(f);
  const bad = await f.request("/api/v1/commands", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      type: "club.upsert",
      payload: { name: "Nieuwe club", state: {} },
      requestId: "api-2",
    }),
  });
  assert.equal(bad.body.error.code, "UNKNOWN_FIELD");
  assert.equal(
    (
      await f.request("/api/v1/commands", {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://other.invalid" },
        body: input,
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await f.request("/api/v1/commands", {
        method: "POST",
        headers: { Cookie: cookie },
        body: "null",
      })
    ).response.status,
    422,
  );
});
test("API CAS and persistent idempotency bind one user/request to one payload", async (t) => {
  const f = await fixture(t),
    cookie = await login(f),
    command = {
      type: "club.upsert",
      payload: { name: "Eenmaal" },
      requestId: "one-command",
      expectedVersion: 0,
    };
  const first = await f.request("/api/v1/commands", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify(command),
  });
  assert.equal(first.body.version, 1);
  const repeated = await f.request("/api/v1/commands", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify(command),
  });
  assert.equal(repeated.body.repeated, true);
  assert.equal(repeated.body.bootstrap.data.clubs.length, 2);
  assert.equal(
    (
      await f.request("/api/v1/commands", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ ...command, payload: { name: "Anders" } }),
      })
    ).response.status,
    409,
  );
  const persisted = new LocalStore({ file: join(f.root, ".local/state.json") });
  assert.equal((await persisted.read()).data.clubs.length, 2);
  assert.equal(
    (await stat(join(f.root, ".local/state.json"))).mode & 0o777,
    0o600,
  );
});
test("Concurrent local commands serialize and only one matching CAS succeeds", async () => {
  const store = new LocalStore(),
    state = await store.read(),
    actor = actorFor(state, { id: "local-admin" });
  const responses = await Promise.allSettled(
    ["a", "b"].map((id) =>
      store.commit(
        {
          type: "club.upsert",
          payload: { name: id },
          requestId: id,
          expectedVersion: 0,
        },
        actor,
      ),
    ),
  );
  assert.equal(responses.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    responses.find((r) => r.status === "rejected").reason.code,
    "VERSION_CONFLICT",
  );
  assert.equal((await store.read()).version, 1);
});
test("Receipt retries recheck current memberships after revocation", async () => {
  const store = new LocalStore(),
    state = await store.read();
  state.memberships.push({
    id: "club-role",
    userId: "club-user",
    role: "club",
    clubId: "HV-V-EXAMPLE",
    status: "active",
  });
  await store.replaceStateForTest(state);
  const actor = actorFor(state, { id: "club-user" }),
    command = {
      type: "club.upsert",
      payload: { id: "HV-V-EXAMPLE", name: "Eigen naam" },
      requestId: "before-revoke",
    };
  await store.commit(command, actor);
  const newer = await store.read();
  newer.memberships.find((m) => m.id === "club-role").status = "revoked";
  await store.replaceStateForTest(newer);
  await assert.rejects(
    store.commit(command, actor),
    (error) => error.code === "FORBIDDEN",
  );
});
test("Supabase Auth getUser verifies JWT and ignores spoofed user metadata", async (t) => {
  const state = createInitialState();
  let calls = 0;
  const client = {
    auth: {
      getUser: async (token) => {
        calls++;
        assert.equal(token, "verified-token");
        return {
          data: {
            user: {
              id: "external-user",
              email: "account@example.invalid",
              user_metadata: { role: "leadership" },
            },
          },
          error: null,
        };
      },
    },
  };
  const f = await fixture(t, {
    state,
    supabaseClient: client,
    config: {
      dataMode: "supabase",
      localSessionEnabled: false,
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
      secretKey: "server-only-secret",
    },
  });
  const result = await f.request("/api/v1/bootstrap", {
    headers: { Authorization: "Bearer verified-token" },
  });
  assert.equal(result.body.user.id, "external-user");
  assert.equal(result.body.activeMembership, null);
  assert(!result.body.capabilities.includes("club.upsert"));
  assert(!JSON.stringify(result.body).includes("server-only-secret"));
  assert.equal(calls, 1);
  const own = await f.request("/api/v1/bootstrap", {
    headers: {
      Authorization: "Bearer verified-token",
      "X-Haagv-Membership": "local-leadership",
    },
  });
  assert.equal(own.response.status, 403);
});
test("Email settings/test routes require managed leadership and keep provider status honest", async (t) => {
  let tests = 0;
  const mailService = {
    getSettings: async () => ({ configured: false, last4: null }),
    updateSettings: async () => ({ configured: true, last4: "abcd" }),
    sendTest: async () => {
      tests++;
      return { id: "mock-mail", status: "accepted" };
    },
  };
  const f = await fixture(t, { mailService });
  assert.equal(
    (await f.request("/api/v1/admin/mail-settings")).response.status,
    403,
  );
  const cookie = await login(f);
  const result = await f.request("/api/v1/admin/mail-test", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      to: "safe@example.invalid",
      requestId: "test-mail",
    }),
  });
  assert.equal(result.body.status, "accepted");
  assert.equal(tests, 1);
});
test("Transactional outbox uses verified stored recipients; a delivery failure leaves pending and command succeeds", async (t) => {
  const state = createInitialState({ example: true });
  state.memberships.push({
    id: "recipient",
    userId: "recipient-user",
    role: "supporter",
    status: "active",
  });
  const f = await fixture(t, { state });
  const cookie = await login(f);
  const result = await f.request("/api/v1/commands", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      type: "message.send",
      payload: {
        recipientUserIds: ["recipient-user"],
        subject: "Planning",
        body: "Open je eigen werkruimte.",
      },
      requestId: "mail-message",
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.notifications.pending, 1);
  const row = (await f.store.read()).mailOutbox[0];
  assert.equal(row.status, "pending");
  assert.equal(row.recipients[0].code, "NO_VERIFIED_ADDRESS");
  assert(!JSON.stringify(row).includes("@"));
});
test("Public build validation requires HTTPS/publishable config while runtime independently requires secret", () => {
  assert.equal(validatePublicConfig({}).dataMode, "local");
  const env = {
    HVCUP_DATA_MODE: "supabase",
    HVCUP_APP_ORIGIN: "https://platform.example",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  };
  assert.equal(readConfig({ env, requireSecrets: false }).secretKey, "");
  assert.throws(() => readConfig({ env }), /SUPABASE_SECRET_KEY/);
  assert.throws(
    () =>
      validatePublicConfig({
        ...env,
        HVCUP_APP_ORIGIN: "http://platform.example",
      }),
    /HTTPS/,
  );
  assert.throws(
    () => readConfig({ env: { NODE_ENV: "production" } }),
    /Supabase/,
  );
});
test("Operator bootstrap refuses existing membership and does not accept elevated user metadata", async () => {
  let creates = 0;
  const existing = {
    from: () => ({
      select: () => ({
        limit: async () => ({ data: [{ id: "existing" }], error: null }),
      }),
    }),
    auth: {
      admin: {
        createUser: async () => {
          creates++;
        },
      },
    },
  };
  await assert.rejects(
    bootstrapLeadership({
      client: existing,
      email: "owner@example.invalid",
      confirmEmpty: true,
    }),
    /BOOTSTRAP_ALREADY_COMPLETE/,
  );
  assert.equal(creates, 0);
  let args;
  const fresh = {
    from: () => ({
      select: () => ({ limit: async () => ({ data: [], error: null }) }),
    }),
    auth: {
      admin: {
        createUser: async (input) => {
          args = input;
          return { data: { user: { id: "verified-id" } } };
        },
      },
    },
    rpc: async () => ({ data: { id: "membership-id" } }),
  };
  const result = await bootstrapLeadership({
    client: fresh,
    email: "owner@example.invalid",
    confirmEmpty: true,
  });
  assert.equal(result.membershipId, "membership-id");
  assert.equal(args.email_confirm, false);
  assert.equal(args.user_metadata, undefined);
});

test("Admin membership listing is separate from the own-context selector", async (t) => {
  const state = createInitialState({ example: true });
  state.memberships.push({
    id: "other-role",
    userId: "other-user",
    role: "supporter",
    status: "active",
  });
  const f = await fixture(t, { state });
  assert.equal(
    (await f.request("/api/v1/admin/memberships")).response.status,
    403,
  );
  const cookie = await login(f);
  const bootstrap = await f.request("/api/v1/bootstrap", {
    headers: { Cookie: cookie },
  });
  assert.equal(bootstrap.body.memberships.length, 1);
  const managed = await f.request("/api/v1/admin/memberships", {
    headers: { Cookie: cookie },
  });
  assert.equal(managed.body.items.length, 2);
});
test("Partially accepted notification retry skips accepted recipients and retains deterministic pending keys", async (t) => {
  const state = createInitialState({ example: true });
  for (const userId of ["recipient-one", "recipient-two"])
    state.memberships.push({
      id: userId,
      userId,
      role: "supporter",
      status: "active",
    });
  const sent = [],
    mailService = {
      getSettings: async () => ({ configured: true }),
      sendNotification: async (input) => {
        sent.push(input);
        if (input.to === "two@example.test" && sent.length === 2)
          throw Object.assign(Error("tijdelijk"), {
            code: "MAIL_PROVIDER_UNAVAILABLE",
          });
        return { id: "mock-" + sent.length, status: "accepted" };
      },
    };
  const f = await fixture(t, { state, mailService });
  f.server.application.auth.resolveEmail = async (id) =>
    id === "recipient-one" ? "one@example.test" : "two@example.test";
  const cookie = await login(f);
  const initial = await f.request("/api/v1/commands", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      type: "message.send",
      payload: {
        recipientUserIds: ["recipient-one", "recipient-two"],
        subject: "Dienst",
        body: "Een gerichte melding.",
      },
      requestId: "partial-mail",
    }),
  });
  assert.equal(initial.body.notifications.pending, 1);
  assert.equal((await f.store.read()).mailOutbox[0].requestId, "partial-mail");
  const retried = await f.request("/api/v1/admin/mail-outbox/process", {
    method: "POST",
    headers: { Cookie: cookie },
    body: "{}",
  });
  assert.equal(retried.body.accepted, 1);
  assert.deepEqual(
    sent.map((x) => x.to),
    ["one@example.test", "two@example.test", "two@example.test"],
  );
  assert.equal(sent[1].id, sent[2].id);
  assert.equal((await f.store.read()).mailOutbox[0].status, "accepted");
});
test("Invalid month/day values return API validation errors instead of internal errors", async (t) => {
  const f = await fixture(t),
    cookie = await login(f);
  for (const [index, date] of [
    "2027-13-01",
    "2027-00-01",
    "2027-01-00",
    "2027-01-32",
  ].entries()) {
    const result = await f.request("/api/v1/commands", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({
        type: "match.upsert",
        payload: { id: "HV-W-EXAMPLE", date },
        requestId: "bad-date-" + index,
      }),
    });
    assert.equal(result.response.status, 422, date);
    assert.equal(result.body.error.code, "VALIDATION");
  }
});
