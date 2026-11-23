# HV Control — operationele verdieping v15

Deze beschrijving hoort bij het interactieve prototype. Alle voorbeeldpersonen en berichten zijn fictief. Bezorging, leesstatus en ontvangstbevestiging worden lokaal per demo-account nagebootst. Er wordt geen externe mail of push verstuurd en er is geen Sportlink-koppeling.

## Arbitrage

De pagina Arbitrage gebruikt dezelfde shell, panelen, formulieren en tabbladen als de andere werkruimtes. De drie onderdelen zijn Aanstelling, Beschikbaarheid en Officials beheren.

- De HV-pool bevat tien voorbeeldofficials, waaronder twee vrije reserves. Naam, HV-bevoegdheden, algemeen beschikbaarheidsvenster en clubverbondenheid zijn te beheren. Nieuwe officials krijgen een blijvend eigen nummer.
- Beschikbaarheid is per official en datum vastgelegd. Een wijziging die een bevestigde aanstelling raakt levert een organisatorische opvolgingsmelding op.
- De controle toetst categorie, beschikbaarheidsvenster, andere aanstellingen, reistijd tussen locaties en vereiste neutraliteit volgens het wedstrijdreglement.
- Aanstellingen hebben een reactietermijn en doorlopen Reactie gevraagd, Bevestigd of Geweigerd. Een weigering vraagt een reden. De geschiedenis blijft bestaan wanneer een vervanger wordt aangewezen.
- Per wedstrijd kan een eigen reservelijst worden onderhouden.
- Een begonnen wedstrijd wordt overgenomen via Noodovername: andere gekwalificeerde official, wedstrijdminuut, reden en expliciete bevestiging dat spelerscontrole, stand en gebeurtenissen zijn overgedragen. De aanstelling behoort daarna aan de nieuwe official; de oorspronkelijke official behoudt geen bevoegdheid op grond van de oude aanstelling.

Belangrijkste commando's op `HVOperations`: `saveOfficial`, `officialAvailability`, `saveOfficialAvailability`, `availability`, `assign`, `confirmAssignment`, `declineAssignment`, `setReserve`, `reserves`, `emergencyReplace`, `canOfficiate`.

## Planning en afspraken tussen verenigingen

De bestaande dagtijdlijn blijft 13.00–23.00 uur gebruiken, met een rij per wedstrijd en één lege rij op een lege dag. De week- en maandweergave blijven beschikbaar.

Slepen en Verplaatsen openen een wijzigingsvoorstel. De bestaande afspraak blijft geldig zolang dit voorstel niet expliciet gepubliceerd is. De voorvertoning toont de oorspronkelijke en voorgestelde afspraak, betrokken teams en official, bekende conflicten en benodigde opvolging. Publicatie controleert opnieuw of de oorspronkelijke planning nog dezelfde versie heeft.

Instelbare afspraken: minimale rusttijd voor teams, standaard reistijd, specifieke reistijd tussen twee locaties en veldsluiting/verlichtingskeuze. Team- en veldoverlap blijven blokkerend. Een niet beschikbare official of gewijzigde finaleontvangst vraagt expliciete opvolging. Buiten de finaledag blijft de thuisvereniging de locatie.

Beide verenigingen kunnen een wijziging voorstellen. Een voorstel bevat maximaal drie gevalideerde speelopties. De andere vereniging kan akkoord geven of een tegenvoorstel indienen. Daarna beslist de toernooileiding. De huidige wedstrijdidentiteit blijft behouden. Publicatie levert een bericht op waarvoor betrokkenen de ontvangst actief kunnen bevestigen.

API: `planningSettings`, `savePlanningSettings`, `planningImpact`, `proposePlan`, `publishPlan`, `planProposals`, `proposeFixtureChange`, `approveChangeOpponent`, `counterChange`, `decideChange`.

## Finaledagregie

De onderdelen zijn Veldplanning, Kleedkamers, Ontvangst, Draaiboek en Uitloop. Iedere finale blijft dezelfde wedstrijd als in kalender, bracket en openbaar programma.

Per finale zijn geplande, verwachte en werkelijke aftrap/eindtijd gescheiden. Regiestatus: Gepland, Gereed, Bezig, Vertraagd of Afgerond. De ontvangst legt per team een tijdstip, aankomststatus, aantal aanwezigen, contactpersoon en korte ontvangstnotitie vast. Contactgegevens en interne notities zijn geen openbare kaartgegevens.

Een uitloopvoorstel berekent vervolgfinales op hetzelfde veld, benodigde wisseltijd, effecten op officialbeschikbaarheid, ontvangst/kamers, vrijwilligers en prijsuitreiking. Een kamer die door de verlengde bezetting overlapt krijgt waar mogelijk twee andere vrije kamers. Ontbreekt capaciteit, dan wordt publicatie geweigerd en moet de regisseur de indeling aanpassen. De regisseur ziet gevolgen voordat deze gepubliceerd worden.

Publicatie bewaart het oorspronkelijke programma, controleert de actuele planning en kamerindeling opnieuw en schrijft de wijzigingen als één lokale wijziging weg. De centrale kalender, finaleontvangst en prijsuitreiking volgen die gegevens. Gewijzigde afspraken vragen actieve ontvangstbevestiging. Een al overeengekomen vrijwilligersdienst schuift niet stilzwijgend buiten iemands beschikbaarheid; noodzakelijke extra dekking verschijnt als opvolgingsmelding.

API: `finalProgress`, `recordFinalProgress`, `checkInTeam`, `previewDelay`, `saveDelayPlan`, `delayPlans`, `publishDelay`. `operationsCeremony` bevat de gepubliceerde prijsuitreikingstijd.

## Vrijwilligers

De coördinator beheert personen en diensten: titel, locatie, begin/einde, capaciteit, verantwoordelijke en actieve status. Een dienst met bestaande deelnemers kan niet ongemerkt worden verwijderd of onderbezet gemaakt.

Vrijwilligers geven eigen beschikbaarheid op en kunnen zich op passende diensten inschrijven. Bij een volle dienst bestaat een wachtlijst. Dubbele inschrijving, overlap en inzet buiten de beschikbaarheid worden geweigerd. De status is Ingeschreven, Aanwezig, Niet verschenen of Afgerond. Vervanging vraagt een reden en wordt opnieuw aan de beschikbaarheid getoetst. Een eenmaal afgesproken dienst behoudt de overeengekomen tijd wanneer het finaleprogramma wijzigt.

Ontvangsttaken hebben een eigenaar, deadline, gereed-voor-ontvangstkenmerk en afrondingshistorie. Alleen de toegewezen vrijwilliger of de coördinator kan de taak afronden. De voortgang wordt uit de werkelijke taken afgeleid.

API: `saveVolunteer`, `saveShift`, `signupShift`, `leaveShift`, `setVolunteerPresence`, `replaceVolunteer`, `volunteerTasks`, `saveVolunteerTask`, `completeVolunteerTask`.

## Spelersbeschikbaarheid en berichten

Spelers beantwoorden iedere komende wedstrijd afzonderlijk. Eerdere antwoorden blijven bewaard. Het spelersportaal en de selectievoorbereiding gebruiken hetzelfde antwoord via `playerAvailability(playerId, matchId)`. De opslag is `playerAvailabilityByMatch[playerId][matchId]`; de oude opslag wordt alleen voor compatibiliteit bijgehouden.

Berichten zijn afgestemd op account, rol en betrokken club/team/wedstrijd. Lees- en ontvangststatus zijn per account opgeslagen. Mogelijke statussen: In wachtrij, Ontvangen in demo-inbox, Gelezen, Actief bevestigd. De knop Verwerk demobezorging maakt de lokale simulatie expliciet. Een ontvangstbevestiging kan niet namens een ander account worden afgegeven. Verplichte ontvangstacties blijven zichtbaar als gewone onderwerpvoorkeuren uitstaan.

De organisatie kan een herinnering klaarzetten of opvolging vragen met een reden. Besloten gesprekken zijn beperkt tot de betrokken accountcontext en toernooileiding. De spelersinbox gebruikt dezelfde voorkeuren als het spelersportaal; het wijzigen daarvan wist geen andere profielkeuzes.

API: `recipientContext`, `inboxFor`, `receipt`, `readState`, `markRead`, `confirmNotice`, `simulateDelivery`, `deliveryReport`, `sendReminder`, `escalateNotice`, `threadsFor`, `newThread`, `send`.

## Validatie en VPS-grens

`tests/v15-operations.test.cjs` gebruikt de echte gedeelde domeinen en controleert onder andere beschikbaarheid, clubneutraliteit, weigering/reserves, noodovername, concept/publicatie, verouderde voorstellen, veldsluiting, finaleontvangst, uitloop, kamerherverdeling, vrijwilligerscapaciteit/wachtlijst/vervanging, bewaarde wedstrijdantwoorden, accountgebonden ontvangst en rolgebonden besluiten. De bestaande berichten-UI-regressie gebruikt nu eveneens de echte domeinmodules.

De latere VPS-versie moet deze commando's met serverautorisatie, databasetransacties en berichtbezorging afdwingen. De huidige opslag blijft een interactieve lokale demonstratie. Kalenderabonnementen, externe koppelingen, Matchday Studio en scherm-/social-integraties zijn niet toegevoegd.

## Context uit een voorbereidingsactie

Een actie uit Mijn overzicht of Gereed voor aftrap bewaart `contextNavigateV15`. Arbitrage opent de exacte wedstrijd en bewaart die selectie; Clubleiding kiest de relevante vereniging en zet het bijbehorende wijzigingsverzoek bovenaan; de planner opent de juiste wedstrijddag en markeert het duel; het spelersportaal selecteert de juiste beschikbaarheidswedstrijd binnen de eigen teambevoegdheid; finaleregie opent de betreffende finale en de bijbehorende formulieren. De berichteninbox selecteert een eigen bericht voor het duel. Alleen de bedoelde pagina consumeert deze navigatiecontext.

Privéselecties volgen de echte actieve demo-accountcontext: de clubkeuze beperkt zich tot de eigen vereniging, spelerskeuzes tot de eigen speler en het eigen team, vrijwilligers tot de eigen identiteit. De coördinatieformulieren worden alleen voor de toernooileiding getoond. De publieke wedstrijdgegevens blijven beschikbaar zonder privégegevens.
