# Uitgevoerde deployvoorbereiding

De eigen hostinrichting is op 23 november 2026 om 20:41 CET als `prepared-inactive` opgeleverd. Er is geen kandidaat, runnerregistratie, appactivatie, `current`-wissel, nieuwe publieke route, DNS- of databasewijziging uitgevoerd. Zie [deployment.md](deployment.md) voor het vaste contract en de afzonderlijke latere opdrachten.

SSH is met de bestaande expliciete sleutel en strikte bekende-hostcontrole geverifieerd tegen `dg-vps-08`, machine-id `05db94b99eca4c3d815f6585ef8ed517`. De hostinventaris bevestigde vooraf dat eigen identiteit en loopbackpoort `127.0.0.1:4190` vrij waren. Er zijn uitsluitend eigen nieuwe accounts en resources toegevoegd:

| Onderdeel | Uitgevoerde status |
| --- | --- |
| Runner | `run-haagv-stg`, UID 978 / GID 971; officieel pakket 2.338.2 aanwezig, ongeregistreerd |
| Build | `build-haagv-stg`, UID 977 / GID 970; eigen buildhome |
| App | `app-haagv-stg`, UID 976 / GID 969; eigen privéschrijfmap |
| Toolchain | Node 24.22.1 / npm 11.19.1; downloadchecksum en uitgepakte versies gecontroleerd |
| App- en runnerunit | Beide `disabled`, `inactive`, `dead`, PID 0 |
| Kandidaat / release / `current` | Geen aanwezig |
| Proxy | Alleen eigen `.caddy.disabled` buiten de actieve import |
| Runtime | Configuratiemappen leeg; eigen mail-vaultsleutel ter plaatse als 32 bytes gegenereerd, root:app 0640 |

De geïnstalleerde root-owned adapter komt overeen met de beoordeelde lokale bron: SHA-256 `dd679e15e8832894be764f7d6b77326c16d0b2224288eb4f8810b03dbb562fc4`. De drie beperkte sudo-opdrachten zijn aan dit digest gebonden; de runner kan geen algemene sudo-opdracht uitvoeren. Build en app hebben geen sudo. De rechtenaudit bevestigt dat runner/build geen runtimesnapshot, serversecret of vaultsleutel kunnen lezen en geen adapter, unit of release kunnen wijzigen; alleen de app kan haar eigen `shared`-map schrijven.

De nulmeting van 20:41:25 CET en nameting van 20:42:55 CET zijn vergeleken. Alle 26 bestaande relevante services behouden hun status, configuratie en PID. Vier bestaande sitebomen, vier runnerregistraties, vier actieve proxybestanden, SSH-configuratie, hostprofielen, gedeelde buildlock, tmpfilesregel en bestaande `dg-build`-leden zijn ongewijzigd. Bestaande publieke healthchecks geven dezelfde 200-respons en inhoud. De eerder aanwezige timeout op CastIQ's kale HTTP-loopbackcheck is onveranderd; de publieke HTTPS-check en afzonderlijk gecontroleerde lokale TLS-route geven 200. Na installatie resteert circa 246 GiB vrije schijfruimte en 18,37 miljoen vrije inodes.

Validatie: 28 ops-tests geslaagd, Pythoncompilatie en drie handmatige workflow-YAML's gecontroleerd, `visudo` en `systemd-analyze verify` geslaagd. De tests omvatten CI- en workflowgates, pad- en archiefmisbruik, onveranderlijke artefactkopie, configdigest, lockbehoud bij afgebroken processen, eerste-installatiefout en rollback zonder vorige release. Een echte kandidaatbouw op de VPS is nog niet uitgevoerd.

Het compacte, niet-geheime bewijs staat in [host-preparation-2026-11-23.json](../ops/evidence/host-preparation-2026-11-23.json). De volledige nulmeting, nameting, vergelijking, installeruitslag en rechtenaudit staan buiten de repository in `/home/codex/repos/hvcup/voorbereiding-platform/host/`; er zijn geen geheime waarden vastgelegd.

Voor een latere kandidaat ontbreken nog de vier nieuwe publieke waarden, de serverkey van hetzelfde nieuwe Supabase-project onder een vooraf gekozen `config_id`, aantoonbaar beperkte toegang van de eigen runner tot uitsluitend de drie beoordeelde handmatige workflows op `main`, en een definitieve SHA met geslaagde `ci.yml`/`verify`. De runner-toegangsgoedkeuring ontbreekt bewust en blokkeert zowel runnerunit als adapter. Het eigen beveiligde GitHub environment moet vóór de afzonderlijke activatie worden ingericht. Deze voorbereiding heeft geen GitHub environment, runnerregistratie of actieve release aangemaakt.
