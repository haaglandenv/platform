/** HTTP client shared by web and React Native. No secret or role decision lives here. */
export class HaagvError extends Error {
  constructor(
    message,
    { code = "NETWORK_ERROR", status = 0, details, requestId } = {},
  ) {
    super(message);
    this.name = "HaagvError";
    Object.assign(this, { code, status, details, requestId });
  }
}
const uuid = () => {
  if (!globalThis.crypto?.randomUUID)
    throw new HaagvError(
      "Configureer een cryptografische request-ID-generator.",
      { code: "CLIENT_CONFIGURATION" },
    );
  return globalThis.crypto.randomUUID();
};
export function createHaagvClient({
  origin,
  getAccessToken = async () => null,
  getMembership = () => null,
  fetchImpl = globalThis.fetch,
  createRequestId = uuid,
  onBootstrap = () => {},
}) {
  const base = new URL(origin);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  )
    throw new HaagvError("Gebruik een geldige platform-origin.", {
      code: "CLIENT_CONFIGURATION",
    });
  if (
    base.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(base.hostname)
  )
    throw new HaagvError("Gebruik HTTPS voor de platformverbinding.", {
      code: "CLIENT_CONFIGURATION",
    });
  let version;
  async function request(
    path,
    { method = "GET", body, requestId, signal } = {},
  ) {
    const accessToken = await getAccessToken(),
      membership = await getMembership();
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = "Bearer " + accessToken;
    if (membership) headers["X-Haagv-Membership"] = membership;
    let response;
    try {
      response = await fetchImpl(new URL(path, base), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "include",
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new HaagvError(
        "De verbinding met het platform is niet beschikbaar. Je invoer is niet bevestigd.",
        { requestId },
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new HaagvError("Het platform gaf geen geldige reactie.", {
        code: "INVALID_RESPONSE",
        status: response.status,
        requestId,
      });
    }
    if (!response.ok || data.ok === false)
      throw new HaagvError(
        data.error?.message || "De actie kon niet worden verwerkt.",
        {
          code: data.error?.code || "REQUEST_FAILED",
          status: response.status,
          details: data.error?.details,
          requestId,
        },
      );
    const bootstrap = data.bootstrap || (data.apiVersion === "1" ? data : null);
    if (bootstrap) {
      version = bootstrap.version;
      onBootstrap(bootstrap);
    } else if (Number.isInteger(data.version)) version = data.version;
    return data;
  }
  return {
    bootstrap: () => request("/api/v1/bootstrap"),
    command(
      type,
      payload,
      { requestId = createRequestId(), expectedVersion = version, signal } = {},
    ) {
      return request("/api/v1/commands", {
        method: "POST",
        body: {
          type,
          payload,
          requestId,
          ...(expectedVersion === undefined ? {} : { expectedVersion }),
        },
        requestId,
        signal,
      });
    },
    localSession: async () =>
      (await request("/api/v1/local-session", { method: "POST", body: {} }))
        .bootstrap,
    clearLocalSession: () =>
      request("/api/v1/local-session", { method: "DELETE" }),
    mailSettings: async () =>
      (await request("/api/v1/admin/mail-settings")).settings,
    updateMailSettings: async (payload) =>
      (
        await request("/api/v1/admin/mail-settings", {
          method: "PUT",
          body: payload,
        })
      ).settings,
    testMail: ({ to, requestId = createRequestId() }) =>
      request("/api/v1/admin/mail-test", {
        method: "POST",
        body: { to, requestId },
        requestId,
      }),
    get version() {
      return version;
    },
  };
}
/** Minimal outbox: only non-secret commands, bound to the original user/membership. */
export function createCommandOutbox({
  storage,
  key = "haagv.commands.v1",
  createRequestId = uuid,
}) {
  const allowed = new Set(["match.event", "favorite.toggle"]);
  let serial = Promise.resolve();
  const lock = (fn) => {
    const next = serial.then(fn);
    serial = next.catch(() => {});
    return next;
  };
  const read = async () => {
    const raw = await storage.getItem(key);
    if (!raw) return [];
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new HaagvError(
        "De lokale wachtrij kan niet veilig worden gelezen. De opgeslagen invoer is behouden.",
        { code: "OUTBOX_INVALID" },
      );
    }
    if (
      !Array.isArray(data) ||
      data.length > 200 ||
      data.some(
        (row) =>
          !row ||
          !allowed.has(row.type) ||
          !row.payload ||
          typeof row.payload !== "object" ||
          Array.isArray(row.payload) ||
          !Number.isSafeInteger(row.expectedVersion) ||
          row.expectedVersion < 0 ||
          typeof row.requestId !== "string" ||
          !row.requestId ||
          typeof row.userId !== "string" ||
          !row.userId ||
          typeof row.membershipId !== "string" ||
          !row.membershipId ||
          !["queued", "received", "conflict"].includes(row.status),
      )
    )
      throw new HaagvError(
        "De lokale wachtrij bevat een ongeldige of ontbrekende oorspronkelijke versie. De opgeslagen invoer is behouden.",
        { code: "OUTBOX_INVALID" },
      );
    return data;
  };
  return {
    list: () => lock(read),
    enqueue: ({ type, payload, userId, membershipId, expectedVersion }) =>
      lock(async () => {
        if (!allowed.has(type))
          throw new HaagvError(
            "Deze handeling kan niet offline worden opgeslagen.",
            { code: "OUTBOX_UNSUPPORTED" },
          );
        if (!userId || !membershipId)
          throw new HaagvError("Een aangemelde werkcontext is nodig.", {
            code: "AUTH_REQUIRED",
          });
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
          throw new HaagvError("Haal eerst een bevestigde gegevensversie op.", {
            code: "OUTBOX_VERSION_REQUIRED",
          });
        const row = {
          type,
          payload,
          userId,
          membershipId,
          expectedVersion,
          requestId: createRequestId(),
          status: "queued",
          createdAt: new Date().toISOString(),
        };
        const rows = await read();
        if (rows.length >= 200)
          throw new HaagvError("Verwerk eerst de lokale wachtrij.", {
            code: "OUTBOX_FULL",
          });
        await storage.setItem(key, JSON.stringify([...rows, row]));
        return row;
      }),
    flush: ({ client, userId, membershipId }) =>
      lock(async () => {
        const rows = await read(),
          out = [];
        for (const row of rows) {
          if (
            row.status !== "queued" ||
            row.userId !== userId ||
            row.membershipId !== membershipId
          ) {
            out.push(row);
            continue;
          }
          try {
            await client.command(row.type, row.payload, {
              requestId: row.requestId,
              expectedVersion: row.expectedVersion,
            });
            out.push({ ...row, status: "received" });
          } catch (error) {
            out.push({
              ...row,
              status: error.code === "NETWORK_ERROR" ? "queued" : "conflict",
              errorCode: error.code || "UNKNOWN",
              error: error.message,
            });
          }
        }
        await storage.setItem(key, JSON.stringify(out));
        return out;
      }),
    remove: (requestId) =>
      lock(async () => {
        await storage.setItem(
          key,
          JSON.stringify(
            (await read()).filter((row) => row.requestId !== requestId),
          ),
        );
      }),
  };
}
