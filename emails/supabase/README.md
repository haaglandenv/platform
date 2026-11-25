# Supabase-inlogmails

`otp.html` is de standaardinhoud voor **Magic Link** bij inloggen met een code;
`confirmation.html` is de standaardinhoud voor **Confirm signup**. Beide tonen
uitsluitend de zescijferige `{{ .Token }}` als inlogcode. Supabase Auth genereert,
controleert en verstuurt deze code via de afzonderlijk ingestelde SMTP-provider.
De server verstuurt deze inlogmails niet via de Resend API.

Stel in het bedoelde project onder **Authentication → Emails → Templates** in:

| Template bij Supabase | HTML-export | Standaardonderwerp |
| --- | --- | --- |
| Magic Link | `otp.html` | Je inlogcode voor Haaglanden Voetbal |
| Confirm signup | `confirmation.html` | Bevestig je account bij Haaglanden Voetbal |

Zet bij de Auth-instellingen voor **Email** de OTP-lengte expliciet op **6**.
De equivalente Management API-instelling is `mailer_otp_length: 6`; deze staat
ook in de platformexport. Laat de Site URL overeenkomen met de bedoelde
omgeving. Voor accountbevestiging moet **Confirm email** ingeschakeld zijn.
Deze stappen en templatepublicatie gebeuren afzonderlijk per project.

Dit zijn exportbestanden van de standaardcatalogus, geen bewijs dat de templates
bij een project zijn gepubliceerd. De leiding kan de actuele opgeslagen versie
exporteren via `GET /api/v1/admin/mail-templates/auth.otp/export` of
`GET /api/v1/admin/mail-templates/auth.confirmation/export`. De export vermeldt
de officiële Supabase-velden voor onderwerp en HTML-inhoud. Opslaan in de
platformmodule verandert de providerconfiguratie niet. De providerstatus blijft
`not-published` zolang geen afzonderlijke bevestigde publicatiekoppeling bestaat.

Volgens de eigenaar is SMTP al ingericht. De HTML-export of een opgeslagen
template bewijst geen verzending of bezorging. Het eerste leidingaccount is
`info@dgwebservices.nl`, en krijgt pas toegang nadat de beveiligde eenmalige
serverbootstrap het Supabase-account en beheerde leidinglidmaatschap heeft
aangemaakt. Een e-mailadres of bewerkbare gebruikersmetadata geeft zelf geen
leidingrechten. De runtime-serverkey blijft buiten Git, browser en Android.

De catalogus staat in `server/mail-templates.mjs`; wijzigingen uit de beheer-UI
staan samen met de mailinstellingen in de server-side AES-256-GCM-vault. Alleen
beheerde leidinglidmaatschappen mogen die catalogus lezen of wijzigen. Een
revisie voorkomt dat twee beheerders elkaars opgeslagen versie overschrijven;
de audit registreert actor, actie, revisie en tijd, zonder template-inhoud of
credentials. De preview verwerkt de actuele onopgeslagen invoer zonder opslag.

Ondersteunde HTML is bewust beperkt tot statische, gebalanceerde mailopmaak met
bekende tags, geciteerde attributen en eenvoudige inline CSS. Scripts, forms,
iframes, eventhandlers, externe stylesheets en CSS-netwerkverzoeken zijn niet
toegestaan. Een shortcode wordt als tekst ingevoegd en voor HTML ge-escaped.
Alleen adres-shortcodes mogen als volledige waarde in een link staan. De
catalogus geeft per template de toegestane shortcodes en voorbeeldwaarden terug.

Bron: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
De OTP-lengte is een veld van de [Supabase Auth-configuratie](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
