import test from "node:test";
import assert from "node:assert/strict";
import {
  createHaagvClient,
  createCommandOutbox,
  HaagvError,
} from "../../packages/client/index.js";
import { createSecureSessionStorage } from "../../packages/client/secure-storage.js";
const memory = () => {
  const data = new Map();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
};
const boot = { apiVersion: "1", version: 4 };
test("web and Android client forwards bearer and own context; version and request ID survive response", async () => {
  const calls = [];
  const client = createHaagvClient({
    origin: "https://platform.example",
    getAccessToken: async () => "token",
    getMembership: () => "own",
    createRequestId: () => "stable-id",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return Response.json(
        calls.length === 1
          ? boot
          : { ok: true, version: 5, bootstrap: { ...boot, version: 5 } },
      );
    },
  });
  await client.bootstrap();
  await client.command("favorite.toggle", {
    entityType: "clubs",
    entityId: "club",
  });
  assert.equal(calls[1].options.headers.Authorization, "Bearer token");
  assert.equal(calls[1].options.headers["X-Haagv-Membership"], "own");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    type: "favorite.toggle",
    payload: { entityType: "clubs", entityId: "club" },
    requestId: "stable-id",
    expectedVersion: 4,
  });
  assert.equal(client.version, 5);
});
test("API conflict and connection failure never become confirmed actions", async () => {
  const client = createHaagvClient({
    origin: "https://platform.example",
    createRequestId: () => "id",
    fetchImpl: async () =>
      Response.json(
        {
          ok: false,
          error: { code: "VERSION_CONFLICT", message: "Ververs eerst." },
        },
        { status: 409 },
      ),
  });
  await assert.rejects(
    client.command("club.upsert", {}),
    (e) =>
      e instanceof HaagvError &&
      e.code === "VERSION_CONFLICT" &&
      e.status === 409,
  );
  const offline = createHaagvClient({
    origin: "https://platform.example",
    createRequestId: () => "id",
    fetchImpl: async () => {
      throw Error("offline");
    },
  });
  await assert.rejects(offline.bootstrap(), (e) => e.code === "NETWORK_ERROR");
  assert.throws(
    () => createHaagvClient({ origin: "http://public.example" }),
    (e) => e.code === "CLIENT_CONFIGURATION",
  );
});
test("offline outbox retains original IDs and versions; another account cannot flush it", async () => {
  const storage = memory(),
    box = createCommandOutbox({ storage, createRequestId: () => "stable" });
  await box.enqueue({
    type: "match.event",
    payload: { matchId: "m", type: "incident", note: "Test" },
    userId: "u",
    membershipId: "own",
    expectedVersion: 8,
  });
  let calls = 0;
  let rows = await box.flush({
    client: {
      command: async () => {
        calls++;
      },
    },
    userId: "other",
    membershipId: "own",
  });
  assert.equal(calls, 0);
  assert.equal(rows[0].status, "queued");
  rows = await box.flush({
    client: {
      command: async (type, payload, options) => {
        calls++;
        assert.deepEqual(options, { requestId: "stable", expectedVersion: 8 });
        throw new HaagvError("offline");
      },
    },
    userId: "u",
    membershipId: "own",
  });
  assert.equal(rows[0].status, "queued");
  rows = await box.flush({
    client: {
      command: async () => {
        throw new HaagvError("changed", { code: "VERSION_CONFLICT" });
      },
    },
    userId: "u",
    membershipId: "own",
  });
  assert.equal(rows[0].status, "conflict");
  assert.equal(rows[0].requestId, "stable");
  await assert.rejects(
    box.enqueue({
      type: "membership.upsert",
      payload: {},
      userId: "u",
      membershipId: "own",
    }),
    (e) => e.code === "OUTBOX_UNSUPPORTED",
  );
});
test("SecureStore chunks Unicode without truncation; failed save preserves previous session", async () => {
  const storage = memory();
  let revision = 0,
    fail = false;
  const adapter = createSecureSessionStorage({
    getItemAsync: storage.getItem,
    setItemAsync: async (k, v) => {
      assert.ok(Buffer.byteLength(v) <= 1400);
      if (fail && k.endsWith(".1")) throw Error("full");
      await storage.setItem(k, v);
    },
    deleteItemAsync: storage.removeItem,
    createRevision: () => "revision-" + ++revision,
  });
  const original = "🔐é漢字".repeat(1000);
  await adapter.setItem("sb-project-auth-token", original);
  assert.equal(await adapter.getItem("sb-project-auth-token"), original);
  fail = true;
  await assert.rejects(
    adapter.setItem("sb-project-auth-token", "new".repeat(3000)),
    /full/,
  );
  assert.equal(await adapter.getItem("sb-project-auth-token"), original);
  await assert.rejects(adapter.setItem("unsafe/key", "value"), /sleutel/);
  await adapter.removeItem("sb-project-auth-token");
  assert.equal(await adapter.getItem("sb-project-auth-token"), null);
  assert.equal(storage.data.size, 0);
});
test("failed outbox storage never reports an enqueued command", async () => {
  const box = createCommandOutbox({
    storage: {
      getItem: async () => null,
      setItem: async () => {
        throw Error("full");
      },
    },
    createRequestId: () => "id",
  });
  await assert.rejects(
    box.enqueue({
      type: "favorite.toggle",
      payload: {},
      userId: "u",
      membershipId: "m",
    }),
    (e) => e.code === "OUTBOX_VERSION_REQUIRED",
  );
  await assert.rejects(
    box.enqueue({
      type: "favorite.toggle",
      payload: {},
      userId: "u",
      membershipId: "m",
      expectedVersion: 0,
    }),
    /full/,
  );
});
test("old or corrupted outbox rows cannot silently inherit a newer version", async () => {
  for (const invalid of [
    {
      type: "favorite.toggle",
      payload: {},
      userId: "u",
      membershipId: "m",
      requestId: "original",
      status: "queued",
    },
    {
      type: "membership.upsert",
      payload: {},
      userId: "u",
      membershipId: "m",
      requestId: "original",
      status: "queued",
      expectedVersion: 1,
    },
  ]) {
    const storage = memory();
    await storage.setItem("haagv.commands.v1", JSON.stringify([invalid]));
    const original = await storage.getItem("haagv.commands.v1"),
      box = createCommandOutbox({ storage });
    let called = false;
    await assert.rejects(
      box.flush({
        client: {
          command: async () => {
            called = true;
          },
        },
        userId: "u",
        membershipId: "m",
      }),
      (e) => e.code === "OUTBOX_INVALID",
    );
    assert.equal(called, false);
    assert.equal(await storage.getItem("haagv.commands.v1"), original);
  }
});
