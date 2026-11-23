# HV Control — acceptatiechecklist voor de laatste prototypecontrole

Versie: 18 · 23 november 2026 · Referentie: `HV-Control-Functioneel-Ontwerp.md`

Deze checklist maakt de gewenste werking toetsbaar. De rijen zijn geen vooraf ingevulde verklaring dat ieder scenario al geslaagd is. De uitvoerder legt bewijs en afwijkingen vast. Productiecontroles voor de VPS staan apart, zodat mock-uitvoering niet wordt verward met externe bezorging, echte autorisatie of gedeelde serveropslag.

## Werkwijze en bewijs

1. Begin met de schone demo en noteer de release/versie, browser, viewport, geselecteerde editie en demo-accountcontext.
2. Gebruik fictieve personen en veilige voorbeeldbestanden. Bewaar de betrokken wedstrijd-, speler- en dossier-ID's in het testverslag.
3. Doorloop de handelingen in de interface; controleer vervolgens de gevolgen in de andere betrokken schermen.
4. Herhaal relevante stappen bij een fout, dubbelklik, herladen en terugnavigeren. Een fout mag geen onbedoelde mutatie achterlaten.
5. Leg bij een geslaagde controle het testbestand of UI-bewijs vast. Een scenario met uitsluitend domeinbewijs krijgt nog geen claim dat de hele UI is beoordeeld.
6. Controleer de kritieke processen op telefoon, tablet en desktop. Een doelbewust scrollvlak in kalender/bracket is iets anders dan horizontale overloop van de pagina.
7. Herstel de demo na experimentele wijzigingen, zodat de opdrachtgever een samenhangende beginstand krijgt.

Gebruik als uitkomst: **Open**, **Geslaagd**, **Afwijking** of **VPS-controle**. Schrijf een praktische afwijking en verwijs naar de eis; verander geen eis om een fout als geslaagd te kunnen markeren.

| Bewijstype | Betekenis |
| --- | --- |
| D | Geautomatiseerde domein-/integratiecontrole met echte gedeelde modules. |
| U | Uitgevoerde gebruikershandeling en zichtbare uitkomst in de gebouwde UI. |
| R | Responsiviteit, toetsenbord, focus, schaal en visuele controle. |
| P | Productievoorwaarde die bij de VPS-bouw werkelijk moet worden getest. |

## A. Scope, Shell en navigatie

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-001 | BAS-01, BAS-02 | Loop bekers, reglementen, beheer en openbare schema's door. Alleen knock-out en eigen administratie zijn onderdeel van de flow; er is geen Sportlink- of poulestandfunctie. | D/U | Open |
| AC-002 | BAS-03–05 | Bevestig een normale uitslag als scheidsrechter. Geen verplicht teamakkoord; een daarna ingediend bezwaar opent een dossier zonder automatische scorewijziging. | D/U | Open |
| AC-003 | BAS-06–09 | Bekijk een voorronde en finale. Thuislocatie respectievelijk finalelocatie klopt; publiek ziet normale labels en geen besloten identificatievelden. | D/U | Open |
| AC-004 | BAS-10, UI-01–03 | Vergelijk alle pagina's met Home: zelfde Shell, contentrail, herohoogte, panelen, gaps, hoeken en knopfamilie. Lange teamnamen passen binnen het grid. | R | Open |
| AC-005 | UI-04, PUB-02 | Wissel alle bekertabs en relevante detailtabs. De hoofdopbouw blijft staan; korte/lange inhoud gebruikt dezelfde gereserveerde componentruimte. | U/R | Open |
| AC-006 | UI-05, OPG-03 | Controleer de scheidsrechterroute op smal scherm: programma → wedstrijdmenu → afzonderlijke actie. Geen overlappende rollen-/actietabs. | U/R | Open |
| AC-007 | UI-06–08 | Controleer links, formulieren en fouten: geen decoratieve tekstonderstreping, labels zichtbaar, invoer blijft bij fout behouden, ontbrekende voorwaarden worden uitgelegd. | U/R | Open |
| AC-008 | UI-07 | Open iedere pagina bij 360, 800 en minimaal 1120 px. Geen horizontale documentoverloop; tijdlijn/kalender/bracket mogen een eigen herkenbaar scrollvlak hebben. | R | Open |
| AC-009 | UI-09 | Doorloop hoofdflows met toetsenbord. Focus zichtbaar; tabs, combobox, dialoog, annuleren en terugkeer werken logisch. Status is niet uitsluitend kleur. | U/R | Open |
| AC-010 | UI-10, LOT-07 | Schakel reduced-motion in en doorloop dezelfde acties en lotingsshow. Inhoud blijft identiek, bediening blijft bereikbaar, intensieve animatie stopt. | R | Open |
| AC-011 | UI-11, UI-12, BAS-11 | Controleer beelden, demo-aanduidingen en foutmeldingen. Sfeerbeeld is geen bewijsfoto; mock-ontvangst wordt niet als echt verzonden push/e-mail aangeduid. | U/R | Open |
| AC-012 | DOC-01–04 | Open Handleiding en downloads. Ontwerp, selectie, eisen en checklist zijn bereikbaar en spreken elkaar niet tegen. | U | Open |
| AC-013 | Pagina-inventaris, PUB-08 | Oude bezoekers-/app-ingangen hebben een passende compatibele bestemming. Nieuwe modules gebruiken dezelfde navigatie; onbekende routes melden dit duidelijk. | U | Open |

## B. Accounts, context en persoonlijke startpagina

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-014 | ACC-01–04 | Kies een voorbeeldpersoon met twee rollen en wissel context. Eigen club-/team-/wedstrijdbereik verandert passend; identiteit en oude audit blijven behouden. | D/U | Open |
| AC-015 | ACC-02–04 | Probeer vanuit team A een besloten actie van team B en vanuit een niet toegewezen official een spelerscontrole. De handeling wordt geweigerd met passende uitleg. | D/U | Open |
| AC-016 | ACC-03 | Trek een bevoegdheid in of laat tijdelijke delegatie verlopen. De volgende mutatie gebruikt geen oude toegang uit het formulier; audit benoemt de handelende context. | D/U | Open |
| AC-017 | ACC-05, GER-04 | Open de startpagina als toernooileiding, clubleiding, teamleiding, scheids, speler en supporter. Eerstvolgende actie/duel en meldingen zijn per context relevant. | U | Open |
| AC-018 | ACC-05 | Gebruik een context zonder wedstrijden of favorieten. Duidelijke lege staat met juiste vervolgstap; geen gegevens van een willekeurige andere club. | U | Open |

## C. Identiteit, edities, archief en bekerbeheer

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-019 | DAT-01, DAT-02 | Wijzig naam of plan een wedstrijd opnieuw. HV-ID blijft gelijk; relatiecode blijft besloten en wordt niet bij een externe partij opgevraagd. | D/U | Open |
| AC-020 | DAT-03, DAT-04 | Koppel dezelfde persoon aan een nieuw team of een nieuwe editie. De persoon houdt zijn ID; teamrelatie en reglementaire deelname worden afzonderlijk beoordeeld. | D/U | Open |
| AC-021 | DAT-03 | Maak een mogelijk dubbel persoon met conflicterende identificatie. Toon conflict, gecontroleerde koppel-/samenvoegprocedure en historische verwijzingen. Geen stil samenvoegen op naam. | D/U | Open |
| AC-022 | DAT-05 | Controleer een import en een handmatige correctie. Actor, tijdstip, reden, bron en oude/nieuwe versie zijn terug te vinden. | D/U | Open |
| AC-023 | EDI-01–03 | Maak een nieuwe editie op basis van de vorige. Gekozen basis wordt gekopieerd; oude opgaven, controles, uitslagen en goedkeuringen worden niet als nieuw goedgekeurd gebruikt. | D/U | Open |
| AC-024 | EDI-01, EDI-06 | Wissel tussen twee edities. Programma, deelnemers, reglementen en cijfers blijven gescheiden; historische namen/relaties blijven begrijpelijk. | D/U | Open |
| AC-025 | EDI-03 | Controleer een winter- en zomerdatum en een T−60-/bezwaartermijn. Tijdzone en tijdstempels zijn consistent; demoklok is herkenbaar. | D/U | Open |
| AC-026 | EDI-04 | Probeer een beker af te sluiten met onbesliste finale/open dossier. Afsluiting blokkeert met concrete resterende acties. | D/U | Open |
| AC-027 | EDI-05, EDI-06 | Sluit een afgeronde beker af, heropen met reden en sluit opnieuw. Eén archiefidentiteit met revisies; volledig schema, regels, gebeurtenissen, finale en IDs zijn raadpleegbaar. | D/U | Open |
| AC-028 | EDI-04, BAS-09 | Vergrendel de editie en probeer een sportieve mutatie. Mutatie blokkeert; heropening is gemotiveerd. Publieke privacy blijft ook in oude archieven gelden. | D/U | Open |
| AC-029 | BEK-01, BEK-02 | Voeg een beker toe en schrijf eigen teams in. Dynamische filters/pagina's herkennen de beker; dubbele/uitgesloten inschrijving wordt tegengehouden. | D/U | Open |
| AC-030 | BEK-02 | Keur een inschrijving goed, vraag aanvulling of wijs af. Status, reden en actor verschijnen bij club en organisatie; afwijzing plaatst geen team in het officiële bracket. | D/U | Open |
| AC-031 | BEK-03–05 | Wijzig alle relevante wedstrijdregels en publiceer een versie. Geldige combinaties worden opgeslagen; ongeldig aantal/duur/beslisregel geeft concrete fout. | D/U | Open |
| AC-032 | BEK-04, BEK-05 | Start een duel en wijzig daarna algemene regels. Gestart duel houdt zijn vastgelegde versie; nieuwe duels volgen de juiste effectieve versie. | D/U | Open |

## D. Bracket, doorstromen en lotingsshow

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-033 | LOT-01–03 | Bouw en herschik een bracket met toegelaten deelnemers. Dubbele/ontbrekende teams worden gemeld; concept en publicatie blijven onderscheiden. | D/U | Open |
| AC-034 | LOT-02 | Maak een vrijloting en een walkover. Beide hebben juiste doorgang; geen fictieve gespeelde score of goals in statistieken. | D/U | Open |
| AC-035 | LOT-01, LOT-03 | Plan 'Winnaar wedstrijd …' en bepaal later de deelnemers. Dezelfde node/tijd/veld blijft bestaan; alleen de juiste namen worden ingevuld. | D/U | Open |
| AC-036 | LOT-04, BEZ-06 | Test automatische en handmatige rondevoortgang, daarna open bezwaar met rondehold. Automatisch werkt alleen waar toegestaan; handmatige/holdroute wacht zichtbaar. | D/U | Open |
| AC-037 | LOT-05, UIT-05 | Probeer een deelnemer/uitslag te veranderen die een begonnen of gecontroleerde vervolgwedstrijd raakt. Geen stille herschrijving; concrete blokkade/organisatieactie. | D/U | Open |
| AC-038 | LOT-06 | Doorloop lotingswizard met potten en voorwaarden. Controleerbaarheid, concept, vastgelegde trekking en publicatie zijn afzonderlijk zichtbaar. | D/U | Open |
| AC-039 | LOT-07 | Zet lotingsshow uit: publieke presentatie is niet beschikbaar, trekking blijft bewaard. Zet aan en test pauze/volgende/herhaling/reduced-motion; resultaat verandert niet. | U/R | Open |

## E. Kalender, planning, locaties en import

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-040 | PLA-01, PUB-03 | Open dag/week/maand op meerdere datums en bekers. Alle relevante rondes en historische/handmatige wedstrijden zijn vindbaar. | U | Open |
| AC-041 | PLA-02 | Open een dag met duels en een lege dag. Horizontaal 13.00–23.00; één rij per duel; lege dag precies één duidelijke lege rij. Vroeg duel blijft vindbaar. | U/R | Open |
| AC-042 | PLA-03 | Verplaats hetzelfde duel via drag-and-drop en formulier. Zelfde controles/ID; oude/nieuwe afspraak zichtbaar; toetsenbord en mobiel alternatief werken. | D/U/R | Open |
| AC-043 | PLA-04, BAS-12 | Voeg een nieuw duel en een historisch duel met alleen eindstand toe. Geen verzonnen spelersgebeurtenissen; historische bronkwaliteit zichtbaar. | D/U | Open |
| AC-044 | PLA-05 | Importeer CSV met geldige, dubbele, onbekende en ongeldige regels. Proefcontrole toont fouten en verwerkt geen ongeldige rijen. | D/U | Open |
| AC-045 | PLA-06, BAS-06 | Wijzig thuisteam en bekijk finale. Locatie volgt de eigen thuisclub buiten finaledag en ingestelde centrale locatie op finaledag. | D/U | Open |
| AC-046 | PLA-07 | Probeer overlap van team, veld en heel-/deelveld; toets rust, reistijd en locatiegrens. Concrete conflictreden en herstelroute; onbevestigde externe beschikbaarheid is herkenbaar. | D/U | Open |
| AC-047 | PLA-08 | Dien wijziging in, laat andere club reageren en organisatie besluiten. Oude afspraak blijft leidend tot akkoord; daarna kalender/briefing/meldingen consistent. | D/U | Open |
| AC-048 | PLA-09 | Bekijk impactvoorstel bij verplaatsen. Betrokken teams, official en middelen worden getoond vóór definitieve publicatie. | U | Open |
| AC-049 | PLA-08, UIT-02 | Leg spoedafgelasting vast met reden. Publiek ziet bevestigde status; organisatie krijgt herplanningstaak, geen stil verschoven aftrap. | D/U | Open |

## F. Spelerslijst, opgave en controle

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-050 | SPL-01–03 | Vul lijst, dien in en probeer rechtstreeks te wijzigen. Ingediende versie staat vast; aanvulling/verzoek maakt gecontroleerde nieuwe versie. | D/U | Open |
| AC-051 | SPL-02, SPL-03 | Beoordeel hele lijst en speler/verzoek. Alleen goedkeuring wijzigt de geldige selectie; afwijzingsreden en eerdere gegevens blijven beschikbaar. | D/U | Open |
| AC-052 | SPL-04, BEK-03 | Selecteer een te jonge/oude speler met en zonder dispensatie en overschrijd het maximum. Juiste peildatum; overschrijding blokkeert met genoemde oorzaak. | D/U | Open |
| AC-053 | SPL-05, OPG-01 | Probeer onbekende/niet-goedgekeurde/geschorste speler te selecteren. Geen vrije invoeromweg; juiste blokkade in opgave en aftrap. | D/U | Open |
| AC-054 | OPG-01 | Dien dubbele rugnummers, twee aanvoerders, ontbrekende keeper of te grote selectie in. Geen geldige indiening; fout is specifiek en behoudt invoer. | D/U | Open |
| AC-055 | OPG-02, OPG-09 | Maak een nieuwe opgaveversie en wijzig later de toernooilijst. Controle geldt voor juiste versie; gestarte wedstrijd houdt de vastgelegde momentopname. | D/U | Open |
| AC-056 | OPG-03, OPG-04 | Scheids opent programma, duel en controle binnen juiste venster/aanstelling. Thuis/uit naam, geboortedatum en foto alleen in besloten controle zichtbaar. | D/U/R | Open |
| AC-057 | OPG-05, OPG-08 | Markeer basisspeler en keeper afwezig. Controle-uitkomst kan afgerond zijn, maar feitelijke bezetting/keeper bepaalt apart of starten is toegestaan. | D/U | Open |
| AC-058 | OPG-06 | Vervang vóór aftrap een afwezige starter door toegelaten reserve. Nieuwe effectieve opstelling, reden en noodzakelijke controle zijn bewaard. | D/U | Open |
| AC-059 | OPG-07 | Laat een toegelaten speler later aankomen en probeer een onbekende speler toe te voegen. Alleen gecontroleerde toegestane toetreding; tijd/status en identiteit worden vastgelegd. | D/U | Open |
| AC-060 | OPG-08, GER-01 | Probeer aftrap met open aanstelling/opgave/controle. De harde startvoorwaarde blokkeert en verwijst naar de juiste actie. | D/U | Open |

## G. Arbitrage en officiële overdracht

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-061 | ARB-01, ARB-02 | Leg beschikbaarheid per datum vast en vergelijk kandidaten op kwalificatie, clubbinding, reistijd en overlap. Uitleg bij ongeschikte kandidaat. | D/U | Open |
| AC-062 | ARB-03 | Laat uitnodiging accepteren, weigeren en verlopen. Statussen, reden, deadline en vervangtaak kloppen; weigering telt niet als bevestigd. | D/U | Open |
| AC-063 | ARB-04 | Verplaats een duel buiten beschikbaarheid van de official. Herbevestiging/vervanging gevraagd; oude aanstelling wordt niet als probleemloos behouden. | D/U | Open |
| AC-064 | ARB-05, ARB-06 | Wijs reserve aan en vervang tijdens live duel. Minuut, reden en overgedragen beeld blijven bewaard; bevoegdheden gaan correct over. | D/U | Open |

## H. Klok, waarnemingen, uitslag en restant

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-065 | KLO-01–03 | Doorloop eerste helft, rust en tweede helft met pauze/herladen. Correcte fase/basisminuut; geen terugval naar eerste helft na heropenen. | D/U | Open |
| AC-066 | KLO-02 | Registreer 45+2 en een korte jeugdhelft met toegevoegde tijd. Presentatie en chronologische sortering volgen de fase. | D/U | Open |
| AC-067 | KLO-01, BEK-03 | Doorloop verlenging waar toegestaan en probeer deze waar niet toegestaan. Alleen geldige beslisroute en juiste duur. | D/U | Open |
| AC-068 | GEB-01–03 | Registreer goal door bankspeler, omgekeerde wissel en inkomende uitgesloten speler. Alle ongeldige acties blokkeren. | D/U | Open |
| AC-069 | GEB-03, TUC-01 | Rood op 20′, inkomende wissel op 35′. Speler kan niet terugkeren; geval met tweede geel en later ingevoerde chronologische kaart eveneens controleren. | D/U | Open |
| AC-070 | GEB-04, GEB-07 | Team meldt eigen goal; ander team probeert die als eigen bron te wijzigen. Alleen eigen melding mogelijk; scheids bevestigt/weigert met zichtbare status. | D/U | Open |
| AC-071 | GEB-05, BET-02 | Verstuur exact commando tweemaal en herhaal na herstel. Eén verwerking, één gebeurtenis, geen dubbele goal. | D/U | Open |
| AC-072 | GEB-06 | Manager en scheids melden hetzelfde moment. Systeem toont overeenkomst; samenvoegen bewaart beide bronnen en telt één feit. Twee echte afzonderlijke goals blijven mogelijk. | D/U | Open |
| AC-073 | PEN-01, PEN-02 | Speel een penaltyserie met raak/mis en beslissende winnaar. Seriestand apart van wedstrijdscore; geen serieschoten bij topscorers/reguliere goals. | D/U | Open |
| AC-074 | UIT-01, UIT-02 | Controleer en bevestig eindstand met nog voorlopige/dubbele registratie. Afwikkeling is duidelijk; officiële score en geldige winnaar werken overal door. | D/U | Open |
| AC-075 | UIT-02 | Publiceer normaal scheidsresultaat zonder teamakkoord. Openbaar en bracket gebruiken dezelfde officiële versie; handmatige doorstroming wacht op vrijgave. | D/U | Open |
| AC-076 | UIT-03 | Onderbreek op concrete minuut/stand. Momentopname bevat veldspelers, kaarten, wissels, fase en hervattingswijze; private rapportage blijft besloten. | D/U | Open |
| AC-077 | UIT-03, UIT-04 | Hervat direct en als later restant. Begin vanaf opgeslagen beeld; bestaande goals tellen niet nogmaals. Nieuw praktisch tijdslot is gekoppeld. | D/U | Open |
| AC-078 | UIT-04–06 | Test overspelen, stand handhaven en walkover/correctie. Historie blijft; begonnen vervolgronde wordt niet stil herschreven; publiek ziet juiste aard uitkomst. | D/U | Open |

## I. Bezwaar, herziening en tucht

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-079 | BEZ-01, BEZ-02 | Dien binnen termijn eigen bezwaar in, herhaal en probeer als ander team. Eigen dossiernummer/ontvangst; duplicaat en onbevoegd verzoek worden begrensd. | D/U | Open |
| AC-080 | BEZ-01, BEZ-05 | Dien buiten termijn in en controleer termijninstellingen/uitzonderingsroute. Geen stil geldig bezwaar buiten beleid; uitleg en tijdstempel kloppen. | D/U | Open |
| AC-081 | BEZ-02–04 | Voeg reactie en veilig bewijs toe aan bestaand dossier. Bevoegde partijen zien dit; interne notitie en privébestand zijn niet openbaar. | D/U | Open |
| AC-082 | BEZ-03 | Wijs behandelaar/deadline toe, vraag beide partijen/official om reactie en beantwoord. Taak, ontvangers en status veranderen passend. | D/U | Open |
| AC-083 | BEZ-05, BEZ-06 | Wijs af, verklaar gegrond zonder scorewijziging en voer expliciete correctie uit. Besluitprint bevat motivering; officiële bron blijft tot ander besluit geldig. | D/U | Open |
| AC-084 | BEZ-05 | Vraag toegestane herziening met reden binnen termijn. Eigen fase en besluitgeschiedenis; herhaald of niet toegestaan verzoek wordt uitgelegd. | D/U | Open |
| AC-085 | BEZ-06, LOT-04 | Activeer rondehold voor open dossier. Ronde wacht zichtbaar; dit creëert geen verplicht teamakkoord voor normale uitslagen. | D/U | Open |
| AC-086 | TUC-01, TUC-02 | Maak kaartzaak en los incidentrapport. Los rapport legt niet automatisch sanctie op; formeel besluit toont juiste type, bron en ingang. | D/U | Open |
| AC-087 | TUC-03 | Geef op 5 juni twee duels schorsing en importeer daarna een duel van 1 mei. Resterend blijft twee; alleen geldige daaropvolgende duels kunnen meetellen. | D/U | Open |
| AC-088 | TUC-03 | Laat een schorsing gedeeltelijk uitzitten, draai tellend duel terug of laat overspelen. Resterend wordt gecontroleerd herberekend. | D/U | Open |
| AC-089 | TUC-04, TUC-05 | Trek bronkaart in of hef sanctie op met reden. Historie blijft; deelnamecontrole volgt geldig besluit; privérapport wordt niet gepubliceerd. | D/U | Open |

## J. Gereedheid, taken, meldingen en briefing

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-090 | GER-01, GER-02 | Bekijk dezelfde wedstrijd als manager, official en organisatie. Voorwaarden komen uit dezelfde bron; harde blokkades en afspraken zijn onderscheidbaar. | D/U | Open |
| AC-091 | GER-02, GER-03 | Pak taak op, wijs andere eigenaar/deadline toe en rond bronactie af. Toewijzen is geen nepgoedkeuring; echte bronactie werkt in de taak door. | D/U | Open |
| AC-092 | GER-03, GER-04 | Laat taak verlopen en open vanuit de werkvoorraad. Herinnering/escalatie en exacte dossier-/wedstrijdcontext werken. | D/U | Open |
| AC-093 | COM-01, COM-02 | Verstuur relevante melding aan twee ontvangers. Alleen geadresseerden zien deze; lezen door één maakt de melding niet voor de ander gelezen. | D/U | Open |
| AC-094 | COM-02, COM-03 | Vraag expliciete ontvangst van veldwijziging. Ontvangen, gelezen en bevestigd blijven verschillend; demo claimt geen externe bezorging. | D/U | Open |
| AC-095 | COM-03, COM-04 | Herinner bij uitblijven reactie. Geen onbeperkte dubbelen; gesprek en interne notities hebben passende deelnemers. | D/U | Open |
| AC-096 | COM-05 | Geef beschikbaarheid voor twee verschillende duels en wijzig er één. Andere antwoord blijft behouden; manager ziet niet gereageerd/beschikbaar/overleg/afwezig. | D/U | Open |
| AC-097 | COM-06 | Open briefing via link als publiek en als eigen manager/speler. Praktische brongegevens kloppen; besloten instructie blijft beperkt; QR geeft geen extra rechten. | D/U | Open |
| AC-098 | COM-07 | Voer shirt/broek/sokken thuis/uit in en creëer kleurconflict. Wedstrijd toont juiste afspraak en begrijpelijke waarschuwing. | D/U | Open |

## K. Statistieken, kwaliteit en historie

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-099 | STA-01–03 | Vergelijk score/eventcorrectie op wedstrijd, live, team, club en editie. Eén bron; voorlopige en officiële totalen blijven onderscheiden. | D/U | Open |
| AC-100 | STA-01, STA-11 | Team in twee bekers en goedgekeurde inschrijving vóór indeling. Unieke teams, inschrijvingen, ingedeeld en actief krijgen verschillende juiste aantallen. | D/U | Open |
| AC-101 | STA-02 | Voeg historische 3–1 zonder events toe. Vier teamgoals, geen verzonnen spelersgoals; volledigheidslabel zichtbaar. | D/U | Open |
| AC-102 | STA-04 | Start nummer 19 en laat reserve nummer 7 niet invallen. Basisplaats/minuten volgen positie en aanwezigheid, niet rugnummer. | D/U | Open |
| AC-103 | STA-05 | Doorwisselen: speler uit, terug in, later rood of late toetreding. Som van daadwerkelijke veldintervallen klopt; geen minuten tijdens afwezigheid. | D/U | Open |
| AC-104 | STA-06, PEN-02 | Bereken goals per90 met te weinig/betrouwbare/onvolledige minuten en penaltyserie. Drempel/bronkwaliteit zichtbaar; serieschoten uitgesloten. | D/U | Open |
| AC-105 | STA-07 | Bevestig dezelfde gele/tweede gele/rode kaart en wissel opnieuw. Geen dubbele telling; uitleg telwijze tweede geel aanwezig. | D/U | Open |
| AC-106 | STA-08, STA-09 | Bekijk clean sheets, vorm, onderlinge historie en duel tussen twee teams van één club. Clubduel telt eenmaal; editie/bekercontext herkenbaar. | D/U | Open |
| AC-107 | STA-10, PRI-02 | Filter statistieken en bekijk afgeschermde speler in alle profielen. Publieke projectie is consequent; geboortedatum/relatiecode ontbreken in exports. | D/U | Open |
| AC-108 | STA-11, STA-12 | Open organisatiecijfers zonder en met gegevens. Teller/noemer duidelijk; geen 100% bij nul gegevens. Kwaliteitsissue opent de juiste bron. | D/U | Open |

## L. Publiek, redactie, privacy en beleving

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-109 | PUB-01, PUB-02 | Controleer Home: programma/bekeringangen vóór nieuws, drie uitgelichte posts en tien laatste titels; geen concept/toekomstige post. | U/R | Open |
| AC-110 | PUB-03, PUB-04 | Open geplande, live en afgeronde wedstrijd. Live pas na echte start; onbekend ID geeft keuzehulp; score/status/bracket consistent. | D/U | Open |
| AC-111 | PUB-05, PUB-06 | Zoek en volg via autofill met toetsenbord. Alleen openbare zoekresultaten; geen permanente inline-scrolllijst of besloten velden. | U/R | Open |
| AC-112 | PUB-07 | Volg twee clubs, teams en een beker met overlappend nieuws. Persoonlijke tijdlijn combineert alle bronnen en dedupliceert. | D/U | Open |
| AC-113 | NIE-01–03 | Maak gekoppeld concept met kop, citaat en beeld; preview zonder publicatie; laat controleren, plan/publiceer en herstel revisie. Relevante feeds tonen één juiste post. | D/U | Open |
| AC-114 | NIE-04 | Zet verslagconcepten uit en aan. Uit maakt geen nieuw concept; aan gebruikt alleen bevestigde feiten en publiceert niet automatisch. | D/U | Open |
| AC-115 | NIE-05 | Corrigeer bronwedstrijd na concept/publicatie. Redactie krijgt hercontrole; gepubliceerd artikel wordt niet stil herschreven. | D/U | Open |
| AC-116 | MED-01–03 | Dien beeld in met alleen artikelrechten. Niet publiek voor review; na goedkeuring alleen toegestaan doel. Intrekken verwijdert uit galerij/artikel/download. | D/U | Open |
| AC-117 | MED-02, MED-04 | Beoordeel persaanvraag en download toegestane media. Credit en rechten mee; metadata-/videodemo is eerlijk gelabeld. | D/U | Open |
| AC-118 | PRI-01, PRI-02 | Beperk naam/foto/statistiek/publicatie in meerdere bekercontexten. Controlefoto blijft apart; jeugdbeleid komt niet uitsluitend uit team-ID-suffix. | D/U | Open |
| AC-119 | PRI-03 | Zet openbare opstellingen aan bij nog niet goedgekeurde opgave. Geen publicatie vóór geldige review/embargo; website en pers gelijk. | D/U | Open |
| AC-120 | PRI-04, EDI-06 | Trek persoons-/beeldpublicatie in en bekijk profiel, lijst, export en archief. Geen omweg via oude editie of artikel. | D/U | Open |
| AC-121 | BEV-01, BEV-02 | Open Road to Houtrust van meerdere teams/bekers. Echte duels/byes/volgende afspraak; mogelijke tegenstander wordt niet als bewezen finalist getoond. | D/U/R | Open |
| AC-122 | BEV-03 | Bekijk bekerkast na afsluiten en naamwijziging. Prijs blijft aan juiste HV-entiteit/archiefrevisie gekoppeld; mockprijs herkenbaar. | D/U | Open |
| AC-123 | BEV-04, BEV-05 | Nomineer moment, modereer, stem tweemaal en trek nominatie in. Alleen goedgekeurd publiek; stembegrenzing; officiële statistieken blijven gelijk. | D/U | Open |
| AC-124 | KAART-01–03 | Selecteer veld/voorziening/wedstrijd op kaart en in lijst. Actuele centrale aftrap/veld klopt; mobiel/toetsenbord bruikbaar; geen geclaimde GPSprecisie. | D/U/R | Open |

## M. Finaledag en vrijwilligers

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-125 | FIN-01–03 | Voeg bekerfinale toe, wijs kamers toe en check team in. Alle bekers gebruiken echte finalenodes; ontvangst en openbaar programma blijven gekoppeld. | D/U | Open |
| AC-126 | FIN-02, FIN-04 | Meld tien minuten uitloop. Gepland/verwacht/werkelijk onderscheiden; gevolgenvoorstel bevat volgende duels, officials, kamers, vrijwilligers en ceremonie. | D/U | Open |
| AC-127 | FIN-04–06, KAART-02 | Publiceer het voorstel. Centrale kalender, kaart en gerichte meldingen veranderen samen; publiek zag het concept niet voortijdig. | D/U | Open |
| AC-128 | FIN-05 | Test heel-/deelveld, kamerbezetting en vrijwilligers buiten beschikbaarheid na uitloop. Conflict zichtbaar vóór publicatie. | D/U | Open |
| AC-129 | VRI-01, VRI-02 | Maak dienst/rol/persoon, schrijf in, vul capaciteit en wachtlijst. Overlap/beschikbaarheid gecontroleerd; afmelden en vervanging werken. | D/U | Open |
| AC-130 | VRI-02, VRI-03 | Check in, markeer no-show en vervang. Eigen dienstinformatie passend; geen spelersadministratie voor vrijwilliger. | D/U | Open |
| AC-131 | FIN-07, BET-06 | Print noodpakket/draaiboek. Geldige versie/printtijd en privacy passen; papier claimt geen liveactualiteit. | U | Open |

## N. Betrouwbaarheid en herstel in de demo

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-132 | BET-01, BET-04 | Simuleer opslagfout/offline. Eerlijke status; geen succesclaim voor niet opgeslagen actie of echte externe serverontvangst. | D/U | Open |
| AC-133 | BET-02, BET-03 | Bewaar commando offline, herstel en herhaal. Eén sportief effect; achterhaalde versie vraagt conflictcontrole. | D/U | Open |
| AC-134 | BET-03, BET-05 | Heropen app met wachtrij en beschikbare update. Commando's/ingevuld duel blijven bestaan; beheerste update. | D/U | Open |
| AC-135 | BET-06 | Download noodpakket als publiek en als bevoegd account. Alleen passende gegevens; privéfoto's niet in publiek offlinepakket. | D/U | Open |
| AC-136 | BET-07, DAT-05 | Los kwaliteitsissue op met reden. Bron en oude/nieuwe versie zichtbaar; issue verdwijnt alleen wanneer de bron werkelijk klopt. | D/U | Open |
| AC-137 | DEM-01–03 | Herstel de demo met bevestiging. Voorbeeldgegevens samenhangend; testverslag verwijst naar release en concrete scenario's. | D/U | Open |

## O. Apart te bewijzen bij de VPS-bouw

Deze rijen zijn geen blokkerende claim over wat de lokale mockomgeving al moet bewijzen. Ze horen bij de productieoplevering.

| Check | Eis(en) | Productiecontrole | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| VPS-AC-01 | VPS-01–03, ACC-04 | Echte accounts en servercontrole op iedere lees-/schrijfactie, inclusief object- en veldrechten. Ongeldige context faalt ook buiten de UI. | P | VPS-controle |
| VPS-AC-02 | VPS-03, BET-02 | Twee apparaten wijzigen gelijktijdig hetzelfde duel. Geen verloren update; uitslag en doorstroming atomair; idempotent herhalen. | P | VPS-controle |
| VPS-AC-03 | VPS-03, EDI-03 | Serverklok, deadlines, wintertijd/zomertijd en verschillende apparaatklokken leveren dezelfde geldige uitkomst. | P | VPS-controle |
| VPS-AC-04 | VPS-04, COM-02 | Mail/push echt bezorgd, fout/retry/status per ontvanger; expliciete bevestiging verschilt van gelezen. | P | VPS-controle |
| VPS-AC-05 | VPS-05, PRI-01–04 | Private bestanden alleen met geldige tijdgebonden toegang; intrekken en cacheverval getest; geen ongewenste openbare data. | P | VPS-controle |
| VPS-AC-06 | VPS-03–05, BET-03 | Werkelijke offline invoer en reconnect op meerdere apparaten, conflicten, intrekking tijdens offline en veilige wachtrij. | P | VPS-controle |
| VPS-AC-07 | VPS-06, BET-05 | Reproduceerbare deployment, versie-update met lopende wedstrijd en herstel naar vorige release. | P | VPS-controle |
| VPS-AC-08 | VPS-06, BET-08 | Back-up terugzetten in een schone omgeving en herstelbaarheid van database/objectbestanden/audit aantonen. | P | VPS-controle |
| VPS-AC-09 | VPS-07, UI-09 | Screenreader-/toetsenbordtaken, reële mobiele apparaten, belasting tijdens parallelle wedstrijden en foutmonitoring. | P | VPS-controle |

## Gekoppeld automatisch bewijs uit de v15-controles

De onderstaande scenario's zijn afzonderlijk teruggevonden in de gerichte testbestanden en de beschikbare geslaagde suite-uitvoer. De koppeling betreft uitsluitend het genoemde domeingedrag. Een samengestelde check uit de hoofdlijst blijft voor de laatste gebruikers- en visuele controle **Open**, ook wanneer het D-deel al geslaagd is. Een scenario in deze tabel bewijst geen externe server, mailbezorging of productieautorisatie.

| Check(s) | Gericht automatisch scenario | Testbestand | D-status |
| --- | --- | --- | --- |
| AC-014, AC-015, AC-053 | Eigen teamcommando toegestaan, vreemd team geweigerd; scheidsrechterbevoegdheid volgt de aanstelling. | `tests/v15-system.test.cjs`: `team commands reject another team…`; `referee scope follows assignment…` | Geslaagd voor deze scenario's |
| AC-019, AC-020 | De bestaande 75 wedstrijdidentiteiten blijven behouden; dezelfde persoon houdt één HV-ID over meerdere teamrelaties. | `tests/v15-editions.test.cjs`: `existing edition preserves…`; `same registered person keeps one HV-ID…` | Geslaagd |
| AC-021 | Alias/samenvoeging bewaart de doelidentiteit en weigert tegenstrijdige geboortedata. | `tests/v15-editions.test.cjs`: `controlled identity alias preserves target…` | Geslaagd |
| AC-020, AC-024 | Een overgang laat oude opgaven intact en beëindigt niet onbedoeld een andere gelijktijdige teamrelatie. | `tests/v15-editions.test.cjs`: `team transition keeps past rosters intact…`; `a transition from one team leaves another…` | Geslaagd |
| AC-023, AC-024 | Geselecteerde basis kopiëren zonder goedkeuring-/wedstrijddossiers; edities isoleren en herstellen de juiste kalender. | `tests/v15-editions.test.cjs`: `new edition copies selected setup…`; `working edition switching isolates calendars…` | Geslaagd |
| AC-025 | Amsterdam winter/zomer en onbestaande voorjaarstijd; sanctie-ingang tegen de gekozen wedstrijd. | `tests/v15-system.test.cjs`: `clock converts Amsterdam winter/summer…`; `tests/v15-cases.test.cjs`: `sanction effective date applies…` | Geslaagd |
| AC-027, AC-028 | Eén archiefidentiteit met onveranderlijke revisies; openbare snapshot bevat geen besloten opgavevelden. | `tests/v15-editions.test.cjs`: `archive reopening produces…`; `tests/v15-system.test.cjs`: `a full edition archive is revisioned…` | Geslaagd |
| AC-033, AC-034, AC-038 | Reproduceerbare trekking publiceert exact het concept met vrijlotingen; pot- en clubvoorwaarden worden getoetst. | `tests/v15-editions.test.cjs`: `draw preparation is reproducible…`; `two-pot draw respects…` | Geslaagd |
| AC-042, AC-048 | Een sleep-/verplaatsingsvoorstel wijzigt de wedstrijd pas bij expliciete publicatie. | `tests/v15-operations.test.cjs`: `drag/drop proposals do not move a fixture…` | Geslaagd |
| AC-046, AC-048 | Verouderde planningsvoorstellen en veldsluiting worden geweigerd. | `tests/v15-operations.test.cjs`: `stale planning proposals and field closing constraints…` | Geslaagd |
| AC-047 | Twee verschillende teamcontexten zijn nodig voor clubakkoord; teammanager kan niet zelf het organisatiebesluit nemen. | `tests/v15-operations.test.cjs`: `actual account scopes enforce two different team acknowledgements…` | Geslaagd |
| AC-055 | Goedgekeurde persoonscorrectie behoudt ID, versieert toekomstig gebruik en verandert bevroren wedstrijdfoto niet. | `tests/v15-sport.test.cjs`: `approved identity correction updates the person…` | Geslaagd |
| AC-057, AC-058 | Afwezige keeper blokkeert; gecontroleerde vervanging maakt een nieuwe te beoordelen opgaveversie. | `tests/v15-sport.test.cjs`: `an absent keeper blocks approval…` | Geslaagd |
| AC-057, AC-059, AC-060 | Afwijkende bezetting vereist reden, minimum en aanwezige keeper; laatkomer komt na controle op de bank. | `tests/v15-sport.test.cjs`: `a short-handed start needs a reason…`; `minimum player count cannot be bypassed…` | Geslaagd |
| AC-061 | Datumgebonden beschikbaarheid en clubbinding beïnvloeden de daadwerkelijke aanstelling. | `tests/v15-operations.test.cjs`: `date-specific availability and neutral affiliations…` | Geslaagd |
| AC-062 | Weigering, reserve en latere acceptatie behouden aanstellingsgeschiedenis. | `tests/v15-operations.test.cjs`: `decline, reserve and subsequent acceptance…` | Geslaagd |
| AC-064 | Noodovername verplaatst verantwoordelijkheid op een vastgelegde wedstrijdminuut. | `tests/v15-operations.test.cjs`: `an emergency handover moves responsibility…` | Geslaagd |
| AC-065, AC-066, AC-067 | Fases, pauze/hervatten, gemotiveerde klokcorrectie, toegevoegde tijd en toegestane verlenging bewaren score en chronologie. | `tests/v15-sport.test.cjs`: `clock phases, stoppage time…`; `first-half stoppage time sorts…`; `extra-time phases are rule-gated…` | Geslaagd |
| AC-068, AC-069 | Een rodekaartspeler kan niet terugkeren of scoren; oudere invoer mag een al geldige latere scorer niet onmogelijk maken. | `tests/v15-sport.test.cjs`: `a confirmed red card cannot return…`; `chronological insertion cannot invalidate…` | Geslaagd |
| AC-071, AC-072 | Eén canonieke goal met gekoppelde waarnemingen en idempotent commando; werkelijk afzonderlijke gelijkende momenten vragen een scheidsreden. | `tests/v15-sport.test.cjs`: `same goal is one canonical event…`; `distinct same-minute goals require…` | Geslaagd |
| AC-073 | Afzonderlijke, alternerende en beslissende strafschoppenserie met correctiehistorie. | `tests/v15-sport.test.cjs`: `penalty kicks form an alternating separately scored decisive series…` | Geslaagd |
| AC-074, AC-101 | Volledigheidsattestatie vereist beoordeelde, passend gekoppelde goals; een eindstand kan herkenbaar zonder volledig eventlog bestaan. | `tests/v15-sport.test.cjs`: `full-event attestation requires…`; `tests/v15-public.test.cjs`: `completed scores and incomplete event logs…` | Geslaagd |
| AC-076, AC-077 | Een onderbreking bewaart en hervat de exacte fase/extra tijd zonder de bestaande stand te veranderen. | `tests/v15-sport.test.cjs`: `an interruption resumes the exact phase clock…`; `tests/v15-cases.test.cjs`: `incident preserves full phase clock…` | Geslaagd |
| AC-079, AC-080 | Genummerde ontvangst met proceduremomentopname; verlopen indiening geweigerd en gemotiveerde uitzondering geldt alleen benoemd team. | `tests/v15-cases.test.cjs`: `numbered receipt freezes procedure…`; `expired filing is refused…` | Geslaagd |
| AC-081 | Reactie/bewijs weigert buitenstaanders, bewaart veilig bewijs en herkent een verouderde versie. | `tests/v15-cases.test.cjs`: `outside teams cannot append…`; `reasoned closing of unanswered question…` | Geslaagd |
| AC-082 | Behandelaar/deadline met audit; hoorvraag alleen door geadresseerde beantwoord en blokkade vóór vroegtijdig besluit. | `tests/v15-cases.test.cjs`: `case handling has explicit owner…`; `hearing questions accept the addressed party…` | Geslaagd |
| AC-084, AC-085 | Herziening bewaart huidig besluit, kan eenmaal heropenen en heeft besluitdownload; optionele rondehold verandert score niet. | `tests/v15-cases.test.cjs`: `review request preserves current decision…`; `cup policy optional round hold…` | Geslaagd |
| AC-087, AC-088, AC-089 | Historisch duel vóór incident zit geen sanctie uit; gewijzigde meetellende duels herberekenen; expliciet opgeheven sanctie herleeft niet stil. | `tests/v15-cases.test.cjs`: `historical import before incident…`; `served matches recompute…`; `revoked sanctions never reactivate…` | Geslaagd |
| AC-089 | Gewijzigde bronkaart van vastgesteld besluit opent herbeoordeling in plaats van stil opheffen. | `tests/v15-cases.test.cjs`: `decided source-card reversal opens explicit review…` | Geslaagd |
| AC-090, AC-092, AC-097 | Gereedheid volgt echte controles; briefingmutatie heeft teamscope; vreemde taak kan niet worden geclaimd. | `tests/v15-system.test.cjs`: `readiness derives real checks…`; `a team cannot claim a preparation task…` | Geslaagd |
| AC-093, AC-094 | Inbox/gelezen/bevestiging zijn accountgebonden; een ander account kan niet namens ontvanger bevestigen. | `tests/v15-operations.test.cjs`: `inbox and read/confirmation receipts…`; `actual account receipt cannot be acknowledged…` | Geslaagd |
| AC-095, AC-096 | Eigen gesprekken blijven besloten; antwoorden voor twee wedstrijden blijven beide bestaan. | `tests/v15-operations.test.cjs`: `new conversations stay in own account scope…`; `availability answers for different matches…` | Geslaagd |
| AC-100, AC-102, AC-103 | Inschrijvingen vóór bracket tellen mee; basis/minuten volgen echte positie en toegestane herintredingsintervallen. | `tests/v15-public.test.cjs`: `enrollment counts include approved teams…`; `statistics use actual starter positions…`; `tests/v15-sport.test.cjs`: `player intervals use actual lineup positions…` | Geslaagd |
| AC-107, AC-118, AC-119 | Leeftijdsprivacy zonder suffixafleiding, beperkend globaal profielbeleid en opstellingsgoedkeuring plus embargo. | `tests/v15-public.test.cjs`: `age-based privacy…`; `global player profiles…`; `public lineups require both…`; `tests/v15-system.test.cjs`: `public lineup publication requires…` | Geslaagd |
| AC-113, AC-114 | Nieuwe redactieconcepten laten geldige openbare versie staan; herstel maakt concept; optionele feitenconcepten blijven ongepubliceerd en dedupliceren. | `tests/v15-public.test.cjs`: `a new editorial draft preserves…`; `optional match reports use official facts…` | Geslaagd |
| AC-116, AC-117 | Mediadownloads controleren actuele kanaalrechten, verloop en intrekking. | `tests/v15-public.test.cjs`: `media downloads obey channel rights…` | Geslaagd |
| AC-121, AC-124 | Bekerroute en kaart lezen canonieke wedstrijden; historische statistieken gebruiken de archiefdataset zonder huidige spelers aan te vullen. | `tests/v15-public.test.cjs`: `Road to Houtrust and map…`; `archived edition statistics…` | Geslaagd |
| AC-123 | Gemodereerde momenten gebruiken één veranderbare accountstem per wedstrijd. | `tests/v15-public.test.cjs`: `moderated moments use one changeable vote…` | Geslaagd |
| AC-125, AC-126, AC-128 | Ontvangst/werkelijke timing apart; uitloop wordt vóór publicatie getoond en schrijft canonieke finales; overlappende kamers worden herverdeeld. | `tests/v15-operations.test.cjs`: `final reception stores…`; `delay cascade is previewed…`; `delay proposal reserves different rooms…` | Geslaagd |
| AC-129, AC-130 | Vrijwilligerscapaciteit, wachtlijst, vervanging en persoonlijke scopes; afgesproken dienst schuift niet stil; eigen taak heeft eigenaar/deadline. | `tests/v15-operations.test.cjs`: `volunteer CRUD, waiting list…`; `an agreed volunteer shift…`; `coordinator tasks have owners…`; `volunteers cannot change another person…` | Geslaagd |
| AC-133 | Offline event blijft lokaal, voorkomt editiewissel met wachtrij, verwerkt idempotent met oorspronkelijke rol en vraagt review bij veranderd wedstrijdbeeld. | `tests/v15-system.test.cjs`: `offline event remains local…`; `a queued event conflicts…` | Geslaagd |

De nieuwste aanvullende testbestanden en de definitieve gezamenlijke suite worden in het vrijgaveverslag opgenomen. Er is hier geen totaalgetal vastgezet dat door latere gerichte regressies kan verouderen. UI-/responsieve checks blijven pas geslaagd wanneer de zichtbare uitkomst daadwerkelijk is gecontroleerd.

## P. Aanmaakwizards en gekoppelde administratie

| Check | Eis(en) | Uitvoering en verwachte uitkomst | Bewijs | Uitkomst |
| --- | --- | --- | --- | --- |
| AC-138 | AAN-01, UI-01–09 | Open beker-, club- en teamwizard op 360, 390, 800 en 1280 px. Kop, stappen en footer blijven in beeld; geen horizontale overloop of overlap. | U/R | Open |
| AC-139 | AAN-02, BEK-03 | Maak een beker met 2×40 minuten, verlenging, twee dispensaties en handmatige doorstroming. Controleer de opgeslagen instellingen in Toernooibeheer. | D/U | Open |
| AC-140 | AAN-03, LOT-01–04 | Maak een beker met vier goedgekeurde teams en acht plekken plus expliciete bracketkeuze. Controleer de vrijlotingen; zonder deze keuze ontstaan geen wedstrijden. | D/U | Open |
| AC-141 | AAN-04, BAS-07 | Voeg een club met thuislocatie en contact toe. Teamwizard is meteen met die club te openen; thuislocatie klopt; contact staat standaard niet openbaar. | D/U | Open |
| AC-142 | AAN-05, AAN-06 | Maak een team en koppel meerdere passende bekers. Voeg later een koppeling aan hetzelfde team toe; HV-ID en eerdere inschrijvingen blijven behouden, spelerslijst blijft leeg concept. | D/U | Open |
| AC-143 | AAN-06 | Probeer dubbele namen, bestaande inschrijvingen, volle/afgesloten bekers, andere categorie, uitgesloten team of onbevoegde rol. Geen ongeldige registratie. | D/U | Open |
| AC-144 | AAN-07 | Ga terug, wissel stappen, sluit met Esc en behoud invoer. Simuleer een mislukte tweede koppeling of volle apparaatopslag; geen half record. Herhaal dezelfde registratiecode zonder duplicaat. | D/U/R | Open |
| AC-145 | AAN-08 | Zoek de aangemaakte club en het team in Seizoensbeheer → Toevoegen. De bekertags en deelnemersstatussen komen overeen met de gemaakte keuzes. | U | Open |

Automatisch en uitgevoerd browserbewijs voor deze aanvulling staat in `v17-wizards-validation.md`. De opdrachtgever houdt de laatste inhoudelijke gebruikerscontrole.

## Vrijgaveverslag

| Veld | In te vullen bij vrijgave |
| --- | --- |
| Release / sourceversie | Exacte gepubliceerde versie en broncommit. |
| Dataset | Beginstand, gebruikte scenario's en eventuele extra voorbeeldrecords. |
| Geautomatiseerd | Testbestanden, aantal geslaagde/afgewezen checks en relevante beperkingen. |
| UI-controle | Uitgevoerde gebruikersflows en bewijs van zichtbare uitkomst. |
| Responsief | Browsers/viewports, alle geopende pagina's en eventuele bewuste scrollvlakken. |
| Afwijkingen | Eis/check, reproduceerbare handelingen, impact, besluit en herstelstatus. |
| Bewuste mockgrenzen | Geen echte authenticatie/bezorging/database waar die nog lokaal worden gesimuleerd. |
| Gebruikerscontrole | Laatste opmerkingen van opdrachtgever en verwerkt besluit. |
| VPS-overdracht | Open productiecontroles en definitieve documentversie. |

Een release is alleen als gecontroleerd te beschrijven voor de daadwerkelijk uitgevoerde rijen en bewijstypen. De opdrachtgever kan de lijst gebruiken om gericht de laatste inhoudelijke en visuele controle te doen.


### Compacte actielijsten v18

| ID | Eis | Controle | Type | Status |
| --- | --- | --- | --- | --- |
| AC-146 | LIJ-01, LIJ-04, LIJ-05 | Controleer werkvoorraad, Mijn overzicht, voorbereiding en datakwaliteit op 360/390/800/1280 px. Iconen rechts, toegankelijke namen en geen overlap of horizontale overloop. | U/R | Open |
| AC-147 | LIJ-02, LIJ-03 | Wijs een taak toe via het persoonicoon, wijzig behandelaar/deadline en sla op. Heropen het venster; waarden zijn behouden. Annuleren met gewijzigde invoer vraagt expliciet om verdergaan of sluiten. | U | Open |
| AC-148 | LIJ-02, LIJ-03 | Open een actie via het oogicoon. De juiste wedstrijdcontext is geselecteerd. Herinneren blijft beschikbaar bij een toegewezen taak en gebruikt de bestaande bevoegdheidscontrole. | U | Open |
