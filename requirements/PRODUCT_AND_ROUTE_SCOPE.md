# Premium Prototype — Product and Route Scope

The exact router may follow an existing codebase, but every capability below needs a stable deep-linkable route or an explicit in-product state.

## Public routes

| Route | Experience | Required working behavior |
|---|---|---|
| `/` | Editorial homepage | Lead story, live strip, matches, tournaments, news, media, clubs, search and real CTAs |
| `/nieuws` | News index | Category row, filter/search, pagination/load-more, empty/reset states |
| `/nieuws/[slug]` | Article | Metadata, credit, share/copy, embedded match card, related news |
| `/toernooien` | Tournament discovery | Current/archived filters, competition cards and progress |
| `/toernooien/sir-winston-cup` | Tournament home | Season/round header, tabs, latest state and partner row |
| `/toernooien/sir-winston-cup/programma` | Program/results | Date/round/status filtering and Match Centre links |
| `/toernooien/sir-winston-cup/bracket` | Tournament Arena | Fully data-driven bracket and accessible list equivalent |
| `/toernooien/sir-winston-cup/teams` | Teams | Team cards and club/team links |
| `/toernooien/sir-winston-cup/statistieken` | Statistics | Top scorers, leaderboard, team stats with privacy-aware fallbacks |
| `/toernooien/sir-winston-cup/nieuws` | Tournament news | Scoped article listing |
| `/toernooien/sir-winston-cup/reglement` | Regulations | Search, sticky sections, summaries, accordion and version/effective date |
| `/wedstrijden/quick-duindorp-sv` | Match Centre | Pre/live/post/postponed/stopped and official/provisional states |
| `/wedstrijden` | Match discovery | Date/tournament/status/nearby filters and venue context |
| `/clubs` | Club discovery | Search, regional filters, follow and next fixture |
| `/clubs/duindorp-sv` | Club detail | Profile, teams, fixtures/results, news, media and follow state |
| `/spelers/[slug]` | Public player profile | Only approved public information; youth/privacy fallback |
| `/media` | Media experience | Photo/video/match/club/photographer filters and editorial grid |
| `/media/[slug]` | Media detail | Image/video, caption, match, tags, credit and related media |
| `/historie` | Tournament archive | Season selector, winners, records and trophy timeline |
| `/finaledag` | Final Day hub | Live schedule, next final, champion state and trophy context |
| `/zoeken` | Search | Grouped club/team/match/news results with query state |
| `/account` | Public account | Favorites, notifications, privacy and PWA status |
| `/meldingen` | Notification center | Grouped timeline, read state and deep links |
| `/inloggen` | Login/demo entry | Simple public-safe entry and explicit demo role access |

Use breadcrumbs only where hierarchy benefits; keep mobile concise.

## Personal dashboard routes

| Route | Required behavior |
|---|---|
| `/next` | Personalized bento overview with next action/live priority |
| `/next/favorieten` | Follow/unfollow clubs and tournaments; persistence |
| `/next/meldingen` | Read state, filters, deep links and settings |
| `/next/instellingen` | Profile, privacy, notification and PWA preferences |

## Operations routes

The route names may live under `/beheer` or an existing authenticated namespace. Preserve explicit active role/scope.

| Route | Role | Required behavior |
|---|---|---|
| `/beheer` | All authenticated roles | Role-aware landing and explicit demo switcher |
| `/beheer/toernooileiding` | Tournament leadership | Urgent decisions and tournament command center |
| `/beheer/toernooileiding/toernooien` | Tournament leadership | Create/configure tournaments, rounds and rules |
| `/beheer/toernooileiding/wedstrijden` | Tournament leadership | Program, assignments, changes, postponement/stoppage |
| `/beheer/toernooileiding/bracket` | Tournament leadership | Draw/progression and logged override |
| `/beheer/toernooileiding/spelerscontrole` | Tournament leadership | Eligibility, bulk approval and exceptions |
| `/beheer/toernooileiding/uitslagen` | Tournament leadership | Provisional review and official confirmation |
| `/beheer/toernooileiding/tucht` | Tournament leadership | Cases, dossiers, decisions and public-safe summary |
| `/beheer/toernooileiding/audit` | Tournament leadership | Filterable consequential action history |
| `/beheer/vereniging` | Association manager | Club overview, deadlines and corrections |
| `/beheer/vereniging/teams` | Association manager | Team registration and manager assignment |
| `/beheer/vereniging/spelerslijsten` | Association manager | Submission/completeness/version oversight |
| `/beheer/vereniging/profiel` | Association manager | Club/venue/contact/privacy data |
| `/beheer/team` | Team manager | Next action, roster, lineup and messages |
| `/beheer/team/spelerslijst` | Team manager | Full roster editor and version lifecycle |
| `/beheer/team/wedstrijden/[id]/opstelling` | Team manager | Starters/substitutes/captain/keeper and submit/lock |
| `/beheer/scheidsrechter` | Referee | Assignments and T-60 countdown |
| `/beheer/scheidsrechter/wedstrijden/[id]/controle` | Referee | Player-by-player lineup verification |
| `/beheer/scheidsrechter/wedstrijden/[id]/rapport` | Referee | Events, stopped state and provisional result |
| `/beheer/berichten` | Scoped roles | Working inbox/thread/send with synthetic recipients |
| `/beheer/media` | Authorized roles | Upload, rights, match/club link and moderation |

Direct URL authorization must be tested. A role must never access another organization/team/match by changing an ID.

## Homepage hierarchy

Desktop public home:

1. Compact navigation and optional live score strip.
2. Editorial lead story with integrated match/tournament context.
3. Current match/tournament state.
4. News/editorial grid with deliberate asymmetry.
5. Tournament progress/bracket teaser.
6. Club/community module.
7. Media/photo-of-week or goal-of-round module.
8. Historical/partner/footer rhythm.

Mobile is redesigned, not scaled:

1. Compact app-like header.
2. Lead story or live match according to state.
3. Swipeable category/filter row.
4. Short match/result modules.
5. News hierarchy.
6. Bracket one-round preview.
7. Club/community/media modules.

## Required component set

- Global header, mobile drawer and footer
- Live score ticker
- Editorial hero and article cards
- Shared `ClubCrest`
- Shared `PlayerPhoto`
- Shared `MatchScore`
- Match card in pre/live/final/postponed/stopped variants
- Official/provisional status
- Tournament progress and Road to Final
- Bracket + match node + mobile round selector
- Match event timeline
- Match information and rules-summary panels
- Club discovery card and follow control
- Media grid/item/detail
- Notification item/settings
- Dashboard shell, task panel, data table/record card
- Roster editor/player row/photo upload
- Lineup selector and validation summary
- T-60 referee check row/progress/approval confirmation
- Audit timeline
- Loading/empty/error/permission/offline states
- Dialog, sheet, toast and confirmation patterns

## Public module details

- Photo of the Week: large photo, `FOTO VAN DE WEEK`, photographer, match and working vote.
- Goal of the Round: video thumbnail, play, player, club, minute and vote.
- Man of the Match: portrait, player, club, match, stats and vote status.
- Player statistics: matches/goals/assists/MVP and tournament timeline; privacy fallback where needed.
- Road to Final: horizontal desktop, vertical mobile.
- Team form: text labels in addition to color.
- Head-to-head: wins/draws/latest meeting.
- Share/Open Graph preview: score, crests, competition, status and brand.
- Sponsor integrations are restrained, clearly labeled and never banner-like.

## Content rules

- Natural, short Dutch UI labels.
- No lorem ipsum or broken generated copy.
- Realistic Haaglanden club/tournament names.
- Match scores and timelines must reconcile.
- Photography credit is visible but unobtrusive.
- Official data uses `OFFICIEEL` or subtle source badge.
- No odds, betting lines or cash prediction mechanics.

