# V15 — edities, blijvende identiteit, archieven en loting

Status: geïmplementeerd in het lokale prototype. Geen koppeling met Sportlink of een andere externe sportadministratie. Een handmatig ingevoerde KNVB-relatiecode is een administratief attribuut; HV Control kent zelf de blijvende HV-ID toe en voert de eigen goedkeuringsprocedure uit.

## Routes en bestanden

- `#seizoen`: bestaande tabbladen plus **Edities** en **Personen en teams**.
- `#toernooibeheer`: extra instelbare minimale aanwezige veldbezetting.
- `#historie`: volledig terugklikbaar editiedossier, revisies, wedstrijden, wedstrijdbeeld, reglement, artikelen en toegestane beelden.
- `#loting`: beheer van loting én een optioneel openbaar presentatiescherm; uitgeschakeld betekent geen openbare presentatie.
- Bestaande `#schema-*` toont alleen een link naar de lotingshow als die beker een vrijgegeven presentatie heeft.
- `#bekerkast`: verwijzing naar de door de publieke module verzorgde digitale bekerkast.

Scripts: `editions.js` na `fixtures.js`, vóór `registrations.js`; `draw-show.js` na domeinmodules en vóór paginafragmenten. Root verzorgt de build/route-integratie.

## Blijvende identiteit

`HVIdentity` biedt `people()`, `person(idOfRelatiecode)`, `canonicalPersonId(id)`, `memberships(personId)`, `resolvePerson(input, scope)`, `correctPerson(personId,input,reason)`, `transferPerson(personId,input)`, `mergePeople(sourceId,targetId,reason)`, `saveClub`, `saveTeam`, `retainPeople`.

- Dezelfde persoon houdt zijn HV-ID bij een ander team of een volgende editie.
- Persoon, vereniging, team, editie en bekerinschrijving zijn afzonderlijke relaties.
- Een nieuwe teamkoppeling is voorlopig totdat de beoordelende procedure `scope.approved:true` vastlegt.
- Een koppeling aan een bestaand persoon overschrijft geen centrale naam, foto of geboortedatum. Voorgestelde correcties blijven in de spelerslijst/verzoekprocedure.
- Alleen de toernooileiding kan via `correctPerson` een beoordeelde persoonscorrectie vaststellen. De ID blijft bestaan, de reden en voor/na worden bewaard. Oude bevroren wedstrijdopgaven veranderen niet.
- Een teamovergang sluit de gekozen eerdere relatie af met een ingangsdatum en reden en opent een nieuwe relatie. Andere gelijktijdige teamrelaties blijven behouden; `effectiveStatus` onderscheidt op de huidige datum actief, gepland, voorlopig en afgelopen. De bekerinschrijving en spelersgoedkeuring voor het nieuwe team blijven afzonderlijk nodig.
- Mogelijke dubbele personen kunnen gecontroleerd worden gekoppeld. Verschillende geboortedata en conflicterende vastgelegde onderlinge wedstrijden blokkeren samenvoegen. Een oude ID blijft een navolgbare alias.
- Verenigingen en teams kunnen worden toegevoegd. Een bestaand team behoudt zijn vereniging; voor een ander clubverband wordt een nieuw team geregistreerd.

## Zelfstandige edities

`HVEditions.activeId()/active()/list()/all()/get(id)/fixtures(id)/snapshot(id)/create(input)/activate(id)/update(id,input)/captureCup(cupId)/saveCurrent()`.

- De bestaande voorbeeldeditie heeft ID `HV-ED-2026-27`; de bestaande 75 wedstrijd-IDs blijven behouden.
- `list()` toont werkedities; `all()` voegt historische, alleen-lezen archiefedities toe voor publieke filters.
- Een nieuwe editie krijgt een eigen periode, finaledag, leeftijdspeildatum, demodag en tijdzone Europe/Amsterdam.
- De organisator kiest of bekers/categorieën, reglementen, deelnemers en spelerslijsten worden overgenomen.
- Overgenomen deelnemers zijn **te beoordelen**, spelerslijsten zijn **concept** en spelers/dispensaties zijn niet automatisch goedgekeurd.
- Uitslagen, wedstrijdgebeurtenissen, aanstellingen, gecontroleerde opgaven en tuchtbesluiten worden nooit als geldige besluiten in de nieuwe editie gekopieerd.
- De nieuwe editie heeft een eigen kalender en eigen beker-/wedstrijdidentiteiten. Bracketdatums worden ten opzichte van de eigen finaledag voorgesteld.
- Verenigingscontacten, tenues, blijvende persoonsidentiteit en toegestane persoonsprivacykeuzes zijn centrale stamgegevens.
- Bij wisselen wordt de volledige werkcontext van de huidige editie bewaard. Terugkeren herstelt de oorspronkelijke wedstrijden, lijsten, regels en dossiers. Ook een niet-actieve broneditie kan worden gebruikt voor een nieuwe voorbereiding.
- Een openstaande offline/synchronisatiewachtrij blokkeert het wisselen van werkeditie.
- De tijdservice is `HVClock`; het nieuwe model bevat geen vaste zomertijd-offset.

## Officieel archief met revisies

Afsluiten gebruikt dezelfde controlelijst als de bestaande workflow. Open wedstrijden, bezwaren, herzieningsverzoeken, stakingsdossiers en tuchtzaken blokkeren afsluiting.

Eén archiefidentiteit hoort bij één editie en één beker. Heropenen en opnieuw afsluiten verhoogt de revisie van datzelfde dossier. De eerste revisie blijft beschikbaar.

De openbare momentopname bevat de wedstrijddataset, reglementsversies, goedgekeurde openbare gebeurtenissen, afgeleide cijfers, gekoppelde gepubliceerde artikelen en toegestane beelden. Winnaar en finalist hebben blijvende team-IDs én historische weergavenamen. Huidig publicatiebeleid en ingetrokken beeldrechten worden opnieuw toegepast bij het openbare uitlezen.

De besloten volledige momentopname staat afzonderlijk onder `editionPrivateArchives`, inclusief lijsten en interne besluiten, en hoort bij de toekomstige serverautorisatie.

De drie historische voorbeeldarchieven bevatten ieder een onderling gekoppeld schema met zeven fictieve duels. Wedstrijdtellingen en doelpuntentotalen worden uit die duels berekend. Ontbrekende historische doelpuntenmakers of speelminuten worden niet verzonnen: de dekking is expliciet **alleen uitslag bekend**.

## Optionele lotingshow

`HVDraw.settings(cupId)/saveSettings(cupId,input)/records(cupId)/record(id)/candidates(cupId,round)/prepare(cupId,input)/publish(id,reason)/publicRecord(cupId)`.

1. Organisatie kiest beker en een nog niet begonnen ronde.
2. Alleen goedgekeurde/gekwalificeerde deelnemers mogen in de trekking.
3. Voorwaarden: verenigingen uit elkaar houden, optioneel pot A tegen pot B, bestaande bekeromvang en vrijlotingen.
4. Een herkenbare lotingssleutel maakt de concepttrekking reproduceerbaar. Deze demonstratie is geen extern gecertificeerde trekking.
5. Het concept toont alle koppelingen en vrijlotingen. Onmogelijke voorwaarden geven een concrete fout.
6. Publicatie vraagt een controle-/besluitreden en controleert opnieuw of deelnemers niet zijn gewijzigd.
7. Exact dezelfde slots worden in de echte centrale bracket gepubliceerd; wedstrijd-IDs en begonnen duels worden beschermd.
8. Een ingestelde bezwaarblokkade verhindert voortgang naar de volgende ronde.
9. De optionele openbare show toont de gepubliceerde trekking met vorige/volgende, starten/pauzeren, volledig overzicht en toetsenbordbediening. Reduced-motion wordt gerespecteerd.
10. Uitschakelen verbergt de show; de officiële indeling en lotingshistorie blijven behouden.

De bestaande vijf bekers hebben een demonstratiepresentatie op basis van hun werkelijke vastgestelde openingswedstrijden. Deze past geen begonnen beker opnieuw aan. De schakelaar staat standaard uit.

## Gegevenscontracten voor andere modules

- `HVFixtures.all()` levert `editionId`, `ruleSnapshot={rules,version,cupId,name}`, `scheduledPlayingMinutes`, `actualPlayingMinutes` en `playingMinutesRecorded`. Vastgelegde werkelijke speeltijd wordt niet door geplande duur overschreven.
- `HVCompetition.entrants(cupId, fixtureContext?)` kan één bestaande wedstrijdprojectie hergebruiken, om herhaald kalenderwerk bij statistieken te voorkomen.
- `rules.minimumPlayers` is instelbaar tussen 3 en 11 en niet hoger dan `starterCount`; standaard 7. De sportmodule controleert aanwezige keeper/bezetting.
- `HVCases.canReleaseRound(cupId,targetRoundKey)` wordt bij automatische doorstroom, handmatige vrijgave en herindeling toegepast. Deze functie moet zuiver blijven en geen wedstrijdprojectie opnieuw aanroepen.
- `HVWorkflow.archives()` levert `editionId`, `cupId`, `winnerTeamId`, `runnerUpTeamId`, `revision`, `revisions[]` en `snapshot`.
- `HVWorkflow.actor()` gebruikt `HVAccess.actor()` wanneer beschikbaar, zodat account, lidmaatschap en rol aan besluiten gekoppeld zijn.

## Controle

`tests/v15-editions.test.cjs` bevat 14 controles met de echte gedeelde domeinmodules: bestaande IDs, meerdere teamrelaties, teamovergang zonder historische mutatie, gecontroleerde identiteitssamenvoeging, conceptkopieën zonder goedkeuringen, kalenderisolatie/terugkeer, volledige eerlijke archieven, reproduceerbare loting/vrijlotingen, potvoorwaarden, revisies zonder dubbele dossiers, een niet-actieve broneditie, beoordeelde persoonscorrecties en bevoegdheidscontrole.

Verder zijn de bestaande competitie-, wedstrijdreglement-, import-, workflow- en volledige integratiecontroles opnieuw gecontroleerd. Root voert de definitieve gezamenlijke suite, browsercontrole en publicatie uit. Deze deelimplementatie heeft geen build, commit of deployment uitgevoerd.
