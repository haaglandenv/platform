# Keuzes en koppelingen

De HV Control-huisstijl en lokale assets blijven de basis. Een gedeelde Node.js 24-API beheert domeinregels en toegangscontrole voor web en React Native Android. Supabase verzorgt OTP en Postgres. Rollen komen uitsluitend uit beheerde lidmaatschappen; browserinvoer en user_metadata geven geen bevoegdheden. Supabase-modus bevat geen voorbeeldrecords.

Op 25 november 2026 zijn de aangewezen nieuwe projecten hvcup-staging (DartFlow) en hvcup-production (Duindorpdoet) geïdentificeerd, leeg bevonden en gemigreerd. Hun moderne serversleutels zijn automatisch en afgeschermd naar de eigen VPS-runtime overgebracht. De tijdelijke overdrachtsfuncties zijn gesloten en private overdrachtsmaterialen verwijderd. Sleutels staan buiten Git, builds, chat en uitvoerlogs.

Beide eigen omgevingen zijn nu geactiveerd op bronrelease e21809120e0520effe8b9d9a7a1d02a9276bf74b met geslaagde CI, afzonderlijke kandidaten/activaties en geldig publiek HTTPS. Bestaande omgevingen en gedeelde hostinstellingen zijn behouden. Zie deployment-status.md. Kandidaten, activeren en rollback blijven afzonderlijke handmatige acties; alleen de huidige eigen appunits starten mee na hostherstart.

De eerste beheerder info@dgwebservices.nl is in beide projecten eenmalig voorbereid met een beheerd leidinglidmaatschap. De eigenaar bevestigt de twee Auth-templates, OTP-lengte 6, Site URLs en SMTP. De connector kan de Auth-configuratie niet zelf uitlezen of wijzigen. Web en Android accepteren alleen precies zes cijfers. Er is geen echte OTP-mail/loginproef uitgevoerd.

De beheeromgeving ondersteunt versleutelde Resend API-instellingen, acht bewerkbare templates, shortcodes, voorbeeldweergave, revisies/audit en afzonderlijke Auth-export. De Resend API-sleutel kan de leiding na de eerste login invullen; tot dan staat platformmail terecht als niet ingericht. Het opslaan/exporteren van Auth-templates publiceert niet automatisch bij Supabase; de UI claimt geen gecontroleerde providerstatus.

De algemene Supabase Auth-waarschuwing over gelekte-wachtwoordcontrole is als afzonderlijk configuratieadvies vastgelegd. Het platform heeft alleen OTP-login en heeft geen gebruikerswachtwoord aangeleverd. De database/RPC-toegangsgrenzen zijn gecontroleerd. Een native Android APK/AAB en echte toestelproef blijven onderdeel van de latere Android-productuitwerking.
