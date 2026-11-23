# HV Control v15 — sportieve werking en contracten

Deze notitie beschrijft de uitgewerkte sportieve processen van het prototype. De hoofdreferentie voor de volledige gewenste werking blijft `HV-Control-Functioneel-Ontwerp.md`. Alle demo-invoer is synthetisch; de latere VPS-laag moet dezelfde commando's en versies op de server afdwingen.

## Eén wedstrijdmoment, meerdere waarnemingen

- `HVMatchCenter.addEvent(input, actor)` ondersteunt `commandId` / `requestId`. Een herhaling van hetzelfde commando retourneert het bestaande resultaat en maakt geen tweede gebeurtenis.
- Een overeenkomstige wedstrijd, zijde, gebeurtenistype, speler, inkomende speler, minuut (maximaal één minuut afwijking binnen dezelfde speelhelft) en toegevoegde tijd levert een mogelijk dubbel moment op. De registratie wordt geblokkeerd met `duplicate:true`, `existingEventId` en `existingEvent`.
- `linkObservation(matchId,eventId,input,actor)` bewaart de aanvullende waarneming bij de bestaande gebeurtenis. De score telt eenmaal. Een scheidsrechterswaarneming bevestigt de bestaande voorlopige registratie; de gecontroleerde minuut van de scheidsrechter wordt leidend. De oorspronkelijke invoer en beide waarnemingen blijven bewaard.
- Alleen de scheidsrechter kan met `allowSeparate:true` en een expliciete `separateReason` vastleggen dat twee identiek beschreven momenten werkelijk twee verschillende gebeurtenissen zijn.
- Teamleiding blijft beperkt tot het eigen spelende team. De scheidsrechter stelt de definitieve uitslag vast. Er is geen verplicht teamakkoord vóór publicatie.

## Werkelijke veldbezetting

De controles onderscheiden geselecteerd, fysiek gecontroleerd en feitelijk inzetbaar:

- `HVRegistrations.presence(matchId,side)` geeft onder meer `presentStarters`, `selectedStarters`, `minimumPlayers`, `presentKeeper`, `absentIds` en een eventueel gemotiveerd bezettingsbesluit.
- Afwezig is een afgeronde identiteitscontrole, maar geen bewijs dat er genoeg aanwezige basisspelers of een aanwezige keeper zijn.
- `approveShortHanded(matchId,side,reason)` laat een gemotiveerde afwijkende bezetting vastleggen. Het minimum en de aanwezige keeper kunnen daarmee niet worden overgeslagen.
- `replaceAbsentStarter(matchId,side,absentId,reserveId,reason)` wisselt vóór de aftrap een afwezige basisspeler om met een als aanwezig gecontroleerde reserve. Keeper-/aanvoerdersmarkering wordt zo nodig overgedragen. De opgave krijgt een nieuwe versie, behoudt de uitgevoerde controles en moet opnieuw goedgekeurd worden.
- `admitLatePlayer(matchId,side,playerId,minute,reason,identityConfirmed)` vereist een bevestigde aanstelling, een lopende wedstrijd, een afwezige speler uit de bevroren opgave, een reden en bevestigde naam-/foto-/geboortedatumcontrole. De speler komt op de bank. Een latere invalbeurt wordt als gewone wissel vastgelegd. Een toelating kan geen schorsing of rode kaart opheffen.
- Ingediende correctieverzoeken wijzigen de centrale persoon nog niet. Pas bij goedkeuring wordt de persoonsstam bijgewerkt, worden dezelfde persoonsgegevens in relevante lijsten geversioneerd en blijven bevroren wedstrijdmomentopnamen intact.

## Spelerstatus en chronologie

De effectieve toestand per speler is `field`, `bench`, `substituted`, `sent-off` of `absent`. Een rode of tweede gele kaart sluit terugkeer definitief uit. Wissels en doelpunten worden chronologisch herberekend. Een ingevoegde oudere gebeurtenis die een reeds vastgelegde latere gebeurtenis ongeldig maakt, wordt geblokkeerd. Ook het afwijzen van een eerdere wissel wordt geblokkeerd wanneer daardoor een latere doelpuntenmaker niet meer op het veld zou hebben gestaan.

`playerStates(matchId,side?,minute=Infinity,options)` retourneert spelerobjecten met `state`, `onField`, `started`, `appeared`, `sentOff`, `available`, `minutes` en `intervals`. `playerStates(matchId,numericMinute)` levert beide teams op dat moment. Dit wordt onder andere gebruikt voor een stakingsmomentopname.

`playerIntervals(matchId,side,{confirmedOnly,duration,fixtureContext,events,rules})` retourneert dezelfde spelers met hun daadwerkelijke veldintervallen `{from,to}` en totale minuten. Er is geen afleiding van basisplaatsen uit rugnummers. Toegestaan doorwisselen kan meerdere intervallen opleveren. Een afwezige speler krijgt geen speelminuten; een laat toegelaten speler krijgt pas minuten vanaf een werkelijke wissel.

Tijden in intervallen zijn werkelijk verstreken speelminuten. Eerste-helfttijd `45+2` komt vóór minuut 46 van de tweede helft. De tweede helft krijgt daarbij de al gespeelde toegevoegde tijd als offset. Zonder expliciete `duration` worden reglement, gespeelde verlenging en bekende toegevoegde tijd gebruikt; een expliciete duur betekent de daadwerkelijke totale speelduur.

## Wedstrijdklok

`clock(matchId,fixtureContext?)` projecteert de fase, `phaseLabel`, `running`, `elapsedSeconds`, `minute`, `addedMinutes`, `minuteDisplay`, `completedPhases` en geschiedenis. De footballklok gebruikt een verstreken-tijdanker; administratieve tijdstempels volgen de centrale demoklok.

Fases:

1. `not-started` — vóór de aftrap.
2. `first` — eerste helft.
3. `half-time` — rust.
4. `second` — tweede helft.
5. `full-time` — reguliere speeltijd beëindigd.
6. `extra-first`, `extra-break`, `extra-second` — alleen als het reglement verlenging voorschrijft.
7. `shootout` — alleen als de beslisprocedure dit toestaat.
8. `finished` — speelklok afgesloten.

`clockCommand(matchId,action,input)` ondersteunt:

- `pause`: speelklok stilzetten.
- `resume`: gepauzeerde speelklok hervatten.
- `correct`: verstreken seconden in de huidige speelhelft corrigeren, met reden.
- `phase`: de volgende toegestane fase openen.

De scheidsrechter bestuurt deze handelingen vanuit een afzonderlijk scherm. Een fasewisseling verandert de score niet. Toegevoegde tijd wordt als bijvoorbeeld `45+2` of `90+4` getoond. De klokgeschiedenis blijft bewaard. Een hervatbesluit start vanuit de opgeslagen minuut en stand; overspelen archiveert de vorige wedstrijdgebeurtenissen en reset klok en strafschoppenserie.

## Strafschoppenserie

De serie heeft een afzonderlijk scherm en gegevensverzameling. Zij maakt geen gewone doelpunten, doelpuntenmakers of topscorertreffers aan.

- `shootout(matchId)` geeft trappen, score, aantal genomen trappen, volgende zijde, gerechtigde nemers en de beslissende winnaar.
- De eerste nemende zijde kan gekozen worden. Daarna wisselen de teams elkaar af.
- `setShootoutEligible(matchId,homeIds,awayIds,reason)` legt vóór de eerste trap twee even grote lijsten aanwezige, niet uitgesloten veldspelers vast. Bij een ongelijke veldbezetting is deze vaststelling nodig.
- `addShootoutKick(matchId,{side,playerId,scored})` bewaart iedere trap. Een speler neemt pas opnieuw wanneer alle gerechtigde teamgenoten in die cyclus zijn geweest.
- Een serie kan voortijdig beslist zijn; bij gelijke stand na vijf trappen per team volgt een beslissing na een compleet paar.
- `undoShootoutKick(matchId,reason)` trekt de laatste actieve trap met reden in. Het originele record en de correctiegeschiedenis blijven bestaan.
- Bij afronden gebruikt de uitslag de geregistreerde beslissende strafschoppenscore. Een onbesliste geregistreerde serie blokkeert afronden.

## Volledigheid van statistieken

De scheidsrechter kan bij afronden expliciet bevestigen dat het volledige verloop gecontroleerd is. Zonder die bevestiging wordt `eventsComplete:false` / `dataCompleteness:'score-only'` bewaard. Met bevestiging worden alle voorlopige gebeurtenissen eerst beoordeeld en moeten de doelpuntenregistraties en bekende doelpuntenmakers bij de eindstand passen. De eindstand kan ook zonder volledig detailverloop worden gepubliceerd, met een zichtbare volledigheidsaanduiding.

Het definitieve resultaat bevat `playingMinutes`, `extraTimePlayed` en de aparte strafschoppenscore. De statistiekenmodule kan daardoor onderscheiden tussen een officiële eindstand en volledig bekende individuele prestaties.

## UI en offline gedrag

De scheidsrechter begint bij zijn programma, opent een wedstrijd en kiest afzonderlijk aanstelling, spelerscontrole, wedstrijdklok, strafschoppenserie, gebeurtenissen of afronden. De bestaande Shell, paneelbreedtes, grids en bediening blijven leidend. Nieuwe formulieren gebruiken dezelfde invoer- en knopcomponenten en stapelen op mobiel.

Teamleiding ziet alleen eigen toegestane teams. Mogelijk dubbele invoer geeft een koppelactie. Als de synchronisatielaag een registratie lokaal in de wachtrij zet, zegt de interface expliciet dat deze nog niet verwerkt is. De wachtrij is vanuit het gebeurtenisscherm bereikbaar via Werkzekerheid.

## Gerichte controles

`tests/v15-sport.test.cjs` dekt dubbele waarnemingen en herhaalde commando's, gemotiveerd afzonderlijke momenten, rood/terugkeer, chronologische correcties, afwezige keeper en vervanging, minimale bezetting, laatkomers, doorwisselen, rugnummers, klokfases, toegevoegde tijd, strafschoppen en volledigheidsbevestiging. Bestaande registratie-, reglement- en integratiecontroles blijven behouden.
