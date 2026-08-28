# Haaglanden Voetbal TournamentOS

Begin met [`START_HERE.md`](START_HERE.md). De autonome VPS-opdracht staat in [`CODEX_AUTONOMOUS_BUILD_PROMPT.md`](CODEX_AUTONOMOUS_BUILD_PROMPT.md).

Dit pakket bevat de production-ready Next.js-app, de oorspronkelijke ontwerpbeelden en brieven, het 300-featureswerkboek, genormaliseerde requirements, deterministische synthetische seeddata, assets en QA-gates.

De productie-uitrol wordt uitsluitend gestart door een push naar `production` en loopt via de repository-scoped GitHub Actions-runner en `/usr/local/bin/dg-site-deploy`. Een push naar `main` deployt niet.

## Lokale quality gates

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Production gebruikt `NEXT_PUBLIC_SITE_URL`, `APP_ENVIRONMENT` en `APP_REVISION`; zie `.env.example` en `DEPLOYMENT_RUNBOOK.md`.
