# Handmatig uitrollen op dg-vps-08

Kandidaatbouw, activeren en rollback zijn afzonderlijke handmatige opdrachten. Een push of PR activeert niets. De eigenaar heeft op 25 november 2026 de uitrol van beide eigen omgevingen geautoriseerd. De uiteindelijke kandidaat blijft gebonden aan een exacte volledige `main`-SHA met geslaagde `ci.yml`-job `verify`; runtimegeheimen en publieke bereikbaarheid worden vooraf gecontroleerd.

## Twee vaste doelen

| Onderdeel | Staging | Productie |
| --- | --- | --- |
| GitHub environment | `staging` | `production` |
| Site / runnernaam | `haagv-platform-staging` | `haagv-platform-production` |
| Loopback | `127.0.0.1:4190` | `127.0.0.1:4191` |
| Runner / build / app | `run-haagv-stg` / `build-haagv-stg` / `app-haagv-stg` | `run-haagv-prd` / `build-haagv-prd` / `app-haagv-prd` |
| Vastgestelde origin | `https://hvcup-staging.dgwebservices.nl` | `https://hvcup.dgwebservices.nl` |
| Aangewezen Supabase-project | `wntzrrzolgnuiszudmzn` | `mgerzyyeuqwjdpwfdkqz` |

Repository en branch zijn `haaglandenv/platform` / `main`. Host is `dg-vps-08`, machine-id `05db94b99eca4c3d815f6585ef8ed517`. SSH gebruikt de bestaande expliciete sleutel, `HostKeyAlias=100.65.51.108` en strikte bekende-hostcontrole. Node 24.22.1 en npm 11.19.1 staan per doel in een eigen root-owned toolchain. Het appstartpunt is `npm start` → `node server/index.mjs`; systemd voert dezelfde gepinde Nodebinary direct uit.

De enige vier GitHub-variabelen staan per environment: `HVCUP_APP_ORIGIN`, `HVCUP_DATA_MODE`, `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Op beide doelen is de modus `supabase`. De workflows lezen hun eigen environment; repositoryvariabelen zijn hiervoor niet nodig. De adapter weigert een origin of Supabase-URL van de andere omgeving.

## Rechten en inrichting

Voor `SITE=haagv-platform-staging` of `haagv-platform-production` geldt:

| Pad | Rechten / functie |
| --- | --- |
| `/usr/local/libexec/SITE` | Root-owned vaste releaseadapter; runner/build/app kunnen niet wijzigen |
| `/etc/dg-webservices/SITE/host.json` | Niet-geheime vaste identiteit, origin, project en toegekende UID/GID |
| `…/build-configs/CONFIG_ID.json` | Vier publieke waarden, onveranderlijk root:build 0640 |
| `…/runtime-secrets/CONFIG_ID.json` | Uitsluitend serverkey van dit doel, root:root 0600; directory 0700 |
| `…/runtime-configs/CONFIG_ID/SHA.env` | Versiegebonden runtime, root:app 0640; niet leesbaar door runner/build |
| `…/secrets/mail-encryption-key` | Per doel op de host gegenereerde base64-sleutel van 32 bytes, root:app 0640 |
| `…/prepared/*.caddy.disabled` | Inactieve voorbereiding buiten de actieve proxy-import |
| `/var/lib/dg-build/SITE` | Eigen buildaccount, home/cache en tijdelijke bron |
| `/opt/actions-runner/SITE` | Eigen pakket; blijft ongeregistreerd en gestopt zonder bewezen toegangsbeperking |
| `/opt/dg-toolchains/SITE` | Eigen gepinde root-owned Node/npm |
| `/srv/sites/SITE/{candidates,releases}` | Verzegeld root:app; app/build/runner hebben geen schrijfrechten |
| `…/shared` | Alleen de eigen app schrijft hier, 0700; versleutelde mailinstellingen 0600 |

De bestaande `/run/lock/dg-build.lock` blijft root:dg-build 0660. Bestaande tmpfilesregel en groepsleden blijven intact. De onafhankelijke root-supervisor houdt deze lock vast totdat bij afbreken de gehele buildprocesgroep is gestopt. Lockconflict geeft exitstatus 75; een workflow probeert maximaal eenmaal opnieuw na 30 seconden. Activeren en rollback gebruiken per doel een eigen exclusieve lock en releaseconcurrency.

De installer controleert standaard alleen. `--apply` maakt uitsluitend de nieuwe vaste eigen resources; hij registreert/start geen runner of app en importeert geen proxy. Een refresh is beperkt tot een nog inactieve, ongeregistreerde eigen voorbereiding zonder kandidaten/releases; accounts, vaultkey, runtimegeheimen, toolchain en andere apps blijven behouden. De vorige eigen adapter, sudoers, hostmetadata en units worden vooraf root-only bewaard. Gebruik uitsluitend beoordeelde root-owned bron buiten de runnercheckout:

```sh
sudo python3 -I -B /root/BEOORDEELDE_BRON/ops/install-host.py --environment production
sudo python3 -I -B /root/BEOORDEELDE_BRON/ops/install-host.py --environment production --apply
sudo python3 -I -B /root/BEOORDEELDE_BRON/ops/install-host.py --environment staging --refresh --apply
```

`ops/pins.json` bindt officiële Node- en runnerdownloads aan SHA-256. De installatie-uitslag staat zonder geheimen in `…/installation.json`. De feitelijke metingen staan in [deployment-status.md](deployment-status.md).

## Runtimegeheimen

Op 25 november zijn beide moderne defaultkeys op expliciet verzoek van de eigenaar automatisch geplaatst via de gekoppelde Supabase-accounts. De beoordeelde helper `ops/provision-runtime.mjs` genereert een RSA4096-privatekey en private proof uitsluitend op de VPS. De korte Supabase-handler `ops/runtime-provisioning.mjs` accepteert alleen die proof en versleutelt de moderne key voor de vastgepinde publieke VPS-sleutel, project, omgeving, transfer-ID en vervaltijd. Er is geen caller-controlled recipient of URL en geen legacyfallback. De ontvangkant valideert echte admin- en state-RPC-toegang vóór exclusieve opslag. De actieve overdrachtshandler is daarna vervangen door een vaste HTTP410-respons, en privatekey/proof zijn gewist. Een stateless handler garandeert geen eenmalig gebruik over isolates; de binding, korte geldigheid en afsluiting begrenzen deze operatie. Geen sleutelwaarde kwam in chat, Git, procesargumenten of uitvoerlogs. [Niet-geheim bewijs](evidence/runtime-provisioning-2026-11-25.json).

Het onderstaande schema beschrijft de beschermde opslag en blijft ook bruikbaar voor een afzonderlijke handmatige herinrichting. Bewaar voor elke omgeving uitsluitend het volgende schema in `/etc/dg-webservices/SITE/runtime-secrets/hvcup-v1.json`, root:root 0600. Gebruik de key van precies het in bovenstaande tabel aangewezen project:

```json
{"SUPABASE_SECRET_KEY":"SERVERKEY_VAN_DIT_NIEUWE_PROJECT"}
```

Dit is alleen het schema; op de host staan de echte waarden onder root:root 0600, geen placeholders. Geef werkelijke waarden via een afgeschermde stdin-overdracht door, zonder shell tracing of logoutput. Geheimen gaan niet in GitHub-variabelen, broncode, procesargumenten, kandidaatbundels of uitvoerlogs. De app krijgt alleen haar beschermde runtimesnapshot. De adapter voegt de eigen vaultsleutel en `HAAGV_HOST`, `HAAGV_PORT`, `HAAGV_ENVIRONMENT`, `HAAGV_RELEASE_SHA` en mailvaultpad toe; dit zijn geen extra GitHub-variabelen.

De vier publieke waarden zitten niet als runtimeconfig in de statische bundel. Het buildmanifest bindt wel de SHA-256 van het genormaliseerde JS-object `{origin,dataMode,supabaseUrl,publishableKey}`. De adapter vergelijkt dit vóór verzegeling met de aangeleverde waarden en bewaart daarnaast het snapshotdigest. Een bestaande `config_id` kan niet andere waarden krijgen.

## Beoordeelde SSH-route

Er zijn geen repositoryrunners geregistreerd. De organisatie-API voor restricted selected-workflow-runnergroepen is met de beschikbare credentials niet leesbaar (403). Repositoryscope en labels bewijzen geen PR-afscherming; daarom worden de eigen runners niet geregistreerd of gestart.

De uitvoerbare alternatieve route gebruikt het bestaande, door de eigenaar geautoriseerde SSH-beheeraccount. `ops/ssh-release.py` leest de vier waarden uit het juiste GitHub environment, controleert exact `main`-SHA en CI, en geeft token/config alleen via SSH-stdin aan de root-owned adapter. De host herhaalt dezelfde CI-controle. De speciale `operator-*`-operaties krijgen geen sudo-regel voor de runner. Alleen de bestaande hostbeheerder kan deze root-opdrachten uitvoeren; buildcode draait vervolgens met het eigen buildaccount, zonder servergeheimen en zonder aanvullende groepen.

```sh
python3 ops/ssh-release.py candidate --environment staging --sha VOLLEDIGE_MAIN_SHA \
  --config-id hvcup-v1 --check-only
python3 ops/ssh-release.py candidate --environment staging --sha VOLLEDIGE_MAIN_SHA \
  --config-id hvcup-v1
```

Gebruik voor productie exact dezelfde afzonderlijke opdracht met `--environment production`. `--check-only` verricht geen hostoperatie. Een kandidaatbuild doet `npm ci --ignore-scripts --include=dev`, `npm run verify`, `npm prune --omit=dev --ignore-scripts` en controleert dat het gecommitte lockbestand ongewijzigd is. Root kopieert met directory-FD's, `O_NOFOLLOW`, type/eigenaarschecks en wijzigingsdetectie naar een aparte onveranderlijke uitvoer. De kandidaat bevat `dist`, `server`, `scripts` (inclusief eerste-adminbootstrap), runtimeafhankelijkheden en packagebestanden; geen runtimegeheimen. Een build start geen app en wisselt geen `current`.

Het kandidaat-ID is `SHA-REQUEST_ID-1` voor SSH en `SHA-RUN_ID-RUN_ATTEMPT` voor een workflow. Het manifest bindt SHA, CI-run/poging/job, doel, configuratie, toolchain, lockfile, werkelijk buildmanifest, artefactdigest en runtimesnapshot.

## Apart activeren, bootstrap en rollback

Voer pas uit na de concrete succesvolle nieuwe kandidaat en de vooraf geautoriseerde releaseopdracht:

```sh
python3 ops/ssh-release.py activate --environment staging --sha VOLLEDIGE_KANDIDAAT_SHA \
  --candidate-id EXACT_KANDIDAAT_ID
```

De adapter wisselt alleen de eigen `current`, herstart alleen de eigen app en vereist `/api/health` met `ok=true`, service `haagv`, de juiste omgeving en exacte SHA, plus `/api/ready`. De vorige gezonde app/configuratiecombinatie blijft als `previous` behouden. Bij een mislukte eerste activatie zonder vorige release stopt alleen de eigen app en wordt alleen de eigen zojuist gemaakte `current` verwijderd. Een onderbroken sessie vereist inspectie van pointers/manifesten/health vóór een nieuwe opdracht.

De beoordeelde kandidaat bevat `scripts/bootstrap-admin.mjs` en zijn imports. De beheerder kan dit als eigen appaccount met de kandidaat- of releasegebonden beschermde env uitvoeren, een beheerdersmailadres via stdin en `--confirm-empty`. De CLI controleert het lege lidmaatschapsregister, maakt precies de eerste beheerde toernooileiding via de databasefunctie en verstuurt geen mail. Gebruik dit uitsluitend op het door de eigenaar aangewezen nieuwe project en nadat de bijbehorende migraties zijn uitgevoerd. Een al gebootstrapte omgeving wordt geweigerd. Supabase OTP moet later nog het bezit van de mailbox verifiëren.

Lees voor rollback de werkelijk bestaande eigen `previous/manifest.json` en gebruik precies die SHA:

```sh
python3 ops/ssh-release.py rollback --environment staging --sha VOLLEDIGE_VORIGE_GEZONDE_SHA
```

Een gezonde eerdere app/configuratiecombinatie is vereist. Rollback wijzigt geen database, mail/provider, DNS of proxy. Beoordeel migratiecompatibiliteit en gegevensherstel afzonderlijk.

## GitHub-workflows en publieke route

Beide omgevingen hebben afzonderlijke `haagv-vps08-ENV-candidate.yml`, `…-activate.yml` en `…-rollback.yml`, uitsluitend `workflow_dispatch`, met volledige SHA-input en minimale leesrechten. Candidate vraagt ook expliciet de vooraf geplaatste `config_id`; activate het exacte kandidaat-ID. Voor de latere runnerroute blijven een werkelijk geverifieerde restricted selected-workflows-policy, passende GitHub environmentbescherming en een root-owned `runner-access-approved.json` verplicht. De goedkeuring moet repository, exacte runnernaam, policy `restricted-selected-workflows` en uitsluitend de drie eigen workflowpaden op `@refs/heads/main` bevatten.

De publieke route is een afzonderlijke stap na gezonde loopback. Dg-vps-08 heeft publiek IPv4 `204.168.128.28`. De eigenaar heeft op 25 november de eigen records gecorrigeerd: alle vier autoritatieve StackDNS-nameservers en de gecontroleerde Cloudflare-/Google-resolvers geven voor beide origins dit IPv4-adres, TTL 3600; er zijn geen AAAA-records. Lokale/VPS-resolvercaches hadden bij de nameting nog circa 47 minuten het eerdere `167.235.202.206`-antwoord. Gebruik voor tussentijdse doelcontroles een expliciete `curl --resolve` per origin, zonder gedeelde DNS-configuratie te veranderen. De eerdere TLS-fout bewijst nog geen status na proxy-inrichting. Installeer uitsluitend de nieuwe eigen Caddysnippet na gezamenlijke configuratievalidatie, met behoud van alle bestaande snippets; herlaad Caddy pas na die validatie. Controleer TLS, publieke health/readiness, OTP en de belangrijkste gebruikersflow. Leg bestaande service-PID's, health, proxies en pointers voor en na deze stap vast.
