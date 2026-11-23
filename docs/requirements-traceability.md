# Eisen en uitvoering

| Opdracht | Uitvoering / bewijs |
| --- | --- |
| Nieuwe main zonder oude branches | Verifieerde GitHub-identiteit; lokale complete git-bundle; lease-beveiligde vervanging; geen production-push |
| HV Control basis / compacte voorbeeldset | Bestaande Shell, fonts en assets; één voorbeeld per entiteit in local-modus; Supabase start leeg |
| Gedeelde web/React Native data | Versiebeheerde HTTP-API en gedeelde client; server voert domeincommando’s met rollen, CAS-versies en idempotentie uit |
| OTP | Supabase e-mail-OTP met Resend SMTP; sessiecontrole op server; geen publieke demo-autorisatie in Supabase-modus |
| Overige mail | Resend API alleen server-side; versleutelde credentials via bevoegde beheeromgeving; geen leesbare sleutel terug naar client |
| Vier GitHub-variabelen | Publiek configuratiesnapshot; runtimegeheimen apart van buildaccount |
| DG VPS08 staging | Eigen accounts/paden/poort, gescheiden rechten, handmatige kandidaat/activatie/rollback, geen activatie tijdens voorbereiding |
| Tests en oplevering | Schone lokale build, SQL/RLS- en API-tests, browsertests; afzonderlijke status lokale build en doelkandidaat |
