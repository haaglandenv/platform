# Wedstrijddossiers — functionele uitwerking v15

## Uitgangspunt en autoriteit

HV Control is een zelfstandig systeem. De scheidsrechter stelt het definitieve wedstrijdbeeld vast. Een teambezwaar of herzieningsverzoek verandert de officiële stand niet automatisch. Alleen een expliciet gemotiveerd besluit van de toernooileiding kan een uitslag corrigeren. Correcties die een al begonnen vervolgwedstrijd zouden aantasten blijven geblokkeerd.

Alle gebruikte personen, stukken en besluiten zijn fictieve prototypegegevens. Rolkeuzes demonstreren afgebakende werkprocessen. Serverautorisatie en gedeelde privébestanden worden bij de VPS-bouw toegevoegd.

## Schermen en rollen

De bestaande Shell en containerbreedte blijven behouden. Wedstrijddossiers heeft vijf consistente tabbladen: Bezwaren, Onderbrekingen, Tucht en schorsingen, Reglementair besluit en Procedure. Een dossier toont een vaste samenvatting met nummer, behandelaar, beslistermijn en ontvangstbevestiging. Reacties/bewijs en behandelafspraken zijn afzonderlijke uitklapbare onderdelen, zodat de hoofdweergave overzichtelijk blijft.

- Teamleiding bekijkt bezwaren bij de eigen wedstrijden, waaronder het bezwaar van de tegenpartij; alleen betrokken partijen kunnen reageren. Interne scheidsrechtersrapporten worden niet aan teams getoond.
- De scheidsrechter ziet de toegewezen wedstrijden en kan gevraagde toelichtingen geven. Het indienen namens een team is verborgen in deze rol.
- De toernooileiding behandelt dossiers, stelt termijnen vast, wijst een behandelaar aan, stelt vragen, legt besluiten vast en behandelt herzieningsverzoeken.
- De optionele `HVAccess`-laag controleert `cases.manage`, `cases.file`, `cases.respond` en `cases.referee` met beker-, team- en wedstrijdscope. De interface wisselt in deze demo expliciet van accountcontext bij een rol- of teamkeuze.

## Procedure per beker

Standaard demonstratie-instellingen:

| Instelling | Waarde |
| --- | --- |
| Bezwaar indienen | Binnen 48 uur na vaststelling; bij historische invoer zonder vaststellingstijd geldt het geplande wedstrijdeinde |
| Gevraagde reactie | 48 uur |
| Besluitvorming | 72 uur na ontvangst |
| Herzieningsverzoek | Binnen 48 uur na besluit |
| Herziening toegestaan | Aan |
| Volgende ronde laten wachten | Uit; optioneel per beker aan te zetten |
| Digitale bewijsstukken | Aan, maximaal 5 bestanden per reactie |
| Reglementaire doorgang telt als uitgezeten schorsingsduel | Uit; expliciete keuze per beker of sanctiebesluit |

De organisatie kan deze waarden wijzigen met motivering. Nieuwe dossiers bewaren de dan geldende procedure als momentopname. Lopende dossiers behouden hun oorspronkelijke procedure. Termijnen gebruiken de centrale HV-klok en tijdzone Europe/Amsterdam. Een gemotiveerde termijnuitzondering geldt uitsluitend voor het benoemde team en duel.

## Bezwaarschrift

1. Een betrokken team kiest een vastgestelde wedstrijd en onderwerp: uitslag, wedstrijdbeeld, speelgerechtigdheid of overig.
2. Het team geeft een concrete toelichting en kan bewijsstukken toevoegen.
3. Het systeem controleert de rol/scope, termijn en of hetzelfde team al een open bezwaar heeft.
4. Het dossier krijgt een vast intern ID, herkenbaar dossiernummer, ontvangstbevestiging, proceduremomentopname, oorspronkelijke uitslag en beslistermijn.
5. Het team en de toernooileiding zien het dossier. De geldende uitslag blijft staan.

De voorbeeldzaak HV-BZ-2027-0001 betreft HVV–DUNO. Er zijn fictieve reacties van DUNO en de scheidsrechter en een reeds beantwoorde vraag, zodat het gehele behandelbeeld zichtbaar is.

## Reacties, bewijs en hoor/wederhoor

Iedere betrokken partij kan aanvullingen toevoegen. De commissie kan een vraag richten aan het thuisteam, uitteam of de scheidsrechter en daarbij een reactietermijn geven. Alleen de geadresseerde partij of de commissie kan die vraag beantwoorden. Open vragen binnen hun reactietermijn blokkeren een eindbesluit. De commissie kan een vraag gemotiveerd sluiten, bijvoorbeeld na een elders ontvangen toelichting. Een verlopen vraag kan opnieuw worden gesteld met een nieuwe termijn.

Reacties en bewijs zijn append-only binnen het dossier. De nieuwste dossier-versie wordt gecontroleerd bij reacties en behandelafspraken. Een verouderd scherm krijgt een melding en overschrijft geen nieuwere reactie.

De demo ondersteunt lokale bestanden van het type JPG, PNG, WebP, PDF en tekst, maximaal 256 kB per bestand. Bestandsnaam, type, omvang en veilige lokale data worden gecontroleerd. Bijlagen zijn in het betrokken dossier downloadbaar en worden niet gepubliceerd in de openbare wedstrijdweergave. In auditmomentopnamen worden bestandsbytes vervangen door een aanduiding, zodat het logboek geen kopie van ieder bestand bevat.

## Behandeling en besluit

Een dossier heeft een benoemde behandelaar en beslistermijn. De commissie kan dit wijzigen met een reden. De mogelijke bezwaarbesluiten zijn:

- In behandeling nemen.
- Afwijzen en wedstrijdbeeld handhaven.
- Gegrond verklaren, stand handhaven en vervolgafspraak vastleggen.
- Gegrond verklaren met expliciete uitslagcorrectie.

Een vastgesteld besluit is downloadbaar als leesbaar tekstdocument met oorspronkelijke registratie, motivering, actuele uitslag, termijn voor herziening en dossierhistorie. Het originele scheidsrechtersresultaat blijft in het dossier en logboek bestaan.

## Herziening en voortgang

Indien toegestaan kan een betrokken team eenmaal een gemotiveerd herzieningsverzoek indienen binnen de vastgelegde termijn, inclusief nieuw bewijs. Het bestaande besluit blijft geldig. De commissie wijst het verzoek af of heropent het dossier voor herbeoordeling. Eerdere besluiten blijven raadpleegbaar en downloadbaar.

Als de optie 'Volgende ronde laten wachten' aanstaat, blokkeert `canReleaseRound(cupId, targetRoundKey)` doorstroming naar een latere ronde zolang eerdere rondes een open bezwaar of onbehandeld herzieningsverzoek hebben. De functie is puur: zij raadpleegt geen wedstrijdprojecties en kan veilig vanuit de bracketprojectie worden gebruikt.

## Schorsingen en historische wedstrijden

Een sanctie bevat de bronwedstrijd, ingangsdatum/-tijd, oorspronkelijk aantal wedstrijden, resterend aantal en de daadwerkelijk meetellende wedstrijd-ID's. Alleen latere wedstrijden van hetzelfde team in dezelfde beker tellen mee. De bronwedstrijd zelf en eerder bekende uitgespeelde wedstrijden tellen niet opnieuw mee. Reglementaire doorgang telt alleen als dit expliciet is toegestaan.

Een handmatig ingevoerde wedstrijd van 1 mei kan daardoor geen sanctie na een incident op 5 juni verminderen. Wordt een uitgezeten wedstrijd herpland, overgespeeld of uit de besliste status gehaald, dan wordt de sanctie opnieuw berekend en kan de deelnameblokkade terugkeren. Een expliciet opgeheven sanctie wordt niet door herberekening opnieuw actief.

Bij intrekking van een onbeoordeelde kaart vervalt de voorlopige blokkade met historie. Wijzigt de bron van een al vastgesteld tuchtbesluit, dan wordt dat dossier voor expliciete herbeoordeling geopend; het bestaande besluit wordt niet stilzwijgend weggehaald.

## Koppelingen en opslagcontract

Publieke API op `HVCases`:

- `policy(cupId)`, `savePolicy(cupId, input, reason)`.
- `deadline(matchOrId, teamId)`, `extendFiling(matchId, teamId, dueAt, reason)`.
- `fileObjection(matchId, teamId, category, note, { evidence })`.
- `appendResponse(id, input, actor)`, `askQuestion(id, input)`, `answerQuestion(id, questionId, input, actor)`, `closeQuestion(id, questionId, reason)`.
- `assignCase(id, { handlerId, handler, dueAt, reason, expectedVersion })`; de interface kiest een actieve organisator met vast account-ID..
- `decideObjection(id, decision, reason, adjustment)`.
- `requestReview(id, input, actor)`, `decideReview(id, decision, reason)`, `decisionDocument(id)`.
- `canReleaseRound(cupId, targetRoundKey)`.
- Bestaande incident-, hervat-, reglementaire- en tuchtcommando's blijven beschikbaar.
- `canPlay(playerId, cupId, matchOrDate)` accepteert een optionele wedstrijdcontext voor de sanctie-ingangsdatum.
- `syncDiscipline(matchId)` en `syncServedMatches()` houden kaartbron en chronologie actueel.

Opslagsleutels per editie: `casePolicies`, `caseFilingExtensions`, `caseSequence`, `caseObjections`, `caseIncidents`, `caseDiscipline`, `caseSanctions`, `caseOverlays`, `caseExcludedTeams`.

Een gesloten bezwaardossier met `reviewRequest.status === 'pending'` telt nog als open werkvoorraad en blokkeert afsluiting. De formele bezwaarstatus blijft tijdens het verzoek het vorige besluit benoemen.

## Controles

De bestaande 13 domeincontroles en 3 formuliercontroles blijven behouden. `tests/v15-cases.test.cjs` voegt zestien daadwerkelijke modulecontroles toe, waaronder termijnverloop, uitzondering per team, hoor/wederhoor, bijlagen, stale-versie, herziening, pure rondeblokkade, historische import, herberekening na overspelen, broncorrectie na besluit wintertijd, hervatting met exacte fase/extra tijd en de daadwerkelijke account-/aanstellingsscopes.
