# Photography and Asset Plan

## Supplied assets

The package already contains:

- five 8K multi-device concept boards;
- one dashboard concept image;
- the supplied Haaglanden Voetbal logo;
- club/player SVG fallbacks;
- two reference dashboard images inside the legacy starter.

The concept boards are visual direction only. Do not use them as hero/gallery images inside the app.

## Required local content slots

Codex should first inventory any newer approved local photography in the existing VPS repository. If none exists, create or request legally usable local derivatives for these slots before release:

| Asset ID | Ratio | Use | Visual brief |
|---|---:|---|---|
| `matchday-live` | 16:9 | Homepage + Match Centre live hero | Evening action at a believable Haaglanden ground, floodlights, modest stand, supporters at barrier, no readable sponsor text |
| `editorial-lead` | 4:3 | Homepage/article lead | Authentic celebration immediately after a goal, close editorial framing, Dutch regional football context |
| `community-night` | 3:2 | Club/community module | Families/supporters along touchline near clubhouse, warm early-evening light, real local atmosphere |
| `tournament-trophy` | 4:5 | Tournament/Final Day | Sophisticated silver cup with restrained green/yellow ribbons at a plausible regional final venue |
| `goalkeeper-save` | 3:2 | Media/gallery | Dynamic save on artificial turf with modest fencing and trees |
| `coach-touchline` | 3:2 | News/editorial | Coach giving instructions beside dugout, natural candid expression |

## Image-generation prompt contract

When generated imagery is permitted, use this common prefix:

> Ultra-photorealistic documentary sports photography at a real-looking Dutch regional amateur football ground in Haaglanden. Small-to-medium venue, modest stand, Dutch fencing, advertising boards with no legible brands, clubhouse, trees and floodlights where appropriate. Authentic players and supporters, plausible kits and crowd size, natural skin texture, decisive football moment, premium European sports journalism color grade. No giant stadium, no Champions League spectacle, no betting, no fake official logos, no text, no watermark, no distorted hands or duplicated people.

Append the specific slot brief and requested aspect ratio.

## Implementation

- Store final app assets locally under a dedicated media directory.
- Preserve rights/source/credit in an asset data file.
- Export responsive AVIF/WebP/JPEG variants where the framework supports them.
- Keep explicit width/height and focal point.
- Include alt text based on editorial purpose, not filename.
- Provide designed fallback for failure/empty state.
- Never expose player identity uploads as public editorial assets.
- Never depend on expiring generated-image URLs or external stock hotlinks.

## Quality check

Reject images with unreadable pseudo-text, deformed anatomy, duplicated balls/players, implausible venue scale, clipped action focal point or kits/logos that could be mistaken for official club identity.

