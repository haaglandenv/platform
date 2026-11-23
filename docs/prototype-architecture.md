# HV Control prototype — gedeelde domeinen

Status: interactief prototype met synthetische gegevens en lokale browseropslag. De hostingtoegang is privé. De rolkeuzes demonstreren werkprocessen; ze zijn geen productieautorisatie. Dit document beschrijft de adaptergrenzen voor de latere VPS-implementatie.

## Gedeelde entiteiten

Verenigingen (`HV-V-*`), teams (`HV-T-*`), spelers (`HV-P-*`), toernooien (`HV-CUP-*`) en wedstrijden (`HV-*` / `HV-W-*`) behouden hun unieke IDs. Een kalenderwijziging maakt geen nieuwe wedstrijdidentiteit. Een herloting houdt de bestaande wedstrijdnodes tenzij een nog niet gestart toernooi expliciet opnieuw wordt ingericht.

Alle schermen raadplegen de onderstaande services. Pagina's bewaren alleen selectie-, zoek- en weergavestatus, geen eigen wedstrijdprogramma of onafhankelijke loting.

| Service | Verantwoordelijkheid |
| --- | --- |
| `HVWorkflow` | Opslagadapter, besluitenlog, meldingen, uitsluiting vereniging, toernooiafsluiting, seizoensvergrendeling en archiefmomentopnamen |
| `HVCompetition` | Toernooien, deelnemende teams, reglementversies, effectieve datum, bracketindeling en rondevoortgang |
| `HVFixtures` | Centrale kalender, wedstrijdidentiteit, thuislocatie, finalevelden, conflictcontrole en import |
| `HVRegistrations` | Toernooilijsten per team, goedkeuringen, correctieverzoeken, versies, wedstrijdselectie en identiteitscontrole |
| `HVMatchCenter` | Wedstrijdgebeurtenissen, voorlopige meldingen van teamleiding en definitieve vaststelling door de scheidsrechter |
| `HVCases` | Teambezwaren, incidentmomentopnamen, hervatbesluiten, reglementaire uitslagen, tuchtzaken en schorsingen |
| `HVOperations` | Scheidsrechteraanstellingen, tweezijdige wedstrijdwijzigingen, finaledagafspraken en interne communicatie |
| `HVPrivacy` / `HVMedia` | Publicatietoestemming, doelgebonden persvelden, media-inzendingen, credits, gebruiksrechten en moderatie |
| `HVStats` | Afgeleide cijfers uit dezelfde wedstrijden en gebeurtenissen; publieke namen lopen via de publicatieprojectie |
| `HVNews` / `HVFollowing` / `HVSearch` | Gekoppelde nieuwsberichten, favorieten en publieke zoekresultaten |

## Beslisregels

1. De scheidsrechter bevestigt de uitslag en het definitieve wedstrijdbeeld. Teamakkoord is geen verplichte stap vóór publicatie.
2. Een team kan daarna een bezwaar indienen. Het originele scheidsrechtersresultaat blijft bestaan totdat de toernooileiding een expliciet, gemotiveerd besluit neemt. Een bezwaarschrift verandert de score niet.
3. Een wijziging die een begonnen vervolgwedstrijd zou aantasten wordt geblokkeerd. De commissie krijgt een concrete melding.
4. Een vrijloting is geen gespeelde wedstrijd en krijgt geen verzonnen score. Een walkover is een apart reglementair besluit.
5. Nieuwe spelers na indiening en correcties aan een ingediende lijst verlopen via een beoordeeld verzoek. Versies blijven terug te vinden.
6. Leeftijd, dispensatie, selectieomvang, keeper, schorsing en controle van beide opgaven bepalen of een wedstrijd kan starten.
7. Wedstrijden worden bij de thuisclub gespeeld; op de finaledag is Houtrust de centrale locatie.
8. Media worden pas gepubliceerd na goedkeuring én toestemming voor het specifieke kanaal. Publieke projecties bevatten geen geboortedatum of KNVB-relatiecode.
9. Een afgerond toernooi en vergrendeld seizoen blokkeren sportieve mutaties. Heropening vereist een besluitreden.

## VPS-ombouw

Vervang `HVWorkflow.repository` en de lokale `HVDemo`-opslag door een server-repository en command/API-laag. Behoud entiteits-IDs en domeincommando's. De server moet toestemming, statusovergangen, concurrentieversies en mutatietransacties afdwingen; een verborgen knop geldt niet als toegangscontrole.

De aanwezige primaire-demowedstrijdcompatibiliteit is een migratie-adapter. Nieuwe generieke flows gebruiken de services hierboven. Verwijder die legacybrug pas na migratie van bestaande demo-gegevens en regressiecontrole.

Voor productie zijn een echte identityprovider, serverrollen en scopes, database, privé-objectopslag, mediaverwerking, push/mailbezorging, gelijktijdigheidscontrole en bewaarbeleid nodig. Het huidige prototype doet geen externe e-mail- of pushbezorging en gebruikt geen externe API-sleutels.

## Controle

Voer `python build.py`, `node --check dist/site.js` en de Node-tests in `tests/` uit. Browsercontrole gebeurt op het gebouwde prototype, met echte UI-acties en mobiele/tablet/desktopweergaven. De versie wordt pas gepubliceerd na de domein- en browsercontroles.
