# Haaglanden Voetbal TournamentOS — HTML/CSS Prototype

Interactief, responsive prototype voor desktop, mobiel en PWA-concept. Geen build-stap nodig.

## Starten
Open `index.html` direct in een browser, of start lokaal een simpele webserver:

```bash
python -m http.server 8080
```

Open daarna `http://localhost:8080`.

## Belangrijkste pagina’s
- `index.html` — Toernooi-/wedstrijdleiding dashboard
- `tournaments.html` — Toernooien + Rules Engine / live loting
- `matches.html` — Programma, wijzigingen en afgelastingen
- `match-center.html` — Live wedstrijdcentrum + staken/annuleren flow
- `clubs.html` — Verenigingen / teams
- `team-manager.html` — Club administrator / teammanager dashboard
- `players.html` — Spelersgoedkeuring / eligibility
- `referees.html` — Scheidsrechterbeheer
- `discipline.html` — Tuchtzaken / protesten
- `messages.html` — Directe berichten
- `media.html` — Media / pers / rechten / content assistent
- `public.html` — Publieke ESPN-achtige toernooihub

## Prototype-interacties
Diverse knoppen openen modals, tonen bevestigingen, verwerken voorbeeldgoedkeuringen en demonstreren filters. Alle data is fictief en client-side.

## Stijl
Lichte enterprise sport-UI: Haaglanden-groen + lime, veel witruimte, compacte gegevenskaarten, duidelijke statussen, responsive grids en mobile bottom navigation.
