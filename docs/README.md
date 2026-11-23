# HV Control — documentatie

De documenten zijn onderdeel van de versieerbare projectbron. Het functionele ontwerp beschrijft de afgesproken werking; de acceptatiechecklist maakt deze toetsbaar.

| Document | Gebruik |
| --- | --- |
| [HV-Control-Functioneel-Ontwerp.md](HV-Control-Functioneel-Ontwerp.md) | Volledig normatief ontwerp: rollen, gegevens, pagina's, wedstrijdprocessen, reglementen, privacy, UI/Shell, geselecteerde beleving en VPS-grenzen. |
| [HV-Control-Acceptatiechecklist.md](HV-Control-Acceptatiechecklist.md) | Laatste prototypecontrole met concrete scenario's, verwachte uitkomst en aparte productiecontroles. |
| [prototype-architecture.md](prototype-architecture.md) | Technische achtergrond van de gedeelde domeinen en de overstap van lokale mock-opslag naar de VPS. Lees samen met de actuele implementatienotities. |
| [v18-compact-lists.md](v18-compact-lists.md) | Compacte actierijen, iconen rechts, toewijsvenster en gerichte responsieve controle. |
| [v17-wizards-validation.md](v17-wizards-validation.md) | Aanmaakwizards voor bekers, verenigingen en teams; bekerkoppelingen, controles en 48 responsieve modalmetingen. |
| [v16-ui-polish.md](v16-ui-polish.md) | Visuele afwerking, gedeelde typografie en witruimte; 53 routes gecontroleerd op vijf schermbreedtes. |
| [v15-validation.md](v15-validation.md) | Actuele verificatie: 235 scenario's, 53 responsieve pagina's en doorlopen browserprocessen; productiegrenzen blijven apart. |
| [v14-validation.md](v14-validation.md) | Historisch controleverslag van versie14; geen automatisch bewijs dat een later toegevoegd scenario is getest. |
| [v15-sport-notes.md](v15-sport-notes.md) | Sportieve commando's, veldbezetting, klok, waarnemingen en strafschoppen. |
| [v15-cases-notes.md](v15-cases-notes.md) | Proceduretermijnen, hoor/wederhoor, bewijs, herziening en schorsingschronologie. |
| [v15-operations-notes.md](v15-operations-notes.md) | Arbitrage, planning, finaledaguitloop, vrijwilligers en accountgebonden communicatie. |
| [v15-editions-notes.md](v15-editions-notes.md) | Blijvende identiteit, editiecontext, revisiearchieven en gecontroleerde loting. |
| [v15-public-notes.md](v15-public-notes.md) | Statistiekdefinities, publicatiebeleid, redactie en geselecteerde bekerbeleving. |

De `v15-*-notes.md`-bestanden beschrijven de concrete implementatiecontracten en modulecontroles. Zij vervangen de laatste gebruikerskeuzes niet. Bij een verschil wordt het functionele ontwerp aangepast met een expliciet besluit of wordt de implementatie aan de afgesproken eis gelijkgetrokken. Het functionele ontwerp benoemt de huidige demo-invulling en houdt de nog te bewijzen productievoorwaarden apart.

De laatste selectie is leidend: volledig eigen systeem, geen Sportlink, geen kalenderabonnement, alle bekers knock-out en de scheidsrechter stelt het definitieve wedstrijdbeeld vast. Een bezwaar is een aparte procedure. Van de voorgestelde belevingsuitbreidingen zijn uitsluitend Road to Houtrust, optionele lotingshow, optioneel verslagconcept, digitale bekerkast, moment van de wedstrijd en interactieve finaledagkaart geselecteerd.

De prototypeversie gebruikt fictieve gegevens en lokale/demoverwerking. Werkelijke productieauthenticatie, serveropslag, mail/pushbezorging en gedeelde verwerking over apparaten worden afzonderlijk bewezen bij de VPS-bouw.
