import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(mjs|js)$/.test(file))
      execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
  }
}
for (const dir of ["server", "web", "packages", "scripts", "tests/platform"])
  await walk(dir);
console.log("JavaScript-syntaxcontrole geslaagd.");
