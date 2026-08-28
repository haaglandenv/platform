# Premium Prototype Acceptance / QA Matrix

## Release definition

The prototype is accepted only when:

- every visible control has a working outcome;
- active-looking placeholders, `href="#"`, silent no-ops and unexplained disabled controls are absent;
- public, personal and all role experiences complete their golden paths with documented seed/reset data;
- all representative routes pass at 360, 390, 430, 768, 1024, 1440 and 1920 px;
- clean lint, typecheck, tests and production build succeed;
- direct routes and hard refresh work;
- no P0/P1 issue remains.

A simulated interaction must still be deterministic, show success/failure, persist for the documented scope and have a reset procedure.

## Universal controls

| ID | Area | Pass criteria |
|---|---|---|
| CTRL-01 | Links/navigation | Correct destinations, active states, deep links, refresh and back/forward |
| CTRL-02 | Mutations | Loading, no duplicates, confirmation, success, actionable error and persistence |
| CTRL-03 | Tabs/filters | Visible selected state, keyboard/touch, correct results and reset |
| CTRL-04 | Forms | Labels, required/format rules, inline errors, error recovery and server/data validation |
| CTRL-05 | Dialogs/drawers | Escape/outside close, focus trap/return, scroll lock and mobile-safe layout |
| CTRL-06 | Disabled | Cannot trigger and explains why/how to enable |
| CTRL-07 | State families | Loading, empty, success, validation, permission, conflict/stale, offline and retry |

## Responsive matrix

| Width | Required checks |
|---:|---|
| 360 | One-column core flow, menu/forms/upload/Match Centre/roster/bracket touch-safe; no input zoom |
| 390 | Safe areas and browser chrome; sticky actions/toasts/bottom nav remain reachable |
| 430 | Intentional wrapping and use of extra phone width; no accidental breakpoint jump |
| 768 | Tablet portrait; touch + keyboard, tables/dialogs/role forms redesigned |
| 1024 | Tablet landscape/small laptop; sidebar, roster review and bracket usable |
| 1440 | Primary desktop grid, line lengths, hover/focus parity and overlays stable |
| 1920 | Intentional maximum width/expanded grid; no sparse stretched cards; sharp assets |

At every width: no page-level horizontal overflow, clipping, sticky overlap or inaccessible action. Also check portrait/landscape, 200% zoom, reduced motion and current Chromium; use other configured browsers where available.

## Public/editorial

| ID | Scenario | Pass criteria |
|---|---|---|
| PUB-01 | Global shell | Header/mobile menu/logo/footer/legal and active routes work everywhere |
| PUB-02 | Homepage | Hero, live strip, stories, tournaments, fixtures, clubs and all CTAs resolve |
| PUB-03 | Discovery | Search, category/filter, pagination/reset and no-results work |
| PUB-04 | Article | Metadata, image credit, rich hierarchy, match embed, share and related links |
| PUB-05 | Resilience | Direct load, refresh, branded 404 and no framework error pages |
| PUB-06 | Content | No lorem ipsum, broken Dutch, impossible dates/scores or false live claims |

## Bracket

| ID | Scenario | Pass criteria |
|---|---|---|
| BRK-01 | Selection | Competition/season/round selectors show correct shareable state |
| BRK-02 | Integrity | Teams, scores, byes, penalties and progression match canonical data |
| BRK-03 | Interaction | Nodes link to correct Match Centre; round controls/swipe work |
| BRK-04 | Responsive | Page never overflows; mobile shows one round; scroll/gesture is contained |
| BRK-05 | Accessibility | Structured list/table equivalent with full match links and statuses |
| BRK-06 | State rule | Only official result advances a winner; revisions recalculate safely |

## Match Centre

| ID | Scenario | Pass criteria |
|---|---|---|
| MC-01 | Identity | Teams, crests, tournament, date/time, venue, referee and status agree everywhere |
| MC-02 | Lifecycle | Pre/live/rust/final/postponed/cancelled/stopped transitions are coherent |
| MC-03 | Reconciliation | Timeline goals equal score; corrections never duplicate events |
| MC-04 | Tabs | Lineups/timeline/stats/info/media show correct fixture or designed empty state |
| MC-05 | Live failure | Stale/reconnect/refresh state is visible; failure never looks successful |
| MC-06 | Actions | Follow/share/copy/directions/report/back all work with feedback |

## Clubs/community/media

| ID | Scenario | Pass criteria |
|---|---|---|
| CLUB-01 | Directory | Search, region filters, sort/reset and empty state work |
| CLUB-02 | Profile | Crest, teams, fixtures, results, news, media and missing-data states agree |
| CLUB-03 | Cross-links | Club/team/match/news links preserve correct context |
| COMM-01 | Public form/upload | Validation, consent/privacy, progress, success and retry work |
| COMM-02 | Safety | Submitted content renders safely and has moderation state |
| MEDIA-01 | Gallery | Filters and image/video details are functional and responsive |
| MEDIA-02 | Assets | Credits, alt text, fallback, dimensions and local source are correct |

## HV Next

| ID | Scenario | Pass criteria |
|---|---|---|
| NEXT-01 | Identity | Signed-out path and scoped demo identity work; direct URLs do not leak |
| NEXT-02 | Overview | Fixtures/results/favorites/tasks/notices agree with canonical data/timezone |
| NEXT-03 | Controls | Follow, read state, preferences and customization persist |
| NEXT-04 | Deep links | Cards/alerts/tasks open correct public/operations record |
| NEXT-05 | Edge states | New user, no favorites, expired session, removed team and failure designed |
| NEXT-06 | Privacy | Public account and private roster/notification data are visibly separated |

## Role permissions

| Role | Pass criteria |
|---|---|
| Tournament leadership | Only scoped tournaments; overrides need reason and audit; official result/bracket coherent |
| Association manager | Only assigned club; can monitor/request correction, not inspect other private rosters |
| Team manager | Only assigned team; draft/version/submit/lock/reopen rules enforced |
| Referee | Only assigned match; T-60 time gate; no unrelated roster access or identity edits |

Test copied URLs, browser history, stale tabs, ID tampering and multi-role context. UI hiding alone does not pass.

## Roster submission

| ID | Scenario | Pass criteria |
|---|---|---|
| ROST-01 | Fields | Name, DOB, reference, number, position and photo validation; Unicode and valid dates |
| ROST-02 | Photo | Type/size guidance; upload/progress/preview/replace/remove/cancel/failure |
| ROST-03 | Integrity | Add/edit/remove, duplicate identity/number and live completeness counts |
| ROST-04 | Draft | Refresh persistence, unsaved protection, expired/stale recovery without data loss |
| ROST-05 | Submit | Block incomplete, explain lock, idempotent, records version/time/actor |
| ROST-06 | Resubmit | Reason visible; prior version preserved; new immutable version created |

## Referee T-60

| ID | Scenario | Pass criteria |
|---|---|---|
| REF-01 | Time gate | Opens at authoritative kickoff minus 60; reschedule recalculates |
| REF-02 | Assignment | Only current assigned referee can act |
| REF-03 | Snapshot | Exact roster/lineup version; no invisible changes mid-review |
| REF-04 | Completion | Approval unavailable until required checks resolved |
| REF-05 | Integrity | Confirmation; referee/match/version/time recorded; idempotent/read-only after success |
| REF-06 | Failure | Offline/timeout/conflict never shows false approval; retry safe |

## Golden end-to-end journeys

| ID | Journey | Pass criteria |
|---|---|---|
| E2E-01 | Public discovery | Home → article → club → fixture → Match Centre → bracket with correct context |
| E2E-02 | Roster to approval | Add/fix player → save/reload → submit → review → T-60 → discrepancy → approve |
| E2E-03 | Match lifecycle | Provisional result → official → Match Centre/club/bracket/HV Next all update |
| E2E-04 | Permission boundaries | Every role sees only permitted routes, records, fields and actions |
| E2E-05 | Recovery | Upload interruption, expired session, stale version and live reconnect recover safely |

## Data consistency

- Canonical IDs drive names, crests, matches, venues and people.
- Scores reconcile with events and bracket.
- Status labels use one shared state model.
- Timestamps use stored timezone and render consistently around DST.
- Roster/approval uses immutable versions.
- Empty/error states never invent data.
- Demo data is synthetic with documented reset.

## Accessibility (WCAG 2.2 AA)

- Keyboard operation, logical focus and focus return.
- Correct landmarks, headings, links, buttons, forms, tabs, dialogs and tables.
- 4.5:1 body text contrast; state not by color alone.
- 200% zoom and 320/360 px reflow.
- Form errors explain and are announced.
- Live updates announce without moving focus.
- Meaningful alt text and reduced-motion support.
- Accessible bracket equivalent.

## Privacy/security

- Field visibility map for public, personal and each operation role.
- DOB/photo/roster IDs absent from public URLs, logs and analytics.
- Private uploads are not guessable public static files in production design.
- Content/MIME validation and metadata stripping plan.
- Session expiry/sign-out cannot leak prior private content.
- No secrets in source, fixtures, screenshots or bundle.
- Synthetic data only.

## Build gate

- Clean deterministic install with one lockfile.
- Format/lint/typecheck/test/build pass.
- Production bundle starts and representative direct routes refresh.
- Browser console/network show no uncaught/hydration/missing-asset failures.
- Environment variables documented/validated; no debug/localhost leakage in release config.
- Target mobile Core Web Vitals where measurable: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.

## Required QA evidence

- Route × viewport × browser pass sheet.
- Visible-control inventory.
- Screenshots of public, HV Next and all four role journeys.
- Exact build/test output.
- Keyboard/a11y/contrast/reflow notes.
- Privacy field-visibility map.
- Seed-data reconciliation for one full tournament journey.
- Final defect list with severity, disposition and retest evidence.

