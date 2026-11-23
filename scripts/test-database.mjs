import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["--test", "tests/platform/backend-sql.test.mjs"],
  { stdio: "inherit", env: { ...process.env, HAAGV_TEST_DATABASE: "1" } },
);
process.exit(result.status ?? 1);
