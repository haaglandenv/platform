# Visible control inventory

| Family                   | Implemented outcome                                                                     | Persistence / feedback                   |
| ------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Global/public links      | Stable deep links, active states, direct refresh and branded not-found                  | Router/history                           |
| Mobile drawer/navigation | Open/close, reachable links and safe-area bottom navigation                             | Current route                            |
| News search/category     | Live filtering and designed empty state                                                 | Page state                               |
| Match/tournament filters | Status/date selection and filtered records                                              | Page state                               |
| Bracket controls         | Previous/next mobile round and match deep links                                         | Page state + canonical match state       |
| Follow/vote              | Toggle favorites; idempotent vote                                                       | DEV server state + toast                 |
| Share/copy               | Native share where available, clipboard fallback                                        | Explicit status feedback                 |
| Notifications            | Filter and mark read                                                                    | DEV server state + toast                 |
| Preferences              | Match/news/club toggles                                                                 | DEV server state + toast                 |
| Community media          | File metadata, consent validation and moderation queue                                  | DEV server state + error/success         |
| Demo role                | HTTP-only role switch and direct-route authorization                                    | Cookie + permission screen               |
| Roster                   | Add/edit/remove, photo preview, reference/consent/dispensation, submit/version/review   | DEV state + dirty guard/validation/audit |
| Lineup                   | Configured squad, starter, keeper and captain limits with immutable snapshot            | DEV server state + confirmation/audit    |
| T-60                     | Both exact lineups, four player states, notes, discrepancy and approval gate            | DEV server state + audit                 |
| Match operations         | Fixture change with two approvals; live start, incident snapshot, stop/resume/decision  | DEV server state + audit/notification    |
| Match events             | Goal, yellow, red, substitution, half-time, resume and explicit correction              | Canonical event/score state + audit      |
| Match report/result      | Split public/private report, referee/home/away confirmation, dispute and finalization   | DEV server state + audit/bracket update  |
| Discipline               | Incident-to-case creation, sanction decision and suspension eligibility gate            | DEV server state + audit                 |
| Club profile/exclusion   | Venue/privacy save and reasoned participation toggle                                    | DEV server state + audit                 |
| Messages                 | Scoped synthetic thread and validated send                                              | DEV server state + audit                 |
| Rules/governance         | Full format/age/time/substitution/official rules, immutable versions, finalization/lock | DEV server state + confirmation/audit    |
| Press center             | Publication-right-gated names, numbers, lineup and approved media                       | Server projection + permission tests     |
| Photographer portal      | File metadata, match, credit, three independent rights and private moderation inbox     | DEV server state + validation/audit      |
| Privacy/security         | Field map, denied-action security events and safe scoped audit presentation             | Server projection + security-event log   |
| Push demo                | Explicit simulated permission state and preference feedback                             | DEV server state + toast                 |
| Reset                    | Destructive confirmation followed by deterministic reset                                | Golden baseline + toast                  |

Repository checks contain no `href="#"`. Disabled controls expose a rule/time/state explanation in adjacent copy or their accessible title.
