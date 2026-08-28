# Demo Data and State Model

`demo-data/tournamentos-seed.json` is the canonical deterministic seed fixture. Codex may normalize it into the detected datastore, but IDs and relationships should remain stable for tests and documentation.

## Reset behavior

Provide one documented reset command, for example:

```bash
npm run demo:reset
```

Reset returns the golden journey to:

- Duindorp roster v1 = incomplete;
- Quick–Duindorp match = scheduled;
- no submitted lineup;
- T-60 check unavailable or not started according to demo clock;
- Quick has not advanced from quarterfinal 1;
- notifications/audit contain only baseline events.

The prototype may expose a clearly labelled `Demo resetten` action for reviewers, protected from accidental double activation.

## Demo clock

Real wall-clock dates make T-60 demos hard to repeat. Implement a demo clock abstraction:

- default scenario time is configurable and deterministic;
- reviewer can switch between pre-T60, T-60, live and post-match states;
- the UI clearly labels this as a demo control;
- domain logic still uses authoritative timezone `Europe/Amsterdam`;
- production path does not trust a client-set clock.

## Canonical state transitions

```text
ROSTER: CONCEPT → INCOMPLEET → CONCEPT → INGEDIEND → GOEDGEKEURD → VERGRENDELD
LINEUP: NIET_GESTART → CONCEPT → INGEDIEND → T60_CONTROLE → AFWIJKING → T60_CONTROLE → AKKOORD → OFFICIEEL
MATCH: SCHEDULED → PRE_MATCH → LIVE → HALF_TIME → LIVE → FINISHED_PROVISIONAL → OFFICIAL
BRACKET: AWAITING_RESULT → PROVISIONAL_RESULT → OFFICIAL_RESULT → WINNER_ADVANCED
```

No official state can be reached by skipping required approvals. Reopening/override creates a new immutable version and audit event.

## Shared consistency rules

- A score equals the sum of scoring events, with shootout score stored separately.
- Bracket progression reads only official result state.
- Fixture time, T-60 and notifications use the same zoned timestamp.
- Roster/lineup approval references an immutable version ID.
- Public entities never serialize private roster/DOB/photo-check fields.
- Counts and badges are derived, not separately hard-coded.

## Demo identities

The values in the seed are synthetic. Use role-entry buttons or local DEV credentials; never imply they are real people/accounts.

| Demo account | Role | Scope |
|---|---|---|
| `leiding@demo.tournamentos.local` | Tournament leadership | Sir Winston Cup |
| `vereniging@demo.tournamentos.local` | Association manager | Duindorp SV |
| `team@demo.tournamentos.local` | Team manager | Duindorp SV 1 |
| `scheids@demo.tournamentos.local` | Referee | Quick–Duindorp SV |
| `supporter@demo.tournamentos.local` | Supporter | Public + HV Next |

If passwords are used, generate DEV-only values at seed time, keep them outside Git and document how to retrieve/reset them without printing real secrets.

## Audit events

Each consequential event includes:

- stable event ID;
- entity and immutable version where applicable;
- actor ID/role/scope;
- action;
- before/after state;
- UTC timestamp plus localized display;
- structured reason code and note when required.

## Photo handling

The seed points to `assets/brand/player-placeholder.svg`. A demo upload must create a private DEV preview and support replace/remove. Do not place uploaded identity images in a public static folder in the production architecture.

