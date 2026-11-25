import test from "node:test";
import assert from "node:assert/strict";
import { constants, createPublicKey, generateKeyPairSync, publicEncrypt } from "node:crypto";
import { chmod, link, lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beginTransfer, cleanupTransfer, proofHash, receiveTransfer, TARGETS, validateDescriptor, validateEnvelope } from "./provision-runtime.mjs";
import { createProvisionHandler } from "./runtime-provisioning.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 4096 });
const spki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const secret = "sb_secret_" + "synthetic_only_not_a_real_key_123456789";
const publishableKey = "sb_publishable_synthetic_only_123456789";
const ownerUid = process.getuid();
const uid = "runtime-staging-" + "a".repeat(32);
const proofValue = "p".repeat(42) + "A";
const descriptor = () => ({ publicKeySpki: spki, proofHash: proofHash(proofValue), expiresAt: new Date(Date.now() + 9 * 60 * 1000).toISOString(), transferId: uid, projectId: TARGETS.staging.projectId, environment: "staging" });
const envelope = (d) => ({ key: secret, projectId: d.projectId, environment: d.environment, expiresAt: d.expiresAt, transferId: d.transferId, proofHash: d.proofHash });
async function fixture(t) {
  const configRoot = await mkdtemp(join(tmpdir(), "haagv-provision-")); t.after(() => rm(configRoot, { recursive: true, force: true }));
  const d = descriptor(), root = join(configRoot, "provisioning"), directory = join(root, uid);
  for (const p of [root, directory, join(configRoot, "runtime-secrets")]) await mkdir(p, { mode: 0o700 });
  await writeFile(join(directory, "descriptor.json"), JSON.stringify(d), { mode: 0o600 });
  await writeFile(join(directory, "proof"), proofValue, { mode: 0o600 });
  await writeFile(join(directory, "private.pem"), privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  return { configRoot, environment: "staging", transferId: uid, ownerUid, descriptor: d, directory, runtime: join(configRoot, "runtime-secrets/hvcup-v1.json") };
}
function fakeTransport(d, { plaintext = envelope(d), corrupt = false, wrongLabel = false, adminDenied = false, stateDenied = false, redirect = false } = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    assert.equal(new URL(url).origin, "https://" + d.projectId + ".supabase.co"); assert.equal(options.redirect, "error");
    if (url.endsWith("/functions/v1/hvcup-runtime-bootstrap")) {
      assert.deepEqual(JSON.parse(options.body), { proof: proofValue }); assert.equal(options.headers.apikey, publishableKey);
      let ciphertext = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256", oaepLabel: Buffer.from(wrongLabel ? "another-transfer" : d.transferId) }, Buffer.from(JSON.stringify(plaintext)));
      if (corrupt) ciphertext[1] ^= 1;
      return Response.json({ ciphertext: ciphertext.toString("base64"), alg: "RSA-OAEP-256", transferId: d.transferId }, { status: redirect ? 302 : 200 });
    }
    assert.equal(options.headers.apikey, secret); assert.equal(options.headers.Authorization, undefined);
    if (url.includes("/auth/v1/admin/users?")) return Response.json({ users: [] }, { status: adminDenied ? 403 : 200 });
    assert(url.endsWith("/rest/v1/rpc/haagv_read_state")); assert.equal(options.body, "{}");
    return Response.json({ version: 0, data: { schemaVersion: 1 }, memberships: [] }, { status: stateDenied ? 403 : 200 });
  };
  return { requests, fetchImpl };
}
test("begin stores RSA4096 private material and proof only in private files; descriptor is public", async (t) => {
  const configRoot = await mkdtemp(join(tmpdir(), "haagv-provision-begin-")); t.after(() => rm(configRoot, { recursive: true, force: true }));
  const before = Date.now(), d = await beginTransfer({ configRoot, environment: "production", ownerUid });
  validateDescriptor(d, "production", d.transferId); assert.equal(d.projectId, TARGETS.production.projectId); assert(Date.parse(d.expiresAt) >= before + 9 * 60 * 1000 && Date.parse(d.expiresAt) <= Date.now() + 9 * 60 * 1000);
  assert.equal(createPublicKey({ key: Buffer.from(d.publicKeySpki, "base64"), type: "spki", format: "der" }).asymmetricKeyDetails.modulusLength, 4096);
  const directory = join(configRoot, "provisioning", d.transferId);
  for (const name of ["private.pem", "proof", "descriptor.json"]) assert.equal((await stat(join(directory, name))).mode & 0o777, 0o600);
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  const proof = (await readFile(join(directory, "proof"), "utf8")).trim(); assert.equal(proofHash(proof), d.proofHash);
  const output = JSON.stringify(d); assert(!output.includes(proof)); assert(!output.includes("PRIVATE KEY"));
});
test("descriptor and envelope reject cross-environment, expiry, unknown fields and legacy keys", () => {
  const d = descriptor(); validateEnvelope(envelope(d), d);
  for (const input of [d, { ...d, transferId: "../../outside" }, { ...d, projectId: TARGETS.production.projectId }, { ...d, expiresAt: new Date(Date.now() - 1).toISOString() }, { ...d, expiresAt: new Date(Date.now() + 11 * 60 * 1000).toISOString() }, { ...d, unexpected: true }]) {
    if (input === d) assert.throws(() => validateDescriptor(input, "production", uid));
    else assert.throws(() => validateDescriptor(input, "staging", input.transferId));
  }
  for (const input of [{ ...envelope(d), environment: "production" }, { ...envelope(d), proofHash: "f".repeat(64) }, { ...envelope(d), key: "eyJ.legacy.service-role" }, { ...envelope(d), additional: "field" }]) assert.throws(() => validateEnvelope(input, d));
});
test("receive validates fixed project admin and RPC before exclusive runtime creation; repeat cannot overwrite", async (t) => {
  const f = await fixture(t), transport = fakeTransport(f.descriptor);
  const result = await receiveTransfer({ ...f, publishableKey, ...transport });
  assert.deepEqual(result, { status: "runtime-provisioned", usersSampled: 0, membershipCount: 0, stateVersion: 0 });
  assert.equal(transport.requests.length, 3); assert.deepEqual(JSON.parse(await readFile(f.runtime, "utf8")), { SUPABASE_SECRET_KEY: secret }); assert.equal((await stat(f.runtime)).mode & 0o777, 0o600);
  assert(!JSON.stringify(result).includes(secret));
  await assert.rejects(receiveTransfer({ ...f, publishableKey, ...transport }), { code: "IMMUTABLE_RUNTIME_ALREADY_EXISTS" }); assert.equal(transport.requests.length, 3);
});
test("host receiver interoperates with the reviewed Edge handler and never accepts a caller recipient", async (t) => {
  const f = await fixture(t), transport = fakeTransport(f.descriptor);
  const handler = createProvisionHandler(f.descriptor, { env: { get: (name) => ({ SUPABASE_URL: "https://" + f.descriptor.projectId + ".supabase.co", SUPABASE_SECRET_KEYS: JSON.stringify({ default: secret }) })[name] } });
  const fetchImpl = async (url, options) => url.endsWith("/functions/v1/hvcup-runtime-bootstrap") ? handler(new Request(url, options)) : transport.fetchImpl(url, options);
  assert.equal((await receiveTransfer({ ...f, publishableKey, fetchImpl })).status, "runtime-provisioned");
  assert.equal(transport.requests.length, 2); assert.equal(JSON.parse(await readFile(f.runtime, "utf8")).SUPABASE_SECRET_KEY, secret);
});
test("tampered ciphertext, wrong OAEP label, wrong binding and denied API/RPC cannot create a runtime", async (t) => {
  for (const kind of ["corrupt", "wrongLabel", "adminDenied", "stateDenied", "redirect", "wrongBinding"]) {
    const f = await fixture(t), options = kind === "wrongBinding" ? { plaintext: { ...envelope(f.descriptor), projectId: TARGETS.production.projectId } } : { [kind]: true }, transport = fakeTransport(f.descriptor, options);
    await assert.rejects(receiveTransfer({ ...f, publishableKey, ...transport })); await assert.rejects(lstat(f.runtime), { code: "ENOENT" });
  }
});
test("symlink/hardlink private files, public modes and wrong proof are refused before network", async (t) => {
  for (const kind of ["symlink", "hardlink", "mode", "proof"]) {
    const f = await fixture(t), path = join(f.directory, "proof"), transport = fakeTransport(f.descriptor);
    if (kind === "mode") await chmod(path, 0o644);
    else if (kind === "proof") await writeFile(path, "z".repeat(43));
    else { const outside = join(f.configRoot, "other-private"); await writeFile(outside, proofValue, { mode: 0o600 }); await rm(path); if (kind === "symlink") await symlink(outside, path); else await link(outside, path); }
    await assert.rejects(receiveTransfer({ ...f, publishableKey, ...transport })); assert.equal(transport.requests.length, 0);
  }
});
test("cleanup removes only private key/proof, leaves runtime/descriptor and rejects traversal", async (t) => {
  const f = await fixture(t), transport = fakeTransport(f.descriptor); await receiveTransfer({ ...f, publishableKey, ...transport });
  const descriptorBefore = await readFile(join(f.directory, "descriptor.json"), "utf8");
  assert.deepEqual(await cleanupTransfer(f), { status: "transfer-private-material-removed" });
  for (const name of ["private.pem", "proof"]) await assert.rejects(lstat(join(f.directory, name)), { code: "ENOENT" });
  assert.equal(await readFile(join(f.directory, "descriptor.json"), "utf8"), descriptorBefore); assert.equal(JSON.parse(await readFile(f.runtime, "utf8")).SUPABASE_SECRET_KEY, secret);
  await cleanupTransfer(f);
  await assert.rejects(cleanupTransfer({ ...f, transferId: "../../runtime-secrets" }));
});
