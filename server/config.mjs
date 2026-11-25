import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, isAbsolute } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const isLoopback = (hostname) =>
  ["localhost", "127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"].includes(
    hostname,
  );
export function validatePublicConfig(env = process.env) {
  const dataMode = env.HVCUP_DATA_MODE || "local";
  if (!["local", "supabase"].includes(dataMode))
    throw new Error("HVCUP_DATA_MODE moet local of supabase zijn.");
  let url;
  try {
    url = new URL(env.HVCUP_APP_ORIGIN || "http://127.0.0.1:4175");
  } catch {
    throw new Error("HVCUP_APP_ORIGIN is geen geldige origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname && url.pathname !== "/")
  )
    throw new Error(
      "HVCUP_APP_ORIGIN moet een HTTP(S)-origin zonder pad zijn.",
    );
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (dataMode === "supabase") {
    let project;
    try {
      project = new URL(supabaseUrl);
    } catch {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt of is ongeldig.");
    }
    if (
      project.protocol !== "https:" ||
      project.username ||
      project.password ||
      project.pathname !== "/" ||
      project.search ||
      project.hash
    )
      throw new Error("Supabase vereist een HTTPS-projectorigin.");
    if (!publishableKey.startsWith("sb_publishable_"))
      throw new Error("Gebruik een Supabase publishable key.");
    if (url.protocol !== "https:")
      throw new Error("Supabase-modus vereist een HTTPS-apporigin.");
  }
  return Object.freeze({
    origin: url.origin,
    dataMode,
    supabaseUrl,
    publishableKey,
  });
}
export function readConfig({
  env = process.env,
  requireSecrets = true,
  root = repositoryRoot,
} = {}) {
  const publicConfig = validatePublicConfig(env);
  const production = env.NODE_ENV === "production";
  const hostname = env.HAAGV_HOST || "127.0.0.1";
  const port = Number(
    env.HAAGV_PORT || new URL(publicConfig.origin).port || 4175,
  );
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("HAAGV_PORT is ongeldig.");
  const stateFile = resolve(
    root,
    env.HAAGV_LOCAL_STATE_FILE || ".local/platform.json",
  );
  const rel = relative(resolve(root, ".local"), stateFile);
  if (rel.startsWith("..") || isAbsolute(rel) || !rel)
    throw new Error(
      "Lokale gegevens moeten in een privébestand onder .local staan.",
    );
  const secretKey = env.SUPABASE_SECRET_KEY || "";
  if (requireSecrets && publicConfig.dataMode === "supabase" && !secretKey)
    throw new Error("SUPABASE_SECRET_KEY ontbreekt in de serverruntime.");
  if (requireSecrets && production && publicConfig.dataMode === "local")
    throw new Error("Productie vereist Supabase-modus.");
  const localSessionEnabled =
    env.HAAGV_ENABLE_LOCAL_SESSION === "1" &&
    !production &&
    publicConfig.dataMode === "local" &&
    isLoopback(hostname) &&
    isLoopback(new URL(publicConfig.origin).hostname);
  return Object.freeze({
    ...publicConfig,
    publicConfig,
    production,
    hostname,
    port,
    stateFile,
    root,
    secretKey,
    localSessionEnabled,
    environment: env.HAAGV_ENVIRONMENT || (production ? "production" : "local"),
    releaseSha: env.HAAGV_RELEASE_SHA || "development",
    bodyLimit: 1024 * 1024,
  });
}
