# QA evidence

## Automated gates

| Command                          | Result                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| `bash scripts/verify-handoff.sh` | Passed for immutable source material; living implementation README excluded |
| `npm run format:check`           | Passed                                                                      |
| `npm run lint`                   | Passed with zero warnings                                                   |
| `npm run typecheck`              | Passed for application and tests                                            |
| `npm run test`                   | Passed: 21 tests across domain, health and permissions                      |
| `npm run build`                  | Passed: optimized Next.js bundle                                            |
| `npm run test:e2e`               | Passed: 9 Chromium tests, including the expanded golden journey             |
| `git diff --check`               | Passed                                                                      |

Domain coverage includes official/provisional progression, three-party result confirmation, bye/walkover progression without invented scores, roster completeness/duplicates/eligibility/dispensation, configured lineup limits/scope, event-score reconciliation, T-60 boundary, both-team complete-check gating, role/record/action denial and public/press field projection.

The browser workflows additionally cover fixture-change dual approval, media rights/moderation/press visibility, versioned rules, denied-action security logging, live card/goal/interruption events and referee/home/away result confirmation.

## Responsive matrix

Playwright loaded homepage, bracket, Match Centre, HV Next and all seven operational role dashboards at every required viewport:

| Viewport    | Chromium | Overflow | Console/page errors |
| ----------- | -------- | -------- | ------------------- |
| 360 × 800   | Passed   | None     | None                |
| 390 × 844   | Passed   | None     | None                |
| 430 × 932   | Passed   | None     | None                |
| 768 × 1024  | Passed   | None     | None                |
| 1024 × 768  | Passed   | None     | None                |
| 1440 × 900  | Passed   | None     | None                |
| 1920 × 1080 | Passed   | None     | None                |

Curated screenshots are stored under `artifacts/qa/screenshots/` for 390 and 1440 px, plus focused 390 px captures of the reference-aligned hero and live card. The same test verifies no page-level horizontal overflow for 77 route × viewport combinations across 11 product areas.

Network QA fails on every 4xx/5xx response and non-cancelled request failure. Next.js RSC prefetches intentionally cancelled during rapid full-page route replacement (`ERR_ABORTED` with `_rsc`) are excluded because they are browser navigation cancellations, not failed application requests.

## Direct-load matrix

The browser suite directly loads and hard-refreshes 24 public route states and 27 operational routes across all seven operational roles. Coverage includes news, tournament tabs, matches, clubs, player privacy fallback, media, history, Final Day, search, account, notifications, login, HV Next and every declared dashboard/nav route. Each operational role root is additionally loaded from a fresh server projection throughout the viewport matrix.

## Accessibility/reflow notes

- Semantic landmarks, headings, labels, buttons, tables and status live regions are present.
- A skip link and visible focus ring are global.
- Mobile bracket renders one round at a time; a semantic table alternative is available.
- Controls use at least 44 px target geometry; forms keep 16 px input text.
- `prefers-reduced-motion`, forced colors and 320/360 reflow styles are included.
- State is never conveyed by color alone; statuses include text and an icon.

## Visual review notes

- Editorial, Tournament Arena, Matchday, Football Network and HV Next directions are implemented as one token system.
- The final homepage pass was visually compared with both user-supplied mobile captures: device/browser chrome was excluded, while header actions, ticker rhythm, hero hierarchy, lime CTA, overlapping match card and bottom-nav labels were matched.
- Five local synthetic editorial/social assets were generated for this demo and are clearly credited.
- Original 8K boards remain references and are not embedded as UI screenshots.
- Supplied club/player fallbacks are centrally rendered and explicitly labelled as generic.

## Remaining manual review

- Native screen-reader passes (NVDA/VoiceOver) were not available in this CLI environment.
- Real iOS safe-area/PWA installation and non-Chromium engines remain a device/browser lab check.
- Browser push/service-worker delivery is simulated as an explicit permission state; no external delivery service is connected.
- Real upload bytes, malware scanning, EXIF stripping and production identity storage are intentionally not implemented in the local demo.
