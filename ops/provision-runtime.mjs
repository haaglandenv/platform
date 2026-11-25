#!/usr/bin/env node
// Reviewed host-only bridge. No secret is accepted on argv or written to stdout.
import {
  constants, createHash, createPrivateKey, createPublicKey, generateKeyPairSync,
  privateDecrypt, randomBytes, timingSafeEqual,
} from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const TARGETS = Object.freeze({
  staging: Object.freeze({ projectId: "wntzrrzolgnuiszudmzn", site: "haagv-platform-staging", port: 4190 }),
  production: Object.freeze({ projectId: "mgerzyyeuqwjdpwfdkqz", site: "haagv-platform-production", port: 4191 }),
});
const MACHINE_ID = "05db94b99eca4c3d815f6585ef8ed517";
const TTL = 10 * 60 * 1000;
const descriptorFields = ["environment", "expiresAt", "projectId", "proofHash", "publicKeySpki", "transferId"];
const envelopeFields = ["environment", "expiresAt", "key", "projectId", "proofHash", "transferId"];
export class ProvisionError extends Error {
  constructor(code) { super("Runtimeprovisionering geweigerd: " + code); this.code = code; }
}
function requireValue(value, code) { if (!value) throw new ProvisionError(code); }
function exactFields(value, fields) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}
export const proofHash = (proof) => createHash("sha256").update(proof, "utf8").digest("hex");
function same(a, b) {
  return typeof a === "string" && typeof b === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function targetFor(environment) {
  requireValue(Object.hasOwn(TARGETS, environment), "UNKNOWN_ENVIRONMENT"); return TARGETS[environment];
}
function validTransferId(transferId, environment) {
  return typeof transferId === "string" && new RegExp("^runtime-" + environment + "-[a-f0-9]{32}$").test(transferId);
}
function rsaPublic(base64) {
  requireValue(typeof base64 === "string" && base64.length < 2048 && Buffer.from(base64, "base64").toString("base64") === base64, "INVALID_PUBLIC_KEY");
  let key;
  try { key = createPublicKey({ key: Buffer.from(base64, "base64"), format: "der", type: "spki" }); }
  catch { throw new ProvisionError("INVALID_PUBLIC_KEY"); }
  requireValue(key.asymmetricKeyType === "rsa" && key.asymmetricKeyDetails.modulusLength === 4096 && key.asymmetricKeyDetails.publicExponent === 65537n, "INVALID_PUBLIC_KEY");
  return key;
}
export function validateDescriptor(descriptor, environment, transferId, now = Date.now(), allowExpired = false) {
  const target = targetFor(environment);
  requireValue(exactFields(descriptor, descriptorFields), "INVALID_DESCRIPTOR");
  requireValue(validTransferId(transferId, environment) && descriptor.transferId === transferId && descriptor.environment === environment && descriptor.projectId === target.projectId, "TARGET_BINDING_MISMATCH");
  requireValue(typeof descriptor.proofHash === "string" && /^[a-f0-9]{64}$/.test(descriptor.proofHash), "INVALID_PROOF_HASH");
  const expiry = Date.parse(descriptor.expiresAt);
  requireValue(Number.isFinite(expiry) && new Date(expiry).toISOString() === descriptor.expiresAt && (allowExpired || expiry > now && expiry <= now + TTL), "EXPIRED_OR_INVALID_TRANSFER");
  rsaPublic(descriptor.publicKeySpki);
  return descriptor;
}
export function validateEnvelope(envelope, descriptor, now = Date.now()) {
  validateDescriptor(descriptor, descriptor.environment, descriptor.transferId, now);
  requireValue(exactFields(envelope, envelopeFields), "INVALID_ENVELOPE");
  for (const field of ["projectId", "environment", "transferId", "expiresAt", "proofHash"])
    requireValue(same(envelope[field], descriptor[field]), "ENVELOPE_BINDING_MISMATCH");
  requireValue(typeof envelope.key === "string" && /^sb_secret_[A-Za-z0-9_-]{20,256}$/.test(envelope.key), "MODERN_SERVER_KEY_REQUIRED");
  return envelope.key;
}
async function protectedDirectory(path, ownerUid, mode) {
  const stat = await lstat(path);
  requireValue(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === ownerUid && (stat.mode & 0o777) === mode, "UNSAFE_DIRECTORY");
}
async function readProtected(path, ownerUid, maxBytes = 8192) {
  const handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    requireValue(stat.isFile() && stat.nlink === 1 && stat.uid === ownerUid && (stat.mode & 0o777) === 0o600 && stat.size <= maxBytes, "UNSAFE_PRIVATE_FILE");
    return await handle.readFile("utf8");
  } finally { await handle.close(); }
}
async function writeExclusive(path, content) {
  let handle, completed = false;
  try {
    handle = await open(path, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, 0o600);
    await handle.chmod(0o600); await handle.writeFile(content, "utf8"); await handle.sync(); completed = true;
  } finally {
    if (handle) { await handle.close(); if (!completed) await unlink(path).catch(() => {}); }
  }
}
function transferPaths(configRoot, environment, transferId) {
  requireValue(validTransferId(transferId, environment), "INVALID_TRANSFER_ID");
  const root = resolve(configRoot, "provisioning"), directory = resolve(root, transferId);
  requireValue(dirname(directory) === root, "INVALID_TRANSFER_PATH");
  return { root, directory, descriptor: resolve(directory, "descriptor.json"), proof: resolve(directory, "proof"), privateKey: resolve(directory, "private.pem") };
}
export async function beginTransfer({ configRoot, environment, ownerUid = 0, now = Date.now() }) {
  const target = targetFor(environment);
  const transferId = "runtime-" + environment + "-" + randomBytes(16).toString("hex");
  const paths = transferPaths(configRoot, environment, transferId);
  await mkdir(paths.root, { mode: 0o700 }).catch((error) => { if (error.code !== "EEXIST") throw error; });
  await protectedDirectory(paths.root, ownerUid, 0o700);
  await mkdir(paths.directory, { mode: 0o700 });
  await protectedDirectory(paths.directory, ownerUid, 0o700);
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 4096, publicExponent: 65537 });
  const proof = randomBytes(32).toString("base64url");
  const descriptor = { publicKeySpki: publicKey.export({ type: "spki", format: "der" }).toString("base64"), proofHash: proofHash(proof), expiresAt: new Date(now + 9 * 60 * 1000).toISOString(), transferId, projectId: target.projectId, environment };
  await writeExclusive(paths.privateKey, privateKey.export({ type: "pkcs8", format: "pem" }));
  await writeExclusive(paths.proof, proof + "\n");
  await writeExclusive(paths.descriptor, JSON.stringify(descriptor) + "\n");
  return descriptor;
}
async function readTransfer({ configRoot, environment, transferId, ownerUid = 0, now = Date.now(), allowExpired = false }) {
  const paths = transferPaths(configRoot, environment, transferId);
  await protectedDirectory(paths.root, ownerUid, 0o700); await protectedDirectory(paths.directory, ownerUid, 0o700);
  let descriptor;
  try { descriptor = JSON.parse(await readProtected(paths.descriptor, ownerUid)); }
  catch (error) { if (error instanceof ProvisionError) throw error; throw new ProvisionError("INVALID_DESCRIPTOR"); }
  validateDescriptor(descriptor, environment, transferId, now, allowExpired);
  return { paths, descriptor };
}
async function responseJson(response, maxBytes) {
  requireValue(response.ok, "REMOTE_VALIDATION_FAILED");
  const reader = response.body?.getReader(); requireValue(reader, "INVALID_REMOTE_RESPONSE");
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; requireValue(size <= maxBytes, "REMOTE_RESPONSE_TOO_LARGE"); chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ProvisionError("INVALID_REMOTE_RESPONSE"); }
}
export async function receiveTransfer({ configRoot, environment, transferId, publishableKey, ownerUid = 0, now = Date.now(), fetchImpl = globalThis.fetch }) {
  const { paths, descriptor } = await readTransfer({ configRoot, environment, transferId, ownerUid, now });
  requireValue(typeof publishableKey === "string" && /^sb_publishable_[A-Za-z0-9_-]{12,200}$/.test(publishableKey), "PUBLISHABLE_KEY_REQUIRED");
  const runtimeDirectory = resolve(configRoot, "runtime-secrets"), runtimePath = resolve(runtimeDirectory, "hvcup-v1.json");
  await protectedDirectory(runtimeDirectory, ownerUid, 0o700);
  let existing;
  try { existing = await lstat(runtimePath); } catch (error) { if (error.code !== "ENOENT") throw error; }
  requireValue(!existing, "IMMUTABLE_RUNTIME_ALREADY_EXISTS");
  const proof = (await readProtected(paths.proof, ownerUid, 100)).trim();
  requireValue(/^[A-Za-z0-9_-]{43}$/.test(proof) && same(proofHash(proof), descriptor.proofHash), "PROOF_BINDING_MISMATCH");
  let privateKey;
  try { privateKey = createPrivateKey(await readProtected(paths.privateKey, ownerUid)); }
  catch (error) { if (error instanceof ProvisionError) throw error; throw new ProvisionError("INVALID_PRIVATE_KEY"); }
  requireValue(createPublicKey(privateKey).export({ type: "spki", format: "der" }).toString("base64") === descriptor.publicKeySpki, "PRIVATE_KEY_BINDING_MISMATCH");
  const projectUrl = "https://" + TARGETS[environment].projectId + ".supabase.co";
  const invoke = await fetchImpl(projectUrl + "/functions/v1/hvcup-runtime-bootstrap", { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ proof }), redirect: "error", signal: AbortSignal.timeout(15000) });
  const encrypted = await responseJson(invoke, 4096);
  requireValue(exactFields(encrypted, ["ciphertext", "alg", "transferId"]) && encrypted.alg === "RSA-OAEP-256" && encrypted.transferId === transferId, "INVALID_CIPHERTEXT_ENVELOPE");
  requireValue(typeof encrypted.ciphertext === "string" && Buffer.from(encrypted.ciphertext, "base64").toString("base64") === encrypted.ciphertext && Buffer.from(encrypted.ciphertext, "base64").length === 512, "INVALID_CIPHERTEXT");
  let envelope;
  try {
    const plaintext = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256", oaepLabel: Buffer.from(transferId, "utf8") }, Buffer.from(encrypted.ciphertext, "base64"));
    envelope = JSON.parse(plaintext.toString("utf8")); plaintext.fill(0);
  } catch { throw new ProvisionError("DECRYPTION_FAILED"); }
  const key = validateEnvelope(envelope, descriptor, now);
  const headers = { apikey: key, "Content-Type": "application/json" };
  const users = await responseJson(await fetchImpl(projectUrl + "/auth/v1/admin/users?page=1&per_page=1", { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(15000) }), 1024 * 1024);
  requireValue(users && Array.isArray(users.users), "ADMIN_API_NOT_VALIDATED");
  const state = await responseJson(await fetchImpl(projectUrl + "/rest/v1/rpc/haagv_read_state", { method: "POST", headers, body: "{}", redirect: "error", signal: AbortSignal.timeout(15000) }), 4 * 1024 * 1024);
  requireValue(state && Number.isSafeInteger(state.version) && state.version >= 0 && state.data && typeof state.data === "object" && !Array.isArray(state.data) && state.data.schemaVersion === 1 && Array.isArray(state.memberships), "READ_STATE_RPC_NOT_VALIDATED");
  validateEnvelope(envelope, descriptor, Date.now());
  await writeExclusive(runtimePath, JSON.stringify({ SUPABASE_SECRET_KEY: key }) + "\n");
  return { status: "runtime-provisioned", usersSampled: users.users.length, membershipCount: state.memberships.length, stateVersion: state.version };
}
export async function cleanupTransfer({ configRoot, environment, transferId, ownerUid = 0 }) {
  const { paths } = await readTransfer({ configRoot, environment, transferId, ownerUid, allowExpired: true });
  for (const path of [paths.privateKey, paths.proof]) {
    try { await readProtected(path, ownerUid); await unlink(path); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return { status: "transfer-private-material-removed" };
}
async function trustedConfig(environment) {
  requireValue(process.getuid?.() === 0 && process.versions.node.split(".")[0] === "24", "ROOT_NODE24_REQUIRED");
  requireValue(hostname() === "dg-vps-08" && (await readFile("/etc/machine-id", "utf8")).trim() === MACHINE_ID, "WRONG_HOST");
  const target = targetFor(environment), configRoot = "/etc/dg-webservices/" + target.site;
  for (let path = configRoot; ; path = dirname(path)) {
    const stat = await lstat(path);
    requireValue(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === 0 && !(stat.mode & 0o022), "UNTRUSTED_HOST_PATH");
    if (path === "/") break;
  }
  const hostPath = resolve(configRoot, "host.json"), stat = await lstat(hostPath);
  requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === 0 && !(stat.mode & 0o022), "UNTRUSTED_HOST_PROFILE");
  const profile = JSON.parse(await readFile(hostPath, "utf8"));
  requireValue(profile.siteId === target.site && profile.repository === "haaglandenv/platform" && profile.branch === "main" && profile.environment === environment && profile.port === target.port && profile.supabaseUrl === "https://" + target.projectId + ".supabase.co", "HOST_PROFILE_MISMATCH");
  return configRoot;
}
async function main() {
  const [operation, ...argv] = process.argv.slice(2);
  requireValue(["begin", "receive", "cleanup"].includes(operation) && argv.length % 2 === 0, "INVALID_ARGUMENTS");
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    requireValue(["--environment", "--transfer-id"].includes(argv[i]) && args[argv[i]] === undefined, "INVALID_ARGUMENTS"); args[argv[i]] = argv[i + 1];
  }
  const environment = args["--environment"]; targetFor(environment);
  requireValue(operation === "begin" ? args["--transfer-id"] === undefined : validTransferId(args["--transfer-id"], environment), "INVALID_ARGUMENTS");
  const configRoot = await trustedConfig(environment);
  let result;
  if (operation === "begin") result = await beginTransfer({ configRoot, environment });
  else if (operation === "cleanup") result = await cleanupTransfer({ configRoot, environment, transferId: args["--transfer-id"] });
  else {
    let input = "";
    for await (const chunk of process.stdin) { input += chunk.toString("utf8"); requireValue(Buffer.byteLength(input) <= 16384, "INPUT_TOO_LARGE"); }
    let payload; try { payload = JSON.parse(input); } catch { throw new ProvisionError("INVALID_INPUT"); }
    requireValue(exactFields(payload, ["publishableKey"]), "INVALID_INPUT");
    result = await receiveTransfer({ configRoot, environment, transferId: args["--transfer-id"], publishableKey: payload.publishableKey });
  }
  process.stdout.write(JSON.stringify(result) + "\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { process.stderr.write(error instanceof ProvisionError ? error.message + "\n" : "Runtimeprovisionering mislukt; inspecteer uitsluitend niet-geheime doelstatus.\n"); process.exitCode = 1; });
