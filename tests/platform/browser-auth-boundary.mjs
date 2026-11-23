import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "../../server/index.mjs";
import { readConfig } from "../../server/config.mjs";
import { LocalStore } from "../../server/store.mjs";
import { createInitialState, actorFor } from "../../server/domain.mjs";

// Supabase identity responses are isolated stubs. The app itself receives ordinary
// OTP responses and cross-tab Auth events; there are no production test hooks.
const root = resolve("."),
  dir = await mkdtemp(join(tmpdir(), "haagv-auth-boundary-"));
const results = [],
  errors = [],
  seenHeaders = [];
const users = {
  a: { id: "11111111-1111-4111-8111-111111111111", email: "a@example.invalid" },
  b: { id: "22222222-2222-4222-8222-222222222222", email: "b@example.invalid" },
};
function session(user) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: [
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
      Buffer.from(
        JSON.stringify({ sub: user.id, exp: expiresAt, aud: "authenticated" }),
      ).toString("base64url"),
      "auth-stub",
    ].join("."),
    refresh_token: "refresh-" + user.id,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user: {
      ...user,
      aud: "authenticated",
      role: "authenticated",
      created_at: "2026-11-23T00:00:00Z",
    },
  };
}
const sessions = { a: session(users.a), b: session(users.b) },
  storageKey = "sb-boundary-auth-auth-token";
const initial = createInitialState({ example: true });
initial.memberships = [
  { id: "own-a", userId: users.a.id, role: "leadership", status: "active" },
  {
    id: "own-a-extra",
    userId: users.a.id,
    role: "leadership",
    status: "active",
  },
  { id: "own-b", userId: users.b.id, role: "supporter", status: "active" },
];
initial.data.clubs[0].contactEmail = "private-contact@example.invalid";
initial.data.players[0].relationCode = "PRIVATE-A-IDENTITY";
const store = new LocalStore({
  file: join(dir, "state.json"),
  initialState: initial,
});
const config = {
  ...readConfig({ env: {}, root }),
  dataMode: "supabase",
  supabaseUrl: "https://boundary-auth.example.invalid",
  publishableKey: "sb_publishable_boundary_test",
  localSessionEnabled: false,
  port: 0,
};
const auth = {
  resolve: async (req, state) => {
    seenHeaders.push(req.headers["x-haagv-membership"] || null);
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const user = Object.values(sessions).find(
      (s) => s.access_token === token,
    )?.user;
    return actorFor(state, user || null, req.headers["x-haagv-membership"]);
  },
  resolveEmail: async () => null,
};
let browser,
  server,
  page,
  origin,
  blockBootstrap = false,
  invalidToken = false,
  holdNext = false,
  releaseOld,
  markHeld;
let held = new Promise((resolve) => {
  markHeld = resolve;
});
const report = (name) => {
  results.push({ name, ok: true });
  console.log(name);
};
async function route(id) {
  await page.evaluate((id) => {
    location.hash = id;
  }, id);
  await page.waitForFunction(
    (id) => document.querySelector("[data-route-picker]")?.value === id,
    id,
  );
}
async function broadcast(event, identity) {
  await page.evaluate(
    ({ event, identity, key }) => {
      if (identity) localStorage.setItem(key, JSON.stringify(identity));
      else localStorage.removeItem(key);
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event, session: identity });
      setTimeout(() => channel.close(), 20);
    },
    { event, identity, key: storageKey },
  );
}
async function assertCleared() {
  assert.equal(
    await page.locator("[data-account-link]").innerText(),
    "Inloggen",
  );
  assert.equal(
    await page.locator("[data-editor]").evaluate((el) => el.open),
    false,
  );
  assert.equal(await page.locator("[data-editor-form]").innerHTML(), "");
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("haagv.membership")),
    null,
  );
  assert.equal(await page.locator("[data-context]").innerHTML(), "");
  assert(!(await page.content()).includes("private-contact@example.invalid"));
  assert(!(await page.content()).includes("PRIVATE-A-IDENTITY"));
}
try {
  server = await createServer({ config, store, auth });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + server.address().port;
  config.origin = origin;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "nl-NL",
  });
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    "https://boundary-auth.example.invalid/**",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-headers": "*",
        };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      let body = {};
      try {
        body = request.postDataJSON();
      } catch {}
      if (url.pathname.endsWith("/otp"))
        return route.fulfill({ json: {}, headers });
      if (url.pathname.endsWith("/verify"))
        return route.fulfill({
          json: body.email === users.b.email ? sessions.b : sessions.a,
          headers,
        });
      return route.fulfill({ json: {}, headers });
    },
  );
  await page.route("**/api/v1/bootstrap", async (route) => {
    if (holdNext) {
      holdNext = false;
      const response = await route.fetch();
      const body = await response.body();
      markHeld();
      await new Promise((resolve) => {
        releaseOld = resolve;
      });
      return route.fulfill({ response, body });
    }
    if (invalidToken) {
      invalidToken = false;
      blockBootstrap = true;
      return route.fulfill({
        status: 401,
        json: {
          ok: false,
          error: { code: "INVALID_TOKEN", message: "Session invalidated" },
        },
      });
    }
    if (blockBootstrap) return route.abort("internetdisconnected");
    return route.continue();
  });
  await page.goto(origin + "/#account");
  await page.locator("[data-auth-form] [name=email]").fill(users.a.email);
  await page.locator("[data-auth-form] [type=submit]").click();
  await page.locator("[data-auth-form] [name=code]").fill("123456");
  await page.locator("[data-auth-form] [type=submit]").click();
  await page
    .locator("[data-context]")
    .filter({ hasText: users.a.email })
    .waitFor();
  await page.locator("[data-membership]").selectOption("own-a-extra");
  await page.locator("[data-membership]").waitFor();
  assert.equal(
    await page.locator("[data-membership]").inputValue(),
    "own-a-extra",
  );
  const revoked = await store.read();
  revoked.memberships.find((m) => m.id === "own-a-extra").status = "revoked";
  await store.replaceStateForTest(revoked);
  await route("werkzekerheid");
  seenHeaders.length = 0;
  await page.locator("[data-action=refresh]").click();
  await page.waitForFunction(
    () => sessionStorage.getItem("haagv.membership") === null,
  );
  await page
    .locator("[data-context]")
    .filter({ hasText: users.a.email })
    .waitFor();
  assert.deepEqual(seenHeaders, ["own-a-extra", null]);
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("haagv.membership")),
    null,
  );
  report(
    "Revoked selected membership retries bootstrap exactly once without stale context",
  );
  await route("club");
  await page.locator("[data-entity=club][data-id]").first().click();
  assert.equal(
    await page.locator("[data-editor-form] [name=contactEmail]").inputValue(),
    "private-contact@example.invalid",
  );
  blockBootstrap = true;
  await broadcast("SIGNED_IN", sessions.b);
  await page
    .locator("[data-account-link]")
    .filter({ hasText: "Inloggen" })
    .waitFor();
  await assertCleared();
  report(
    "Account change clears private snapshot, editor, membership, and context before a failed refresh",
  );
  blockBootstrap = false;
  await route("werkzekerheid");
  await page.locator("[data-action=refresh]").click();
  await page
    .locator("[data-context]")
    .filter({ hasText: users.b.email })
    .waitFor();
  assert(!(await page.content()).includes("PRIVATE-A-IDENTITY"));
  assert.equal(
    await page
      .locator("[data-context]")
      .innerText()
      .then((t) => t.includes("Supporter")),
    true,
  );
  report("After recovery the new account receives only its own server context");
  await broadcast("SIGNED_IN", sessions.a);
  await page
    .locator("[data-context]")
    .filter({ hasText: users.a.email })
    .waitFor();
  await route("club");
  await page.locator("[data-entity=club][data-id]").first().click();
  await page.locator("[data-action=editor-close]").first().click();
  assert(
    (await page.locator("[data-editor-form]").innerHTML()).includes(
      "private-contact@example.invalid",
    ),
  );
  await route("werkzekerheid");
  holdNext = true;
  await page.locator("[data-action=refresh]").click();
  await held;
  blockBootstrap = true;
  await broadcast("SIGNED_OUT", null);
  await page
    .locator("[data-account-link]")
    .filter({ hasText: "Inloggen" })
    .waitFor();
  await assertCleared();
  releaseOld();
  await page.waitForTimeout(180);
  await assertCleared();
  await route("spelersbeheer");
  assert(
    (await page.locator("#spelersbeheer").innerText()).includes(
      "Log in voor jouw werkruimte",
    ),
  );
  report(
    "SIGNED_OUT clears private data offline; an older in-flight private bootstrap cannot restore it",
  );
  blockBootstrap = false;
  await broadcast("SIGNED_IN", sessions.a);
  await page
    .locator("[data-context]")
    .filter({ hasText: users.a.email })
    .waitFor();
  await route("club");
  await page.locator("[data-entity=club][data-id]").first().click();
  await page.locator("[data-action=editor-close]").first().click();
  await route("werkzekerheid");
  invalidToken = true;
  await page.locator("[data-action=refresh]").click();
  await page
    .locator("[data-account-link]")
    .filter({ hasText: "Inloggen" })
    .waitFor();
  await assertCleared();
  await page.waitForFunction(
    (key) => localStorage.getItem(key) === null,
    storageKey,
  );
  report(
    "An invalid bearer response clears private UI and persisted Auth even when the public refresh fails",
  );
  assert.deepEqual(errors, []);
  await mkdir(join(root, "artifacts"), { recursive: true });
  await writeFile(
    join(root, "artifacts", "browser-auth-boundary.json"),
    JSON.stringify(
      {
        ok: true,
        results,
        errors,
        note: "Isolated Supabase identity stub and temporary local store; no live Auth or mail calls.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, checks: results.length, errors }));
} finally {
  releaseOld?.();
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
}
