# Current DEV state

## What is included and verified

- Five original 8K concept boards (7680 × 5120) covering Matchday, Editorial, Tournament Arena, Football Network and HV Next.
- Original dashboard reference image.
- Supplied Haaglanden Voetbal logo.
- Original 300-feature Excel register with 20 MVP and 36 V1 MUST-features.
- Full original design brief and an earlier control-center reference brief.
- Original static HTML prototype ZIP and an extracted starter copy.
- A normalized premium design system, route scope, role workflows, seed state model and QA matrix.
- Reusable local SVG fallbacks for club crests and player photos.
- An autonomous Codex VPS build prompt and safe runbook.

## Source status

The later live Sites prototype had been published previously, but its generated checkout was no longer locally available while this package was assembled. The live preview may still be used as behavioral/visual context:

<https://haaglanden-tournamentos-prototype.famgoldenbelt.chatgpt.site>

The packaged static prototype is older and less premium. It is included because its routes and basic interactions are a useful functional reference. It is not the final architecture or quality target.

The Next.js application at revision `7b9d83723ff4aa3e9191dc319b09cbb4abb836bf` is the authoritative deployed prototype. The static starter remains historical reference material and must not overwrite it.

## Completed locally

- One shared, file-backed, deterministic domain state for public, personal and operational surfaces.
- Public Editorial/Tournament Arena/Match Centre/Football Network routes and HV Next.
- Eight scoped demo roles, including distinct match-operations, press and photographer experiences.
- Versioned rules, player lifecycle, immutable lineups, two-team T-60, live events, interruption decisions, result confirmations/disputes, discipline and bracket progression.
- Rights-aware media moderation, privacy projections, server-side authorization and security-event auditability.
- Twenty-one unit/permission tests and nine Chromium browser tests, including 77 route/viewport checks.
- Reference-aligned public homepage, local hero/social assets and updated traceability, decisions, QA evidence, build report and authorized deployment runbook.
- Production deployment through GitHub Actions run `33258823206`, with exact revision health readback and live mobile/desktop browser verification.

## Known production gaps

- Demo identity/role switching is not a production identity provider or MFA solution.
- Browser push delivery is simulated; no service worker or delivery provider is connected.
- Media upload persists safe metadata only; binary storage, malware checks and EXIF stripping remain production work.
- Native device, non-Chromium and screen-reader lab passes remain outstanding.

## Quality target

The output should look like a top-tier European sports product agency prototype and remain technically plausible for a real engineering team. Premium means controlled hierarchy, grid precision, authentic football context, coherent data and polished behavior—not just gradients, glass or rounded cards.
