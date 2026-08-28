# Production deployment runbook

## Contract

- URL: `https://haag.dgwebservices.nl`
- Branch: `production`
- Site slug: `haaglandencup`
- Internal port managed by the Sites VPS: `127.0.0.1:3106`
- Workflow: `.github/workflows/deploy-production.yml`
- Runner: `dg-sites-vps-01-haaglandencup-01`

Production deployment is exclusively GitHub Actions → repository-scoped self-hosted runner → `/usr/local/bin/dg-site-deploy`. The repository does not alter Caddy or systemd and contains no SSH/SCP/rsync deployment path.

## Promotion

1. Run format, lint, typecheck, unit tests, production build and browser tests locally.
2. Push the tested commit to `main`; this does not deploy.
3. Verify remote `main` equals the tested SHA.
4. Fast-forward `production` to that exact SHA; never force-push or rewrite history.
5. Watch the resulting Actions run through completion.
6. Verify `/api/health`, `/`, `/nieuws`, the Match Centre, bracket and clubs routes.

The workflow fails closed unless its user, runner name, workspace prefix and checked-out SHA match the dedicated runner boundary. It installs from `package-lock.json`, runs every repository quality gate and builds before invoking the deployment interface.

## Runtime environment

`DG_RUNTIME_ENV_KEYS` contains only:

- `NEXT_PUBLIC_SITE_URL`
- `APP_ENVIRONMENT`
- `APP_REVISION`

This prototype requires no GitHub Secrets or external services.

## Health and rollback

`GET /api/health` must return HTTP 200 with service `haaglandencup`, environment `production` and the deployed production SHA. The Sites VPS deployment interface owns immutable release activation and rollback; do not modify reverse-proxy or service-manager configuration from this repository.
