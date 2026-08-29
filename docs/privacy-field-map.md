# Privacy field-visibility map

| Field/data                        | Public               | HV Next                  | Toernooileiding       | Verenigingsmanager        | Teammanager                | Scheidsrechter                |
| --------------------------------- | -------------------- | ------------------------ | --------------------- | ------------------------- | -------------------------- | ----------------------------- |
| Club/team/match/tournament IDs    | Yes                  | Yes                      | Scoped tournament     | Scoped club               | Scoped team                | Assigned match                |
| Published score/events            | Yes                  | Yes                      | Yes                   | Yes                       | Yes                        | Assigned match                |
| Player display name/statistics    | Approved public only | Approved public only     | Operational need      | Own club                  | Own team                   | Locked lineup                 |
| Date of birth                     | Never                | Never                    | Eligibility need only | Own club oversight        | Own roster                 | Policy-required check only    |
| KNVB/reference number             | Never                | Never                    | Eligibility need only | Own club oversight        | Own roster                 | Assigned locked snapshot only |
| Private player photo              | Never                | Never                    | Eligibility need only | Own club oversight        | Own roster                 | Assigned locked snapshot only |
| Referee discrepancy/internal note | Never                | Never                    | Assigned competition  | Outcome notification only | Own-team notification only | Assigned match                |
| Club contact details              | Never                | Never                    | Purpose-based         | Own club                  | Own team contacts          | Assigned fixture contacts     |
| Audit/security events             | Never                | Personal read state only | Scoped audit          | Own club events           | Own team events            | Own assignment events         |

Additional operational roles:

| Field/data                     | Wedstrijdleiding                         | Pers / Redactie                                     | Fotograaf                              |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| Match, score and public events | Assigned tournament/match                | Published match scope                               | Assigned match                         |
| Player name/number/position    | Operational match need                   | Only when the corresponding publication right is on | Never through the photography endpoint |
| DOB/reference/private photo    | Never                                    | Never                                               | Never                                  |
| Lineup                         | Readiness status, no identity documents  | Only when publication right is on                   | Never                                  |
| Internal report/security data  | Assigned incident decisions, no raw IDs  | Never                                               | Never                                  |
| Media                          | Moderation metadata and rights decisions | Approved media only                                 | Own submission metadata until approved |

Implementation evidence:

- `GET /api/state?surface=public` uses `publicProjection` and serializes no players, rosters, DOBs or reference IDs.
- Operations responses are projected by the HTTP-only role cookie and record scope.
- Action authorization is server-side in addition to route/control visibility.
- Copied record IDs and cross-role actions are denied server-side and recorded in the security-event log.
- The press projection independently gates names, shirt numbers, lineups and approved media.
- Public player fallback says `Geen openbaar spelersprofiel beschikbaar`.
