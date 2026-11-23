# Haaglanden Voetbal platform

De HV Control v18-huisstijl met een gedeelde Node-API voor web en de toekomstige React Native Android-app. Browserrollen en browserdatabase zijn vervangen door serverautorisatie en Supabase-opslag. De lokale modus bevat één voorbeeld per relevante soort; een nieuw Supabase-project begint leeg.

## Lokaal starten

Node **24.22.1**, npm **11.19.1**, Python **3.12+**. De exacte JavaScript-dependencies staan in `package-lock.json`.

```sh
npm ci
npm run verify
npm run dev
```

Open <http://127.0.0.1:4175/>. Standaard is alleen publiek lezen beschikbaar. Voor lokale beheerproeven: `npm run preview`, daarna **Lokale werkruimte openen**. Deze opdracht maakt een besloten lokale mailversleutelingssleutel aan en weigert een productie-, Supabase- of niet-loopbackomgeving. Die lokale sessie werkt uitsluitend voor de voorbeeldadministratie. Testgegevens en sleutel worden afgeschermd in `.local/` opgeslagen. Alleen `dist/` via een Python-fileserver openen volstaat niet meer: de werkende applicatie vereist de API.

`npm run build` voert de bestaande Python-build uit en bundelt daarna de webcode met esbuild naar `dist/`. `npm start` start dezelfde Node-server die later onder systemd draait. Een build verstuurt geen mail en voert geen migraties of writes naar Supabase uit.

## Nieuwe Supabase-omgeving aansluiten

Volg [Supabase instellen](docs/supabase-setup.md), daarna de [releasevoorbereiding](docs/deployment.md). GitHub gebruikt uitsluitend deze vier publieke variabelen:

- `HAAGV_APP_ORIGIN`
- `HAAGV_DATA_MODE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

De voorbeeldnamen staan ook in `.env.example`. Geheimen staan uitsluitend in de afgeschermde serverruntime. Supabase Auth verstuurt de OTP-codes via Resend SMTP. De overige mail gebruikt de server-side Resend API; een bevoegde beheerder vult de sleutel en afzender in op **Instellingen**. De sleutel wordt versleuteld opgeslagen en is niet terug te lezen. Een Resend-acceptatie is geen bewijs van aflevering.

## Controle

```sh
npm run verify
npm run test:db
npx playwright install chromium
npm run test:e2e
npm --prefix apps/android ci
npm --prefix apps/android run typecheck
npm --prefix apps/android run bundle
```

De SQL-proef gebruikt uitsluitend een eigen tijdelijke lokale Postgres-container. Auth-, Resend- en UI-tests gebruiken geïsoleerde gegevens; er wordt geen bestaande Supabase-omgeving of mailontvanger geraakt. Zie het actuele [verificatierapport](docs/verification.md) voor wat daadwerkelijk is uitgevoerd en de beperkingen.

De [Android-basis](docs/android.md) deelt API en sessieregels. De oorspronkelijke v18-browserdemo blijft terug te vinden in Git-commit `6f20a058e0e87dbe313fdb82a972a100bda0a256` en in de aparte lokale overdrachtmap. De oude mockmodules, demoportretten en prototype-tests zijn uit de actieve build verwijderd. Functioneel ontwerp en acceptatiechecklist zijn historische productspecificaties; ze zijn geen bewijs van een geslaagde huidige controle.
