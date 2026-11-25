# Uitgevoerde deployvoorbereiding

## 25 november 2026: twee omgevingen, gereed voor afzonderlijke uitrol

Latere voortgang op dezelfde dag: beide moderne serverkeys zijn automatisch afgeschermd op de VPS geplaatst, met echte readonly admin-API/state-RPC gevalideerd. De tijdelijke encrypt-only overdrachtsfuncties zijn gesloten (HTTP410); hun private overdrachtsmateriaal is verwijderd. De eigenaar bevestigt tevens de HTML-templates, OTP-lengte 6 en Site URLs. Het onderstaande hostvoorbereidingsbewijs is de eerdere nulmeting; kandidaat/activatie krijgt apart bewijs. Zie [runtimeoverdracht](evidence/runtime-provisioning-2026-11-25.json).

De eigenaar heeft staging en productie expliciet voor uitrol aangewezen. Beide vaste hostdoelen zijn op 25 november ingericht en gecontroleerd; zij wachten nog op de nieuwe exacte `main`-SHA met groene CI en de beveiligde runtimecredentials. Er is in deze stap nog geen kandidaat gebouwd of app geactiveerd. De oorspronkelijke meting van 23 november blijft hieronder als geschiedenis staan.

| Omgeving | Loopback | Accounts UID/GID | Laatste eigen adapterverversing |
| --- | --- | --- | --- |
| Staging | `127.0.0.1:4190` | runner 978/971, build 977/970, app 976/969 | 25 november 13:25:33 CET |
| Productie | `127.0.0.1:4191` | runner 975/968, build 974/967, app 973/966 | 25 november 13:25:34 CET |

Beide adapterbestanden zijn bronidentiek: SHA-256 `e21d0552e2e7eec98b3edc42d10500a0fb8337a003e9dbd02455a4cb36ec58b5`. Node 24.22.1 / npm 11.19.1 en officieel runnerpakket 2.338.2 zijn per doel aanwezig. Alle vier eigen units zijn `disabled` en `inactive`, PID 0. Beide runners zijn ongeregistreerd. Er zijn geen kandidaten, releases, `current` of actieve eigen proxysnippets. De staging-vaultkey en bestaande accounts zijn bij de veilige verversing behouden; productie kreeg een afzonderlijke ter plaatse gegenereerde key.

De GitHub environments `staging` en `production` bevatten uitsluitend de vier nieuwe namen `HVCUP_APP_ORIGIN`, `HVCUP_DATA_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. De vastgestelde origins en Supabase-projecten zijn in [deployment.md](deployment.md) opgenomen en door de adapter per doel gebonden. Er zijn geen repositoryrunners. Inspectie van de vereiste organisatie-runnergroeppolicy kreeg 403; de runnerroute blijft daarom geblokkeerd. De beoordeelde root-only SSH-operatorroute is beschikbaar, met afzonderlijke kandidaat-/activatie-/rollbackopdrachten, herhaalde exacte CI-gate en builds onder het eigen onprivileged buildaccount. De clientpreflight is werkelijk geslaagd op de eerdere `main`-SHA `895ff4c0104d95b8c4229ba9ea3c5ec601185be4`, CI-run `45253332335`, zonder hostoperatie. Voor de nieuwe release moet haar eigen CI slagen.

Alle 26 bestaande andere relevante services behouden exact hun status, configuratie en PID. Bestaande andere sitebomen, runnerregistraties, proxy- en SSH-bestanden, hostprofielen, gedeelde buildlock, tmpfilesregel, groepsleden en publieke healthinhoud zijn ongewijzigd. De rechtenaudit controleert daarnaast beide richtingen tussen de nieuwe omgevingen: geen runner, build of app kan de andere privéschrijfmap wijzigen of runtimesnapshot/vaultsleutel lezen. Er resteert circa 242 GiB vrije schijfruimte en 18,24 miljoen vrije inodes.

Validatie: 34 ops-tests geslaagd; zes handmatige workflows aan hun eigen GitHub environment gekoppeld en YAML gecontroleerd; Pythoncompilatie, `visudo` en `systemd-analyze verify` geslaagd. Het beoordeelde eerste-adminscript en imports zitten verplicht in het kandidaatartifactschema; een test bevestigt dat `.env` erbuiten blijft. Runtimegeheimen zijn nog niet als aanwezig aangemerkt: de beschermde `runtime-secrets`-mappen bestaan, zonder placeholders.

De publieke DNS-records wezen bij de eerste controle naar `167.235.202.206`, terwijl de geverifieerde publieke hostinterface `204.168.128.28` heeft; beide toenmalige HTTPS-checks faalden met een TLS-alert. Na correctie door de eigenaar geven alle vier autoritatieve StackDNS-nameservers op 25 november 13:31 CET voor beide origins `204.168.128.28`, TTL 3600, zonder AAAA-record. Cloudflare en Google bevestigen hetzelfde. Alleen lokale/VPS-caches hadden nog circa 47 minuten het oude antwoord; een nieuwe publieke TLS-controle volgt na eigen proxy-inrichting. Deze stap wijzigde geen DNS, actieve proxy of database. Het actuele bewijs staat in [host-preparation-2026-11-25.json](../ops/evidence/host-preparation-2026-11-25.json); volledige metingen inclusief `dns-after-owner-change.json` staan buiten Git in `/home/codex/repos/hvcup/uitrol-platform/host/`.

## 23 november 2026: oorspronkelijke inactieve stagingvoorbereiding

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
