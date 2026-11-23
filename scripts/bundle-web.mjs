import { build } from "esbuild";
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
