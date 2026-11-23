import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createInitialState } from "../../server/domain.mjs";
const enabled = process.env.HAAGV_TEST_DATABASE === "1";
const name = "haagv-platform-validation-" + process.pid;
const docker = (args, input) =>
  execFileSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 60000,
  });
const sql = (text) =>
  docker(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "haagv_validation",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    text,
  ).trim();
const literal = (value) =>
  "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const uuid = "00000000-0000-4000-8000-000000000001";
const fp = "a".repeat(64);
const commit = (id, version, state, hash = fp) =>
  `set role service_role; select public.haagv_commit_command('${uuid}','${id}','${hash}',${version},${literal(state)},${literal({ ok: true, version: version + 1, requestId: id, result: { done: true } })});`;

test(
  "Isolated Postgres: RLS, privileges, atomic receipts, compare-and-swap and one-time bootstrap",
  { skip: !enabled },
  async (t) => {
    let started = false;
    try {
      docker([
        "run",
        "--rm",
        "-d",
        "--name",
        name,
        "--label",
        "haagv.validation=true",
        "--network",
        "none",
        "--tmpfs",
        "/var/lib/postgresql/data",
        "-e",
        "POSTGRES_HOST_AUTH_METHOD=trust",
        "-e",
        "POSTGRES_DB=haagv_validation",
        "postgres:17-bookworm",
      ]);
      started = true;
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          sql("select 1;");
          ready = true;
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      assert(ready, "Disposable Postgres did not become ready");
      sql(
        "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); grant usage on schema public to anon,authenticated,service_role;",
      );
      for (const file of (await readdir(resolve("supabase/migrations")))
        .filter((f) => f.endsWith(".sql"))
        .sort())
        sql(await readFile(resolve("supabase/migrations", file), "utf8"));
      await t.test(
        "New project is empty and every exposed table has RLS",
        () => {
          assert.equal(
            sql("select count(*) from public.haagv_memberships;"),
            "0",
          );
          assert.equal(
            sql(
              "select jsonb_array_length(data->'data'->'clubs') from public.haagv_platform_state;",
            ),
            "0",
          );
          assert.equal(
            sql(
              "select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'haagv_%' and relkind='r' and relrowsecurity;",
            ),
            "3",
          );
        },
      );
      await t.test(
        "Anon/authenticated cannot access tables or call service RPCs",
        () => {
          for (const role of ["anon", "authenticated"]) {
            assert.throws(
              () =>
                sql(
                  `set role ${role}; select data from public.haagv_platform_state;`,
                ),
              /permission denied/,
            );
            assert.throws(
              () =>
                sql(
                  `set role ${role}; select public.haagv_bootstrap_leadership('${uuid}');`,
                ),
              /permission denied/,
            );
            assert.equal(
              sql(
                `select has_function_privilege('${role}','public.haagv_commit_command(text,text,text,bigint,jsonb,jsonb)','execute');`,
              ),
              "f",
            );
          }
          assert.equal(
            sql(
              "select bool_and(not prosecdef) from pg_proc where proname like 'haagv_%';",
            ),
            "t",
          );
        },
      );
      await t.test(
        "RLS remains deny-all even after accidental SELECT grant",
        () => {
          assert.equal(
            sql(
              "begin; grant select on public.haagv_platform_state to anon; set role anon; select count(*) from public.haagv_platform_state; rollback;",
            )
              .split("\n")
              .at(-2),
            "0",
          );
        },
      );
      sql(
        `insert into auth.users(id) values('${uuid}'),('00000000-0000-4000-8000-000000000002');`,
      );
      await t.test(
        "Initial leadership requires an existing auth user and runs exactly once",
        () => {
          assert.throws(
            () =>
              sql(
                "set role service_role;select public.haagv_bootstrap_leadership('00000000-0000-4000-8000-000000000099');",
              ),
            /AUTH_USER_REQUIRED/,
          );
          const row = JSON.parse(
            sql(
              `set role service_role;select public.haagv_bootstrap_leadership('${uuid}');`,
            )
              .split("\n")
              .at(-1),
          );
          assert.equal(row.userId, uuid);
          assert.equal(row.role, "leadership");
          assert.throws(
            () =>
              sql(
                `set role service_role;select public.haagv_bootstrap_leadership('${uuid}');`,
              ),
            /BOOTSTRAP_ALREADY_COMPLETE/,
          );
        },
      );
      await t.test(
        "One read RPC returns the state version and managed memberships in one SQL snapshot",
        () => {
          const read = JSON.parse(
            sql("set role service_role;select public.haagv_read_state();")
              .split("\n")
              .at(-1),
          );
          assert.equal(read.version, 1);
          assert.equal(read.data.version, 1);
          assert.equal(read.memberships[0].userId, uuid);
          assert.equal(read.memberships[0].role, "leadership");
          assert.equal(
            sql(
              "select provolatile from pg_proc where proname='haagv_read_state';",
            ),
            "s",
          );
        },
      );
      let state = JSON.parse(
        sql("select data from public.haagv_platform_state;"),
      );
      state.version = 2;
      state.data.clubs = [{ id: "HV-V-SQL", name: "SQL controle" }];
      await t.test(
        "State, managed memberships and receipt commit atomically",
        () => {
          const result = JSON.parse(
            sql(commit("sql-1", 1, state))
              .split("\n")
              .at(-1),
          );
          assert.equal(result.version, 2);
          assert.equal(
            sql("select version from public.haagv_platform_state;"),
            "2",
          );
          assert.equal(
            sql("select count(*) from public.haagv_command_receipts;"),
            "1",
          );
          assert.equal(
            sql("select user_id::text from public.haagv_memberships;"),
            uuid,
          );
        },
      );
      await t.test(
        "Identical retries return original receipt despite stale version; mismatched retry fails",
        () => {
          const result = JSON.parse(
            sql(commit("sql-1", 1, state))
              .split("\n")
              .at(-1),
          );
          assert(result.repeated);
          assert.equal(
            sql("select version from public.haagv_platform_state;"),
            "2",
          );
          assert.throws(
            () =>
              sql(commit("sql-1", 2, { ...state, version: 3 }, "b".repeat(64))),
            /REQUEST_ID_REUSED/,
          );
        },
      );
      await t.test(
        "Stale CAS and invalid membership FK roll back state plus receipt",
        () => {
          assert.throws(
            () => sql(commit("stale", 1, state)),
            /VERSION_CONFLICT/,
          );
          const invalid = structuredClone(state);
          invalid.version = 3;
          invalid.memberships = [
            {
              id: "foreign",
              userId: "00000000-0000-4000-8000-000000000099",
              role: "leadership",
              status: "active",
            },
          ];
          assert.throws(
            () => sql(commit("invalid-fk", 2, invalid)),
            /foreign key/,
          );
          assert.equal(
            sql("select version from public.haagv_platform_state;"),
            "2",
          );
          assert.equal(
            sql("select count(*) from public.haagv_command_receipts;"),
            "1",
          );
          assert.throws(
            () => sql(commit("invalid-state", 2, { version: 3 })),
            /INVALID_SERVER_STATE/,
          );
          assert.equal(
            sql("select count(*) from public.haagv_command_receipts;"),
            "1",
          );
        },
      );
      await t.test(
        "One of two concurrent writes succeeds and one CAS conflicts",
        async () => {
          const { spawn } = await import("node:child_process");
          const run = (text) =>
            new Promise((resolve) => {
              const p = spawn("docker", [
                "exec",
                "-i",
                name,
                "psql",
                "-X",
                "-U",
                "postgres",
                "-d",
                "haagv_validation",
                "-v",
                "ON_ERROR_STOP=1",
                "-At",
              ]);
              let output = "";
              p.stdout.on("data", (x) => (output += x));
              p.stderr.on("data", (x) => (output += x));
              p.on("close", (code) => resolve({ code, output }));
              p.stdin.end(text);
            });
          const next = { ...state, version: 3 };
          const results = await Promise.all([
            run(commit("race-a", 2, next)),
            run(commit("race-b", 2, next)),
          ]);
          assert.equal(results.filter((x) => x.code === 0).length, 1);
          assert.equal(
            results.filter((x) => x.output.includes("VERSION_CONFLICT")).length,
            1,
          );
          assert.equal(
            sql("select version from public.haagv_platform_state;"),
            "3",
          );
        },
      );
      await t.test(
        "Service-only notification status preserves state and increments version",
        () => {
          sql(
            'update public.haagv_platform_state set data=jsonb_set(data,\'{mailOutbox}\',\'[{"id":"notice-1","status":"pending"}]\'::jsonb);',
          );
          sql(
            'set role service_role; select public.haagv_finish_notification(\'notice-1\',\'{"status":"accepted","recipients":[]}\'::jsonb);',
          );
          assert.equal(
            sql(
              "select data->'mailOutbox'->0->>'status' from public.haagv_platform_state;",
            ),
            "accepted",
          );
          assert.equal(
            sql("select version from public.haagv_platform_state;"),
            "4",
          );
        },
      );
    } finally {
      if (started) docker(["stop", "--time", "2", name]);
    }
  },
);
