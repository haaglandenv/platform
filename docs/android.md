# Android en de gedeelde API

`apps/android` is een werkende Expo/React Native-basis voor de toekomstige Android-app. Het is nog geen volledige mobiele uitvoering van alle beheerschermen en er is geen APK gepubliceerd. De basis toont wedstrijden, nieuws, account, eigen lidmaatschappen en favorieten. OTP en tokens gebruiken hetzelfde nieuwe Supabase-project als de website. Alle acties gaan naar dezelfde server en dezelfde domeinregels.

Getest met Node 24.22.1, npm 11.19.1, Expo 58.0.26, React Native 0.88.1 en React 19.3.0. Versies volgen Expo's `bundledNativeModules.json`; beide lockbestanden horen bij de bron. De `minimatch`-override voor Expo Fingerprint 11.0.9 sluit de gemelde globpatroon-DoS in de buildtooling; verander die uitsluitend met audit en buildcontrole.

```sh
npm ci
npm --prefix apps/android ci
npm --prefix apps/android run typecheck
npm --prefix apps/android run bundle
npm --prefix apps/android start
```

Voor het Android-emulatorvoorbeeld: start de lokale API met `HAAGV_HOST=0.0.0.0 HAAGV_PORT=4175 npm start` op een uitsluitend lokaal afgeschermde ontwikkelmachine. De emulator gebruikt standaard `http://10.0.2.2:4175`. De lokale inlogsimulatie wordt bij een niet-loopback-bind geweigerd. Een echt apparaat gebruikt later de HTTPS-origin van het platform; er is geen productie-HTTP-uitzondering.

Geef bij het starten/bouwen uitsluitend de vier publieke waarden uit `.env.example` door aan Expo. `HVCUP_DATA_MODE=supabase` vereist dezelfde URL en publishable key als `/api/v1/bootstrap`; een mismatch stopt de authenticatie. Expo-extra is openbaar. Zet nooit `SUPABASE_SECRET_KEY`, Resend API-credentials of de mailversleutelingssleutel in Expo, EAS of een appbundel. De website haalt zijn authconfiguratie tijdens runtime op; voor Android vereisen gewijzigde publieke waarden een nieuwe appbuild.

Supabase OTP gebruikt `signInWithOtp({options:{shouldCreateUser:false}})` en `verifyOtp({type:'email'})`. De beheerder maakt accounts en lidmaatschappen aan. Er zijn geen sociale loginproviders of deeplink-magiclinks nodig. Configureer de Supabase e-mailtemplate met de OTP-token en Resend SMTP zoals beschreven in `supabase-setup.md`. Sessies blijven op het apparaat in Expo SecureStore. Grote sessiewaarden worden als UTF-8-begrensde delen geschreven; de verwijzing wordt pas na een geslaagde write vervangen. Android-backup is uitgeschakeld en SecureStore-gegevens worden uitgesloten. Sessieverversing volgt AppState. De server verifieert iedere bearer en beheert alle rechten.

`packages/client` bevat de gedeelde HTTP-client, foutcodes, versiecontrole en een optionele wachtrij. De Android-startschermen bevestigen acties pas na een serverantwoord. De gedeelde wachtrij kan later worden aangesloten voor wedstrijdmomenten en favorieten: bewaart het oorspronkelijke request-ID, versie en gebruikerscontext; conflicten vereisen een besluit en krijgen nooit automatisch een nieuw ID. Bewaar die wachtrij alleen via de veilige opslagadapter. Wisselen van account mag geen acties van een ander account versturen.

Er is een Android JavaScript/Hermes-export gecontroleerd. Een native emulator-/apparaatproef, getekende APK/AAB, notificatiemachtigingen en Play Store-inrichting volgen bij de daadwerkelijke Android-productuitwerking. Geen EAS-build, signingcredential of storepublicatie is gestart.
