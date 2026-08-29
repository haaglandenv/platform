# Local setup and demo guide

## Runtime

- Node.js: `>=24`
- Package manager: npm with authoritative `package-lock.json`
- Framework: Next.js App Router + TypeScript
- DEV state: `.data/state.json` (mode `0600`, Git-ignored)
- Timezone: `Europe/Amsterdam`

## Install and run

```bash
npm ci
npm run demo:reset
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Production-bundle review:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

The preview is intentionally loopback-only. No reverse proxy, DNS, firewall rule, service or production process is configured.

## Deterministic reset

```bash
npm run seed
# or
npm run demo:reset
```

Both commands restore the same golden baseline:

- Duindorp SV 1 roster v1 is incomplete;
- Niels Kramer has no reference/photo;
- no lineup or T-60 check exists;
- Quick–Duindorp SV is scheduled;
- Quick has not advanced;
- only baseline notifications/audit events exist.

## Demo roles

Open `/inloggen` or `/beheer` and use `Demo: wissel rol`.

| Role               | Entry route                | Scope                               |
| ------------------ | -------------------------- | ----------------------------------- |
| Supporter          | `/next`                    | Public + personal demo preferences  |
| Toernooileiding    | `/beheer/toernooileiding`  | Sir Winston Cup                     |
| Wedstrijdleiding   | `/beheer/wedstrijdleiding` | Wedstrijddag + Quick–Duindorp SV    |
| Verenigingsmanager | `/beheer/vereniging`       | Duindorp SV                         |
| Teammanager        | `/beheer/team`             | Duindorp SV 1                       |
| Scheidsrechter     | `/beheer/scheidsrechter`   | Quick–Duindorp SV                   |
| Pers / Redactie    | `/beheer/pers`             | Publiceerbare toernooi-informatie   |
| Fotograaf          | `/beheer/fotograaf`        | Eigen inzendingen voor de wedstrijd |

The selected role is stored in an HTTP-only, same-site demo cookie. Server API actions still verify the role. This is a review mechanism, not production identity/authentication.

## Golden journey

1. Teammanager → `Spelerslijst`: add the local preview and `HV-D1018`, save, then submit v2.
2. Toernooileiding → `Spelerscontrole`: review individual eligibility and bulk-approve the roster.
3. Teammanager → `Opstelling`: select 18 players, choose keeper/captain and lock the snapshot.
4. Scheidsrechter → demo clock `t60`: open both exact lineups, complete checks and record notes.
5. Toernooileiding → resolve the seeded 10/20 discrepancy with a structured reason code.
6. Scheidsrechter → approve both lineups; Wedstrijdleiding → start the match.
7. Scheidsrechter → record two home goals, one away goal, yellow/red events and a temporary interruption.
8. Toernooileiding → decide to resume; Scheidsrechter → submit the split public/private report and 2–1 result.
9. Teammanager confirms away; Wedstrijdleiding confirms home; Toernooileiding resolves any dispute and finalizes.
10. Verify the official score/winner in Match Centre and bracket, then inspect audit/security events.

Additional review paths:

- Teammanager requests a fixture change; Wedstrijdleiding records opponent approval; Toernooileiding gives final approval.
- Fotograaf submits rights metadata; Toernooileiding moderates; Pers sees only approved, permitted fields.
- Toernooileiding saves a new rules version and verifies the effective public rules page.

## Environment variables

No secret or external service is required. `.env.example` documents only optional local preview configuration. Do not put secrets in `NEXT_PUBLIC_*`.

## Data safety

All people and accounts are synthetic. Uploaded roster identity imagery is represented only as a private local preview in this demo; DEV file storage is explicitly not a production identity-storage design. Real production requires encrypted object storage, malware/MIME checks, metadata stripping, retention enforcement and an audited identity provider.
