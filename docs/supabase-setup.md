# Supabase, OTP en platformmail voorbereiden

Op 25 november 2026 heeft de eigenaar de nieuwe projecten expliciet aangewezen: **hvcup-staging** (`wntzrrzolgnuiszudmzn`, DartFlow) en **hvcup-production** (`mgerzyyeuqwjdpwfdkqz`, Duindorpdoet). Beide waren leeg: geen Auth-gebruikers, platformtabellen of migraties. De twee migraties uit deze repository zijn daarop toegepast. Andere projecten zijn niet gewijzigd. Er is geen echte e-mail verzonden. Een kandidaatbuild, activatie en rollback blijven afzonderlijke handmatige handelingen.

## Configuratie en sleutels

De vier GitHub-variabelen zijn uitsluitend:

| Variabele | Betekenis |
| --- | --- |
| `HVCUP_APP_ORIGIN` | De HTTPS-origin van de betreffende omgeving, zonder URL-pad. |
| `HVCUP_DATA_MODE` | `supabase` voor staging/productie; `local` voor lokale ontwikkeling. |
| `NEXT_PUBLIC_SUPABASE_URL` | De HTTPS-projectorigin van het nieuwe project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | De publishable key van dat project (`sb_publishable_…`). |

De browser ontvangt de publieke authconfiguratie via `/api/v1/bootstrap`. De frontendbundle bevat geen ingebouwde runtimeconfiguratie of serversleutels. Buildvalidatie controleert de publieke waarden zonder een databaseverbinding te openen.

De serverruntime heeft daarnaast buiten Git/GitHub/buildartefacten een `SUPABASE_SECRET_KEY` nodig. Deze sleutel wordt uitsluitend op de server gebruikt voor gecontroleerde database- en Auth-adminhandelingen. `HAAGV_MAIL_ENCRYPTION_KEY` bevat een base64-gecodeerde willekeurige sleutel van 32 bytes voor de versleutelde mailinstellingen. De host kan `HAAGV_MAIL_SETTINGS_FILE` naar een besloten persistent bestand laten wijzen. `HAAGV_RELEASE_SHA` en `HAAGV_ENVIRONMENT` zijn door de host gegenereerde releasemetadata, geen extra GitHub-variabelen. Sleutelwaarden worden niet in terminaluitvoer, broncode of rapporten gekopieerd.

## Lege database en migratie

1. Laat de eigenaar expliciet het nieuwe project identificeren. Controleer dat dit geen bestaand project met andere toepassingen is.
2. Pas de bestanden onder `supabase/migrations/` in volgorde toe op dat nieuwe project. De CLI 3.3.0 heeft de bestandsnamen gegenereerd. De tweede migratie trekt publieke uitvoering van de standaard Supabase-eventtriggerhelper in, wanneer die bestaat; de eigen RLS-trigger blijft werken. Op de twee hierboven genoemde projecten is dit al uitgevoerd. Er is geen automatische migratie bij een build of activatie.
3. De migratie maakt één lege versiecontainer, beheerde lidmaatschappen en commando-ontvangstbewijzen. Zij voegt geen voorbeeldvereniging, spelers, uitslagen of gebruikers toe.
4. Controleer de drie tabellen `haagv_platform_state`, `haagv_memberships` en `haagv_command_receipts`: RLS aan; geen privileges voor `anon`/`authenticated`; geen clientbeleid dat toegang verleent. Alleen de serverrol kan de benodigde tabellen en RPC's gebruiken. Alle functies zijn `SECURITY INVOKER` met een vast leeg zoekpad. Directe clienttoegang tot de basisgegevens hoort te falen.

De server leest stateversie en beheerde lidmaatschappen in één PostgreSQL-snapshot via `haagv_read_state`. Het commit-RPC schrijft een versievergelijking, domeinwijziging, lidmaatschappen en idempotent ontvangstbewijs als één transactie. Een concurrerende wijziging levert `VERSION_CONFLICT`; een herhaald request met dezelfde gebruiker/sleutel/inhoud krijgt hetzelfde ontvangstbewijs. Andere inhoud met dezelfde sleutel wordt geweigerd. De frontend kan uitsluitend getypeerde commando's sturen; er bestaat geen API om een willekeurige clientstate te uploaden.

## Eenmalig eerste leidingaccount

De eerste beheerder is op verzoek van de eigenaar **info@dgwebservices.nl**, afzonderlijk in beide projecten. De moderne server-only sleutels staan veilig op de VPS en dit account is in beide projecten eenmalig voorbereid. Voer de bootstrap daar niet nogmaals uit. Het adres is niet vooraf bevestigd; bezit van de mailbox moet bij de eerste OTP-login blijken. De client gebruikt `shouldCreateUser: false`. Daardoor kan een onbekend e-mailadres zich niet via de inlogknop automatisch registreren. De eerste toekenning is een operatorhandeling op de uitdrukkelijk gekozen lege installatie.

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

Configureer op elk nieuw Supabase-project Email Auth, de eigen HTTPS-app-origin en een OTP-lengte van **6**. Web en Android weigeren kortere of langere codes. Plaats `emails/supabase/otp.html` bij **Magic Link** en `emails/supabase/confirmation.html` bij **Confirm signup**. Beide tonen de OTP-variabele `{{ .Token }}` als leesbare code. Onderwerpen en de publicatiestappen staan in `emails/supabase/README.md`. De eigenaar heeft SMTP al gekoppeld; de beschikbare databaseconnector kan de Auth-templateconfiguratie niet publiceren. De eigenaar heeft op 25 november bevestigd dat beide templates, OTP-lengte 6 en de Site URLs al zijn ingesteld. Dit is een eigenaarsbevestiging; de connector kan deze Auth-instellingen niet uitlezen. De clients vragen een code aan met `signInWithOtp({ email, options: { shouldCreateUser: false } })` en controleren deze met `verifyOtp({ email, token, type: 'email' })`. De standaard sjablooninstelling zou een inloglink sturen; de templatewijziging is dus noodzakelijk voor de gekozen codeflow. Zie de actuele [Supabase OTP-documentatie](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Verifieer eerst het verzenddomein bij Resend. Stel daarna in de SMTP-instellingen van dit nieuwe Supabase-project de door Resend beschreven combinatie in: host `smtp.resend.com`, poort `465`, gebruiker `resend`, met de daarvoor bestemde Resend-sleutel als SMTP-wachtwoord. Kies de geverifieerde afzender en zichtbare organisatienaam. Bewaar deze SMTP-gegevens in Supabase, niet als frontend- of GitHub-variabele. Zie [Resend voor Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp) en [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Een gecontroleerde liveproef met een eigenaar/beheerder moet nog bewijzen dat de OTP daadwerkelijk wordt ontvangen, een onjuiste/verlopen code faalt en het juiste lidmaatschap na inloggen verschijnt. De lokale tests gebruiken mock-Auth en tellen niet als externe bezorgproef.

## Overige platformmail via Resend API

De toernooileiding beheert via **Instellingen → Mailinstellingen** de Resend API-sleutel, afzender en antwoordadres. `GET /api/v1/admin/mail-settings` toont uitsluitend de gemaskeerde status; een sleutel kan worden vervangen of verwijderd en wordt nooit teruggelezen. De server bewaart het materiaal met AES-256-GCM en een runtimeversleutelingssleutel. Er is een expliciete beheeractie voor een testmail.

Onder **E-mailtemplates** zijn acht templates te bewerken: inlogcode, accountbevestiging, testmail, bericht, aanstelling, teaminschrijving, wedstrijdplanning en bezwaarbesluit. Iedere template heeft een onderwerp, HTML en gewone tekst, een eigen lijst toegestane shortcodes, voorbeeldweergave, versiecontrole en herstel naar standaard. De server valideert HTML en vervangt tekstwaarden met escaping. Wijzigingen en een begrensd auditlog staan versleuteld in dezelfde private kluis. Resend-meldingen gebruiken de opgeslagen templates direct. De twee Auth-templates hebben een aparte export: opslaan of exporteren publiceert niet bij Supabase. Er is geen route om een OTP via Resend API te versturen.

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

Beide omgevingen zijn publiek geactiveerd met geverifieerde HTTPS, health/readiness en de eerste beheerdersaccounts. De moderne server-only sleutels zijn automatisch geplaatst en gevalideerd; zie `evidence/runtime-provisioning-2026-11-25.json`. De echte publieke API weigert basisgegevens en server-RPC met HTTP401/42501 voor de publishable key. Het definitieve uitrolbewijs staat in `deployment-status.md`. De Auth-templates, OTP6, Site URLs en SMTP zijn door de eigenaar bevestigd. Een echte mailboxproef is niet uitgevoerd. De Resend API-configuratie is via de beheeromgeving beschikbaar en wacht op de sleutel die de leiding zelf wil instellen. `/api/health` toont de release-identiteit en `/api/ready` controleert de gegevensopslag; mail staat tot configuratie terecht op unconfigured.
