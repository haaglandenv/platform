import { mkdir, readFile, writeFile, rename, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  applyCommand,
  assertCommandAccess,
  normalizeState,
  validateCommandEnvelope,
  createInitialState,
  fingerprintCommand,
  fail,
  PlatformError,
} from "./domain.mjs";

function receiptKey(actor, requestId) {
  return actor.user.id + "\u0000" + requestId;
}
export class LocalStore {
  constructor({
    file,
    initialState = createInitialState({ example: true }),
  } = {}) {
    this.file = file;
    this.initial = structuredClone(initialState);
    this.state = null;
    this.receipts = {};
    this.tail = Promise.resolve();
    this.loading = null;
  }
  async load() {
    if (this.state) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const persisted = JSON.parse(await readFile(this.file, "utf8"));
        if (
          persisted.format !== "haagv-local-v1" ||
          !Number.isSafeInteger(persisted.state?.version)
        )
          throw Error("Ongeldig lokaal gegevensbestand.");
        this.state = normalizeState(persisted.state);
        this.receipts = persisted.receipts || {};
      } catch (e) {
        if (e.code !== "ENOENT" && this.file) throw e;
        const initial = normalizeState(this.initial);
        if (this.file) await this.save(initial, this.receipts);
        this.state = initial;
      }
    })();
    return this.loading;
  }
  async save(state, receipts) {
    if (!this.file) return;
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
    await chmod(dirname(this.file), 0o700);
    const tmp = this.file + "." + randomUUID() + ".tmp";
    await writeFile(
      tmp,
      JSON.stringify({ format: "haagv-local-v1", state, receipts }),
      { mode: 0o600 },
    );
    await rename(tmp, this.file);
    await chmod(this.file, 0o600);
  }
  async read() {
    await this.load();
    return structuredClone(this.state);
  }
  async memberships(userId) {
    return (await this.read()).memberships.filter(
      (m) => m.userId === userId && m.status === "active",
    );
  }
  async ready() {
    await this.load();
    return true;
  }
  async receipt(actorId, requestId) {
    await this.load();
    return this.receipts[actorId + "\u0000" + requestId] || null;
  }
  async commit(command, actor) {
    validateCommandEnvelope(command);
    const task = this.tail.then(async () => {
      await this.load();
      actor = assertCommandAccess(this.state, command, actor);
      const key = receiptKey(actor, command.requestId),
        fingerprint = fingerprintCommand(command),
        old = this.receipts[key];
      if (old) {
        if (old.fingerprint !== fingerprint)
          fail(
            "REQUEST_ID_REUSED",
            "Dit request-ID is al met andere inhoud gebruikt.",
            409,
          );
        return { ...structuredClone(old.response), repeated: true };
      }
      if (
        command.expectedVersion !== undefined &&
        command.expectedVersion !== this.state.version
      )
        fail(
          "VERSION_CONFLICT",
          "De gegevens zijn intussen gewijzigd. Vernieuw voor je opnieuw opslaat.",
          409,
          { currentVersion: this.state.version },
        );
      const { state, result } = applyCommand(this.state, command, actor);
      const response = {
        ok: true,
        version: state.version,
        requestId: command.requestId,
        result,
      };
      const receipts = { ...this.receipts, [key]: { fingerprint, response } };
      await this.save(state, receipts);
      this.state = state;
      this.receipts = receipts;
      return structuredClone(response);
    });
    this.tail = task.catch(() => {});
    return task;
  }
  async finishNotification(id, result) {
    const task = this.tail.then(async () => {
      await this.load();
      const state = structuredClone(this.state),
        row = state.mailOutbox?.find((r) => r.id === id);
      if (!row) return;
      Object.assign(row, result);
      state.version++;
      state.updatedAt = new Date().toISOString();
      await this.save(state, this.receipts);
      this.state = state;
    });
    this.tail = task.catch(() => {});
    return task;
  }
  async replaceStateForTest(state) {
    await this.load();
    this.state = structuredClone(state);
    await this.save(this.state, this.receipts);
  }
}
function asError(error) {
  if (error?.code === "40001" || error?.message?.includes("VERSION_CONFLICT"))
    return new PlatformError(
      409,
      "VERSION_CONFLICT",
      "De gegevens zijn intussen gewijzigd.",
    );
  if (error?.message?.includes("REQUEST_ID_REUSED"))
    return new PlatformError(
      409,
      "REQUEST_ID_REUSED",
      "Dit request-ID is al met andere inhoud gebruikt.",
    );
  return new PlatformError(
    503,
    "STORAGE_UNAVAILABLE",
    "De gegevensopslag is tijdelijk niet bereikbaar.",
  );
}
const membership = (row) => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  clubId: row.club_id || undefined,
  teamId: row.team_id || undefined,
  officialId: row.official_id || undefined,
  playerId: row.player_id || undefined,
  volunteerId: row.volunteer_id || undefined,
  status: row.status,
});
export class SupabaseStore {
  constructor(client) {
    this.client = client;
  }
  async read() {
    const { data, error } = await this.client.rpc("haagv_read_state");
    if (error || !data) throw asError(error);
    const state = normalizeState({
      ...data.data,
      version: Number(data.version),
    });
    state.memberships = data.memberships || [];
    return state;
  }
  async memberships(userId) {
    return (await this.read()).memberships.filter(
      (m) => m.userId === userId && m.status === "active",
    );
  }
  async ready() {
    await this.read();
    return true;
  }
  async receipt(actorId, requestId) {
    const { data, error } = await this.client
      .from("haagv_command_receipts")
      .select("fingerprint,response")
      .eq("actor_id", actorId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (error) throw asError(error);
    return data;
  }
  async finishNotification(id, result) {
    const { error } = await this.client.rpc("haagv_finish_notification", {
      p_id: id,
      p_result: result,
    });
    if (error) throw asError(error);
  }
  async commit(command, actor) {
    validateCommandEnvelope(command);
    const current = await this.read();
    actor = assertCommandAccess(current, command, actor);
    const fingerprint = fingerprintCommand(command),
      old = await this.receipt(actor.user.id, command.requestId);
    if (old) {
      if (old.fingerprint !== fingerprint)
        fail(
          "REQUEST_ID_REUSED",
          "Dit request-ID is al met andere inhoud gebruikt.",
          409,
        );
      return { ...old.response, repeated: true };
    }
    if (
      command.expectedVersion !== undefined &&
      command.expectedVersion !== current.version
    )
      fail("VERSION_CONFLICT", "De gegevens zijn intussen gewijzigd.", 409, {
        currentVersion: current.version,
      });
    const { state, result } = applyCommand(current, command, actor),
      response = {
        ok: true,
        version: state.version,
        requestId: command.requestId,
        result,
      };
    const { data, error } = await this.client.rpc("haagv_commit_command", {
      p_actor_id: actor.user.id,
      p_request_id: command.requestId,
      p_fingerprint: fingerprint,
      p_expected_version: current.version,
      p_data: state,
      p_response: response,
    });
    if (error) throw asError(error);
    return data;
  }
}
export async function createStore(config, { supabaseClient } = {}) {
  if (config.dataMode === "local")
    return new LocalStore({ file: config.stateFile });
  let client = supabaseClient;
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(config.supabaseUrl, config.secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return new SupabaseStore(client);
}
