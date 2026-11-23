# HV Control — aanmaakwizards v17

Gecontroleerd op 23 november 2026. Dit verslag beschrijft de toegevoegde wizards; de acceptatie door de opdrachtgever blijft open in de acceptatiechecklist.

## Beschikbaar

In Seizoensbeheer staan de knoppen Nieuw bekertoernooi, Vereniging toevoegen en Team toevoegen. Het tabblad Toevoegen bundelt de drie routes en een doorzoekbaar teamregister per vereniging. Vanuit het register kan een bestaand team aan extra bekers worden gekoppeld. Toernooibeheer heeft ook de knop Nieuw bekertoernooi.

| Wizard | Stappen |
| --- | --- |
| Bekertoernooi | Naam/categorie/8–32 plekken → wedstrijd- en toernooireglement → deelnemers en expliciete goedkeuring/indeling → overzicht en bevestiging. |
| Vereniging | Naam en vestigingsplaats → thuislocatie en besloten clubcontact → overzicht en bevestiging; daarna direct het eerste team toevoegen. |
| Team | Vereniging → nieuw of bestaand team/categorie → passende bekerkoppelingen → overzicht en bevestiging. |

Alle bekers zijn knock-out. Goedkeuring van een bekerinschrijving staat los van goedkeuring van de spelerslijst. Een nieuw team begint met een lege spelerslijst. Bestaande team-ID’s en historie blijven behouden bij extra bekerdeelname. Zonder expliciete bracketkeuze maakt de bekerwizard geen wedstrijden aan.

## Domeincontrole

De volledige suite omvat 27 bestanden met 251 geslaagde controles en nul mislukte bestanden. De syntaxcontrole omvat 103 JavaScriptbestanden; de gewijzigde pagina-controllers en het gebouwde dist/site.js zijn daarna opnieuw gecontroleerd.

De nieuwe scenario’s controleren categorieën, capaciteit inclusief nog te beoordelen inschrijvingen, dubbele namen, blijvende identiteit, bestaande koppelingen, bevoegdheid, editieafsluiting, expliciete toelating en lege spelerslijsten. Aanmaken en koppelen worden als één volledige lokale wijziging verwerkt. Herhaalde verzending met dezelfde aanvraagcode levert geen tweede registratie op. Fouten tijdens een vervolgstap laten geen gedeeltelijke vereniging, team, beker of koppeling achter. Opslagfalen is ook met de echte lokale store getest: het oude geheugenbeeld blijft behouden, er verschijnen geen succesmeldingen en opnieuw proberen kan daarna wel slagen.

Besloten contactgegevens komen niet in de openbare clubregistratie of openbare zoekresultaten. Buiten de finaledag blijft de thuislocatie van de thuisspelende vereniging leidend.

## Doorlopen browserprocessen

- Een beker aangemaakt met aangepast reglement, vier expliciet goedgekeurde deelnemers en een eerste indeling met vrijlotingen; zichtbaar in Seizoensbeheer.
- Een lege conceptbeker aangemaakt zonder wedstrijden.
- Een nieuwe vereniging met sportpark en clubcontact aangemaakt; vanuit het succesvenster een team met de juiste vereniging geopend.
- Een nieuw team met een te beoordelen bekerinschrijving opgeslagen; zichtbaar in de deelnemerslijst en het teamregister.
- Datzelfde bestaande team aan een tweede beker gekoppeld met behoud van zijn identiteit; beide bekers zichtbaar in het register.
- Een volle beker blokkeert extra deelname en toont dit in de keuzelijst. Een mislukte poging maakt geen gedeeltelijk team aan.
- Naamvalidatie, terugnavigeren, niet-opgeslagen wijzigingen, Escape, doorgaan met invoer en sluiten gecontroleerd.

De fictieve registraties voor deze browsercontrole staan alleen in de lokale browserdemo; de bron bevat geen nieuwe testclub of testbeker als standaarddata.

## Responsieve modalcontrole

Alle vier bekerstappen, drie verenigingsstappen, vier teamstappen en het sluitvenster zijn gemeten op 360, 390, 800 en 1280 pixels breed: 48 metingen, zonder horizontale pagina- of formulieroverloop, overlappende modalgebieden, knoppen buiten de modal of een modal buiten het scherm. De formulierinhoud kan scrollen; de kop en acties blijven beschikbaar. De meetgegevens staan in [v17-modal-audit.json](v17-modal-audit.json).

Dit is een gerichte controle van de nieuwe wizards en hun toegangsschermen. De eerdere controle van alle 53 routes staat in [v16-ui-polish.md](v16-ui-polish.md); die is niet als nieuwe volledige routecontrole gepresenteerd.

## Grens van dit prototype

Verwerking en opslag zijn lokaal met mock-data. Productieauthenticatie, servertransacties, gelijktijdige wijzigingen vanaf verschillende apparaten en definitieve autorisatie blijven onderdeel van de VPS-bouw. De functionele werking en acceptatiescenario’s zijn bijgewerkt met AAN-01 t/m AAN-08 en AC-138 t/m AC-145.
