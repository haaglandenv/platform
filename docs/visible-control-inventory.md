# Visible control inventory

| Family                   | Implemented outcome                                                                       | Persistence / feedback                  |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| Global/public links      | Stable deep links, active states, direct refresh and branded not-found                    | Router/history                          |
| Mobile drawer/navigation | Open/close, reachable links and safe-area bottom navigation                               | Current route                           |
| News search/category     | Live filtering and designed empty state                                                   | Page state                              |
| Match/tournament filters | Status/date selection and filtered records                                                | Page state                              |
| Bracket controls         | Previous/next mobile round and match deep links                                           | Page state + canonical match state      |
| Follow/vote              | Toggle favorites; idempotent vote                                                         | DEV server state + toast                |
| Share/copy               | Native share where available, clipboard fallback                                          | Explicit status feedback                |
| Notifications            | Filter and mark read                                                                      | DEV server state + toast                |
| Preferences              | Match/news/club toggles                                                                   | DEV server state + toast                |
| Community media          | File metadata, consent validation and moderation queue                                    | DEV server state + error/success        |
| Demo role                | HTTP-only role switch and direct-route authorization                                      | Cookie + permission screen              |
| Roster                   | Local preview, missing reference fix, versioned submit                                    | DEV server state + validation/audit     |
| Lineup                   | 18-player selection, scope/limit validation and immutable lock                            | DEV server state + confirmation/audit   |
| T-60                     | Clock gate, exact snapshot, per-player states, seeded discrepancy and final approval gate | DEV server state + audit                |
| Match operations         | Live start, postpone, stop and resume with safe public state                              | DEV server state + audit/notification   |
| Match report/result      | Persist report, provisional 2–1 and leadership confirmation                               | DEV server state + audit/bracket update |
| Club profile/exclusion   | Venue/privacy save and reasoned participation toggle                                      | DEV server state + audit                |
| Messages                 | Scoped synthetic thread and validated send                                                | DEV server state + audit                |
| Rules/governance         | Searchable public rules, versioned operations draft, finalization and season lock         | DEV server state + confirmation         |
| Reset                    | Destructive confirmation followed by deterministic reset                                  | Golden baseline + toast                 |

Repository checks contain no `href="#"`. Disabled controls expose a rule/time/state explanation in adjacent copy or their accessible title.
