# TournamentOS production-candidate build report — deployment authorized

Date: 2026-08-29

Working directory: `/home/codex/repos/haaglanden`

Source ZIP SHA-256: `75618d46f5b36f6d4e4eb16dd0d4341e1714fc5ffdfff4152351692d8a2f88ee`

## Outcome

A reviewable TournamentOS application was completed locally in the existing DEV codebase. It combines the public Haaglanden Voetbal experience, Tournament Arena, Match Centre, HV Next and eight explicitly scoped demo roles. Public, personal and operational surfaces now derive from one persistent, deterministic domain state.

The prior application already provided a polished visual shell. This build retained that work and completed the deeper roster, rules, two-team T-60, live event, interruption, result, discipline, fixture-change, press, photography, privacy and audit workflows. A final visual audit against two user-supplied mobile captures then realigned the public homepage around the intended dark photographic hero, uppercase editorial headline, multi-score ticker, lime CTA, overlapping live match card and five-item Home/Live/Cups/Nieuws/Mijn navigation.

The handoff, historical starter and original reference material remain available. Push and production deployment of this exact tested candidate were explicitly authorized by the user on 2026-08-29; execution evidence is recorded after the immutable production workflow completes.

## Architecture and runtime

- Next.js 16 App Router, React 19 and strict TypeScript.
- Server-side Zod validation, same-origin mutation checks and an HTTP-only demo-role cookie.
- Canonical file-backed DEV state in `.data/state.json`, mode `0600` and Git-ignored.
- Separate public and operations projections; birth dates, references, referee identity and internal report notes are absent from public API responses.
- Domain functions control versioned rules, roster/eligibility, lineup/T-60 gates, event-score reconciliation, incident snapshots, three-party result confirmation, official-only bracket progression and bye/walkover outcomes.
- One authoritative `package-lock.json`, Node 24 compatibility and standalone Next.js output.
- No secret or external service is required. Runtime identity is exposed safely through `/api/health` using `APP_ENVIRONMENT` and `APP_REVISION`.

## Delivered areas

- Public: homepage, news, matches, Match Centre with canonical events, tournaments, bracket, clubs, approved player fallback, media, history, Final Day, search, effective rules and privacy.
- HV Next: personalized feed, following, notifications/preferences and role-aware links.
- Toernooileiding: command center, complete versioned rules, player-by-player/bulk approval, fixture approval, interruption decisions, result disputes/finalization, discipline/suspension, media moderation, audit/security events, finalization and season lock.
- Wedstrijdleiding: matchday readiness, officials, start/incident controls, opponent fixture approval and home-result confirmation.
- Vereniging: team/roster review, corrections, exclusion and contact-privacy profile.
- Team: add/edit/remove roster entries, versioning, immutable submission, configured lineup/keeper/captain selection, fixture requests, result confirmation and disputes.
- Scheidsrechter: appointments, exact two-team T-60 snapshot/checks/notes, live goals/cards/substitutions/corrections, interruption capture and split public/internal report.
- Pers: dedicated privacy-filtered center with separately gated names, shirt numbers, lineups and approved media.
- Fotograaf: match-linked metadata submission with credit, three independent usage rights and private moderation inbox.
- Shared: scoped messages, push-permission simulation, PWA manifest, responsive design system, accessible bracket alternative and retry/offline/stale-state feedback.

## Requirements status

The traceability matrix records 54 requirements as implemented and 2 as partial. The honest partials are:

- Security: the demo has server validation, role checks, safe field projections, HTTP-only cookie and auditability, but no production identity provider/MFA, database, encrypted object storage, rate limiting or hardened deployment perimeter.
- Push notifications: in-app events, preferences and an explicit simulated permission state work; browser push/service-worker delivery is not connected.

See `docs/requirements-traceability.md` and `docs/decisions-and-blockers.md` for row-level evidence and decisions.

## Verification evidence

Final local gate results:

| Gate                                    | Result                                                     |
| --------------------------------------- | ---------------------------------------------------------- |
| Immutable handoff checksum verification | Passed; living implementation README excluded by design    |
| `npm run format:check`                  | Passed                                                     |
| `npm run lint`                          | Passed; zero warnings                                      |
| `npm run typecheck`                     | Passed; application and tests                              |
| `npm run test`                          | Passed; 21 tests                                           |
| `npm run build`                         | Passed; optimized Next.js bundle                           |
| `npm run test:e2e`                      | Passed; 9 Chromium tests including expanded golden journey |
| `git diff --check`                      | Passed                                                     |

Browser verification includes the complete seeded golden journey; two-approval fixture changes; rights-aware media moderation; versioned rules; role/action denial and security logging; public/press privacy projections; direct load plus hard refresh for 24 public and 27 operational routes; and 77 route/viewport checks at 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080 with no horizontal overflow, HTTP/request, console or page errors.

Curated visual evidence is in `artifacts/qa/screenshots/` (24 screenshots, including mobile/desktop matrices and focused reference-comparison captures). Detailed evidence and remaining device-lab checks are in `docs/qa-evidence.md`.

## Synthetic image provenance

Five raster assets were created with OpenAI ImageGen and kept local:

- `public/media/matchday-live.png`: documentary regional evening match, authentic amateur-football atmosphere, green/yellow accent, no marks or text.
- `public/media/community-night.png`: warm documentary touchline community/supporter scene, no marks or text.
- `public/media/tournament-trophy.png`: editorial silver amateur-football trophy with green/yellow ribbons, no marks or text.
- `public/media/tournament-hero-v2.png`: reference-led regional green/white player composition with dark copy space; the supplied UI captures were used only as visual references.
- `public/media/social-preview.png`: branded landscape social card with exact Haaglanden Voetbal TournamentOS copy; the local hero was used only as a visual reference.

Exact local credits, rights labels, generation modes and prompt briefs are stored in `public/media/assets.json`. Supplied 8K conceptboards and mobile captures were used only as visual references and are not embedded as product content.

## Reproduce locally

```bash
npm ci
npm run demo:reset
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Use `/inloggen` or `/beheer` to switch the explicit synthetic demo role. Follow `docs/setup-and-demo.md` for the golden journey. Re-run `npm run demo:reset` to return to the review baseline.

## External action status — AUTHORIZED, PENDING EVIDENCE

The user explicitly authorized pushing this tested repository state and promoting it through the existing `production` branch workflow on 2026-08-29. The code candidate itself contains no manual VPS, proxy, migration or service-manager mutation. Immutable workflow, runtime revision and live-route evidence are appended after deployment.
