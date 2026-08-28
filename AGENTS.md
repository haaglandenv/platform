# Codex project instructions — Haaglanden Voetbal TournamentOS

These instructions apply to the complete extracted handoff tree.

## Mission

Build a premium, autonomous demo prototype on the confirmed DEV VPS. Treat public, personal and operational experiences as one product with one shared domain model.

## Mandatory reading before edits

1. `START_HERE.md`
2. `CODEX_AUTONOMOUS_BUILD_PROMPT.md`
3. `requirements/FEATURE_PRIORITY_MATRIX.md`
4. `requirements/DESIGN_SYSTEM.md`
5. `requirements/PRODUCT_AND_ROUTE_SCOPE.md`
6. `requirements/ROLE_WORKFLOWS.md`
7. `requirements/DEMO_DATA_AND_STATE_MODEL.md`
8. `requirements/PHOTOGRAPHY_AND_ASSET_PLAN.md`
9. `requirements/QA_ACCEPTANCE_MATRIX.md`
10. `requirements/VPS_BUILD_RUNBOOK.md`
11. The complete requirements workbook and both original design briefs

## Operating rules

- Work only inside a confirmed persistent DEV project path.
- Inspect existing source and Git state before scaffolding or editing.
- Preserve unrelated existing work.
- If the VPS already contains a newer TournamentOS codebase, continue that codebase and use this package as requirements/assets; do not overwrite it with the legacy starter.
- If no viable application exists, scaffold a maintainable Next.js App Router + TypeScript application using the installed supported runtime and one authoritative lockfile.
- Use the old static starter only to understand earlier flows. Its layout quality is not the target.
- Implement one shared data/state layer. Do not hard-code conflicting copies of teams, matches, scores or statuses per page.
- Use deterministic synthetic demo data and provide a reset command.
- Every visible control must work, persist where promised, and expose loading/success/error states.
- No placeholder links, dead buttons, fake submit toasts or unexplained active-looking controls.
- Enforce permissions in server/data actions as well as in UI visibility.
- Date/time behavior uses `Europe/Amsterdam`.
- Public-facing text is coherent Dutch.
- Use local assets only in the final demo; no fragile remote hotlinks.
- Do not add gambling, odds, casino mechanics or betting visuals.
- Do not expose real personal data, credentials, private notes or youth identity data publicly.

## Design rules

- Public: premium Editorial sports journalism.
- Bracket: Tournament Arena clarity and cup prestige.
- Match Centre: refined Matchday broadcast depth, never a flat green slab.
- Clubs/community: authentic regional Football Network.
- Dashboards: precise HV Next grids and role-specific action hierarchy.
- Follow the shared 4/8/12-column grid and spacing tokens.
- Use relaxed, readable typography; no condensed display font for body/UI.
- All crests use one optically centered `ClubCrest` component and supplied fallback.
- Scores use one shared, tabular-numeral score component independent of team-name length.
- Mobile bracket is one round at a time, not a scaled desktop board.
- No page-level horizontal overflow at any supported width.

## Engineering and evidence

- Create `docs/requirements-traceability.md` before major implementation.
- Maintain `docs/decisions-and-blockers.md`.
- Add automated tests for tournament progression, result updates, roster versions, role boundaries and referee approval gating.
- Run canonical format/lint/typecheck/test/build commands.
- Perform browser QA at every required viewport and inspect console/network errors.
- Do not weaken tests to make them pass.
- End with `BUILD_REPORT.md` and `DEPLOYMENT_RUNBOOK.md` marked NOT EXECUTED.

## External action gate

No push, merge, pull request, tag, deployment, production migration, public message or production service restart is authorized. Stop and request exact approval when local DEV work is complete.
