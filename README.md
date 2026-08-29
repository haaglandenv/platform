# Haaglanden Voetbal TournamentOS

Begin met [`START_HERE.md`](START_HERE.md). De autonome VPS-opdracht staat in [`CODEX_AUTONOMOUS_BUILD_PROMPT.md`](CODEX_AUTONOMOUS_BUILD_PROMPT.md).

Dit pakket bevat een lokaal geverifieerde premium DEV-demo in Next.js, de oorspronkelijke ontwerpbeelden en brieven, het 300-featureswerkboek, genormaliseerde requirements, deterministische synthetische seeddata, assets en QA-gates.

De demo omvat publieke, persoonlijke en operationele ervaringen voor supporter, toernooileiding, wedstrijdleiding, verenigingsmanager, teammanager, scheidsrechter, pers en fotograaf. De rolwissel is uitsluitend een synthetisch reviewmechanisme; productie-authenticatie en externe diensten zijn niet aangesloten.

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

Er is niets gepusht of gedeployed. `DEPLOYMENT_RUNBOOK.md` is gemarkeerd als **NOT EXECUTED** en mag alleen na expliciete goedkeuring worden gebruikt.
