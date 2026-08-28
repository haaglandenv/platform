import { chmod, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, ".data", "state.json");
await mkdir(dirname(target), { recursive: true });
await copyFile(resolve(root, "demo-data", "tournamentos-seed.json"), target);
await chmod(target, 0o600);
console.log(`Deterministische demo hersteld: ${target}`);
