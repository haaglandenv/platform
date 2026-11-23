# Gedeelde platformclient

ES-module zonder browser- of React-afhankelijkheid. Web en React Native gebruiken dezelfde `/api/v1`-routes, foutcodes en commando-envelop. De server verifieert bearer, lidmaatschap, invoer, wedstrijdregels en versie; een client kan geen domeinregister uploaden.

```js
const client = createHaagvClient({
  origin,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  getMembership: () => activeOwnMembershipId,
  createRequestId: () => crypto.randomUUID()
});
const snapshot = await client.bootstrap();
await client.command('favorite.toggle', {entityType:'teams', entityId:teamId});
```

Bewaar bij retries hetzelfde `requestId` én dezelfde payload. Een request-ID met gewijzigde inhoud wordt geweigerd. De gelezen versie gaat automatisch mee. Na `VERSION_CONFLICT` haal je een nieuwe bootstrap op en beoordeel je de handeling opnieuw. Wisselen van context gebruikt alleen één van de door de server teruggegeven eigen lidmaatschappen.

`createCommandOutbox` is optioneel, alleen voor `match.event` en `favorite.toggle`. `received` betekent door de API bevestigd. `conflict` vereist beoordeling; verwijderen is een expliciete clientkeuze. Een netwerkfout blijft `queued`, met het oorspronkelijke request-ID en de oorspronkelijke versie. De oorspronkelijke gebruiker en context moeten overeenkomen vóór flush. Gebruik op Android de SecureStore-adapter, geen onbeveiligde JSON-bestanden voor sessies of wachtrijen.

Er worden geen geheimen door deze package geladen. `getSession` levert alleen het token aan de API; de API gebruikt Supabase `getUser` voor de identiteitscontrole. De typedefinities en fetch-/opslagtests worden in de hoofd-CI gecontroleerd.
