import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, webcrypto } from "node:crypto";
import { createProvisionHandler } from "../../ops/runtime-provisioning.mjs";

const projectId = "abcdefghijklmnopqrst";
const environment = "staging";
const transferId = "isolated-transfer-0123456789";
const proof = randomBytes(32).toString("base64url");
const proofHash = createHash("sha256").update(proof, "utf8").digest("hex");
const timestamp = Date.parse("2026-11-25T12:00:00.000Z");
const expiresAt = new Date(timestamp + 600000).toISOString();
const fakeSecret = "sb_secret_fake_isolated_runtime_key_1234567890";
const pair = await webcrypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
const publicKeySpki = Buffer.from(await webcrypto.subtle.exportKey("spki", pair.publicKey)).toString("base64");
const config = { projectId, environment, transferId, proofHash, expiresAt, publicKeySpki };
function fixture({ values = {}, settings = {}, now = () => timestamp, crypto = webcrypto } = {}) {
  const reads = [];
  const stored = { SUPABASE_URL: "https://" + projectId + ".supabase.co", SUPABASE_SECRET_KEYS: JSON.stringify({ default: fakeSecret }), ...values };
  const handler = createProvisionHandler({ ...config, ...settings }, { env: { get(name) { reads.push(name); return stored[name]; } }, crypto, now });
  return { handler, reads };
}
function request({ input = { proof }, method = "POST", headers = {}, url = "https://" + projectId + ".supabase.co/functions/v1/hvcup-runtime-bootstrap" } = {}) {
  return new Request(url, { method, headers: { "Content-Type": "application/json", ...headers }, ...(!["GET", "HEAD"].includes(method) ? { body: typeof input === "string" ? input : JSON.stringify(input) } : {}) });
}
async function json(response) {
  const value = await response.json();
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(JSON.stringify(value).includes(fakeSecret), false);
  assert.equal(JSON.stringify(value).includes(proof), false);
  return value;
}

test("provisioning authenticates the pinned private proof before every environment read", async () => {
  for (const input of [{ proof: randomBytes(32).toString("base64url") }, { proof: "wrong" }, { proof, publicKeySpki }, { proof, url: "https://attacker.invalid" }, [], null]) {
    const f = fixture(), response = await f.handler(request({ input }));
    assert([400, 401, 413].includes(response.status));
    await json(response);
    assert.deepEqual(f.reads, []);
  }
  const f = fixture();
  assert.equal((await f.handler(request())).status, 200);
  assert.deepEqual(f.reads, ["SUPABASE_URL", "SUPABASE_SECRET_KEYS"]);
});

test("non-POST, browser Origin, expired transfer, unsafe body and extra URL parameters never read secrets", async () => {
  const cases = [
    [{ method: "GET" }, {}, 405], [{ method: "OPTIONS" }, {}, 405],
    [{ headers: { Origin: "https://platform.example.invalid" } }, {}, 403],
    [{ headers: { Origin: "null" } }, {}, 403],
    [{}, { now: () => timestamp + 600000 }, 410],
    [{ input: "{" }, {}, 400],
    [{ headers: { "Content-Type": "text/plain" } }, {}, 415],
    [{ input: JSON.stringify({ proof, padding: "x".repeat(513) }) }, {}, 413],
    [{ headers: { "Content-Length": "513" } }, {}, 413],
    [{ url: "https://" + projectId + ".supabase.co/functions/v1/hvcup-runtime-bootstrap?proof=never-allowed" }, {}, 400],
  ];
  for (const [input, options, expected] of cases) {
    const f = fixture(options), response = await f.handler(request(input));
    assert.equal(response.status, expected);
    await json(response);
    assert.deepEqual(f.reads, []);
  }
});

test("streamed bodies enforce the byte limit without trusting Content-Length and reject invalid UTF-8", async () => {
  for (const chunks of [
    [new TextEncoder().encode(" ".repeat(300)), new TextEncoder().encode(" ".repeat(300))],
    [new Uint8Array([0xc3, 0x28])],
  ]) {
    const f = fixture();
    const stream = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
    const incoming = new Request("https://" + projectId + ".supabase.co/functions/v1/hvcup-runtime-bootstrap", {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "1" }, body: stream, duplex: "half",
    });
    const response = await f.handler(incoming);
    assert.equal(response.status, chunks.length === 2 ? 413 : 400);
    await json(response);
    assert.deepEqual(f.reads, []);
  }
});

test("runtime project mismatch and unavailable modern default key fail closed without legacy fallback or error leaks", async () => {
  const cases = [
    { SUPABASE_URL: "https://otherprojectabcdefgh.supabase.co" },
    { SUPABASE_URL: "https://" + projectId + ".supabase.co/" },
    { SUPABASE_SECRET_KEYS: "not JSON " + fakeSecret },
    { SUPABASE_SECRET_KEYS: JSON.stringify({ default: "eyJlegacy_service_role_not_allowed", custom: fakeSecret }), SUPABASE_SERVICE_ROLE_KEY: "eyJlegacy" },
    { SUPABASE_SECRET_KEYS: JSON.stringify({ custom: fakeSecret }) },
    { SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_short" }) },
    { SUPABASE_SECRET_KEYS: JSON.stringify({ default: fakeSecret + "\n" }) },
    { SUPABASE_SECRET_KEYS: "null" },
  ];
  for (const values of cases) {
    const f = fixture({ values }), response = await f.handler(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await json(response), { error: { code: "PROVISIONING_UNAVAILABLE" } });
    assert(!f.reads.includes("SUPABASE_SERVICE_ROLE_KEY"));
  }
  const failing = fixture({ crypto: { subtle: { digest: (...args) => webcrypto.subtle.digest(...args), importKey: () => { throw Error("internal provider detail " + fakeSecret); } } } });
  const response = await failing.handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await json(response), { error: { code: "PROVISIONING_UNAVAILABLE" } });
});

test("only the pinned RSA4096 recipient decrypts the bound compact credential envelope", async () => {
  const f = fixture(), response = await f.handler(request());
  assert.equal(response.status, 200);
  const result = await json(response);
  assert.deepEqual(Object.keys(result).sort(), ["alg", "ciphertext", "transferId"]);
  assert.equal(result.alg, "RSA-OAEP-256");
  assert.equal(result.transferId, transferId);
  const ciphertext = Buffer.from(result.ciphertext, "base64");
  assert.equal(ciphertext.length, 512);
  const decrypted = await webcrypto.subtle.decrypt({ name: "RSA-OAEP", label: new TextEncoder().encode(transferId) }, pair.privateKey, ciphertext);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(decrypted)), { key: fakeSecret, projectId, environment, expiresAt, transferId, proofHash });
  for (const label of ["different-transfer", ""])
    await assert.rejects(webcrypto.subtle.decrypt({ name: "RSA-OAEP", label: new TextEncoder().encode(label) }, pair.privateKey, ciphertext));
  const altered = Buffer.from(ciphertext); altered[20] ^= 1;
  await assert.rejects(webcrypto.subtle.decrypt({ name: "RSA-OAEP", label: new TextEncoder().encode(transferId) }, pair.privateKey, altered));
});

test("short recipient keys and oversized OAEP envelopes are refused without truncation", async () => {
  const small = await webcrypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const shortKey = Buffer.from(await webcrypto.subtle.exportKey("spki", small.publicKey)).toString("base64");
  const weak = fixture({ settings: { publicKeySpki: shortKey } });
  assert.equal((await weak.handler(request())).status, 503);
  const large = fixture({ settings: { transferId: "x".repeat(64) }, values: { SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_" + "x".repeat(200) }) } });
  const response = await large.handler(request());
  assert.equal(response.status, 503);
  await json(response);
});

test("pinned descriptor validation limits lifetime, project, proof format and recipient encoding", () => {
  for (const settings of [
    { expiresAt: new Date(timestamp + 600001).toISOString() },
    { expiresAt: "2026-13-01T00:00:00.000Z" },
    { projectId: "https://attacker.invalid" },
    { environment: "local" }, { transferId: "short" },
    { proofHash: "sha256:" + proofHash }, { proofHash: proofHash.toUpperCase() },
    { publicKeySpki: publicKeySpki + "\n" },
  ]) assert.throws(() => fixture({ settings }), /Invalid runtime provisioning configuration/);
});

test("expiry is checked again after proof and after encryption before any ciphertext response", async () => {
  let clock = timestamp;
  const afterProof = fixture({ now: () => clock, crypto: { subtle: { digest: async (...args) => { const digest = await webcrypto.subtle.digest(...args); clock = timestamp + 600001; return digest; } } } });
  assert.equal((await afterProof.handler(request())).status, 410);
  assert.deepEqual(afterProof.reads, []);
  clock = timestamp;
  const afterEncryption = fixture({ now: () => clock, crypto: { subtle: {
    digest: (...args) => webcrypto.subtle.digest(...args), importKey: (...args) => webcrypto.subtle.importKey(...args),
    encrypt: async (...args) => { const encrypted = await webcrypto.subtle.encrypt(...args); clock = timestamp + 600001; return encrypted; },
  } } });
  assert.equal((await afterEncryption.handler(request())).status, 410);
});
