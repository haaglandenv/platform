# Feature Priority Matrix — MVP en V1

Dit bestand is rechtstreeks afgeleid van het meegeleverde 300-featureswerkboek. Het werkboek blijft de autoritatieve bron. Er zijn **56** MUST-features in MVP/V1: **20 MVP** en **36 V1**.

Codex neemt voor elke rij een traceability-entry op met route/component, datawijziging, acceptatiecriteria, testbewijs en status. Een feature mag niet stilzwijgend worden samengevoegd of weggelaten.

## Verdeling

| Fase | Primaire groep | Aantal |
|---|---|---:|
| MVP | Platform / Techniek | 5 |
| MVP | Scheidsrechter / Wedstrijdleiding | 1 |
| MVP | Teammanager / Spelers | 3 |
| MVP | Toernooileiding | 10 |
| MVP | Verenigingsmanager | 1 |
| V1 | Pers / Redactie | 3 |
| V1 | Platform / Techniek | 2 |
| V1 | Scheidsrechter / Wedstrijdleiding | 1 |
| V1 | Supporter / Publiek | 1 |
| V1 | Teammanager / Spelers | 3 |
| V1 | Toernooileiding | 23 |
| V1 | Verenigingsmanager | 3 |

## MVP (20)

| # | Feature | Primaire groep | Prioriteit | Acceptatiebetekenis |
|---:|---|---|---|---|
| 3 | Tournament Rules Engine | Toernooileiding | Kritiek | Configureerbare kern waarin per toernooi/leeftijd de wedstrijd-, leeftijds-, dispensatie-, tucht- en arbitrage-regels worden vastgelegd. |
| 8 | Speelgerechtigheidscontrole | Toernooileiding | Kritiek | Controleert ingestelde leeftijds-, dispensatie-, registratie- en schorsingsregels en waarschuwt bij mogelijke ongeldigheid. |
| 10 | Privacy & toestemming spelers | Teammanager / Spelers | Kritiek | Regelt doelgerichte toegang, toestemming, bewaartermijnen en bescherming van persoonsgegevens. |
| 11 | Wedstrijdprogramma | Toernooileiding | Kritiek | Voegt 'Wedstrijdprogramma' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 13 | Interactieve bracket | Toernooileiding | Kritiek | Interactief knock-outschema dat uitslagen en doorgang automatisch verwerkt en mobiel goed bruikbaar is. |
| 19 | Digitale spelerscontrole | Teammanager / Spelers | Kritiek | De scheidsrechter krijgt de gereedgemelde wedstrijdselectie te zien en kan spelers op naam, rugnummer en pasfoto controleren en afwijkingen vastleggen. |
| 22 | Wedstrijd staken / tijdelijk onderbreken | Toernooileiding | Kritiek | Legt bij onderbreking/staking minuut, stand, reden, balbezit of spelhervatting, kaarten, wissels en opmerkingen als snapshot vast. |
| 25 | Uitslagbevestiging | Toernooileiding | Kritiek | Beide teams kunnen de ingevoerde uitslag bevestigen of vóór akkoord een afwijking/opmerking indienen; pas daarna kan de uitslag officieel worden. |
| 27 | Tuchtzaken | Toernooileiding | Kritiek | Voegt 'Tuchtzaken' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 28 | Tuchtdossiers | Toernooileiding | Kritiek | Voegt 'Tuchtdossiers' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 30 | Reglementaire uitslagen | Toernooileiding | Kritiek | Voegt 'Reglementaire uitslagen' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 74 | Audit Log | Platform / Techniek | Kritiek | Voegt 'Audit Log' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 75 | Rollen & rechten | Toernooileiding | Kritiek | Voegt 'Rollen & rechten' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 77 | AVG / Privacy Center | Platform / Techniek | Kritiek | Centrale werkplek waarin relevante informatie, uitzonderingen en acties voor dit onderwerp overzichtelijk samenkomen. |
| 78 | Security | Platform / Techniek | Kritiek | Beveiligt accounts, gevoelige data en kritieke handelingen en maakt beveiligingsgebeurtenissen controleerbaar. |
| 122 | Line-up Lock | Teammanager / Spelers | Kritiek | Voegt 'Line-up Lock' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 124 | Official Match Lock | Scheidsrechter / Wedstrijdleiding | Kritiek | Voegt 'Official Match Lock' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 214 | Contact Privacy | Verenigingsmanager | Kritiek | Regelt doelgerichte toegang, toestemming, bewaartermijnen en bescherming van persoonsgegevens. |
| 296 | Security Event Log | Platform / Techniek | Kritiek | Beveiligt accounts, gevoelige data en kritieke handelingen en maakt beveiligingsgebeurtenissen controleerbaar. |
| 300 | Platform Governance | Platform / Techniek | Kritiek | Voegt 'Platform Governance' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |

## V1 (36)

| # | Feature | Primaire groep | Prioriteit | Acceptatiebetekenis |
|---:|---|---|---|---|
| 1 | Toernooien aanmaken en beheren | Toernooileiding | Hoog | Voegt 'Toernooien aanmaken en beheren' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 5 | Verenigingsprofielen | Verenigingsmanager | Hoog | Voegt 'Verenigingsprofielen' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 6 | Teambeheer | Toernooileiding | Hoog | Voegt 'Teambeheer' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 7 | Spelersregistratie | Teammanager / Spelers | Hoog | Team levert vóór de eerste wedstrijd de officiële toernooiselectie in met naam, KNVB-relatienummer, geboortedatum, rugnummer, actuele pasfoto en eventuele dispensatie. |
| 9 | Spelersmutaties | Teammanager / Spelers | Hoog | Voegt 'Spelersmutaties' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 14 | Wedstrijdwijzigingen | Toernooileiding | Hoog | Voegt 'Wedstrijdwijzigingen' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 15 | Afgelastingen | Toernooileiding | Hoog | Voegt 'Afgelastingen' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 16 | Digitale wedstrijdmap | Toernooileiding | Hoog | Voegt 'Digitale wedstrijdmap' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 17 | Wedstrijdselectie | Toernooileiding | Hoog | Voegt 'Wedstrijdselectie' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 18 | Scheidsrechterportaal | Scheidsrechter / Wedstrijdleiding | Hoog | Voegt 'Scheidsrechterportaal' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 20 | Live wedstrijdcentrum | Toernooileiding | Hoog | Voegt 'Live wedstrijdcentrum' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 21 | Live wedstrijdgebeurtenissen | Toernooileiding | Hoog | Voegt 'Live wedstrijdgebeurtenissen' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 23 | Hervatten gestaakte wedstrijd | Toernooileiding | Hoog | Voegt 'Hervatten gestaakte wedstrijd' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 24 | Wedstrijd annuleren | Toernooileiding | Hoog | Voegt 'Wedstrijd annuleren' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 26 | Digitaal wedstrijdrapport | Toernooileiding | Hoog | Voegt 'Digitaal wedstrijdrapport' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 31 | Directe berichten | Toernooileiding | Hoog | Voegt 'Directe berichten' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 33 | Pushnotificaties | Toernooileiding | Hoog | Voegt 'Pushnotificaties' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 34 | Toernooileiding Command Center | Toernooileiding | Hoog | Centrale werkplek waarin relevante informatie, uitzonderingen en acties voor dit onderwerp overzichtelijk samenkomen. |
| 35 | Club Administrator Dashboard | Verenigingsmanager | Hoog | Centrale werkplek waarin relevante informatie, uitzonderingen en acties voor dit onderwerp overzichtelijk samenkomen. |
| 36 | Teammanager PWA | Toernooileiding | Hoog | Voegt 'Teammanager PWA' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 37 | Publieke Tournament Hub | Supporter / Publiek | Hoog | Voegt 'Publieke Tournament Hub' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 38 | Perscentrum | Pers / Redactie | Hoog | Geautoriseerde pers krijgt wedstrijddata, spelersnamen/rugnummers, statistieken en media te zien voor zover privacy en rechten dat toestaan. |
| 39 | Fotografenportaal | Pers / Redactie | Hoog | Beheert of benut beeldmateriaal met koppeling aan wedstrijd/team, duidelijke rechten en waar nodig moderatie. |
| 40 | Community Media Upload | Pers / Redactie | Hoog | Supporters kunnen foto's/video's aan een wedstrijd koppelen en direct toestemming geven voor gebruik door Haaglanden Voetbal. |
| 82 | Reglementversies | Toernooileiding | Hoog | Voegt 'Reglementversies' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 84 | Incident Center | Toernooileiding | Hoog | Centrale werkplek waarin relevante informatie, uitzonderingen en acties voor dit onderwerp overzichtelijk samenkomen. |
| 167 | Accessibility | Platform / Techniek | Hoog | Voegt 'Accessibility' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 168 | Responsive Design System | Platform / Techniek | Hoog | Voegt 'Responsive Design System' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 245 | Walkover / Bye support | Toernooileiding | Hoog | Voegt 'Walkover / Bye support' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 248 | Duplicate Identity Warning | Teammanager / Spelers | Hoog | Voegt 'Duplicate Identity Warning' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 251 | Bulk Player Approval | Toernooileiding | Hoog | Voegt 'Bulk Player Approval' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 252 | Approval Reason Codes | Toernooileiding | Hoog | Voegt 'Approval Reason Codes' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 253 | Resubmission Workflow | Toernooileiding | Hoog | Voegt 'Resubmission Workflow' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 257 | Club Exclusion Management | Verenigingsmanager | Hoog | Voegt 'Club Exclusion Management' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 259 | Tournament Finalization | Toernooileiding | Hoog | Voegt 'Tournament Finalization' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |
| 260 | Season Lock | Toernooileiding | Hoog | Voegt 'Season Lock' als afzonderlijke capability toe aan TournamentOS, met passende rollen, statussen en historie. |

## Opleverregel

Een rij telt alleen als geïmplementeerd wanneer de zichtbare flow werkt, de relevante rol toestemming heeft, data na refresh consistent blijft, fout/lege/loadingstatussen bestaan en er test- of browserbewijs is. Een visuele kaart zonder gedrag telt niet.

