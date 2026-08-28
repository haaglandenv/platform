# Asset Manifest

## Brand

| File | Purpose | Rule |
|---|---|---|
| `brand/haaglanden-voetbal-logo.jpg` | Supplied Haaglanden Voetbal logo, normalized to its detected JPEG format | Use without distortion; preserve whitespace and contrast |
| `brand/club-placeholder.svg` | Shared fallback for unavailable club crests | One reusable `ClubCrest` component; never invent a real crest |
| `brand/player-placeholder.svg` | Shared private player-photo fallback | Never associate with public DOB/identity data |

## Concept boards

| File | Direction to extract |
|---|---|
| `concepts/HV_TournamentOS_Concept_01_Matchday_8K.png` | Broadcast match hierarchy and live components |
| `concepts/HV_TournamentOS_Concept_02_Editorial_8K.png` | Public editorial hierarchy, typography and news rhythm |
| `concepts/HV_TournamentOS_Concept_03_Tournament_Arena_8K.png` | Bracket, cup prestige, Road to Final and Final Day |
| `concepts/HV_TournamentOS_Concept_04_Football_Network_8K.png` | Club discovery, region/community and mobile personality |
| `concepts/HV_TournamentOS_Concept_05_HV_Next_8K.png` | Personal and operational dashboard grids |
| `reference-ui/HV_Dashboard_Concept.png` | Earlier detailed dashboard composition reference |

The boards are design references, not page-background screenshots. Codex must implement real components, responsive behavior and consistent tokens. Do not crop UI text from a concept board into the product.

The originally supplied file is preserved unchanged as `references/originals/1000295389.png`; its byte content identifies as JPEG despite the original `.png` filename.

## Image implementation rules

- Keep originals in a reference directory.
- Generate optimized local derivatives for the app where needed.
- Use explicit dimensions/aspect ratios and responsive image sizing.
- Never hotlink temporary generated-image URLs.
- Provide a branded fallback for every crest, player, article, hero, gallery and sponsor slot.
- Do not use a club placeholder as if it were an official crest.
- Photographer/rights metadata is visible where applicable.
- Any additional demo photography must depict believable Dutch regional football and contain no fake official logos or unreadable brand text.
