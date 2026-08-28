# Decisions and blockers

## Decisions

| ID    | Decision                                                                                                                                                               | Rationale                                                                                                                                                                                          | Date       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-001 | Build a new Next.js App Router + TypeScript application in the extracted persistent DEV directory.                                                                     | No newer application, lockfile, package manifest or commit exists in the repository; only the verified handoff and historical static starter are present.                                          | 2026-08-28 |
| D-002 | Use a file-backed DEV adapter behind server-only repository functions, with a deterministic JSON reset.                                                                | This gives the review demo refresh persistence without pretending DEV storage is production-grade identity storage. The adapter can later be replaced by a database without changing domain rules. | 2026-08-28 |
| D-003 | Treat `references/design-briefs/CONTROL_CENTER_REFERENCE_ORIGINAL.md` as unrelated source material and do not use its people, incidents or board notes in the product. | The file contains club-governance meeting notes rather than TournamentOS interface requirements, including sensitive contextual material. Explicit TournamentOS requirements take precedence.      | 2026-08-28 |
| D-004 | Use one canonical match/roster state and derive public, personal and role views through server-side field projection.                                                  | This prevents score/status drift and keeps private player fields out of public responses.                                                                                                          | 2026-08-28 |
| D-005 | Provide an explicit, labelled demo clock with deterministic presets.                                                                                                   | T-60, live and post-match workflows must remain repeatable regardless of wall-clock time; Amsterdam remains the authoritative timezone.                                                            | 2026-08-28 |
| D-006 | Implement a deep-linkable catch-all product renderer with a strict known-route registry.                                                                               | The prototype has many related review routes; shared shells and view families reduce duplicated state and still support direct refreshes and branded not-found states.                             | 2026-08-28 |

## Assumptions

- The extracted folder is the confirmed persistent DEV project directory supplied by the user.
- Demo users are synthetic local identities; role switching is an explicit review tool, not production authentication.
- Supplied club placeholders are labelled fallbacks and are not presented as official crests.
- Public profile routes expose only approved display names and football statistics; the roster identity fields remain operations-only.

## Blockers

No implementation blocker is currently known. Push, PR, deployment, production migration and public preview exposure remain intentionally unauthorized.
