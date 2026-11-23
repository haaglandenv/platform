# HV Control v18 — referentie

## Visueel vergelijken

De werkende webapp in `dist/` is de v18-referentie. Alle 37 bestanden zijn vergeleken met de verzonden release en zijn byte voor byte gelijk. Vergelijk de lokale herbouw met die uitvoer bij dezelfde browser, viewport, schaal, rol, editie, scrollpositie en gegevens. Wacht op de beelden, webfonts en de afloop van animaties.

| Referentiebeeld | Weergave |
| --- | --- |
| [v16-polish-preview.jpg](docs/v16-polish-preview.jpg) | Desktopreferentie voor publieke homepage en Shell. |
| [v17-wizard-preview.jpg](docs/v17-wizard-preview.jpg) | Bekerwizard, stap Reglement. |
| [v18-rows-mobile.jpg](docs/v18-rows-mobile.jpg) | Werkvoorraad op een 390 px mobiel scherm met actieicoontjes rechts. |
| [v15-dashboard-preview.png](docs/v15-dashboard-preview.png) | Eerder desktopvoorbeeld van de persoonlijke werkruimte. De oorspronkelijke bestandsnaam is behouden. |

De afbeeldingen hierboven komen uit de gedocumenteerde versiecontroles. De momentopnamen kunnen een andere demostand tonen. Voor elke afzonderlijke route of toestand kun je de actuele referentie openen via de meegeleverde `dist/`.

## Beelden en lettertypen

| Bestanden in `dist/assets/` | Gebruik |
| --- | --- |
| `hero.webp`, `action.webp`, `club.webp`, `crowd.webp`, `finale.webp`, `kleedkamer.webp`, `official.webp`, `velden.webp`, `vrouwen.webp` | Sfeerbeelden voor de homepage, de openbare pagina’s en de werkruimtes. |
| `demo-player-1.webp` t/m `demo-player-4.webp` | Fictieve spelersportretten in de demo. |
| `hv-logo.svg` | Vectorlogo van Haaglanden Voetbal. |
| `hv-app-192.png`, `hv-app-512.png` | Appiconen. |
| `finaledag-qr.png` | QR uit de brondistributie met het oorspronkelijke hosted adres. |
| `fonts.css` en `font/` | DM Sans, Barlow Condensed, Archivo Black, Playfair Display en IBM Plex Mono. De 7 WOFF2-bestanden en 5 licentieteksten zitten in dezelfde mapstructuur. |

## Schermen

Open elk scherm met de hash achter `http://127.0.0.1:4173/`. Sommige schermen tonen informatie op basis van de actieve demorol of vereisen een selectie. De detailroutes voor onder meer wedstrijden, artikelen, teams en spelers blijven werken via de meegeleverde router en voorbeeldgegevens.

| Route | Pagina | Bron in `pages/` |
| --- | --- | --- |
| `#home` | Home | `home.html` |
| `#programma` | Programma | `program.html` |
| `#schema` | Bekerschema | `bracket.html` |
| `#live` | Live wedstrijden | `live.html` |
| `#wedstrijd` | Wedstrijdcentrum | `match.html` |
| `#finaledag` | Finaledag | `fans.html` |
| `#regie` | Wedstrijdregie | `control.html` |
| `#toernooien` | Toernooien | `tournaments.html` |
| `#locaties` | Sportparken | `venues.html` |
| `#account` | Mijn account | `account.html` |
| `#pers` | Pers | `press.html` |
| `#werkvoorraad` | Werkvoorraad | `inbox.html` |
| `#seizoen` | Seizoensbeheer | `season.html` |
| `#toernooibeheer` | Toernooibeheer | `competition.html` |
| `#tenues` | Wedstrijdtenues | `kits.html` |
| `#reglement` | Reglementen | `regulations.html` |
| `#club` | Clubleiding | `club.html` |
| `#team` | Teamleiding | `team.html` |
| `#official` | Scheidsrechter | `official.html` |
| `#finaleregie` | Finaledagregie | `final.html` |
| `#arbitrage` | Arbitrageplanning | `arbitration.html` |
| `#berichten` | Berichten | `messages.html` |
| `#vrijwilligers` | Vrijwilligers | `volunteers.html` |
| `#spelersbeheer` | Spelersbeheer | `eligibility-desk.html` |
| `#nieuws` | Nieuws | `news.html` |
| `#artikel` | Nieuwsartikel | `article.html` |
| `#vereniging` | Vereniging | `club-profile.html` |
| `#elftal` | Team | `team-profile.html` |
| `#nieuwsbeheer` | Nieuwsbeheer | `newsroom.html` |
| `#planning` | Wedstrijdplanning | `planner.html` |
| `#teamlive` | Teammanager live | `team-live.html` |
| `#statistieken` | Statistieken | `statistics.html` |
| `#speler` | Spelersprofiel | `player-profile.html` |
| `#spelersportaal` | Spelersportaal | `player.html` |
| `#supporters` | Supporters | `supporter.html` |
| `#dossiers` | Wedstrijddossiers | `cases.html` |
| `#beheerlog` | Besluiten en afsluiting | `governance.html` |
| `#fotograaf` | Fotograaf en inzendingen | `photographer.html` |
| `#media` | Beeld uit Haaglanden | `media.html` |
| `#privacy` | Publicatie en privacy | `privacy.html` |
| `#zoeken` | Zoeken | `discovery.html` |
| `#volgen` | Jouw favorieten | `following.html` |
| `#historie` | Bekerhistorie | `history.html` |
| `#start` | Mijn overzicht | `dashboard.html` |
| `#gereed` | Gereed voor aftrap | `readiness.html` |
| `#briefing` | Wedstrijdbriefing | `briefing.html` |
| `#datakwaliteit` | Datakwaliteit | `quality.html` |
| `#werkzekerheid` | Werkzekerheid | `reliability.html` |
| `#handleiding` | Functionele werking | `manual.html` |
| `#road` | Road to Houtrust | `road.html` |
| `#bekerkast` | Digitale bekerkast | `trophies.html` |
| `#moment` | Moment van de wedstrijd | `moment.html` |
| `#loting` | Loting en onthulling | `draw.html` |

## Uitgevoerde pakketcontrole

De oorspronkelijke 27 regressietestbestanden zijn uitgevoerd met Node.js 24.22.3. Alle 251 scenario’s zijn geslaagd. Zie [overdracht-v18-testresultaten.json](docs/overdracht-v18-testresultaten.json). De lokale bron is in Chromium gecontroleerd op Home, Programma, Bekerschema, Finaledag, Werkvoorraad met toewijsvenster en Seizoensbeheer met aanmaakwizard. De oorspronkelijke functionele en visuele controles staan in [docs/README.md](docs/README.md).
