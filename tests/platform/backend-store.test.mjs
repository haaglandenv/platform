import test from "node:test";
import assert from "node:assert/strict";
import { SupabaseStore } from "../../server/store.mjs";
import { createInitialState, actorFor } from "../../server/domain.mjs";

test("Supabase read obtains version and managed roles from one snapshot RPC, never two HTTP reads", async () => {
  const state = createInitialState();
  state.version = 7;
  const membership = {
    id: "own",
    userId: "verified-user",
    role: "club",
    clubId: "HV-V-OWN",
    status: "revoked",
  };
  let calls = 0;
  const client = {
    from() {
      throw Error("A split table snapshot is forbidden");
    },
    rpc: async (name) => {
      calls++;
      assert.equal(name, "haagv_read_state");
      return {
        data: {
          version: 7,
          data: {
            ...state,
            memberships: [{ ...membership, status: "active" }],
          },
          memberships: [membership],
        },
        error: null,
      };
    },
  };
  const read = await new SupabaseStore(client).read();
  assert.equal(calls, 1);
  assert.equal(read.version, 7);
  assert.equal(read.memberships[0].status, "revoked");
  assert.equal(actorFor(read, { id: "verified-user" }).membership, null);
});
test("Supabase stale receipt retry rechecks authoritative revoked membership before returning data", async () => {
  const state = createInitialState({ example: true });
  state.memberships = [
    {
      id: "club-role",
      userId: "club-user",
      role: "club",
      clubId: "HV-V-EXAMPLE",
      status: "active",
    },
  ];
  const staleActor = actorFor(state, { id: "club-user" });
  const current = structuredClone(state);
  current.memberships[0].status = "revoked";
  let tableRead = false;
  const client = {
    from() {
      tableRead = true;
      throw Error("Must not return old receipt");
    },
    rpc: async () => ({
      data: { version: 2, data: current, memberships: current.memberships },
    }),
  };
  await assert.rejects(
    new SupabaseStore(client).commit(
      {
        type: "club.upsert",
        payload: { id: "HV-V-EXAMPLE", name: "Nieuwe naam" },
        requestId: "old-request",
      },
      staleActor,
    ),
    (error) => error.code === "FORBIDDEN",
  );
  assert.equal(tableRead, false);
});
