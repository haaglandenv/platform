# Safe DEV VPS Build Runbook

## Boundaries

- Work only on the DEV VPS as a non-root user in a dedicated persistent directory.
- Do not push, create a PR, merge, tag, publish, deploy or restart production unless explicitly asked for that exact action.
- A GitHub push may trigger the self-hosted runner; inspect workflow triggers before any later authorized push.
- The runner should build/deploy the exact GitHub commit. Never copy the DEV working tree directly into production.
- Do not run migrations, seeders, containers, lifecycle hooks or scripts before reviewing them.

## 1. Prepare isolated paths

First discover the real existing project location. Do not assume `/srv/dev`. If no project exists and an administrator-approved root is available, use a layout such as:

```text
/srv/codex-dev/haaglanden-tournamentos/
├── handoffs/
├── releases/
├── checkpoints/
├── shared/
└── logs/
```

Extract into a new release directory, never over an existing working copy.

## 2. Preserve and inspect the ZIP

```bash
HANDOFF_ZIP="/confirmed/inbox/Haaglanden_Voetbal_TournamentOS_Codex_Handoff_2026-08-28.zip"
sha256sum "$HANDOFF_ZIP"
unzip -l "$HANDOFF_ZIP"
```

Reject or escalate absolute paths, `..` traversal, unexpected symlinks/special files, embedded credentials, extreme compression or unknown executables. Extract as the non-root DEV user and inspect before execution.

## 3. Determine source precedence

1. Locate any existing TournamentOS repo on the VPS.
2. Inspect `AGENTS.md`, README, Git status/branch/remotes, lockfiles, runtime declarations and scripts.
3. If it is newer/usable, copy the handoff’s requirements/assets into a review folder and continue the existing repo.
4. If no viable application exists, create a new release project and use the packaged starter only as historical flow reference.
5. Never overwrite dirty or unrelated work.

## 4. Secret scan

Report filenames, never secret values.

```bash
find . -type f \( \
  -name '.env' -o -name '.env.local' -o -name '.env.production' -o \
  -name '*.pem' -o -name '*.key' -o -name 'id_rsa' -o -name 'id_ed25519' \
\) -print
```

Ensure Git ignores real env files, keys, uploads, local databases, logs, build output and dependencies. Only sanitized `.env.example` may be committed.

## 5. Environment

Keep real DEV values outside Git, for example in a mode-0600 shared env file. Never place a secret in `NEXT_PUBLIC_*`. Do not print the complete environment or enable shell tracing around credentials.

Use an isolated DEV database/storage. Never point the prototype at production accounts or data.

## 6. Deterministic install

Use the source-declared Node/runtime and exactly one lockfile:

| Lockfile | Command |
|---|---|
| `package-lock.json` | `npm ci` |
| `pnpm-lock.yaml` | `corepack pnpm install --frozen-lockfile` |
| modern `yarn.lock` | `corepack yarn install --immutable` |
| Yarn Classic | `corepack yarn install --frozen-lockfile` |
| `bun.lock`/`bun.lockb` | `bun install --frozen-lockfile` |

If conflicting or missing lockfiles exist, resolve deliberately and document it. Inspect `preinstall`, `postinstall`, `prepare`, Docker and migration scripts before running them. Do not use `sudo` for project dependencies.

## 7. Local checkpoint

Record:

- original ZIP and SHA-256;
- project path/stack/runtime/package manager;
- Git branch/commit/status and pre-existing changes;
- selected lockfile;
- DEV database/storage target without secrets;
- intended loopback preview port.

Create a local branch/checkpoint after verifying no secrets are staged. No remote action is implied.

## 8. Develop privately

Bind previews to loopback unless a secured private VPS preview is explicitly approved:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Do not alter firewall, reverse proxy, DNS or TLS to expose a public preview without approval.

## 9. Test/build

Use repository commands. Typical gate:

```bash
npm run format:check --if-present
npm run lint --if-present
npm run typecheck --if-present
CI=1 npm run test --if-present
npm run build
```

Run browser/E2E tests and a production-mode smoke test on an unused loopback port. Check `git status --short` and `git diff --check`. Do not stage build output, local DBs, uploads, logs or env files.

## 10. Persistence

- Work under a persistent DEV directory, not `/tmp` or agent scratch.
- `node_modules`/build output are disposable and reproducible.
- A foreground preview stops with its shell.
- Do not create/enable a persistent system service unless explicitly requested.
- The self-hosted runner cannot see unpushed DEV work and should only deploy a GitHub commit.

## 11. Rollback/checkpoints

Maintain:

1. immutable handoff ZIP/checksum;
2. clean extracted release;
3. reviewed baseline commit;
4. logical local commits;
5. last fully tested commit;
6. pre-push candidate if later authorized.

Prefer a new worktree/release directory for rollback. Avoid destructive `git reset --hard`. Database rollback requires its own reviewed backup/migration plan.

## 12. Explicit GitHub gate

Before any later authorized push:

1. inspect `.github/workflows` and target-branch triggers;
2. confirm remote, repository, branch and exact commit;
3. review full diff/commit list;
4. run redacted secret scan;
5. rerun lint/typecheck/tests/build/smoke;
6. confirm no generated or sensitive files tracked;
7. push only the named branch without force.

Do not merge, tag, publish, dispatch a workflow or deploy unless each is requested.

## Completion report before push

| Item | Report |
|---|---|
| Working path | Persistent release path |
| Source provenance | ZIP filename + SHA-256 |
| Stack | Detected framework/runtime |
| Local branch/commit | Current tested commit |
| Checks | Passed/failed/skipped commands |
| Preview | Private address and process state |
| Secrets | Confirm absent from Git; issues without values |
| Database | DEV-only changes and backup/reset |
| External actions | Confirm no push/deploy |
| Awaiting approval | Exact proposed next GitHub action |

