// Expiring, encrypt-only transfer to one owner-controlled host. This module has
// no logging, filesystem, network, or deployment capabilities. It never returns
// a plaintext credential. A transfer can be retried until expiry/tombstoning;
// this stateless handler does not promise cross-isolate one-time consumption.
const MAX_BODY_BYTES = 512;
const MAX_LIFETIME_MS = 10 * 60 * 1000;
const ALGORITHM = "RSA-OAEP-256";
const encoder = new TextEncoder();

function configurationError() {
  throw new Error("Invalid runtime provisioning configuration");
}
function base64Bytes(value) {
  if (typeof value !== "string" || !value || value.length > 2048 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0)
    configurationError();
  try {
    const decoded = atob(value);
    if (btoa(decoded) !== value) configurationError();
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch { configurationError(); }
}
function base64(value) {
  return btoa(String.fromCharCode(...new Uint8Array(value)));
}
function response(status, code, extra = {}) {
  return new Response(JSON.stringify(code ? { error: { code } } : extra), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...(status === 405 ? { Allow: "POST" } : {}),
    },
  });
}
async function readInput(request) {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES)
    return { failure: response(413, "BODY_TOO_LARGE") };
  if (!request.body) return { failure: response(400, "INVALID_REQUEST") };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0, timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Body timeout")), 5000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return { failure: response(413, "BODY_TOO_LARGE") };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 1 || typeof input.proof !== "string" ||
      !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(input.proof))
      return { failure: response(400, "INVALID_REQUEST") };
    return { proof: input.proof };
  } catch {
    void reader.cancel().catch(() => {});
    return { failure: response(400, "INVALID_REQUEST") };
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

export function createProvisionHandler(
  { projectId, environment, publicKeySpki, proofHash, expiresAt, transferId } = {},
  { env, crypto: cryptoImpl = globalThis.crypto, now = () => Date.now() } = {},
) {
  const expiry = Date.parse(expiresAt);
  if (typeof projectId !== "string" || !/^[a-z0-9]{20}$/.test(projectId) ||
    !["staging", "production"].includes(environment) ||
    typeof transferId !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(transferId) ||
    typeof proofHash !== "string" || !/^[a-f0-9]{64}$/.test(proofHash) ||
    typeof expiresAt !== "string" || !Number.isFinite(expiry) ||
    new Date(expiry).toISOString() !== expiresAt ||
    expiry - now() > MAX_LIFETIME_MS || !cryptoImpl?.subtle ||
    typeof env?.get !== "function") configurationError();
  const spki = base64Bytes(publicKeySpki);
  const expectedHash = Uint8Array.from(proofHash.match(/../g), (pair) => parseInt(pair, 16));
  const expectedUrl = "https://" + projectId + ".supabase.co";
  const live = () => {
    const remaining = expiry - now();
    return remaining > 0 && remaining <= MAX_LIFETIME_MS;
  };
  return async function provision(request) {
    if (request.method !== "POST") return response(405, "METHOD_NOT_ALLOWED");
    if (request.headers.has("origin")) return response(403, "ORIGIN_NOT_ALLOWED");
    if (!live()) return response(410, "TRANSFER_EXPIRED");
    if (new URL(request.url).search) return response(400, "INVALID_REQUEST");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return response(415, "CONTENT_TYPE");
    const input = await readInput(request);
    if (input.failure) return input.failure;
    try {
      const actual = new Uint8Array(await cryptoImpl.subtle.digest("SHA-256", encoder.encode(input.proof)));
      let difference = actual.length ^ expectedHash.length;
      for (let index = 0; index < expectedHash.length; index++) difference |= actual[index] ^ expectedHash[index];
      if (difference !== 0) return response(401, "UNAUTHORIZED");
      if (!live()) return response(410, "TRANSFER_EXPIRED");

      // No runtime environment reads occur before proof authentication.
      if (env.get("SUPABASE_URL") !== expectedUrl)
        return response(503, "PROVISIONING_UNAVAILABLE");
      const secrets = JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "null");
      const key = secrets && typeof secrets === "object" && !Array.isArray(secrets) ? secrets.default : null;
      // The deprecated service_role JWT is deliberately not a fallback.
      if (typeof key !== "string" || !/^sb_secret_[A-Za-z0-9_-]{20,256}$/.test(key))
        return response(503, "PROVISIONING_UNAVAILABLE");
      const recipient = await cryptoImpl.subtle.importKey("spki", spki, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
      if (recipient.type !== "public" || recipient.algorithm.modulusLength !== 4096)
        return response(503, "PROVISIONING_UNAVAILABLE");
      const plaintext = encoder.encode(JSON.stringify({ key, projectId, environment, expiresAt, transferId, proofHash }));
      // RSA-OAEP max plaintext: modulus bytes - 2*SHA256 bytes - 2 = 446.
      if (plaintext.byteLength > 446) return response(503, "PROVISIONING_UNAVAILABLE");
      let encrypted;
      try {
        encrypted = await cryptoImpl.subtle.encrypt({ name: "RSA-OAEP", label: encoder.encode(transferId) }, recipient, plaintext);
      } finally { plaintext.fill(0); }
      if (!live()) return response(410, "TRANSFER_EXPIRED");
      return response(200, null, { ciphertext: base64(encrypted), alg: ALGORITHM, transferId });
    } catch {
      // Provider configuration, credential values, request data, and crypto
      // exception messages must never be reflected to the caller.
      return response(503, "PROVISIONING_UNAVAILABLE");
    }
  };
}
