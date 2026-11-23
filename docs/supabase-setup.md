# Supabase, OTP en platformmail voorbereiden

Deze handleiding richt een **nieuw, door de eigenaar aangewezen leeg project** in. Tijdens de ontwikkeling zijn geen bestaande gehoste Supabase-projecten gewijzigd en geen echte e-mails verzonden. De database is lokaal met een geïsoleerde PostgreSQL-container getest. Een kandidaatbuild activeren op de VPS blijft een afzonderlijke handmatige stap.

## Configuratie en sleutels

De vier GitHub-variabelen zijn uitsluitend:

| Variabele | Betekenis |
| --- | --- |
| `HAAGV_APP_ORIGIN` | De HTTPS-origin van de betreffende omgeving, zonder URL-pad. |
| `HAAGV_DATA_MODE` | `supabase` voor staging/productie; `local` voor lokale ontwikkeling. |
| `NEXT_PUBLIC_SUPABASE_URL` | De HTTPS-projectorigin van het nieuwe project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | De publishable key van dat project (`sb_publishable_…`). |

De browser ontvangt de publieke authconfiguratie via `/api/v1/bootstrap`. De frontendbundle bevat geen ingebouwde runtimeconfiguratie of serversleutels. Buildvalidatie controleert de publieke waarden zonder een databaseverbinding te openen.

De serverruntime heeft daarnaast buiten Git/GitHub/buildartefacten een `SUPABASE_SECRET_KEY` nodig. Deze sleutel wordt uitsluitend op de server gebruikt voor gecontroleerde database- en Auth-adminhandelingen. `HAAGV_MAIL_ENCRYPTION_KEY` bevat een base64-gecodeerde willekeurige sleutel van 32 bytes voor de versleutelde mailinstellingen. De host kan `HAAGV_MAIL_SETTINGS_FILE` naar een besloten persistent bestand laten wijzen. `HAAGV_RELEASE_SHA` en `HAAGV_ENVIRONMENT` zijn door de host gegenereerde releasemetadata, geen extra GitHub-variabelen. Sleutelwaarden worden niet in terminaluitvoer, broncode of rapporten gekopieerd.

## Lege database en migratie

1. Laat de eigenaar expliciet het nieuwe project identificeren. Controleer dat dit geen bestaand project met andere toepassingen is.
2. Voer na beoordeling de SQL in `supabase/migrations/20261123193301_platform_authoritative_store.sql` op dat nieuwe project uit, bijvoorbeeld in de SQL Editor. De migratie is lokaal gemaakt met de gepinde Supabase CLI 3.3.0. Er is geen automatische remote migration-/deployactie ingericht.
3. De migratie maakt één lege versiecontainer, beheerde lidmaatschappen en commando-ontvangstbewijzen. Zij voegt geen voorbeeldvereniging, spelers, uitslagen of gebruikers toe.
4. Controleer de drie tabellen `haagv_platform_state`, `haagv_memberships` en `haagv_command_receipts`: RLS aan; geen privileges voor `anon`/`authenticated`; geen clientbeleid dat toegang verleent. Alleen de serverrol kan de benodigde tabellen en RPC's gebruiken. Alle functies zijn `SECURITY INVOKER` met een vast leeg zoekpad. Directe clienttoegang tot de basisgegevens hoort te falen.

De server leest stateversie en beheerde lidmaatschappen in één PostgreSQL-snapshot via `haagv_read_state`. Het commit-RPC schrijft een versievergelijking, domeinwijziging, lidmaatschappen en idempotent ontvangstbewijs als één transactie. Een concurrerende wijziging levert `VERSION_CONFLICT`; een herhaald request met dezelfde gebruiker/sleutel/inhoud krijgt hetzelfde ontvangstbewijs. Andere inhoud met dezelfde sleutel wordt geweigerd. De frontend kan uitsluitend getypeerde commando's sturen; er bestaat geen API om een willekeurige clientstate te uploaden.

## Eenmalig eerste leidingaccount

De client gebruikt `shouldCreateUser: false`. Daardoor kan een onbekend e-mailadres zich niet via de inlogknop automatisch registreren. Voor de eerste beheerder is een operatorhandeling nodig op de uitdrukkelijk gekozen lege installatie.

1. Configureer de serveromgeving met de vier publieke waarden en de server-secret van **dat nieuwe project**. Gebruik een besloten env-bestand buiten de repository; zet de waarden niet in CLI-argumenten.
2. Bewaar uitsluitend het e-mailadres van de eerste beheerder tijdelijk in een besloten bestand buiten de repository (rechten `0600`).
3. Voer vanuit de releasebron uit:

```sh
node --env-file=/besloten/pad/runtime.env scripts/bootstrap-admin.mjs --confirm-empty < /besloten/pad/eerste-beheerder.txt
```

De CLI controleert eerst of er geen enkel beheerd lidmaatschap bestaat. Zij maakt een Auth-account zonder het e-mailadres vooraf bevestigd te verklaren en kent via `haagv_bootstrap_leadership` eenmaal de rol `leadership` toe. De transactie weigert een tweede bootstrap, ook bij gelijktijdige pogingen. Er wordt door deze CLI geen mail verzonden. Het eerste inloggen vereist daarna bezit van de mailbox via de echte OTP-code. De CLI print uitsluitend de gebruikers-ID. Ruim het tijdelijke e-mailbestand op volgens de hostafspraken.

Als een Auth-account al bestaat of een gelijktijdige bootstrap de toekenning wint, stopt de CLI. Controleer dan als operator de Auth-gebruiker en beheerde lidmaatschappen; draai geen herhaald automatisme dat bestaande rollen overschrijft. Verdere accounts worden gecontroleerd als Auth-gebruiker voorbereid; de leiding kent daarna de noodzakelijke, beperkte lidmaatschappen toe. Rollen worden nooit ontleend aan `user_metadata`.

## OTP via Supabase Auth en Resend SMTP

Supabase verzorgt de OTP-aanvraag en verificatie. De API controleert iedere ontvangen Bearer-token met `auth.getUser(jwt)` en leest de actuele rol uit de eigen beheerde tabel. Web en Android gebruiken dezelfde API en dezelfde rollen. `X-Haagv-Membership` kiest uitsluitend een eigen actief lidmaatschap.

Configureer op het nieuwe Supabase-project Email Auth en de app-origin. Pas het e-mailsjabloon voor Magic Link aan zodat het de OTP-variabele `{{ .Token }}` als leesbare code toont. De clients vragen een code aan met `signInWithOtp({ email, options: { shouldCreateUser: false } })` en controleren deze met `verifyOtp({ email, token, type: 'email' })`. De standaard sjablooninstelling zou een inloglink sturen; de templatewijziging is dus noodzakelijk voor de gekozen codeflow. Zie de actuele [Supabase OTP-documentatie](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Verifieer eerst het verzenddomein bij Resend. Stel daarna in de SMTP-instellingen van dit nieuwe Supabase-project de door Resend beschreven combinatie in: host `smtp.resend.com`, poort `465`, gebruiker `resend`, met de daarvoor bestemde Resend-sleutel als SMTP-wachtwoord. Kies de geverifieerde afzender en zichtbare organisatienaam. Bewaar deze SMTP-gegevens in Supabase, niet als frontend- of GitHub-variabele. Zie [Resend voor Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp) en [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Een gecontroleerde liveproef met een eigenaar/beheerder moet nog bewijzen dat de OTP daadwerkelijk wordt ontvangen, een onjuiste/verlopen code faalt en het juiste lidmaatschap na inloggen verschijnt. De lokale tests gebruiken mock-Auth en tellen niet als externe bezorgproef.

## Overige platformmail via Resend API

De OTP-mail blijft gescheiden van platformmeldingen. De toernooileiding beheert via **Mailinstellingen** de Resend API-sleutel, afzender en antwoordadres. `GET /api/v1/admin/mail-settings` toont uitsluitend de gemaskeerde status; een sleutel kan worden vervangen of verwijderd en wordt nooit teruggelezen. De server bewaart het materiaal met AES-256-GCM en een runtimeversleutelingssleutel. Er is een expliciete beheeractie voor een testmail.

Domeincommando's voor berichten, aanstellingen, inschrijvingsbeoordeling, planning en bezwaarbesluiten schrijven waar er beheerde ontvangers zijn een transactioneel uitgaand record. Dit record bevat gebruikers-ID's, geen door een client vrij gekozen mailadressen. De server zoekt het geverifieerde adres via Auth op en verwerkt de melding met een vaste idempotentiesleutel. De status `accepted` betekent dat Resend de aanvraag accepteerde; zij bewijst geen bezorging in een inbox. Zonder instellingen of geverifieerd adres blijft de melding `pending`. Een verzendprobleem maakt een reeds opgeslagen sportief besluit niet ongedaan.

Leiding kan de wachtrij bekijken via `/api/v1/admin/mail-outbox` en expliciet opnieuw verwerken via `POST /api/v1/admin/mail-outbox/process`. Voor automatisch periodiek verwerken moet de host later een gecontroleerde servertaak kiezen; er is geen externe planner geactiveerd.

## Lokale controle en voorbereiding voor staging

`local` bewaart maximaal één herkenbaar beginvoorbeeld per primaire entiteit in een privébestand onder `.local/`. Het voorbeeldduel heeft nog geen tegenstander of uitslag. Een lokale beheersessie is alleen beschikbaar met `HAAGV_ENABLE_LOCAL_SESSION=1`, loopbackbinding én loopbackaanvraag, buiten productie. Deze cookie geeft nooit toegang tot Supabase-modus.

```sh
npm test
npm run test:db
npm run build
```

De databasetest start en verwijdert uitsluitend zijn eigen Docker-container `haagv-platform-validation-<procesnummer>` op een geïsoleerd netwerk zonder gepubliceerde poorten. Andere lokale Supabase-projecten blijven buiten deze tests. Getest zijn onder meer clientweigering/RLS, foutieve foreign keys met volledige rollback, één succesvolle schrijver bij een CAS-race en eenmalige eerste-roltoekenning. Bij de tijdelijke bare-Postgres-test is geen Supabase CLI-stack geregistreerd; beveiligingscataloguscontroles in de SQL-suite vormen het lokale bewijs, geen gehost advisorrapport.

Voor daadwerkelijke stagingvrijgave blijven projectidentificatie, externe OTP-/mailproef, runtime-secretplaatsing, back-up/herstel en de aparte handmatige kandidaat-/activatie-/rollbackprocedure op de VPS nodig. `/api/health` toont de release-identiteit; `/api/ready` controleert de gegevensopslag. Ontbrekende platformmail wordt als niet ingericht getoond en krijgt geen fictieve successtatus.
