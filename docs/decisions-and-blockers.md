# Keuzes en open koppelingen

De HV Control-huisstijl en lokale assets blijven de basis. Een gedeelde Node.js 24-API beheert de domeinregels en toegangscontrole voor web en React Native Android. Supabase verzorgt OTP en Postgres. Rollen komen uitsluitend uit beheerde lidmaatschappen; browserinvoer en user_metadata geven geen bevoegdheden. Supabase-modus bevat geen voorbeeldrecords.

Op 25 november 2026 zijn de aangewezen nieuwe projecten hvcup-staging (DartFlow) en hvcup-production (Duindorpdoet) geïdentificeerd en leeg bevonden. De platformmigraties zijn toegepast en de echte publieke API weigert directe gegevens- en RPC-toegang. GitHub heeft de vier HVCUP/Supabase-variabelen per environment. Beide eigen VPS-doelen zijn voorbereid zonder andere omgevingen te wijzigen.

De eigenaar heeft staging én productie voor activatie aangewezen. Kandidaatbuild, activeren en rollback blijven aparte handmatige acties op exact main met geslaagde CI. Beide moderne serversleutels zijn automatisch naar de root-only VPS-opslag overgebracht, zonder plaintext in chat, Git of logs; de tijdelijke routes zijn gesloten en private overdrachtsmaterialen verwijderd. De eigenaar heeft DNS aangepast: alle autoritatieve nameservers geven 204.168.128.28. Alleen resolvercache en de eigen HTTPS-proxy moeten bij de activatie nog worden gecontroleerd.

De eerste beheerder is info@dgwebservices.nl in beide projecten. Het account wordt na de kandidaatbuild via de beveiligde eenmalige serverbootstrap voorbereid. SMTP is volgens de eigenaar ingericht. De twee HTML-templates met zes cijfers zijn geleverd. De eigenaar bevestigt dat beide templates, OTP-lengte 6 en Site URLs in beide projecten zijn ingesteld. De connector kan deze Auth-configuratie niet zelf controleren. Een echte OTP-proef is nog niet uitgevoerd.

De beheeromgeving ondersteunt versleutelde Resend API-instellingen, acht bewerkbare templates, shortcodes, voorbeeldweergave en Auth-export. De Resend API-sleutel kan de beheerder na de eerste login invoeren. Zonder die sleutel wordt platformmail als niet ingericht getoond; lokale tests gebruiken uitsluitend een nep-provider en sturen geen echte mail.
