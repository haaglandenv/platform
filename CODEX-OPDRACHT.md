# Codex-opdracht — HV Control v18 lokaal draaien

Werk vanuit de uitgepakte map van het overdrachtspakket. Lever een lokaal werkende, visueel en functioneel identieke kopie van het gepubliceerde HV Control-prototype v18. De bron komt uit commit `dd384bee966c83bf1daf053dcc4538f8cffa7529`. Gebruik de meegeleverde bron als implementatie en de meegeleverde `dist/` als referentie voor de uitvoer. De opdracht is afgerond wanneer de toepassing draait, de vergelijking is uitgevoerd en je de lokale URL en testresultaten hebt gegeven.

## 1. Bron en start

1. Lees `README-START.md`, `docs/HV-Control-Functioneel-Ontwerp.md` en `docs/HV-Control-Acceptatiechecklist.md`. Gebruik `docs/prototype-architecture.md` voor de relatie tussen schermen, gegevens en domeinregels. Lees voor de recentste UI `docs/v16-ui-polish.md`, `docs/v17-wizards-validation.md` en `docs/v18-compact-lists.md`.
2. Voer de controle uit volgens `README-START.md` met `scripts/verify_handoff.py --rebuild` en `SHA256SUMS`. Bewaar de aangeleverde `dist/` buiten de projectmap als onveranderde referentie bij een herbouw. Controleer na `build.py` de hashes van de gebouwde uitvoer opnieuw. Bij een afwijkende hash onderzoek je eerst het concrete bestandsverschil. Houd rekening met automatische LF/CRLF-conversie van bronbestanden op Windows.
3. Start de aangeleverde `dist/` direct via HTTP. De projectmap bevat een statische toepassing met HTML, CSS en JavaScript. Python 3 dient voor de HTTP-server en herbouw. Node.js dient voor de bestaande tests. Voor de layout en het draaien van de demo volstaan de meegeleverde bestanden.

   Windows met Python Launcher:

   ```powershell
   py -3 -m http.server 4173 --bind 127.0.0.1 --directory dist
   ```

   macOS en Linux:

   ```sh
   python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
   ```

4. Open `http://127.0.0.1:4173/`. Gebruik binnen één controle steeds dezelfde host en poort voor de browseropslag. Begin met een schoon browserprofiel of gebruik **Herstel demo** op de lokale testkopie. De vaste demoklok gebruikt `Europe/Amsterdam` en hoort bij de actieve editie. Behoud de vaste startgegevens, rolsimulatie, opslag per browser en het installatiegedrag van `dist/manifest.webmanifest` en `dist/sw.js`.
5. Controleer de eerste herbouw via `scripts/verify_handoff.py --rebuild`. Bouw na eventuele aanpassingen op macOS, Linux of WSL met `python3 -X utf8 build.py`. Op Windows kun je `py -3 -X utf8 build.py` gebruiken voor een lokale build en de verifier voor vergelijking met exacte Linux-regeleinden. `build.py` combineert de rootmodules, `pages/` en de stijlen tot de sitebundels en schrijft een serviceworkercacheversie op basis van de uitvoer. Bewerk bronbestanden alleen als een reproduceerbare lokale blokkade een gerichte reparatie vereist. Houd alle layout, assets, demo-inhoud en gedrag intact. Beperk de opdracht tot de lokale kopie van deze versie.

## 2. Visuele referentie

- Gebruik alle meegeleverde assets op hun oorspronkelijke relatieve paden in `dist/assets/`. Dit omvat de WebP-sfeerfoto's en demoportretten, het HV-logo, de appiconen, de finaledag-QR en de lokale WOFF2-lettertypen met licentieteksten. Raadpleeg `REFERENTIE.md` voor routes en beelden. Behoud alle bestanden, beeldverhoudingen, uitsnedes, posities, overlays en de fontdefinities van `dist/assets/fonts.css`.
- Behoud de 53 paginasegmenten van `build.py`, alle bestaande hash-routes en deeplinks, de Shell met navigatie, hero, inhoudsrail en footer, de bestaande tekst, iconen en volgorde van blokken. De paginaweergave van `#handleiding` en de documentdownloads horen ook bij de kopie.
- Vergelijk de referentie en de lokale herbouw met gelijke browser en browserversie, OS, zoom (100%), device pixel ratio, viewport, taal, tijdzone, opslagstatus en demoklok. Wacht op geladen fonts en afbeeldingen, dezelfde scrollpositie en een stabiele animatiestatus. Vergelijk layout, tekst, plaatjes en interactieve toestanden bij dezelfde invoer. Native browserbediening en lettertyperendering kunnen tussen platforms verschillen.
- Controleer de 53 routes op 360, 390, 800, 1024 en 1280 px. Neem voor de visuele vergelijking ten minste Home, wedstrijdkalender, bekerschema, wedstrijdcentrum, finaledag, persoonlijke werkruimte, werkvoorraad, seizoensbeheer, toernooibeheer en de scheidsrechteromgeving op. Vergelijk op minimaal 390 en 1280 px ook de actieve wizardstappen, het toewijsvenster, filters, tabs, lege toestanden, geselecteerde rijen en formulieren met foutmelding. Binnen een kalender of bracket is de bestaande interne scroll toegestaan. Controleer dat de pagina als geheel nergens horizontaal overloopt, de bediening niet overlapt en focus zichtbaar blijft.
- Gebruik `docs/v16-polish-preview.jpg`, `docs/v17-wizard-preview.jpg` en `docs/v18-rows-mobile.jpg` als aanvullende referentie voor de getoonde toestand. De actuele referentie blijft de meegeleverde v18-uitvoer. Vergelijk screenshots alleen bij identieke schermtoestand en afmetingen. Rapporteer renderingverschillen met hun oorzaak en locatie.

## 3. Functionele controle

Voer de bestaande suite in `tests/` uit met Node.js. Controleer bovendien via de UI onderstaande flows op een lokale testkopie. Test met de meegeleverde fictieve accounts en begin bij iedere vergelijking met dezelfde editie en rol. Gebruik `#start` of de bestaande werkruimtenavigatie om rollen te bereiken.

| Onderdeel | Verwachte uitkomst |
| --- | --- |
| Publiek en PWA | Home, toernooien, dag/week/maand, schema, live, wedstrijd, nieuws, statistieken, zoeken, volgen en finaledag laden met dezelfde lokale beelden. Links en deeplinks openen de juiste detailtoestand. Een favoriet blijft na herladen zichtbaar. |
| Werkvoorraad v18 | Compacte regels tonen status, deadline, onderwerp, toernooi en behandelaar. Oog- en persoonicoon staan rechts, ook op mobiel. Openen behoudt wedstrijdcontext. Kies in de pop-up een bevoegde behandelaar en datum, sla op en controleer de gewijzigde rij. Bij opnieuw openen staan de opgeslagen waarden klaar. Sluiten met wijzigingen vraagt om een keuze. |
| Wizards v17 | Maak in Seizoensbeheer → Toevoegen een conceptbeker, een vereniging en een team aan. Koppel het bestaande team aan een tweede passende beker en behoud het HV-ID. Probeer ook dubbele aanmaak, volle bekers en annuleren. Bekerinschrijving en spelersgoedkeuring blijven afzonderlijke beslissingen. |
| Wedstrijdketen | Inschrijving, loting, vrijloting, planning en reglement behouden hun samenhang. Controleer teamopgave, goedkeuring en dispensatie, aanstelling van de scheidsrechter, fysieke spelerscontrole, aftrap, wedstrijdgebeurtenissen en definitieve uitslag. Een bezwaar wijzigt de uitslag pas na een expliciet gemotiveerd besluit van de toernooileiding. |
| Rollen en publicatie | Controleer de demo-werkruimten van toernooileiding, clubleiding, teamleiding, scheidsrechter, speler, supporter, fotograaf, pers en vrijwilliger. Controleer werkvoorraad, gereed voor aftrap, berichten, nieuws, privacy, media, pers en statistieken volgens de actieve rol en publicatieregels. |
| Finaledag en betrouwbaarheid | Controleer finalevelden en -regie, vrijwilligersdiensten, opslag na herladen, bestaande offlinewachtrij en het noodpakket. Controleer behoud van opgeslagen demogegevens bij navigatie en de bestaande herstelactie op een aparte testkopie. |

## 4. Oplevering

Laat de lokale server draaien en geef de URL. Noteer de exacte start- en herbouwopdracht, het resultaat van de integriteitscontrole, het aantal uitgevoerde tests en de gecontroleerde routes, schermbreedtes en toestanden. Leg aantoonbare afwijkingen vast met het scherm en een reproduceerbare stap. Het pakket vormt de basis voor de lokale demo met voorbeeldgegevens en browseropslag. De beschrijving van een eventuele VPS-versie in de documentatie dient als achtergrond voor een aparte bouwopdracht.
