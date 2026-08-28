# QA evidence

## Automated gates

| Command                           | Result                                                 |
| --------------------------------- | ------------------------------------------------------ |
| `bash scripts/verify-handoff.sh`  | Passed; all original checksums match                   |
| `npm ci`                          | Passed; one lockfile, 0 audit vulnerabilities          |
| `npm run format:check`            | Passed                                                 |
| `npm run lint`                    | Passed with zero warnings                              |
| `npm run typecheck`               | Passed                                                 |
| `npm run test`                    | Passed: 16 tests                                       |
| `npm run build`                   | Passed: Next.js production bundle                      |
| `npm run test:e2e`                | Passed: 6 Chromium tests including full golden journey |
| Secret and source-whitespace scan | Passed                                                 |

Domain coverage includes official/provisional progression, result recalculation, team confirmation, bye/walkover progression without invented scores, roster completeness/duplicates/eligibility, lineup limits/scope, event-score reconciliation, T-60 boundary, complete-check gating, direct-route/action denial and public-field projection.

## Responsive matrix

Playwright loaded homepage, bracket, Match Centre, HV Next and all four role dashboards at every required viewport:

| Viewport    | Chromium | Overflow | Console/page errors |
| ----------- | -------- | -------- | ------------------- |
| 360 × 800   | Passed   | None     | None                |
| 390 × 844   | Passed   | None     | None                |
| 430 × 932   | Passed   | None     | None                |
| 768 × 1024  | Passed   | None     | None                |
| 1024 × 768  | Passed   | None     | None                |
| 1440 × 900  | Passed   | None     | None                |
| 1920 × 1080 | Passed   | None     | None                |

Curated full-page screenshots are stored under `artifacts/qa/screenshots/` for 390 and 1440 px. The same test verifies no page-level horizontal overflow for 56 route × viewport combinations.

## Direct-load matrix

The browser suite directly loads and hard-refreshes 24 public route states: news index/article, tournament overview/program/teams/statistics/news/rules, matches, clubs/detail, privacy-fallback player, media/detail, history, Final Day, search, account, notifications, login and HV Next subroutes.

## Accessibility/reflow notes

- Semantic landmarks, headings, labels, buttons, tables and status live regions are present.
- A skip link and visible focus ring are global.
- Mobile bracket renders one round at a time; a semantic table alternative is available.
- Controls use at least 44 px target geometry; forms keep 16 px input text.
- `prefers-reduced-motion`, forced colors and 320/360 reflow styles are included.
- State is never conveyed by color alone; statuses include text and an icon.

## Visual review notes

- Editorial, Tournament Arena, Matchday, Football Network and HV Next directions are implemented as one token system.
- Three local synthetic editorial assets were generated for this demo and are clearly credited.
- Original 8K boards remain references and are not embedded as UI screenshots.
- Supplied club/player fallbacks are centrally rendered and explicitly labelled as generic.

## Remaining manual review

- Native screen-reader passes (NVDA/VoiceOver) were not available in this CLI environment.
- Real iOS safe-area/PWA installation and non-Chromium engines remain a device/browser lab check.
- Real upload bytes, malware scanning, EXIF stripping and production identity storage are intentionally not implemented in the local demo.
