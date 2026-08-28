# TournamentOS — Roles and Operational Workflows

## Shared truth

**A club prepares the data, the team submits the match selection, the referee verifies what appears at the ground, and tournament leadership publishes the official outcome.**

Every status change, task, notification and dashboard count must update throughout the deterministic demo. Production permission checks belong server-side; hiding controls is not authorization.

## Roles

| Role | Scope | Dashboard priority |
|---|---|---|
| Public supporter | Published information | Live matches, tournaments, news, clubs |
| Tournament leadership | Assigned competitions | Exceptions, approvals, fixtures, incidents |
| Association manager | Assigned club/association | Teams, managers, registrations, completeness |
| Team manager | Assigned teams | Roster, lineup and deadlines |
| Referee | Assigned matches | T-60 check, incidents and result |

The demo may offer `Demo: wissel rol`, but each role still receives a scoped server/demo session.

## State models

### Player roster

| State | Meaning |
|---|---|
| `CONCEPT` | Editable working version |
| `INCOMPLEET` | Required data missing |
| `INGEDIEND` | Submitted for review |
| `WIJZIGING_GEVRAAGD` | Correction required |
| `GOEDGEKEURD` | Registration accepted |
| `VERGRENDELD` | Match/tournament window locked |

### Match lineup

| State | Meaning |
|---|---|
| `NIET_GESTART` | No selection |
| `CONCEPT` | Manager is selecting |
| `INGEDIEND` | Selection submitted |
| `T60_CONTROLE` | Referee verification open |
| `AFWIJKING` | Unresolved discrepancy |
| `AKKOORD` | Referee approved lineup |
| `OFFICIEEL` | Part of official record |

### Match

| Internal state | Public label |
|---|---|
| Scheduled | `GEPLAND` |
| Pre-match | `VANDAAG · 20:00` |
| Live | `LIVE · 78'` |
| Half-time | `RUST` |
| Pending | `Wacht op bevestiging` |
| Confirmed | `✓ OFFICIEEL` |
| Postponed | `AFGELAST` |
| Stopped | `GESTAAKT · 71'` |

## Association setup

The association manager:

1. verifies club profile and venue;
2. registers tournament teams;
3. assigns team manager and backup contact;
4. monitors deadline and completeness;
5. receives late/returned-list notifications.

Club-level data includes name/crest, reference ID where applicable, venue, authorized delegates, tournament teams and privacy/contact preferences.

## First-match roster

The team manager records per player:

- full name;
- KNVB/reference number;
- date of birth;
- current portrait/photo;
- shirt number;
- position;
- captain/goalkeeper where relevant;
- eligibility/registration confirmation;
- dispensation and consent/privacy confirmation where applicable.

Prototype behavior:

- working upload/preview/replace/remove;
- synthetic data only;
- persistent draft in the DEV data layer;
- immediate field/list validation;
- exact missing-item feedback;
- add/edit/remove/reorder while in concept;
- duplicate identity and shirt-number warning;
- explicit submit confirmation;
- version, actor and timestamp after submission;
- no claim that front-end/DEV photo persistence equals secure production storage.

## Association oversight

The association manager can monitor all assigned teams, request a correction with reason, reassign a manager and see version/audit history. A submitted player identity is never silently rewritten by this role.

## Tournament review

Tournament leadership can approve/reject eligibility exceptions, bulk-approve valid players, lock the roster and record structured reason/supporting note. Sensitive data is visible only where operationally required.

## Match lineup

The team manager:

1. opens assigned fixture;
2. selects starters and substitutes from approved roster;
3. assigns goalkeeper and captain;
4. records allowed number changes;
5. resolves starter count, substitute maximum, duplicate number and eligibility validation;
6. submits lineup;
7. receives a timestamped immutable version.

After lock, changes require a logged exception.

## Referee T-60 verification

The assigned referee receives action access at kickoff minus 60 minutes in the authoritative match timezone.

Visible operational data:

- match, venue, field, kickoff, tournament and round;
- both submitted lineup versions;
- photo, name, shirt number and starter/substitute state;
- DOB only when the configured policy requires it;
- eligibility/status and match-specific rules summary.

Per player actions:

- `Akkoord`;
- `Niet aanwezig`;
- `Identiteit controleren`;
- `Gegevens wijken af`;
- concise private note.

Rules:

- referee cannot edit player identity/registration;
- flagged player remains unresolved;
- final approval is disabled until all required checks are resolved;
- full-team approval has an explicit review/confirmation step;
- referee, time and exact lineup version are recorded;
- internal notes never appear publicly;
- failure/offline/conflict can never display false approval.

Recommended progress copy:

- `11 van 11 basisspelers gecontroleerd`
- `5 van 7 wissels gecontroleerd`
- `1 afwijking vereist actie`

## Discrepancy flow

1. Referee flags player.
2. Lineup becomes `AFWIJKING`.
3. Team manager and leadership receive notification.
4. Leadership chooses remove, corrected after verification, authorized exception, or escalation.
5. Decision requires actor, timestamp, reason and exact player/lineup version.
6. Public UI exposes no sensitive detail.

If resolution is unsafe before kickoff, show a controlled unresolved operational state instead of silently approving.

## Tournament leadership dashboard

Primary modules:

- urgent decisions;
- fixtures awaiting confirmation;
- roster exceptions;
- referee assignments;
- live/stopped matches;
- provisional results;
- discipline/protests;
- draw/bracket;
- announcements and audit activity.

Capabilities include tournament/round creation, teams, draw/seeding, fixtures, venue/field/referee, result confirmation, bracket advancement, postponement/stoppage, discipline case and targeted messages. Manual bracket override needs confirmation and reason.

## Association manager dashboard

Primary modules:

- registered teams;
- manager assignments;
- roster submission state;
- upcoming club fixtures;
- outstanding correction requests;
- venue/profile information;
- club notifications.

This role cannot approve its own tournament exception without separately granted tournament-leadership context and an explicit role switch.

## Team manager dashboard

Primary modules:

- next match;
- roster completion;
- lineup deadline;
- correction requests;
- recent messages;
- rules/documents.

The next required action outranks generic statistics.

## Referee dashboard

Primary modules:

- next assignment;
- T-60 countdown;
- verification progress;
- match rules;
- venue/field;
- match report tasks;
- recent assignments.

No referee may inspect arbitrary rosters outside assigned matches.

## Match reporting and official result

Authorized users can record goals, cards, substitutions, halftime/fulltime score, stoppage/postponement, public-safe note, internal incident note and MVP where enabled.

Result flow:

1. Referee submits provisional result.
2. Both teams may confirm or report a discrepancy where configured.
3. Tournament leadership reviews.
4. Result becomes official.
5. Bracket progresses.
6. Public Match Centre, club pages and dashboards update together.

For a stopped match, public copy is limited to:

> De wedstrijd is gestaakt. De toernooicommissie beoordeelt het verdere verloop.

## Privacy and youth data

Never public by default:

- date of birth;
- identity material;
- private player photos;
- internal notes;
- contact details;
- eligibility documents;
- referee discrepancy reasons;
- youth profile data without valid publication basis.

Public alternatives include team-level statistics, anonymous labels and `Geen openbaar spelersprofiel beschikbaar`.

## Audit trail

Consequential actions record actor, role, scope, action, previous/new state, timestamp, reason, related entity and version ID. The demo exposes an understandable audit timeline for at least one roster and one official result.

## Notifications

Support missing data, deadlines, correction requested, roster accepted, lineup deadline, T-60 open, discrepancy, referee approval, fixture moved, result pending/official, stopped/postponed match and announcement. Each notification deep-links to the relevant task. Read state and settings work.

## Required seed journey

1. Association registers Duindorp SV 1.
2. Roster v1 is incomplete.
3. Manager fixes it and submits v2.
4. Leadership approves roster.
5. Manager selects Quick–Duindorp SV lineup.
6. Referee opens T-60.
7. One number discrepancy is flagged.
8. Leadership resolves it.
9. Referee approves both teams.
10. Match becomes live.
11. Referee submits Quick 2–1 Duindorp SV.
12. Leadership makes result official.
13. Quick advances.
14. All dependent public/role screens agree.

## State-family requirement

Every major flow includes loading, empty, validation error, permission denied, save failure, success, locked/read-only and stale/offline indication. Examples:

- `Nog geen spelers toegevoegd`
- `Je mist nog 2 verplichte gegevens`
- `De spelerslijst is ingediend`
- `Controle opent om 19:00`
- `Je hebt geen toegang tot deze wedstrijd`
- `Opslaan is niet gelukt. Probeer het opnieuw.`

