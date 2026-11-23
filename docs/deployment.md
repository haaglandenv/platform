# Haagv staging op dg-vps-08

Deze route bereidt alleen `haagv-platform-staging` voor. Kandidaatbouw, activatie en rollback zijn drie afzonderlijke handmatige workflows. Er is geen automatische deployment bij push of PR. Bestaande Fabelpad-/CastIQ-omgevingen, runners, proxy, DNS en databases blijven buiten deze route.

## Vast contract

| Onderdeel | Waarde |
| --- | --- |
| Repository / integratiebranch | `haaglandenv/platform` / `main` |
| Host / machine-id | `dg-vps-08` / `05db94b99eca4c3d815f6585ef8ed517` |
| SSH | expliciete bestaande sleutel, `HostKeyAlias=100.65.51.108`, strict host checking |
| Doel / runnernaam | `haagv-platform-staging` |
| Accounts | `run-haagv-stg`, `build-haagv-stg`, `app-haagv-stg` |
| Loopback / appservice | `127.0.0.1:4190` / `haagv-platform-staging.service` |
| Runnerlabels | `self-hosted`, `Linux`, `X64`, `dg-vps-08`, `haagv-platform-staging` |
| Node / npm | `24.22.1` / `11.19.1`, eigen root-owned toolchain |
| Vereiste CI | workflow `ci.yml`, push op `main`, job `verify` op exact dezelfde SHA |
| GitHub environment voor activering | eigen `haagv-platform-staging`; pas later aanmaken/beveiligen |
| Gedeelde buildlock | bestaande `/run/lock/dg-build.lock`, root:dg-build 0660; bestaande tmpfiles en groepsleden behouden |

De runtime start met `npm start` → `node server/index.mjs`. systemd gebruikt dezelfde uitvoering direct via de gepinde Nodebinary. De Nodebuild voert de oorspronkelijke Python-build uit en bundelt de webclient. De kandidaatroute doet `npm ci --ignore-scripts --include=dev`, `npm run verify` en `npm prune --omit=dev --ignore-scripts`, met het gecommitte lockbestand. De build voert geen migraties of mail uit.

## Voorbereiding en rechten

`ops/install-host.py` controleert standaard alleen de juiste host, vrije eigen namen/poort, gedeelde lock, bestaande utilities en capaciteit. `--apply` maakt uitsluitend nieuwe eigen accounts, paden, toolchain, runnerpakket, beperkte sudoers, privé-vaultkey, uitgeschakelde app-/runnerunits en een inactieve proxysnippet. Hij registreert/start geen runner, start/enabled geen app, maakt geen `current`, importeert geen proxy en wijzigt geen DNS. Bij bestaande eigen resources weigert hij; inspecteer een gedeeltelijke/eerdere installatie vóór een nieuwe poging.

De beheerder gebruikt een beoordeelde root-owned bronmap buiten iedere runnercheckout:

```sh
sudo /usr/bin/python3 -I -B /root/haagv-platform-prep.XXXXXX/ops/install-host.py
sudo /usr/bin/python3 -I -B /root/haagv-platform-prep.XXXXXX/ops/install-host.py --apply
```

`ops/pins.json` bindt de officiële Node- en runnerdownloads aan SHA-256. De installer controleert de uitgepakte Node- en npmversie. De uitslag staat niet-geheim in `/etc/dg-webservices/haagv-platform-staging/installation.json`. De feitelijke uitgevoerde status staat in [deployment-status.md](deployment-status.md).

| Pad | Rechten/functie |
| --- | --- |
| `/usr/local/libexec/haagv-platform-staging` | root-owned adapter, geen runner/build/app-writes |
| `/etc/dg-webservices/haagv-platform-staging/host.json` | vaste niet-geheime metadata en toegekende UID/GID |
| `…/build-configs/CONFIG_ID.json` | onveranderlijke vier publieke waarden, root:build 0640 |
| `…/runtime-secrets/CONFIG_ID.json` | uitsluitend serversecret van het nieuwe Supabase-project, root:root 0600 |
| `…/runtime-configs/CONFIG_ID/SHA.env` | versiegebonden runtime, root:app 0640; build/runner kunnen niet lezen |
| `…/secrets/mail-encryption-key` | ter plaatse gegenereerde base64-sleutel van 32 bytes, root:app 0640 |
| `…/prepared/*.caddy.disabled` | buiten actieve proxy-import, domeinplaceholder |
| `/var/lib/dg-build/haagv-platform-staging` | eigen buildhome/cache en werkmap |
| `/opt/actions-runner/haagv-platform-staging` | eigen pakket, voorlopig ongeregistreerd en gestopt |
| `/opt/dg-toolchains/haagv-platform-staging` | eigen vaste Node/npm, root-owned |
| `/srv/sites/haagv-platform-staging/{candidates,releases}` | verzegeld, root:app, app/build/runner kunnen niet wijzigen |
| `…/shared` | enige appschrijfmap, app 0700; versleutelde mailinstellingen worden 0600 geschreven |

De runner krijgt alleen drie digestgepinde, projectspecifieke sudo-opdrachten met `NOSETENV`, vaste operaties en strikte argumenten. Hij krijgt geen algemene sudo of recht op systemctl. Elke bevoorrechte operatie valideert opnieuw host, accounts, repository, volledige SHA, `main`, vereiste CI, actuele handmatige workflowrun en exacte runnernaam. Root kopieert buildbestanden met directory-FD's en `O_NOFOLLOW` naar een afzonderlijke root-owned uitvoer; bronlinks, hardlinks en wijzigingen tijdens kopiëren worden geweigerd. De onafhankelijke root-supervisor houdt de lock vast totdat een geannuleerde buildprocesgroep volledig is gestopt. Lockconflict geeft status 75; de kandidaatworkflow probeert hoogstens eenmaal opnieuw na 30 seconden.

## Vier variabelen en nog ontbrekende koppeling

De enige GitHub-variabelen zijn:

- `HAAGV_APP_ORIGIN`: geverifieerde HTTPS-origin van het nieuwe doel, zonder pad/poort.
- `HAAGV_DATA_MODE`: lokaal `local`, stagingkandidaat `supabase`.
- `NEXT_PUBLIC_SUPABASE_URL`: het door de eigenaar gekoppelde nieuwe project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key van datzelfde project.

Het domein en Supabase-project zijn nog niet ingevuld. Geen waarden van andere omgevingen gebruiken. Publieke waarden worden niet in de statische bundel ingebakken, maar het buildmanifest legt de SHA-256 vast van het genormaliseerde JS-object `{origin,dataMode,supabaseUrl,publishableKey}`. De adapter vergelijkt dat digest vóór verzegeling met de vier aangeleverde waarden en bewaart daarnaast hun eigen snapshotdigest. Gewijzigde publieke waarden vereisen een nieuwe configuratie-ID en kandidaat.

Runtimegeheimen gaan niet in GitHub-variabelen, procesargumenten, broncode of kandidaatbundels. Plaats voor de later gekozen `CONFIG_ID` uitsluitend dit schema in `…/runtime-secrets/CONFIG_ID.json`, root:root 0600:

```json
{"SUPABASE_SECRET_KEY":"ALLEEN_DE_NIEUWE_PROJECTSERVERKEY"}
```

Dit voorbeeld is geen geldige of geplaatste configuratie. Gebruik een afgeschermde overdracht via stdin, zet shell tracing uit en toon de waarde niet. De installer genereert de mail-vaultsleutel op de host; de adapter leest die zelf. `HAAGV_HOST`, `HAAGV_PORT`, `HAAGV_ENVIRONMENT`, `HAAGV_RELEASE_SHA` en privé-bestandspaden zijn hostgegenereerde runtimegegevens, geen extra GitHub-variabelen. Runtimegeheimen blijven buiten de kandidaat; de release bevat een root-owned verwijzing naar de bijbehorende beschermde runtimesnapshot.

## Runner veilig vrijgeven

Registratie/start is geblokkeerd totdat de eigen runner uitsluitend de drie beoordeelde handmatige workflows op `refs/heads/main` kan uitvoeren. Repositoryscope en labels alleen bewijzen dat niet: onbeoordeelde PR's mogen deze runner niet bereiken. Controleer daarvoor de beschikbare organisatie-/runnergroeppolicy en GitHub-planrechten. Als restricted selected-workflow-toegang niet beschikbaar is, registreer/start deze runner niet; gebruik eerst een aantoonbaar gelijkwaardige afgeschermde route.

Na werkelijk geverifieerde toegangsbeperking plaatst de beheerder een root-owned `runner-access-approved.json` (0600) met repository, runnernaam, policy `restricted-selected-workflows` en exact deze `workflows`:

```text
haaglandenv/platform/.github/workflows/haagv-vps08-staging-candidate.yml@refs/heads/main
haaglandenv/platform/.github/workflows/haagv-vps08-staging-activate.yml@refs/heads/main
haaglandenv/platform/.github/workflows/haagv-vps08-staging-rollback.yml@refs/heads/main
```

De unit en adapter vereisen dit bewijs. Registreer pas daarna repositoryscope `haaglandenv/platform`, naam `haagv-platform-staging` en de vaste labels, onder `run-haagv-stg`. Een kortlevend registratietoken wordt niet opgeslagen in documentatie/logs. Start uitsluitend de eigen runnerservice nadat de API dezelfde scope/naam/labels bevestigt. Deze handelingen zijn tijdens voorbereiding niet uitgevoerd.

## Later kandidaat bouwen

Zorg eerst dat de definitieve volledige commit-SHA in `main` staat, `ci.yml`/`verify` erop slaagt, de beveiligde eigen runner beschikbaar is, de vier nieuwe waarden zijn ingevuld en het vooraf gekozen runtimeprofiel bestaat. `CONFIG_ID` bevat 1–63 kleine letters/cijfers/streepjes en begint met letter/cijfer; het is een workflowinput, geen extra GitHub-variable. Gebruik dezelfde ID nooit voor andere waarden.

```sh
gh workflow run haagv-vps08-staging-candidate.yml --repo haaglandenv/platform --ref main \
  -f release_sha=VOLLEDIGE_GOEDGEKEURDE_MAIN_SHA -f config_id=staging-v1
gh run list --repo haaglandenv/platform --workflow haagv-vps08-staging-candidate.yml --limit 5
gh run watch RUN_ID --repo haaglandenv/platform --exit-status
```

Het kandidaat-ID is `SHA-RUN_ID-RUN_ATTEMPT`. Het manifest bindt die SHA aan CI-job/run/poging, de vierwaarden-snapshot, werkelijk buildmanifest, runtimesnapshot, lockfile, artefact en toolchain. Een build wisselt geen releaseverwijzing en start geen app. De huidige voorbereiding heeft geen kandidaat op de doel-VPS gemaakt.

## Later activeren en herstellen

Een aparte expliciete releaseopdracht blijft vereist. Maak/beveilig dan uitsluitend het nieuwe GitHub environment `haagv-platform-staging`, met passende reviewers en `main`-beperking. Controleer eigen systemd-unit, runtimesnapshot, kandidaatmanifest en vrije poort opnieuw. De actieve proxy en DNS blijven hierbij nog ongemoeid.

```sh
sudo systemd-analyze verify /etc/systemd/system/haagv-platform-staging.service
gh workflow run haagv-vps08-staging-activate.yml --repo haaglandenv/platform --ref main \
  -f release_sha=VOLLEDIGE_KANDIDAAT_SHA -f candidate_id=EXACT_KANDIDAAT_ID
gh run watch ACTIVATIE_RUN_ID --repo haaglandenv/platform --exit-status
```

Activatie en rollback gebruiken dezelfde doelconcurrency en eigen lock. De adapter wisselt alleen de eigen `current` naar app én corresponderende runtime, herstart alleen de eigen app en vereist `/api/health` met `ok=true`, service `haagv`, omgeving `staging` en exacte SHA, plus `/api/ready`. De vorige gezonde combinatie blijft als `previous` behouden. Bij een mislukte eerste installatie zonder vorige release stopt hij alleen de eigen app en verwijdert uitsluitend zijn eigen zojuist gemaakte `current`; de mislukte release blijft voor onderzoek. Een herstart na hostuitval of afgebroken workflow is geen automatisch bewezen herstel: inspecteer eigen pointers/manifesten/health eerst.

Voor rollback lees je alleen het eigen werkelijke vorige manifest en gebruik je precies die SHA:

```sh
sudo python3 -I -c 'import json; p="/srv/sites/haagv-platform-staging/previous/manifest.json"; d=json.load(open(p)); print(d["sha"],d["configId"],d["id"])'
gh workflow run haagv-vps08-staging-rollback.yml --repo haaglandenv/platform --ref main \
  -f release_sha=VOLLEDIGE_VORIGE_GEZONDE_SHA
gh run watch ROLLBACK_RUN_ID --repo haaglandenv/platform --exit-status
```

De vorige runtimesnapshot moet exact overeenkomen met het gezonde bewijs. Rollback wijzigt geen database, mail/provider, DNS, proxy of bootpersistentie. Migraties zijn apart: beoordeel compatibiliteit, backup en herstel op geïsoleerde gegevens; zet geen oude app terug wanneer haar datamodel niet compatibel is.

Na een gezonde loopbackrelease volgt pas de afzonderlijke publieke stap: verifieer de nieuwe origin/DNS-bestemming, render de eigen `.caddy.disabled` buiten de actieve import, valideer samen met de bestaande Caddyconfiguratie, leg bestaande health/service/proxytoestand opnieuw vast en installeer alleen de nieuwe eigen snippet na toestemming. Controleer TLS, publieke health/readiness, OTP en de belangrijkste gebruikersflow. Er wordt hier geen nieuw domein of DNS-record aangenomen.
