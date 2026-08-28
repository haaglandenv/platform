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

Implementation evidence:

- `GET /api/state?surface=public` uses `publicProjection` and serializes no players, rosters, DOBs or reference IDs.
- Operations responses are projected by the HTTP-only role cookie and record scope.
- Action authorization is server-side in addition to route/control visibility.
- Public player fallback says `Geen openbaar spelersprofiel beschikbaar`.
