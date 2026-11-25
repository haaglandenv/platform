# Verificatie en koppeling

Op 25 november 2026 is de bron in de beheerde werkmap gebouwd en gecontroleerd met Node 24.22.1, npm 11.19.1, Python 3.12 en Playwright 1.62.1. Beide dependencybomen zijn met npm ci uit de lockbestanden geïnstalleerd. De lokale tests gebruiken eigen tijdelijke gegevens en sturen geen echte mail naar een bestaande omgeving.

| Controle | Resultaat |
| --- | --- |
| Bron en typecontract | JavaScript-syntax, gedeelde webclient en Android TypeScript geslaagd |
| API/domein/client/mail/provisionering | 66 tests geslaagd; één bewuste SQL-skip in npm test wordt afzonderlijk uitgevoerd |
| Echte lokale SQL | 11 resultaten geslaagd in eigen tijdelijke PostgreSQL 17-container, inclusief RLS, RPC-grants, snapshot, CAS-race, rollback, idempotentie en eenmalige beheerder |
| Releaseadapter | 34 Python-tests en 7 Node-hostprovisioneringstests geslaagd voor beide vaste doelen, exacte CI, workflow/SSH-gates, padscheiding, locks, immutable artifacts, eerste-installatiefout en rollback |
| Routes en browserflows | 54 routes op vijf breedtes: 270 controles; 43 samengestelde route-, CRUD-, mail-, focus-, wedstrijdketen- en authgrenschecks, zonder paginafouten |
| Nieuwe e-mailmodule | 17 browserchecks met echte tijdelijke API/vault en fake Resend: CRUD/reload, revisie, foutinvoerbehoud, shortcodevalidatie, sandboxaanval, export en zes OTP-invoergevallen |
| Android | TypeScript en zelfstandige Expo/Hermes-export geslaagd; geen native APK/AAB of apparaatproef |
| Dependencies | Beide audits zonder bevindingen op niveau moderate of hoger |
| Nieuwe Supabase-projecten | Beide aangewezen projecten leeg vastgesteld, twee migraties toegepast; echte publieke base-table- en state-RPC-aanvragen geweigerd met HTTP401/42501 |
| Gehoste security advisor | Geen WARN/ERROR op beide projecten; de drie INFO-meldingen RLS zonder beleid zijn de bedoelde server-only deny-all opslag |
| VPS | Beide eigen doelen voorbereid; 26 bestaande relevante services en gedeelde/bestaande bestanden behouden; zie deployment-status.md |

De databaseproef start en verwijdert uitsluitend zijn eigen geïsoleerde Docker-container. De nieuwe gehoste schema-inrichting is een afzonderlijke geautoriseerde uitrolhandeling op de door de eigenaar aangewezen lege projecten. De publieke API-controle doet geen gegevenswrites. Zie [Supabase-bewijs](evidence/supabase-2026-11-25.json).

De browserproeven gebruiken Authstubs voor aanvraag/fout/succes, sessieverlies, accountwisseling en intrekking. De fake Resend-provider bewijst de platforminhoud en acceptatieafhandeling; dit is geen bewijs van echte inboxbezorging. De voorbeelden bevatten geen echte contactgegevens. Screenshots en lokale detailrapporten staan buiten Git onder artifacts/. Beide breedtes van de nieuwe e-mailpreview zijn ook visueel geïnspecteerd.

De mailsleutel is write-only en AES-256-GCM-versleuteld. Templatewijzigingen behouden bestaande credentials en gebruiken revisies en een begrensde audit. Onbekende shortcodes en actieve HTML worden geweigerd. De preview heeft een opaque sandbox, beperkte CSP en geen externe aanvragen. Een onafhankelijke read-only review vond geen concrete beveiligingsbevindingen in deze mailgrenzen.

De oorspronkelijke v18-demo en de lokale herstelbundle blijven behouden. De oude remote branches zijn eerder op expliciet verzoek vervangen; main is de integratiebranch. Alleen CI draait bij een push. De zes VPS-workflows zijn handmatig; de operatorroute bouwt en activeert afzonderlijk en controleert de concrete CI-SHA telkens opnieuw. Geen runner is geregistreerd zonder bewezen workflowbeperking.

De eigenaar heeft de DNS-records naar de juiste VPS gecorrigeerd. De moderne serversleutels zijn via een privateproof-beveiligde encrypt-only overdracht naar de vaste VPS-recipient geplaatst en met de echte admin-API en state-RPC gevalideerd. Beide tijdelijke functies geven HTTP410; private overdrachtsmaterialen zijn verwijderd. Zie [overdrachtsbewijs](evidence/runtime-provisioning-2026-11-25.json). Concrete kandidaatbuilds/activaties, eerste beheerdersbootstrap en publieke TLS/health volgen in het uiteindelijke uitrolbewijs. De twee HTML-exports zijn geleverd; de gekoppelde tool heeft geen Auth-configuratiebewerking. De eigenaar heeft bevestigd dat templates, OTP-lengte 6, Site URLs en SMTP zijn ingesteld; een echte OTP-/mailproef is nog niet uitgevoerd.
