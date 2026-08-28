# TournamentOS local DEV build report

Date: 2026-08-28

Working directory: `/home/codex/repos/haaglanden`

Source ZIP SHA-256: `75618d46f5b36f6d4e4eb16dd0d4341e1714fc5ffdfff4152351692d8a2f88ee`

## Outcome

A reviewable TournamentOS application was built locally from the supplied handoff. It combines the public Haaglanden Voetbal experience, Tournament Arena, Match Centre, HV Next and role-scoped operations for tournament leadership, associations, teams and referees. The seeded roster-to-official-bracket journey is persistent, deterministic and browser-tested.

The repository had no application commit or package baseline. The handoff, historical starter and reference material remain available alongside the application. A production workflow was added for the explicitly authorized DG Sites VPS deployment.

## Architecture and runtime

- Next.js 16 App Router, React 19 and strict TypeScript.
- Server-side Zod validation and HTTP-only demo-role cookie.
- Canonical file-backed DEV state in `.data/state.json`, mode `0600` and Git-ignored.
- Separate public and operations projections; birth dates, references, referee identity and internal report notes are absent from public API responses.
- Domain functions control roster/eligibility, lineup/T-60 gates, event-score reconciliation, official-only bracket progression and bye/walkover outcomes.
- One authoritative `package-lock.json`, Node 24 compatibility and standalone Next.js output.
- No secret or external service is required. Runtime identity is exposed safely through `/api/health` using `APP_ENVIRONMENT` and `APP_REVISION`.

## Delivered areas

- Public: homepage, news, matches, Match Centre, tournaments, bracket, clubs, approved player fallback, media, history, Final Day, search, rules and privacy.
- HV Next: personalized feed, following, notifications/preferences and role-aware links.
- Toernooileiding: command center, tournament/rules creation, team assignment, fixture mutation/cancellation, match state, bracket, eligibility and roster approval, team-confirmed result finalization, discipline, incidents, audit, finalization and season lock.
- Vereniging: team/roster review, corrections, exclusion and contact-privacy profile.
- Team: roster completion/versioning, immutable submission, lineup selection and provisional result confirmation.
- Scheidsrechter: appointments, deterministic T-60 snapshot/checks, discrepancy flow and split public/internal match report.
- Shared: scoped messages, consent-aware media submission/moderation state, PWA manifest, responsive design system and accessible bracket alternative.

## Requirements status

The traceability matrix records 53 requirements as implemented and 3 as partial. The honest partials are:

- Security: the demo has server validation, role checks, safe field projections, HTTP-only cookie and auditability, but no production identity provider/MFA, database, encrypted object storage, rate limiting or hardened deployment perimeter.
- Push notifications: in-app notification events and preferences work; browser push/service-worker delivery is not connected.
- Press center: public-safe media and match data plus rights/consent moderation exist, but there is no separately authenticated press role, accreditation workflow or syndication feed.

See `docs/requirements-traceability.md` and `docs/decisions-and-blockers.md` for row-level evidence and decisions.

## Verification evidence

Final local gate results:

| Gate                                   | Result                              |
| -------------------------------------- | ----------------------------------- |
| Original handoff checksum verification | Passed; every manifest file `OK`    |
| `npm audit`                            | Passed; 0 known vulnerabilities     |
| `npm run format:check`                 | Passed                              |
| `npm run lint`                         | Passed; zero warnings               |
| `npm run typecheck`                    | Passed                              |
| `npm run test`                         | Passed; 17 tests                    |
| `npm run build`                        | Passed; optimized production bundle |
| `npm run test:e2e`                     | Passed; 6 Chromium tests            |

Browser verification includes the complete seeded golden journey; role/action denial; public-field privacy projection; direct load plus hard refresh for 24 public routes; and 56 representative route/viewport checks at 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080 with no horizontal overflow or console/page errors.

Curated visual evidence is in `artifacts/qa/screenshots/` (16 full-page screenshots, mobile and desktop). Detailed evidence and remaining device-lab checks are in `docs/qa-evidence.md`.

## Synthetic image provenance

Three new raster assets were created with OpenAI ImageGen in new-image mode, without source images:

- `public/media/matchday-live.png`: documentary regional evening match, authentic amateur-football atmosphere, green/yellow accent, no marks or text.
- `public/media/community-night.png`: warm documentary touchline community/supporter scene, no marks or text.
- `public/media/tournament-trophy.png`: editorial silver amateur-football trophy with green/yellow ribbons, no marks or text.

Exact local credits, rights labels and prompt briefs are stored in `public/media/assets.json`. Supplied 8K conceptboards were used only as visual references and are not embedded as product content.

## Reproduce locally

```bash
npm ci
npm run demo:reset
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Use `/inloggen` or `/beheer` to switch the explicit synthetic demo role. Follow `docs/setup-and-demo.md` for the golden journey. Re-run `npm run demo:reset` to return to the review baseline.

Production deployment evidence is recorded after the GitHub Actions promotion completes.
