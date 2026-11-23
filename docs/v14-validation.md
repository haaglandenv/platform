# HV Control — prototypecontrole

Deze versie behoudt het definitieve wedstrijdbeeld van de scheidsrechter. Een teambezwaar opent een dossier; alleen een gemotiveerd besluit van de toernooileiding kan een correctie doorvoeren. De oorspronkelijke registratie blijft terug te vinden.

## Functionele controle

De Node-tests controleren de werkelijke gedeelde domeinmodules, met onder meer 75 wedstrijden en 80 toernooispelerslijsten. De integratiecontrole doorloopt spelerslijst, beoordeling, wedstrijdselectie, identiteitscontrole, uitslag, bezwaar, tucht, hervatting, planning, publicatierechten en afsluiting.

In de browser zijn daarnaast de volgende handelingen uitgevoerd:

- Een bezwaar namens een team indienen en gemotiveerd afwijzen; de officiële stand blijft behouden.
- De vernieuwde SVV-spelerslijst indienen, beoordelen, een wedstrijdselectie insturen en beide opgaven als scheidsrechter controleren.
- De aanstelling bevestigen, de aftrap registreren, een doelpunt en kaart toevoegen en het definitieve wedstrijdbeeld publiceren.
- Een tuchtbesluit van twee wedstrijden vastleggen en de actieve deelnameblokkade terugzien.
- Een live duel onderbreken bij 64 minuten en 0–2, 22 veldspelers in de momentopname bewaren en vanuit die stand hervatten; de openbare livepagina toont hetzelfde vervolg.
- Een extra beker aanmaken, vier teams inschrijven en goedkeuren, een bracket met vrijlotingen opbouwen en de openbare projectie openen.
- Een historische wedstrijd via CSV valideren en importeren.
- De aanvangstijd van een finale aanpassen en dezelfde wijziging op de openbare finaledag terugzien.
- Een lokale voorbeeldfoto inzenden, goedkeuren en met credit in de openbare beeldbank terugzien.
- De statistieken en privacyprojectie bekijken; afgeschermde jeugdspelers verschijnen met een anoniem spelerslabel.

## Responsieve controle

Alle 43 pagina's zijn in de browser geopend op framebreedtes van 360, 800 en 1120 pixels. Er is geen horizontale overloop van het document. De kalender en planningtijdlijn gebruiken waar nodig een eigen scrollvlak. De scheidsrechtersomgeving gebruikt een programma, wedstrijdmenu en afzonderlijke actieschermen. De mobiele menukaarten overlappen elkaar niet.

Hero's en inhoud gebruiken per schermbreedte dezelfde afmetingen en containers. Bestaande afbeeldingen en huisstijl zijn behouden.

De opslagluisteraar meldt tussen tabbladen alleen werkelijk veranderde sleutels. Dit voorkomt dat een voorkeur of navigatiekeuze alle sportieve processen opnieuw aanstuurt.

## Afbakening

Alle personen, wedstrijden en besluiten zijn mock-data. Wijzigingen blijven in de lokale browseropslag. De rolwisselaar demonstreert werkprocessen; productieautorisatie, gedeelde database, externe live-API, mail/pushbezorging en objectopslag volgen bij de VPS-ombouw. CSV uit Excel wordt ondersteund; een binair XLSX-bestand wordt niet als CSV ingelezen.
