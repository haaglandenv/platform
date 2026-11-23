# HV Control — compacte actielijsten v18

23 november 2026. De werkvoorraad toont compacte rijen met oog- en persoonicoon rechts. Toewijzen staat in een native pop-up met behandelaar, deadline, controle op bevoegde behandelaars en bescherming van niet-opgeslagen wijzigingen. Een toegewezen taak behoudt de bestaande demoherinnering via het venster.

Hetzelfde patroon is toegepast op de taak- en wedstrijdregels in Mijn overzicht, rollen/uitnodigingen, voorbereidingschecks, datakwaliteit/dagafsluiting en lokale retry/intrekacties. Hoofdacties en formuliersubmitknoppen behouden tekst.

## Uitgevoerde controle

- Via het persoonicoon een taak aan een andere bevoegde behandelaar toegewezen en de deadline gewijzigd. De rij toont daarna de opgeslagen naam en datum; heropenen behoudt beide waarden.
- Wijzigen en annuleren toont het venster voor niet-opgeslagen wijzigingen. Sluiten zonder opslaan behoudt de eerdere toewijzing.
- Via het oogicoon opent de juiste wedstrijdbriefing met behoud van de wedstrijdcontext.
- Vier geladen pagina’s gecontroleerd op 360, 390, 800 en 1280 px framebreedte: Werkvoorraad, Mijn overzicht, Gereed voor aftrap en Datakwaliteit. Alle 16 metingen zonder horizontale paginaoverloop of overlap tussen rijinhoud en acties; zichtbare icoonacties hebben labels, titels en ten minste 40 × 40 px aanraakvlak.
- Toewijsvenster op die vier schermbreedtes: geen horizontale overloop, alle velden binnen het venster. De viewportbreedte in het meetbestand is 15 px kleiner door de zichtbare scrollbar.
- JavaScript-syntax en gebouwde uitvoer gecontroleerd; HTML-ID’s uniek. De 11 bestaande integrale systeemcontroles en 4 workflowcontroles slagen (15/15). Geen nieuwe tests geschreven die alleen de opmaak herhalen.

Meetgegevens: [v18-row-audit.json](v18-row-audit.json). De voorbeelden zijn uitsluitend lokaal in de browser verwerkt. Publicatie wijzigt de bestaande Site-toegang niet. Dit is een gerichte UI-controle en geen nieuwe volledige audit van alle 53 routes.
