# Codex Autonomous Build Prompt — Haaglanden Voetbal TournamentOS

You are the lead product engineer, product designer, QA engineer and technical owner for the Haaglanden Voetbal TournamentOS premium demo prototype.

Work autonomously on the designated DEV VPS. Build a complete, cohesive and review-ready prototype from this handoff and any newer existing TournamentOS source already present on the VPS. Continue through implementation, testing and visual verification without asking about routine implementation choices.

Ask only when:

- the target VPS/project directory is uncertain;
- required access is missing;
- a requirement materially contradicts another authoritative requirement;
- an operation is destructive, irreversible or affects production;
- a paid/external service is indispensable;
- a push, PR, merge or deployment is requested but not explicitly authorized.

## Hard release boundary

You may:

- inspect and edit files inside the confirmed DEV project directory;
- install reviewed locked dependencies;
- create or seed an isolated DEV datastore;
- run DEV-only migrations, tests, builds and loopback/private previews;
- create local branches and local commits for reversible checkpoints.

You must not, without explicit action-specific approval:

- push or force-push;
- open or merge a pull request;
- create a tag or release;
- deploy, publish or restart a production service;
- touch production data or production migrations;
- alter DNS, TLS, firewall, reverse proxy or system-wide configuration;
- send real emails, notifications, invitations or other outbound communications.

Approval to push is not approval to deploy.

## 1. Establish the correct source baseline

Before writing:

1. Confirm hostname, current user, exact application path and available disk space.
2. Inspect Git branch, HEAD, remotes, status and pre-existing changes.
3. Locate all `AGENTS.md`, README files, lockfiles, runtime declarations, package scripts, hooks, environment examples, schemas, migrations and tests.
4. Inspect scripts before executing anything that might publish, migrate, delete or contact an external service.
5. Identify the newest usable TournamentOS source already on the VPS.
6. If a newer application exists, continue it and preserve unrelated work.
7. If no usable application exists, use `starter/haaglanden-tournamentos-prototype/` to understand previous working flows and create a new maintainable application.

Fallback stack only when no real application baseline exists:

- Next.js App Router and TypeScript;
- a checked-in, local font setup;
- CSS variables plus a clear component/token layer; Tailwind is allowed when it improves consistency;
- Lucide-style line icons from one library;
- Zod or equivalent shared validation;
- a small persistent DEV data adapter, preferably SQLite behind repository/service interfaces;
- local DEV upload storage outside public source control;
- Vitest or equivalent for domain/unit tests;
- Playwright or the repository’s existing browser test framework.

Do not rewrite an existing router, identity provider, data layer or design system merely from preference. Create a reversible local baseline checkpoint before structural or schema changes.

## 2. Turn the handoff into traceable work

Read every file listed in `CONTENTS.md`. Review every populated sheet in the Excel workbook, including legends, hidden sheets/rows/columns, comments and validation notes.

Create `docs/requirements-traceability.md` with one row per applicable MVP/V1 requirement:

- original feature number and wording;
- phase and primary role;
- acceptance criteria;
- route/component/domain/data change;
- automated/manual test evidence;
- status: not started, in progress, implemented, partial, blocked or needs decision.

Implement all 20 MVP and 36 V1 features in `requirements/FEATURE_PRIORITY_MATRIX.md`, including direct technical prerequisites. Do not silently weaken, merge or omit a requirement. Log meaningful assumptions or conflicts in `docs/decisions-and-blockers.md`.

Later-phase workbook ideas may be used for polish when they are cheap and do not delay the complete MVP/V1 journey, but they are not substitutes for core completion.

## 3. Build one shared product, not separate mock pages

Use a single canonical domain model for clubs, teams, competitions, rounds, fixtures, scores, events, rosters, users, roles, news and media.

The same match ID must drive:

- fixture cards;
- Match Centre;
- bracket progression;
- club pages;
- HV Next cards;
- operations dashboards;
- notifications and audit entries.

Do not maintain conflicting hard-coded data copies. All consequential mutations must update every dependent view. Use the seed IDs and scenario in `requirements/DEMO_DATA_AND_STATE_MODEL.md` unless the existing source already has a better consistent fixture.

## 4. Required public experience

The main public site uses the Editorial concept as its foundation: premium Dutch sports journalism, generous whitespace, authentic regional football imagery and precise match-data integration.

Required public routes and experiences are defined in `requirements/PRODUCT_AND_ROUTE_SCOPE.md` and include at minimum:

- editorial homepage and live score strip;
- news index, article page and embedded match cards;
- tournaments index and Sir Winston Cup home;
- program/results, teams, statistics, news, rules and archive;
- a complete Tournament Arena knockout bracket;
- a complete Matchday Match Centre with pre/live/post/postponed/stopped states;
- clubs directory and club detail;
- media gallery and media detail;
- history/trophy archive;
- search and coherent result groups;
- Final Day hub;
- login/demo role entry, public profile, notifications and PWA/install surfaces where applicable.

The public site remains browseable without login. Never expose date of birth, identity verification, private photos, internal notes or referee discrepancy details publicly.

## 5. Required Tournament Arena bracket

Build a real bracket module driven by canonical fixture/result data.

Desktop:

- stable round columns and aligned match cards;
- correct connectors and round headings;
- winner, score and status in fixed internal columns;
- match detail links;
- byes, walkovers, penalties, postponed and provisional states;
- automatic progression only from official results.

Mobile:

- exactly one round at a time;
- swipe plus visible previous/next controls;
- selected-round state and progress;
- match detail in a sheet or dedicated route;
- no scaled-down desktop bracket and no page-level horizontal overflow.

Add domain tests proving each winner advances to the correct next match, official-result changes recalculate safely and provisional scores do not advance a team.

## 6. Required Matchday Match Centre

Use a premium broadcast composition with authentic photography, controlled deep-green overlays, separate score geometry, subtle motion-trail accents and restrained live status. Do not use a flat, oversized green rectangle.

Support:

- pre-match countdown and rules summary;
- lineups, bench, venue, field, referee, competition and round;
- live minute, score and event timeline;
- goals, cards, substitutions and corrections;
- halftime, completed and official/provisional result states;
- postponed/cancelled/stopped match states;
- public-safe message for stopped matches;
- report, photos, next round and related news after full time;
- share/copy/follow actions with real feedback.

Scores, team names and crests must remain optically aligned even when names differ in length. Use tabular numerals and one shared score component.

## 7. Required club and community experience

Use Football Network as the foundation:

- premium regional club discovery;
- region filters and search;
- club logo, name, teams, next fixture and follow state;
- club detail with fixtures, results, news and community context;
- community media upload with consent, validation and moderation state;
- photo/video filters and editorial media grid;
- local/authentic visual tone without tourism clichés or fantasy stadiums.

All visible follow, filter, upload, consent, share and navigation controls must work.

## 8. Required HV Next personal dashboard

Build a compact, premium, responsive PWA-like dashboard with a precise 12-column desktop grid and a purpose-built mobile app hierarchy.

Include:

- followed club/tournament overview;
- next match and live score priority;
- tasks and relevant alerts;
- news, bracket and result updates;
- notification center and settings;
- personal favorites and privacy preferences;
- persistent demo personalization;
- explicit empty, loading, offline/stale and error states.

Avoid a generic row of identical KPI cards. Urgent tasks must dominate decorative metrics. Mobile navigation must respect safe-area insets.

## 9. Required operations portal and role workflows

Use the shared HV Next design language, but each role gets a distinct decision hierarchy.

### Tournament leadership

Provide a command center for:

- tournament/rules configuration;
- teams, fixtures, venue/field and referee assignments;
- bracket/draw integrity;
- roster exceptions and bulk approvals;
- live/stopped/postponed matches;
- provisional result confirmation;
- discipline and cases;
- messages, notifications and audit activity;
- tournament finalization and season lock.

Manual overrides require confirmation, reason code and audit event.

### Association manager

Provide:

- club profile and venue data;
- tournament team registrations;
- manager assignments;
- roster completeness and deadlines;
- correction requests and resubmissions;
- upcoming fixtures and notifications;
- contact privacy and club exclusion state.

### Team manager

Provide the complete first-match roster workflow:

- add/edit/remove player;
- full name, KNVB/reference number, date of birth, shirt number, position and current photo;
- captain/goalkeeper and dispensations where relevant;
- preview, replace and remove photo;
- duplicate identity warning;
- inline and submission validation;
- draft persistence, version history and unsaved-change protection;
- submit, correction request, resubmit and locked state;
- select starters/substitutes for a match;
- enforce unique shirt numbers and lineup limits;
- submit and lock the lineup.

Use synthetic adults/players only. Explain that DEV storage is not secure production identity storage.

### Referee

Provide the assigned-match T-60 flow:

- before T-60: read-only countdown and explanation;
- from T-60: exact submitted lineup snapshot;
- photo, name, number and only policy-required identity data;
- per-player states: akkoord, niet aanwezig, identiteit controleren, gegevens wijken af;
- internal note for an exception;
- progress counts;
- team approval disabled until every required check is resolved;
- explicit final confirmation and immutable audit entry;
- provisional result and match-report submission after the match.

The referee never edits player identity fields and cannot open unrelated team rosters.

## 10. Complete seeded end-to-end demo

Implement this coherent journey across roles:

1. The association has registered `Duindorp SV 1`.
2. The team manager opens roster version 1 with one missing photo/reference.
3. The manager fixes it, adds/replaces a local preview image and submits version 2.
4. Tournament leadership reviews and approves the roster.
5. The manager submits the lineup for `Quick – Duindorp SV`.
6. The referee opens the T-60 check.
7. One player is flagged for a shirt-number discrepancy.
8. Tournament leadership resolves the exception with a reason code.
9. The referee approves both lineups.
10. The match moves through live and completed states.
11. The referee submits `Quick 2–1 Duindorp SV` as provisional.
12. Tournament leadership confirms the official result.
13. Quick advances in the bracket.
14. Public Match Centre, bracket, club pages, notifications and dashboard counts show the same official outcome.

Provide `npm run seed`/equivalent and `npm run demo:reset`/equivalent. Seed data must be deterministic and contain no real personal data.

## 11. Premium design implementation contract

Follow `requirements/DESIGN_SYSTEM.md` exactly.

Essential rules:

- palette: `#003D1D`, `#005B2A`, `#D9F000`, `#F4D000`, `#F7F8F6`, `#17201B`;
- readable checked-in UI font and an editorial serif only where appropriate;
- 4-column mobile, 8-column tablet and 12-column desktop grid;
- maximum content width about 1480 px;
- deliberate 4 px spacing scale and shared component padding;
- consistent 12–20 px radii, restrained shadows and fine keylines;
- dark sections remain controlled and are never the whole public experience;
- one shared club-crest component with the supplied SVG fallback;
- one shared player-photo fallback;
- one shared score component;
- one icon family;
- every interactive element has default, hover, focus-visible, active, disabled and applicable loading state;
- meaningful motion only, with `prefers-reduced-motion` support;
- authentic Dutch regional football tone, no esports/neon/casino/fantasy-arena styling.

Use the supplied images locally. The 8K boards are visual references, not content images to place as page screenshots. Optimize production derivatives where needed, but preserve the originals in a reference folder.

## 12. Make every visible interface real

Inventory every route and visible control. For each link, button, tab, filter, sort, pagination, menu, dialog, form, search box, upload, follow, vote, reaction and dashboard action:

- implement the outcome;
- provide loading and double-submit protection;
- show success and actionable error feedback;
- persist for the documented scope;
- support keyboard and touch;
- remove the control if the function is genuinely out of scope;
- use a clearly explained disabled state when a rule/time gate blocks it.

No `href="#"`, silent no-op, fake toast-only save or mutation that disappears unexpectedly on reload is allowed.

## 13. Privacy, security and accessibility

- Use least privilege in server/data actions.
- Use role/scoped demo sessions; a client-side role switch is never authorization by itself.
- Keep DOBs, photos, internal notes and identity checks off public routes, URLs, analytics and logs.
- Strip unnecessary image metadata in the production design path.
- Document retention/consent requirements for real production use.
- Keep real secrets out of code and provide only `.env.example` placeholders.
- Meet WCAG 2.2 AA contrast and keyboard expectations.
- Use semantic headings, labels, dialogs, tables and live regions.
- Provide an accessible list/table alternative to the visual bracket.
- Verify 200% zoom, reduced motion and 320/360 px reflow.

## 14. Responsive and visual verification

Visually and functionally inspect all representative public and role routes at:

- 360 × 800
- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 768
- 1440 × 900
- 1920 × 1080

At every size verify:

- no page-level horizontal overflow;
- no clipped typography, scores, crests, controls or safe-area navigation;
- intentional line wrapping for Dutch labels;
- 44 px touch targets;
- dialogs, drawers and sticky actions remain reachable;
- forms remain usable;
- mobile bracket and Match Centre remain purpose-built;
- image crops remain meaningful;
- focus order follows the visual order.

Capture concise screenshots/evidence for the homepage, bracket, Match Centre, HV Next and all four operational roles.

## 15. Required tests and build gates

Run the canonical repository commands, normally including:

- formatting check;
- lint;
- typecheck;
- unit/domain tests;
- integration tests;
- production build;
- browser/end-to-end tests against the production bundle.

Minimum automated coverage:

- tournament rules and bracket progression;
- official versus provisional result behavior;
- result changes and dependent recalculation;
- roster validation and immutable versions;
- duplicate player/number protection;
- T-60 gate and complete-check requirement;
- role and record-scope denial cases;
- public/private field separation;
- the complete seeded journey.

Inspect browser console and network failures. Do not delete, weaken or skip tests to obtain a green result. Report each check as passed, failed, blocked or not run.

## 16. Required local deliverables

Create or update:

- `docs/requirements-traceability.md`;
- `docs/decisions-and-blockers.md`;
- setup and `.env.example` documentation;
- demo role/seed/reset instructions;
- `BUILD_REPORT.md`;
- `DEPLOYMENT_RUNBOOK.md` clearly marked **NOT EXECUTED**.

`BUILD_REPORT.md` includes:

- completed product areas;
- requirement status and true blockers;
- changed files, schema, migrations and dependencies;
- environment variable names without secret values;
- demo roles and seed/reset flow;
- exact test commands/results;
- responsive/browser/accessibility evidence;
- known limitations and manual review items;
- current branch/commit/status/diff summary;
- pre-existing unrelated changes;
- private DEV preview instructions.

## Final stop

When implementation and verification are complete:

1. stop before any push or deployment;
2. summarize the review path and real blockers;
3. state the exact next approval required;
4. end with:

**Changes are local to the DEV workspace; nothing was pushed or deployed.**

