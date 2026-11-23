import { mkdir, readFile, open, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readConfig, isLoopback } from "../server/config.mjs";
import { createMailService } from "../server/mail.mjs";
import { start } from "../server/index.mjs";
const config = readConfig({
  env: { ...process.env, HAAGV_ENABLE_LOCAL_SESSION: "1" },
});
if (
  config.production ||
  config.dataMode !== "local" ||
  !isLoopback(config.hostname) ||
  !isLoopback(new URL(config.origin).hostname)
)
  throw Error("De voorbeeldwerkruimte vereist lokale loopbackconfiguratie.");
const privateDir = resolve(config.root, ".local");
await mkdir(privateDir, { recursive: true, mode: 0o700 });
await chmod(privateDir, 0o700);
const keyFile = resolve(privateDir, "mail-encryption-key");
let key;
try {
  key = await readFile(keyFile, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const file = await open(keyFile, "wx", 0o600);
  key = randomBytes(32).toString("base64");
  try {
    await file.writeFile(key);
    await file.sync();
  } finally {
    await file.close();
  }
}
const mailService = createMailService({
  file: resolve(privateDir, "mail-settings.enc"),
  encryptionKey: key.trim(),
});
await start({ config, mailService });
