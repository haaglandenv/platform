# START HERE — Haaglanden Voetbal TournamentOS

Dit is het complete overdrachtspakket voor Codex op de DEV VPS.

## Opdracht in één zin

Bouw op basis van dit pakket een volledig werkend, premium en perfect responsive Haaglanden Voetbal TournamentOS-demoproduct waarin de publieke Editorial-site, Tournament Arena-bracket, Matchday Match Centre, Football Network-community, HV Next-dashboard en vier operationele roldashboards één consistent systeem vormen.

## Startvolgorde

1. Pak het ZIP-bestand uit in een nieuwe, persistente DEV-map.
2. Laat Codex eerst `AGENTS.md` lezen.
3. Geef `CODEX_AUTONOMOUS_BUILD_PROMPT.md` als hoofdopdracht.
4. Laat Codex alle bestanden in `requirements/`, daarna `references/` en `assets/` inventariseren.
5. Gebruik `starter/haaglanden-tournamentos-prototype/` als functionele historische referentie, niet als visuele eindkwaliteit.
6. Laat Codex lokaal op de DEV VPS bouwen, testen en een reviewbare preview starten.
7. Laat niets pushen, deployen of naar productie schrijven totdat daar apart en expliciet opdracht voor wordt gegeven.

## Bronhiërarchie

Bij een conflict geldt:

1. De nieuwste expliciete gebruikersinstructie.
2. `CODEX_AUTONOMOUS_BUILD_PROMPT.md` en `AGENTS.md`.
3. MVP/V1-features in het Excelwerkboek.
4. De specificaties in `requirements/`.
5. De visuele richting uit `assets/concepts/`.
6. De oude HTML-demo in `starter/`.

Codex mag nooit stilzwijgend een vereiste overslaan. Conflicten en aannames komen in `docs/decisions-and-blockers.md`.

## Niet-onderhandelbaar

- Alles wat zichtbaar klikbaar is, werkt aantoonbaar.
- Alle belangrijke data is onderling consistent.
- Het prototype werkt van 360 tot 1920 px zonder horizontale pagina-overflow.
- Publieke en private gegevens zijn strikt gescheiden.
- Gebruik uitsluitend synthetische persoonsgegevens.
- De vijf 8K-conceptboards zijn richtinggevend; de uiteindelijke UI is één coherent product, geen collage.
- De publieke site gebruikt Editorial als basis.
- De bracket gebruikt Tournament Arena als basis.
- Het Match Centre gebruikt Matchday als basis.
- Clubs/community gebruiken Football Network als basis.
- Persoonlijke en operationele dashboards gebruiken HV Next als basis.
- Gebruik het aangeleverde Haaglanden Voetbal-logo en de vaste placeholders uit `assets/brand/`.
- Geen push, PR, merge, tag of deployment zonder afzonderlijke expliciete toestemming.

## Definitie van klaar

Codex is pas klaar wanneer:

- alle 20 MVP- en 36 V1-features uit de prioriteitenmatrix aantoonbaar zijn verwerkt of eerlijk als echte blocker zijn vastgelegd;
- de publieke kernroutes en alle vier operationele rolflows werken;
- de volledige seedjourney van spelerslijst tot officieel resultaat en bracketdoorgang werkt;
- lint, typecheck, tests en productiebuild slagen;
- de belangrijkste routes visueel en functioneel zijn gecontroleerd op 360, 390, 430, 768, 1024, 1440 en 1920 px;
- `BUILD_REPORT.md`, requirements-traceability en een niet-uitgevoerde deploymentrunbook zijn opgeleverd;
- het slotbericht expliciet vermeldt: **“Changes are local to the DEV workspace; nothing was pushed or deployed.”**

