# HV Control — controleverslag versie 15

Gecontroleerd op 20 november 2026. Dit verslag beschrijft de gecontroleerde lokale prototypeversie; het bewijst geen werkende productiebackend of beveiliging op een VPS.

## Geautomatiseerde controle

- 26 testbestanden, 235 geslaagde scenario's en nul resterende fouten.
- 100 JavaScript-syntaxcontroles geslaagd, plus controle van de gebouwde JavaScriptbundel.
- 53 pagina's, 248 unieke HTML-IDs en 275 interne hashlinks.
- Geen dubbele IDs, ontbrekende resources, kapotte interne anchors, ontbrekende label-/ARIA-doelen of formuliernamen die DOM-methoden overschrijven.
- Bestaande tests zijn behouden. Eén verwachting voor een inactieve open werkeditie is bijgewerkt: deze is alleen-lezen maar geen officieel afgesloten archief. De gerichte controle is daarna opnieuw geslaagd.

De scenario's toetsen onder meer spelerscontrole en rostervergrendeling, minimumbezetting, dispensaties, gebeurtenissen en dubbele waarnemingen, werkelijke speelminuten, wedstrijdklok, strafschoppen, bezwaar en hoor/wederhoor, sanctiechronologie, arbitragevervanging, planning, finaledaguitloop, vrijwilligers, rolcontext, offline verwerking en conflicten, opslagfouten, exacte herstelkopieën, editie-isolatie, nieuwsreview, veilige mediapakketten en publicatiebeleid.

## Responsieve browsercontrole

Alle 53 pagina's zijn bezocht met weergavebreedtes 360, 800 en 1120 pixels. Er is geen horizontale pagina-overloop vastgesteld. De gedeelde herohoogtes blijven binnen elke breedte gelijk; tabbladen en werkruimtenavigatie blijven bereikbaar. Ook het uitgeklapte procedurepaneel is op de drie breedtes gecontroleerd. De finaledagkaart is na de laatste veldcorrectie opnieuw in de browser gecontroleerd; de kaart gebruikt geen overlappende veldmarkeringen.

## Doorlopen browserprocessen

1. Account met meerdere rollen kiezen en een eigen teamwerkruimte openen.
2. SVV-spelerslijst indienen, als leiding goedkeuren en als team een wedstrijdopgave indienen.
3. Scheidsrechteraanstelling bevestigen en beide ingediende opgaven fysiek controleren en goedkeuren.
4. Aftrap, eerste helft met 45+2, rust, tweede helft met 90+2 en einde reguliere speeltijd doorlopen.
5. Bij gesimuleerd slecht bereik een doelpunt lokaal bewaren: geen onmiddellijke wijziging van het officiële wedstrijdbeeld. Na verwerken staat precies één bevestigd doelpunt geregistreerd.
6. Eindbeeld bevestigen en de openbare wedstrijdpagina controleren op de vastgelegde 1–0 met doelpuntenmaker en minuut.
7. Als team een bezwaar indienen, als leiding een vraag stellen, als team antwoorden en een gemotiveerd besluit vastleggen. De officiële uitslag blijft 1–0.
8. Centrale teamcontext bij het openen van de dossierpagina behouden.
9. Lotingshow inschakelen en naar de volgende gepubliceerde trekking gaan; bestaande duels blijven behouden.
10. Noodpakket daadwerkelijk downloaden.
11. Finaledagregie met verwachte tijden en een uitloopvoorstel openen.
12. Road to Houtrust, bekerkast, documentnavigatie en interactieve veldselectie bekijken. Veld 3 toont de Halve Maan Cup-finale uit dezelfde wedstrijdbron.

De browserproeven zijn uitgevoerd op een afzonderlijke lokale preview met fictieve gegevens. Die proefinvoer is geen onderdeel van de gepubliceerde standaarddataset. Een tijdelijke onderbreking van de preview tijdens herladen is verholpen door de preview opnieuw te starten; de documentatie en kaart zijn daarna opnieuw geopend.

## Grenzen en laatste gebruikerscontrole

De [acceptatiechecklist](HV-Control-Acceptatiechecklist.md) blijft de leidraad voor Danny's laatste beoordeling. Handmatige en inhoudelijke eindcontrolepunten zijn niet automatisch afgevinkt op basis van een geslaagde unittestsuite.

De gewenste werking staat in het [functionele ontwerp](HV-Control-Functioneel-Ontwerp.md). Alleen de geselecteerde belevingsfuncties zijn toegevoegd. Sportlink en kalenderabonnementen ontbreken bewust.

Alle accounts, rollen, ontvangsten, notificatiebezorging, wachtrijverwerking en wedstrijdgegevens zijn lokale simulaties. Echte serverautorisatie, transacties, synchronisatie tussen apparaten, mail/push, externe API en serverback-ups moeten bij de VPS-bouw worden geïmplementeerd en afzonderlijk bewezen.
