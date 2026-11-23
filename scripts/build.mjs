import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { validatePublicConfig } from "../server/config.mjs";
const publicConfig = validatePublicConfig();
const publicConfigSha256 = createHash("sha256")
  .update(JSON.stringify(publicConfig))
  .digest("hex");
execFileSync("python3", ["-X", "utf8", "build.py"], { stdio: "inherit" });
await build({
  entryPoints: ["web/app.js"],
  outfile: "dist/site.js",
  bundle: true,
  platform: "browser",
  target: "es2022",
  format: "iife",
  minify: true,
  sourcemap: false,
  legalComments: "eof",
});
const files = ["index.html", "site.css", "site.js"];
const hashes = Object.fromEntries(
  await Promise.all(
    files.map(async (file) => [
      file,
      createHash("sha256")
        .update(await readFile("dist/" + file))
        .digest("hex"),
    ]),
  ),
);
await writeFile(
  "dist/build-manifest.json",
  JSON.stringify(
    {
      application: "haagv-platform",
      version: 19,
      apiVersion: "1",
      publicConfigSha256,
      files: hashes,
    },
    null,
    2,
  ) + "\n",
);
console.log("Webbuild gereed; geen externe database of mail aangeroepen.");
