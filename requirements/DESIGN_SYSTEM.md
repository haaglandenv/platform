# Haaglanden Voetbal TournamentOS — Premium Design System

## 1. Product character

| Product area | Visual foundation | Primary quality |
|---|---|---|
| Public website | Editorial | Premium sports journalism |
| Bracket | Tournament Arena | Cup prestige and competitive clarity |
| Match Centre | Matchday | Refined broadcast immediacy |
| Clubs/community | Football Network | Regional authenticity |
| Dashboards | HV Next | Precise, efficient product UI |

Core principle: **This is where football in Haaglanden happens.**

The product is premium and authoritative while remaining believable regional Dutch football. It must not resemble a generic SaaS template, betting product, esports dashboard, tourism website or fantasy stadium experience.

## 2. Tokens

```css
:root {
  --hv-green-900: #003D1D;
  --hv-green-700: #005B2A;
  --hv-lime-400: #D9F000;
  --hv-yellow-400: #F4D000;
  --hv-off-white: #F7F8F6;
  --hv-graphite: #17201B;
  --hv-white: #FFFFFF;
  --hv-grey-50: #F2F4F1;
  --hv-grey-100: #E8ECE8;
  --hv-grey-200: #D7DDD8;
  --hv-grey-500: #68736C;
  --hv-grey-700: #3A443E;
  --hv-danger: #B52B36;
  --hv-warning: #A66A00;
  --hv-success: #08713B;
  --hv-info: #28638A;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  --radius-control: 10px;
  --radius-card: 12px;
  --radius-panel: 18px;
  --shadow-soft: 0 8px 30px rgba(23, 32, 27, .08);
  --shadow-raised: 0 18px 50px rgba(23, 32, 27, .13);
}
```

Rules:

- Warm off-white is the default page canvas.
- Graphite is default text.
- Deep green is used for premium contrast, navigation and broadcast panels.
- Lime is an energy accent, never a full-page background.
- Yellow is controlled tournament emphasis.
- Red is functional only.
- No unrelated rainbow palette.
- Dark public sections generally occupy no more than 20–30% of a screen.

## 3. Typography

Avoid condensed/narrow display fonts. Dutch club names and long labels must remain relaxed and readable.

Recommended checked-in variable fonts:

- UI/product: Plus Jakarta Sans Variable (or an equally open, readable grotesk already in the codebase)
- Editorial: Source Serif 4 Variable
- Scores/ranks: UI font with `font-variant-numeric: tabular-nums`

```css
--font-ui: "Plus Jakarta Sans", Inter, ui-sans-serif, system-ui, sans-serif;
--font-editorial: "Source Serif 4", Georgia, serif;
```

| Token | Desktop | Mobile | Weight | Line height |
|---|---:|---:|---:|---:|
| Display XL | 72 px | 42 px | 650 | 0.98–1.04 |
| Display L | 56 px | 36 px | 650 | 1.04 |
| H1 | 44 px | 32 px | 650 | 1.10 |
| H2 | 32 px | 26 px | 650 | 1.15 |
| H3 | 24 px | 21 px | 650 | 1.20 |
| H4 | 19 px | 18 px | 650 | 1.28 |
| Body L | 18 px | 17 px | 450 | 1.60 |
| Body | 16 px | 16 px | 450 | 1.55 |
| Body S | 14 px | 14 px | 500 | 1.45 |
| Label | 12 px | 12 px | 700 | 1.30 |

- No negative letter spacing below 24 px.
- Uppercase only for short labels/statuses; use about `0.06em`, maximum `0.10em`.
- Never horizontally scale text or crop a heading to make it fit.
- Scores, times and ranks use tabular numerals.
- Editorial serif is never used in buttons, scores, tables or dashboards.

## 4. Grid and geometry

Every page uses a deliberate grid.

| Viewport | Columns | Outer padding | Gutter |
|---|---:|---:|---:|
| 360–479 | 4 | 16 px | 12 px |
| 480–767 | 4 | 20 px | 16 px |
| 768–1023 | 8 | 28 px | 20 px |
| 1024–1279 | 12 | 32 px | 24 px |
| 1280–1599 | 12 | 48 px | 24 px |
| 1600–1920 | 12 | 64 px | 28 px |

- Maximum content width: 1480 px.
- Article measure: 680–760 px.
- Form measure: 720–880 px.
- Align headings, media, cards and dividers to shared column lines.
- Nested modules use an explicit subgrid.
- Every grid child uses `min-width: 0`.
- No page-level horizontal overflow.
- Public section rhythm: 64–96 px desktop and 40–64 px mobile.

## 5. Surfaces

- Standard radius: 12 px.
- Editorial/tournament panels: 16–20 px.
- Controls: 8–10 px.
- Pills only for statuses, filters and segmented controls.
- Prefer dividers/open editorial sections over card overload.
- Standard border: 1 px solid `--hv-grey-200`.
- Shadows are neutral and restrained.
- Avoid glassmorphism as a global style.

## 6. Logo, club crest and player photo

All club marks use one `ClubCrest` component and `assets/brand/club-placeholder.svg` as fallback.

- Fixed square frame with 8–12% safe area.
- `object-fit: contain`.
- Optically centered, never cropped, stretched or compressed.
- Use a neutral backing where a real crest lacks contrast.

| Context | Crest frame |
|---|---:|
| Compact row | 28–32 px |
| Match card | 40–48 px |
| Club card | 56–72 px |
| Match Centre | 72–96 px |
| Club hero | 96–128 px |

Use controlled geometry such as:

```css
grid-template-columns: 48px minmax(0, 1fr) auto;
align-items: center;
```

Long club names may wrap to two lines. Never shrink the crest to make text fit. Player photos use one consistent aspect ratio, neutral fallback and no public DOB association.

## 7. Photography

Authentic regional football means small-to-medium grounds, Dutch fencing, boards, clubhouses, trees, floodlights, artificial/natural turf, genuine action and plausible attendance.

Avoid posed stock imagery, giant arenas and unreadable generated signage. Store final demo images locally, declare aspect ratio, preserve focal crops and show unobtrusive credit where relevant.

## 8. Premium live module

The live module must never be a flat green slab. Required layers:

1. Match photograph or subtle action texture.
2. Controlled deep-green image overlay.
3. Fine motion-trail/highlight motif.
4. Separate tonal/translucent score rail.
5. Status, minute and official indicator.
6. Stable team/crest/score geometry.
7. One restrained primary action.

```css
grid-template-columns: minmax(0, 1fr) clamp(82px, 11vw, 148px) minmax(0, 1fr);
```

The score remains centered independently of unequal team names. Mobile may place each name beneath its crest while the score stays centered. Use full labels such as `LIVE · 78'`, `RUST`, `AFGELOPEN`, `AFGELAST`, `GESTAAKT · 71'` and `✓ OFFICIEEL`.

## 9. Bracket

Desktop:

- Stable round columns.
- Equal match-card geometry.
- Connectors align with vertical card centers.
- Fixed columns for crest/name/status/score.
- Full values available in match details.

Mobile:

- One round at a time.
- Swipe plus visible previous/next controls.
- Selected-round and progress state.
- Match details in a sheet or route.
- Never scale the desktop bracket.
- No document overflow.

The bracket is a data visualization and must have an accessible structured list/table equivalent.

## 10. Dashboard language

- HV Next uses a precise 12-column bento grid without rows of identical KPI cards.
- Highest-priority task spans more columns.
- Operational exceptions appear before analytics.
- Tables become structured row cards below tablet width when practical.
- Shared shell/tokens; distinct priorities per role.
- Demo role switcher is explicitly labeled `Demo: wissel rol`.
- Sidebar becomes app bar/drawer on mobile.
- Bottom navigation respects safe-area insets.

## 11. Tables and forms

Tables:

- Text left, dates consistent, numbers/scores right.
- Tabular numerals and fixed action column.
- Shared header/cell padding.
- Body text never below 14 px.
- Mobile uses labeled records instead of uncontrolled horizontal scrolling.

Forms:

- Minimum target 44 × 44 px.
- Input height 48 px.
- Labels outside fields.
- Help/validation reserves its own space.
- Errors explain the correction.
- Photo upload supports preview, replace and remove.
- DOB uses a real date control with Dutch presentation.
- Destructive actions require confirmation.

## 12. Buttons and states

- Primary: brand/deep green with white, or lime with deep-green text where contrast passes.
- One primary action per decision group.
- Secondary: outline or low-emphasis tonal.
- Every visible control has default, hover, focus-visible, active, disabled and applicable loading/success/error state.
- Decorative buttons are forbidden.

Statuses combine text, color and icon. Color alone never carries meaning.

| Status | Treatment |
|---|---|
| Concept | Neutral |
| Incompleet | Warning |
| Ingediend | Information |
| Controle nodig | Warning |
| Akkoord | Success |
| Afgekeurd | Danger |
| Officieel | Green + check |
| Voorlopig | Neutral outline |
| Live | Subtle pulse + text |
| Gestaakt | Warning/danger + minute |

## 13. Motion and accessibility

- Standard transitions: 160–220 ms; panels 240–320 ms.
- Respect `prefers-reduced-motion`.
- No perpetual decorative animation except a restrained live pulse.
- WCAG 2.2 AA contrast.
- Semantic heading order and landmarks.
- Full keyboard operation and visible focus.
- Accessible names for icon-only controls.
- Live score changes use a polite live region without moving focus.
- Meaningful imagery has useful alt text; decoration has empty alt text.

## 14. Responsive quality gate

Check 360, 390, 430, 768, 1024, 1440 and 1920 px. At every size:

- no page-level horizontal overflow;
- no clipped headings, scores, crests or controls;
- long Dutch labels wrap intentionally;
- touch targets remain at least 44 px;
- navigation, bracket and forms remain usable;
- bottom navigation never overlaps content;
- images keep meaningful crops;
- focus order follows visual layout.

A screen is complete only when data is consistent, every visible interaction works, all state families are represented, private/public data is separated and the result is credible for a high-value European sports product pitch.

