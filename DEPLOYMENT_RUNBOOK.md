# Production deployment runbook — AUTHORIZED, PENDING EXECUTION

Status on 2026-08-29: **AUTHORIZED, PENDING EXECUTION**. The user explicitly requested the final detail audit, repository push and production deployment. Only the established fast-forward branch workflow below is authorized; no manual VPS, DNS, proxy, migration or service-manager change is included.

## Contract

- URL: `https://haag.dgwebservices.nl`
- Branch: `production`
- Site slug: `haaglandencup`
- Internal port managed by the Sites VPS: `127.0.0.1:3106`
- Workflow: `.github/workflows/deploy-production.yml`
- Runner: `dg-sites-vps-01-haaglandencup-01`

Production deployment is exclusively GitHub Actions → repository-scoped self-hosted runner → `/usr/local/bin/dg-site-deploy`. The repository does not alter Caddy or systemd and contains no SSH/SCP/rsync deployment path.

## Authorized promotion procedure

1. Record exact approval for the intended push and production deployment. **Complete: 2026-08-29.**
2. Re-run format, lint, typecheck, unit tests, production build and browser tests on the exact candidate SHA.
3. Push that tested SHA to the specifically approved remote branch.
4. Verify the remote SHA before any production promotion.
5. Fast-forward `production` to that exact SHA; never force-push or rewrite history.
6. Watch the resulting Actions run through completion and verify `/api/health`, `/`, `/nieuws`, Match Centre, bracket and clubs.

The workflow fails closed unless its user, runner name, workspace prefix and checked-out SHA match the dedicated runner boundary. It installs from `package-lock.json`, runs every repository quality gate and builds before invoking the deployment interface.

## Runtime environment

`DG_RUNTIME_ENV_KEYS` contains only:

- `NEXT_PUBLIC_SITE_URL`
- `APP_ENVIRONMENT`
- `APP_REVISION`

This prototype requires no GitHub Secrets or external services.

## Health and rollback

`GET /api/health` must return HTTP 200 with service `haaglandencup`, environment `production` and the deployed production SHA. The Sites VPS deployment interface owns immutable release activation and rollback; do not modify reverse-proxy or service-manager configuration from this repository.

Candidate-time health checks confirmed that production still served the previous revision `e397908ccb2fd5902fba8d07581ac2693f0a6d96`. Promotion, workflow and final live-route evidence are appended after execution.
