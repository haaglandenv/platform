import { randomBytes, timingSafeEqual } from "node:crypto";
import { isLoopback } from "./config.mjs";
import { actorFor, fail } from "./domain.mjs";
const COOKIE = "haagv_local_session";
function cookieValue(req) {
  const raw = req.headers.cookie || "";
  return raw
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
}
function equals(a, b) {
  return (
    typeof a === "string" &&
    typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export function createAuth({
  config,
  store,
  supabaseClient,
  now = () => Date.now(),
} = {}) {
  const sessions = new Map();
  let client = supabaseClient;
  async function authClient() {
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
    return client;
  }
  function localAllowed(req) {
    return (
      config.localSessionEnabled &&
      config.dataMode === "local" &&
      !config.production &&
      isLoopback(req.socket.remoteAddress) &&
      isLoopback(config.hostname) &&
      isLoopback(new URL(config.origin).hostname)
    );
  }
  async function userFor(req) {
    const authorization = req.headers.authorization;
    if (authorization) {
      if (!/^Bearer [^\s]+$/i.test(authorization))
        fail("INVALID_TOKEN", "De toegangssessie is ongeldig.", 401);
      if (config.dataMode !== "supabase")
        fail("INVALID_TOKEN", "Gebruik de lokale ontwikkelsessie.", 401);
      let response;
      try {
        response = await (
          await authClient()
        ).auth.getUser(authorization.slice(7));
      } catch {
        fail(
          "AUTH_UNAVAILABLE",
          "De identiteitsdienst is tijdelijk niet bereikbaar.",
          503,
        );
      }
      if (response.error || !response.data?.user)
        fail(
          "INVALID_TOKEN",
          "De toegangssessie is verlopen of ongeldig.",
          401,
        );
      const user = response.data.user;
      if (user.is_anonymous)
        fail("ANONYMOUS_ACCOUNT", "Gebruik een bevestigd account.", 401);
      return {
        id: user.id,
        email: user.email || null,
        name: user.email?.split("@")[0] || "Account",
      };
    }
    const token = cookieValue(req);
    if (token && localAllowed(req)) {
      for (const [stored, session] of sessions) {
        if (equals(stored, token)) {
          if (session.expiresAt <= now()) {
            sessions.delete(stored);
            return null;
          }
          return { id: "local-admin", name: "Lokale beheerder", email: null };
        }
      }
    }
    return null;
  }
  return {
    localAllowed,
    async resolve(req, state) {
      const user = await userFor(req);
      const membershipId = req.headers["x-haagv-membership"];
      if (membershipId && typeof membershipId !== "string")
        fail("FORBIDDEN", "Kies één lidmaatschap.", 403);
      return actorFor(state, user, membershipId);
    },
    async startLocal(req, res) {
      if (!localAllowed(req))
        fail(
          "LOCAL_SESSION_DISABLED",
          "De lokale ontwikkelsessie is hier niet beschikbaar.",
          403,
        );
      const token = randomBytes(32).toString("base64url");
      sessions.set(token, { expiresAt: now() + 8 * 3600000 });
      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
      );
      return { id: "local-admin", name: "Lokale beheerder", email: null };
    },
    endLocal(req, res) {
      const token = cookieValue(req);
      if (token) sessions.delete(token);
      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
      );
    },
    async resolveEmail(userId) {
      if (config.dataMode !== "supabase") return null;
      const { data, error } = await (
        await authClient()
      ).auth.admin.getUserById(userId);
      if (error || !data?.user?.email_confirmed_at) return null;
      return data.user.email || null;
    },
  };
}
