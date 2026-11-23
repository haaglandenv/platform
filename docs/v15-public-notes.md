# V15 — Publiek, statistieken, privacy en bekerbeleving

Deze notities beschrijven de geïmplementeerde interfaces en verificatie voor het geïntegreerde prototype. Alle gegevens zijn fictief. Er is geen Sportlink, externe statistiekbron, kalenderabonnement, VeyoCast, Matchday Studio of SocialHero toegevoegd.

## Gedeelde scripts en routes

Laad `experiences.js` na `news.js`, `public-tools.js`, `operations.js`/`operations-v15.js`, `statistics.js` en `privacy-media.js`, vóór de paginacontrollers. `pages/road.css` bevat de gezamenlijke `xp-*` componenten die ook de statistiek-, redactie- en finaledagpagina gebruiken.

| Route | Paginabestanden | Werking |
| --- | --- | --- |
| `#road`, `#road-HV-T-*` | `pages/road.*` | Bekerroute van het gekozen team en toernooi, met echte wedstrijdnodes, vrijlotingen, uitschakeling, nieuws en schema-links. |
| `#bekerkast`, `#bekerkast-HV-T-*` | `pages/trophies.*` | Officiële winnaar/finalist per editie uit het revisieerbare archief, filterbaar op vereniging/team. |
| `#moment` | `pages/moment.*` | Inzenden, beoordelen en stemmen op een wedstrijdmoment. |
| `#finaledag`, anker `#finaledag-kaart` | `pages/fans.*` | Interactieve schematische kaart met de echte finaleplanning per veld, voorzieningen en actuele publieke timing. |
| `#nieuwsbeheer` | `pages/newsroom.*` | Rich text, besloten preview, versies, herstel, review en optionele feitenconcepten. |
| `#statistieken` | `pages/statistics.*` | Editie/cup/club/teamfilters, deelnamebetekenis, ranglijsten, volledigheid, onderlinge historie en privacyveilige CSV. |

De bestaande teamprofielen linken rechtstreeks naar Road to Houtrust en de digitale bekerkast. De bestaande wedstrijdpagina toont faselabels, toegevoegde tijd en een aparte strafschoppenserie zodra die is ingevoerd. Strafschopnemers gebruiken dezelfde publicatieprojectie als overige spelers.

## Statistiekdefinities

- **Unieke teams:** de unie van ingedeelde teams en goedgekeurde inschrijvingen binnen de selectie.
- **Inschrijvingen:** goedgekeurde team-bekerrelaties; hetzelfde team in twee bekers telt twee inschrijvingen.
- **Ingedeelde teams:** unieke teams die daadwerkelijk een wedstrijdnode hebben.
- **Nog actief:** teams met een volgende of lopende wedstrijd; vrijlotingen zijn geen gespeelde wedstrijden.
- **Wedstrijden en doelpunten:** officiële gespeelde eindstanden; strafschoppenseries blijven buiten het doelpuntentotaal.
- **Duels, basisplaatsen, invalbeurten en minuten:** de echte positie uit de opgave en alle veldintervallen van `HVMatchCenter.playerIntervals`. Rugnummer bepaalt geen basisplaats. Re-entry, afwezigheid, rode kaarten en toegevoegde tijd worden door dezelfde sportlogica verwerkt.
- **Doelpunten per 90 minuten:** pas vanaf 180 geregistreerde speelminuten; daaronder staat een streep in plaats van een misleidende verhouding.
- **Clean sheets team:** een bevestigde wedstrijd zonder tegendoelpunt. Spelerstatistieken bewaren ook hoeveel wedstrijden zonder tegengoal de speler daadwerkelijk meedeed.
- **Kaarten en wissels:** bevestigde gebeurtenissen bij officiële wedstrijden; live cijfers zijn afzonderlijk en voorlopig.
- **Volledig bevestigd:** de scheidsrechter heeft expliciet bevestigd dat het gehele gebeurtenisbeeld compleet is, alle doelpunten zijn gekoppeld en er zijn geen onbeoordeelde meldingen.
- **Deels geregistreerd:** bruikbare afzonderlijke gebeurtenissen, zonder volledige attestatie.
- **Alleen eindstand:** een officiële uitslag zonder betekenisvol gebeurtenislog. Een scorecorrectie zonder bekende doelpuntenmaker vult geen persoon in.
- **Niet gekoppelde goals:** het verschil tussen de officiële eindstand en bevestigde doelpunten met een gekoppelde speler.

Historische edities gebruiken uitsluitend opgeslagen archieffixtures en opgeslagen spelersstatistieken. Niet-actieve werkedities lezen hun bewaarde `__statisticsByCup` en `__fixtures`; geplande duels, actieve teams en livecijfers blijven daarbij behouden, ook na filteren op club of team. De keuze Alle edities combineert deze gegevens met de actieve editie en telt het archief van een nog actieve afgesloten editie niet dubbel. Spelersprofielen hebben eveneens een editie- en alle-editiesfilter. Huidige selecties vullen geen ontbrekende historische speelminuten aan. Bij fictieve archieven zonder spelerregistraties blijven spelersranglijsten leeg.

`HVStats.snapshot(context)` accepteert `editionId`, `tournamentId`, `cupKey`, `clubId` en `teamId`. `HVStats.headToHead(teamA, teamB, context)` berekent onderlinge officiële resultaten. Dezelfde ploeg met zichzelf vergelijken levert geen ontmoetingen op. De bestaande invalidatiecache blijft actief; kalender, reglement en gebeurtenissen worden per berekening gedeeld.

## Publicatie en privacy

`HVPrivacy` bepaalt jeugdstatus primair uit geboortedatum ten opzichte van de centrale klok. Een expliciete classificatie en de teamcategorie zijn fallback; een team-ID-suffix bepaalt geen privacyrecht. Onbekende classificatie wordt terughoudend behandeld.

Publieke projecties bevatten nooit geboortedatum, relatiecode, controles of interne notities. Naam/foto/statistiek/pers worden per persoon bepaald en met het bekerbeleid gecombineerd. Een algemeen spelersprofiel past de meest beperkende naam-/nummerkeuze van alle gekoppelde bekers toe. Bij een concrete wedstrijd geldt de juiste bekercontext.

`HVPrivacy.canPublishLineup(matchOrId, side, purpose)` vereist:

1. De juiste openbare of pers-publicatiekeuze van de beker.
2. Een actuele door de scheidsrechter goedgekeurde opgave.
3. Het publicatievenster. Standaard 30 minuten vóór aftrap; instelbaar tussen 0 en 120 minuten. Bij een lopende of afgelopen wedstrijd blijft de goedkeuringsvoorwaarde gelden.

De openbare wedstrijdpagina en persomgeving gebruiken dezelfde toegangspoort. Intrekken van beeldrechten verwijdert het beeld ook uit nieuwspublicaties en galerijen.

## Redactie

Artikelen behouden `body` als array van tekstalinea's. Ondersteunde, veilig als tekst gerenderde blokken:

- `## Tussenkop`
- `> Citaat`
- `[[media:ID1,ID2]]` voor een galerij van goedgekeurde artikelbeelden.

Er wordt geen ongecontroleerde HTML ingevoegd. `HVNews.renderBody(target, post)` rendert dezelfde inhoud in de besloten preview en het publieke artikel.

Iedere opslag krijgt een revisie, auteur, tijdstip en reden. De oorspronkelijke voorbeeldversie blijft bij de eerste wijziging beschikbaar. Herstel maakt een nieuw concept; het wist geen geschiedenis. Een nieuwe concept-/reviewversie van een openbaar artikel laat de vorige openbare versie staan totdat de nieuwe wordt gepubliceerd.

`HVNews.requestReview(id,note)` biedt het artikel aan ter controle. `HVNews.review(id,approved,reason)` vereist een bevoegde redacteur en een besluitreden. `HVNews.restore(id,revision,reason)` herstelt een eerdere versie als nieuw concept.

De functie **Verslag als redactieconcept** staat standaard **uit**. Inschakelen gebeurt in Nieuwsbeheer. Er is ook een knop om voor een geselecteerde officiële wedstrijd een concept te maken. Na inschakeling kan een nieuw definitief wedstrijdresultaat automatisch een concept aanmaken. Het concept gebruikt uitsluitend de officiële uitslag, bevestigde gebeurtenissen, toegestane namen en eventuele penaltyuitslag. Ontbrekende omstandigheden, citaten en doelpuntenmakers worden niet verzonnen. Exact dezelfde bronfeiten maken geen dubbel concept. Het systeem publiceert nooit automatisch een wedstrijdverslag.

De feitenbron (`sourceMatchId`, score en bevestigde gebeurtenis-IDs) blijft aan het concept gekoppeld. Nieuwe bronfeiten kunnen een nieuwe redactionele versie opleveren; beoordeling blijft nodig.

## Beeldbank en perspakket

Beelden hebben credits, kanaalrechten, goedkeuringshistorie en een optionele einddatum. `HVMedia.downloadInfo(id, channel)` controleert de actuele goedkeuring, kanaalrechten en geldigheid opnieuw bij de downloadactie. `setExpiry` legt de wijziging met reden vast. Fotografen zien hun eigen accountgebonden inzendingen.

`HVMedia.packageForMatch(matchId, channel)` maakt een ZIP met de actuele vrijgegeven beeldbestanden en een JSON-overzicht van credits en gebruiksrechten. Tijdens samenstellen worden rechten opnieuw gecontroleerd. Het pakket gebruikt alleen echte beschikbare demo-afbeeldingsbytes; een videometadatarecord wordt niet als een nepvideo gedownload.

Bij eigen grote uploads bewaart het prototype een kleine lokale preview en metadata, zoals expliciet in het inzendformulier vermeld. Originele privébestanden, transcodering en serverdownloads horen bij de latere objectopslag op de VPS. De bestaande gegenereerde demobeelden zijn volledig downloadbaar.

## Road to Houtrust, bekerkast en momenten

`HVExperiences.road(teamId,cupId)` gebruikt canonieke wedstrijdnodes en echte winnaars/vrijlotingen. Een uitgeschakeld team krijgt geen verzonnen toekomstige tegenstander. Nieuws en toegestane beelden blijven gekoppeld aan de route.

`HVExperiences.trophies(context)` gebruikt de officiële archiefrecords en winnaar-/finalist-HV-IDs. Heropening maakt geen tweede prijskaart voor dezelfde officiële archiefidentiteit.

Momenten worden eerst **pending** opgeslagen. Alleen **approved** verschijnt openbaar. De organisatie kan een moment afwijzen of intrekken met reden. Iedere account heeft per wedstrijd één veranderbare stem. Per beker of wedstrijd kan de organisatie een optionele begin- en eindtijd voor het stemmen vastleggen; een wedstrijdspecifieke periode gaat voor. Open/nog niet geopend/gesloten wordt zichtbaar getoond en de domeincontrole weigert stemmen buiten de periode. Stemmen zijn geen officiële sportieve statistiek. Alleen bevestigde gebeurtenissen en goedgekeurde openbare media kunnen worden gekoppeld.

`HVExperiences.settings(cupId)` / `saveSettings(input,cupId?)` bevatten `autoReports:false`, `momentVoting:true`, `road:true`, `finalMap:true`. De lotingshow heeft zijn eigen schakelaar bij toernooibeheer, beheerd door de editie-/lotingsmodule.

## Finaledagkaart

De kaart is een expliciet schematische voorbeeldindeling. Veldnodes lezen de canonieke finaleplanning en nemen ieder ingepland finaleveld op, inclusief Veld 3. Extra velden breiden de schematische kaart uit zonder kaartpunten te laten overlappen. Verwachte en werkelijke aftrapinformatie is beperkt tot publieke tijdvelden; contactgegevens, interne notities en aanwezigheidsaantallen worden niet gepubliceerd. Zowel kaartpunten als een tekstuele knoppenlijst zijn bedienbaar met muis/toetsenbord. Mobiel kan de kaart intern schuiven; de pagina zelf blijft binnen het gedeelde inhoudsgrid.

## Verificatie

- `tests/v15-public.test.cjs`: 15 scenario's voor rugnummeronafhankelijke basisplaatsen, oningedeelde inschrijvingen, volledigheid, privacy, goedkeuring/publicatievenster, redactieversies, optionele verslagen, gemodereerde stemmen, mediarechten, canonieke bekerroute historische cijfers, bewaarde open werkedities en stemvensters.
- `tests/v15-media-package.test.cjs`: 3 scenario's voor echte ZIP-inhoud met credits, uitsluiten pending beelden en intrekking.
- `tests/v15-reports.test.cjs`: 2 scenario's voor automatisch aanmaken na een nieuw scheidsrechtersresultaat en geen duplicaten bij herhaalde meldingen.
- Bestaande statistiekregressie blijft 4/4 groen inclusief ongewijzigde prestatielimiet. Bestaande publieke, media- en UI-tests behouden hun inhoudelijke verwachtingen. De publieke DOM-fixture kreeg alleen de nieuwe `canPublishLineup`-poort als expliciete stub.
