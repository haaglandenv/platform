# Verificatie en resterende koppeling

Op 23 november 2026 is de nieuwe platformbron lokaal gebouwd en getest. Node 24.22.1, npm 11.19.1, Python 3.12 en Chromium 151 via Playwright 1.62.1 zijn gebruikt. De schone controlemap staat buiten de repository in `/home/codex/repos/hvcup/voorbereiding-platform/clean-build`. Beide dependencybomen zijn daar met `npm ci` uit de gecommitte lockbestanden geïnstalleerd. Geen bestaande Supabase-omgeving is gebruikt.

De eindcontrole omvat 51 geslaagde unit-/API-/client-/mailtests, 11 SQL-testresultaten en 28 releaseadaptertests. De browsercontroles omvatten daarnaast 26 samengestelde flow-/focus-/authchecks en de 270 routecontroles. De opt-in SQL-test wordt in `npm test` als één bewuste skip getoond en draait volledig in het aparte databasecommando.

## Uitgevoerde controles

| Controle | Uitvoering |
| --- | --- |
| Bron en typecontract | `npm run check`, `npm run typecheck` en Android TypeScript |
| API/domein/opslag | Beheerde rollen, eigen context, intrekking, privacy, volledige wedstrijdketen, bezwaar/correctie, loting, tenues, mediarechten en onafhankelijke beoordeling |
| Gedeelde client | Bearer/context/CAS, verbindingsfout, oorspronkelijke offlineversie, ongeldige oude wachtrij en Unicode/SecureStore-behoud bij mislukte opslag |
| Mail | Versleutelde write-only kluis, sleutelvervanging/verwijdering, vaste Resend-host, providerfouten, eerlijke acceptatiestatus en gedeeltelijke outboxretry |
| Echte lokale SQL | Eigen tijdelijke PostgreSQL 17-container: RLS/grants, één snapshot-RPC, bootstrap-once, transactie-rollback, CAS-race en idempotentie; container daarna verwijderd |
| Releaseadapter | 28 synthetische tests: vereiste exacte CI, main-afkomst, juiste workflow/runner, paden/archieven, onveranderlijke kopie, configuratiehash, locks/cancel, mislukte eerste installatie en rollbackgrens |
| Browser | 54 routes op 360, 390, 800, 1024 en 1280 px: 270 routecontroles, geen pagina-overloop of JavaScript-fouten |
| Browseracties | Werkelijke API-opslag/herladen; mailinstellingen herladen; OTP-aanvraag/fout/succes met Authstub; volledige spelers-/inschrijvings-/opgaven-/official-/uitslagketen; tenues, media en toetsenbord-/modalfocus; sessieverlies, accountwisseling, intrekking, 401 en vertraagde oude antwoorden |
| Android | Expo/React Native TypeScriptcontrole en geslaagde zelfstandige Android Hermes-export |
| Dependencies | Beide `npm audit --audit-level=moderate` zonder bevindingen |
| Host | Inactieve additieve installatie, rechtenaudit en alle 13 conserveringschecks geslaagd; zie `deployment-status.md` |

`npm test` slaat bewust de opt-in Dockerproef over. `npm run test:db` voert die afzonderlijk daadwerkelijk uit; deze skip is geen ontbrekende databasecontrole. Browser/Auth-/Resendstubs bewijzen de applicatieflow, niet externe authenticatie of aflevering. Testmailadressen gebruiken gereserveerde voorbeeldnamen en er is geen echte testmail verzonden.

De oorspronkelijke v18-demo is als basis bewaard in commit `6f20a058e0e87dbe313fdb82a972a100bda0a256`. De oude mockdata/browserrollen en het nieuwe gedeelde gegevensmodel hebben bewust verschillende schermtoestanden. De huidige controles zijn functionele, beveiligings- en responsivecontroles; geen claim van identieke screenshots met de oude volle demo.

## GitHub en release

De oude `main` en `production` zijn op expliciet verzoek vervangen. Vooraf is een complete herstelbundle gemaakt en geverifieerd buiten de repository: `/home/codex/repos/hvcup/voorbereiding-platform/platform-before.bundle`, met eigen SHA-256-bestand en vastgelegde oude refs. De remote bevat uitsluitend `main`; alleen de CI-workflow reageert op pushes. De drie VPS-workflows zijn uitsluitend handmatig. Het definitieve volledige commit-ID en de bijbehorende GitHub-CI-run staan in de oplevering van deze chat; een kandidaat controleert die exacte SHA opnieuw.

**Lokaal:** de relevante build- en configuratiecontroles slagen in lokale modus. De validatie van Supabase-configuratie is met synthetische waarden getest; de echte nieuwe omgevingswaarden ontbreken.

**Doel-VPS:** geen kandidaat aanwezig. Geen runnerregistratie/start, appactivatie, `current`-wissel, proxyimport of DNS-wijziging. De nieuwe accounts, toolchain, units, beperkte releaseadapter en herstelprocedure staan inactief klaar. Bestaande omgevingen zijn ongewijzigd volgens de voor-/nameting.

Voor het nieuwe doel ontbreken nog: geverifieerde HTTPS-origin; nieuwe Supabase-URL/publishable key/serversecret; migratie en eerste beheerder; Resend SMTP/template/domeinverificatie; aantoonbaar beperkte runnertoegang; en later een apart beveiligd activatie-environment. De vier publieke waarden gaan naar GitHub, de serversecret uitsluitend naar het afgeschermde runtimeprofiel. De Resend API-sleutel wordt vervolgens via Instellingen ingevoerd.

Een live OTP-/mailproef, native Android-apparaat-/APK-proef, echte doelkandidaat en publieke activatie zijn niet uitgevoerd. De concrete latere commando's staan in `deployment.md`, de projectkoppeling in `supabase-setup.md` en de mobiele afbakening in `android.md`.
