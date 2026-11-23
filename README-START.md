# HV Control v18 — lokaal overdrachtspakket

Dit pakket bevat de volledige lokale uitvoering van het Haaglanden Voetbaltoernooi zoals gepubliceerd in versie 18. De broncode komt uit commit `dd384bee966c83bf1daf053dcc4538f8cffa7529` van 23 november 2026. Alle 37 bestanden in `dist/` komen byte voor byte overeen met de gepubliceerde webapp.

## Meteen openen

Pak de hele ZIP uit en open een terminal in de map `HV-Control-v18`. Start de server met Python 3 (3.9 of hoger).

Windows PowerShell:

```powershell
py -3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

macOS, Linux of WSL:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Laat het terminalvenster open. Stop de server met Ctrl+C. Is poort 4173 in gebruik, kies dan bijvoorbeeld 4174 en pas ook de URL aan. Kies de actieve voorbeeldrol via [Mijn overzicht](http://127.0.0.1:4173/#start).

Gebruik HTTP om onder meer de navigatie, browseropslag, media en serviceworker te kunnen gebruiken. De runtime bestaat uit statische bestanden en werkt met de meegeleverde assets. Voor openen zijn Python en een moderne browser voldoende. Node.js is alleen nodig voor de bestaande ontwikkeltests.

## Codex de overdracht geven

Open de uitgepakte map als werkmap in Codex. Geef de opdracht **‘Voer CODEX-OPDRACHT.md uit in deze map’**. Het bestand bevat de startopdracht, herstel- en teststappen, visuele vergelijking en acceptatiecriteria. Codex kan gelijk uit de bron werken en de meegeleverde versie als referentie draaien.

| Bestand of map | Inhoud |
| --- | --- |
| `dist/` | De direct startbare v18-uitvoer, inclusief manifest en serviceworker. |
| `dist/assets/` | 17 beeldbestanden, 7 lokale WOFF2-bestanden, 5 fontlicenties en de fontstylesheet. |
| `pages/`, `*.js`, `*.css` | De originele HTML-fragmenten, stijlen, schermcontrollers, domeinlogica en voorbeeldgegevens. |
| `build.py` | Combineert de bron tot de webapp. `dist/assets/`, het manifest en de serviceworker zijn ook invoer van de bestaande build. |
| `docs/` | Functioneel ontwerp, acceptatiechecklist, architectuur, visuele referenties en eerdere controles. |
| `REFERENTIE.md` | Routeoverzicht, beeldinventaris en uitleg bij de bestaande referentiebeelden. |
| `tests/` | De 27 oorspronkelijke regressietestbestanden. |
| `SHA256SUMS`, `scripts/verify_handoff.py` | Controle van bestandshashes, routes, interne doelen en reproduceerbare herbouw. |

## Uitpakken, controleren en bouwen

Controleer de ZIP na uitpakken. `--rebuild` bouwt in een tijdelijke map en vergelijkt de uitvoer met de meegeleverde bestanden. De lokale werkmap blijft bij deze controle intact.

```powershell
py -3 scripts/verify_handoff.py --rebuild
```

```sh
python3 scripts/verify_handoff.py --rebuild
```

Voor eigen bronwijzigingen maak je eerst een aparte kopie van de uitgepakte map. Bouw daar met `python3 -X utf8 build.py` en open de nieuwe uitvoer via dezelfde HTTP-opdracht. Op Windows kan `py -3 -X utf8 build.py` een werkende build opleveren met andere regeleinden. Gebruik voor exact dezelfde bytes de meegeleverde verifier of bouw in WSL. Bewaar de meegeleverde `dist/` als ijkpunt. De bundels worden vanuit `pages/` en de rootbron gegenereerd, dus voer structurele aanpassingen daar door.

Tests uitvoeren vanaf de projectmap, met een moderne Node.js-versie (de pakketcontrole gebruikte Node.js 24):

```powershell
Get-ChildItem tests -Filter *.test.cjs | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Test mislukt: $($_.Name)" }
}
```

```sh
for test_file in tests/*.test.cjs; do
  node "$test_file" || exit 1
done
```

## Dezelfde weergave vergelijken

Begin met een schoon browserprofiel, dezelfde demo-editie en dezelfde rol. Demowijzigingen blijven lokaal per browserprofiel, host en poort bewaard. Voorbeelden gebruiken dezelfde gegevens als de gepubliceerde v18-bron. Het hosted inlogscherm van Sites hoort bij de hosting. De lokale app opent direct en gebruikt de ingebouwde demorollen. De sportieve en beheerflows gebruiken voorbeeldgegevens en browseropslag.

Vergelijk met dezelfde browser, OS, taal, zoom, schermbreedte, scrollpositie en demostand. De bestanden voor layout, beelden en fonts zijn identiek. Rendering van native datumvelden, scrollbars en letterranden kan verschillen per browser en besturingssysteem.
