# Haaglanden Voetbal platform

Werk in deze repository. Behoud de HV Control-huisstijl, lokale assets en gedeelde web/Android-domeinregels. Productietaal Nederlands; tijdzone Europe/Amsterdam.

De vier GitHub-variabelen zijn uitsluitend HVCUP_APP_ORIGIN, HVCUP_DATA_MODE, NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Geheimen horen buiten Git en buildartefacten. Gebruik Supabase Auth voor OTP; platformmail gebruikt server-side Resend met beheerbare credentials. Rollen komen uit beheerde lidmaatschappen, nooit user_metadata of een clientrolselector.

Geen automatische activatie: kandidaatbuild, activeren en rollback zijn aparte handmatige handelingen op dg-vps-08. Bestaande omgevingen en gedeelde hostinstellingen blijven intact. GitHub main is de expliciet door de eigenaar aangewezen integratiebranch. De oorspronkelijke remote branches zijn op zijn verzoek vervangen, met lokale herstelbundle buiten de repository.

Controleer build, echte API/domeinregels en toegangsgrenzen met geïsoleerde gegevens. Verstuur geen echte mail of databasewijzigingen naar bestaande omgevingen tijdens tests. Gebruik een leeg nieuw Supabase-project pas na identificatie door de eigenaar. Beschrijf ontbrekende credentials als open koppeling, niet als werkende live-integratie.
