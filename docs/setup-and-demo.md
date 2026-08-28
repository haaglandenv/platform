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

| Role               | Entry route               | Scope                              |
| ------------------ | ------------------------- | ---------------------------------- |
| Supporter          | `/next`                   | Public + personal demo preferences |
| Toernooileiding    | `/beheer/toernooileiding` | Sir Winston Cup                    |
| Verenigingsmanager | `/beheer/vereniging`      | Duindorp SV                        |
| Teammanager        | `/beheer/team`            | Duindorp SV 1                      |
| Scheidsrechter     | `/beheer/scheidsrechter`  | Quick–Duindorp SV                  |

The selected role is stored in an HTTP-only, same-site demo cookie. Server API actions still verify the role. This is a review mechanism, not production identity/authentication.

## Golden journey

1. Teammanager → `Spelerslijst`: add local preview and `HV-D1018`, save, submit v2.
2. Toernooileiding → `Spelerscontrole`: approve the submitted roster.
3. Teammanager → `Opstelling`: select all 18 seeded players and lock.
4. Scheidsrechter → choose demo clock `t60`, open the T-60 snapshot and run the seeded check.
5. Toernooileiding → resolve the 10/20 discrepancy using the reason code.
6. Scheidsrechter → approve both lineups.
7. Toernooileiding → start the match.
8. Scheidsrechter → submit the 2–1 provisional report.
9. Teammanager → confirm the provisional result on the team dashboard.
10. Toernooileiding → make the result official.
11. Review Match Centre, bracket, HV Next and audit log.

## Environment variables

No secret or external service is required. `.env.example` documents only optional local preview configuration. Do not put secrets in `NEXT_PUBLIC_*`.

## Data safety

All people and accounts are synthetic. Uploaded roster identity imagery is represented only as a private local preview in this demo; DEV file storage is explicitly not a production identity-storage design. Real production requires encrypted object storage, malware/MIME checks, metadata stripping, retention enforcement and an audited identity provider.
