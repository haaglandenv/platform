(() => {
  const store = window.HVDemo;
  const identity = window.HVIdentity;
  const storageKey = 'newsPosts';
  const demoNow = '2027-06-05T19:00:00+02:00';
  const tournaments = [
    { id: 'HV-CUP-STD', name: 'Sir Winston Cup' },
    { id: 'HV-CUP-HMC', name: 'Halve Maan Cup' },
    { id: 'HV-CUP-VR', name: 'Vrouwenbeker' },
    { id: 'HV-CUP-O23', name: 'O23-beker' },
    { id: 'HV-CUP-JEUGD', name: 'Jeugdbeker' },
  ];
  const images = ['hero', 'action', 'crowd', 'finale', 'club', 'official', 'kleedkamer', 'vrouwen', 'velden']
    .map(name => 'assets/' + name + '.webp');

  const seed = [
    {
      id: 'HV-N-001', slug: 'houtrust-maakt-zich-op-voor-de-finaledag', title: 'Houtrust maakt zich op voor de finaledag',
      excerpt: 'Twee gastverenigingen ontvangen de regio voor een dag vol bekerfinales. Op 12 juni komt het toernooi samen op Houtrust.',
      body: [
        'De laatste week van het Haaglanden Voetbaltoernooi staat voor de deur. Op zaterdag 12 juni vormt Sportpark Houtrust het decor voor de finaledag. Van de eerste jeugdwedstrijd tot de finale van de standaardteams draait de dag om de clubs uit de regio.',
        'Duindorp SV en SVV Scheveningen verzorgen samen de ontvangst. Teams vinden hun veld, kleedkamer en meldtijd in het wedstrijdoverzicht. Supporters kunnen de publieke bezoekerspagina gebruiken om hun dag te plannen.',
        'De wedstrijdleiding werkt het programma bij wanneer een duel wordt verplaatst. Controleer de aftrapgegevens vlak voor vertrek en volg de finale van jouw team via het live-overzicht.',
      ],
      image: 'assets/crowd.webp', category: 'Finaledag', status: 'published', publishedAt: '2027-06-05T13:10:00+02:00', featured: true,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-HMC', 'HV-CUP-VR', 'HV-CUP-O23', 'HV-CUP-JEUGD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: [],
    },
    {
      id: 'HV-N-002', slug: 'duindorp-en-scheveningen-maken-zich-klaar-voor-kwartfinale', title: 'Alles staat klaar voor de derby op Houtrust',
      excerpt: 'Duindorp SV en SVV Scheveningen ontmoeten elkaar in de kwartfinale. De inzet is een plek bij de laatste vier.',
      body: [
        'Een bekeravond op vertrouwd terrein. Duindorp SV en SVV Scheveningen treffen elkaar op Houtrust in de kwartfinale van de Sir Winston Cup. Voor beide teams is het de volgende stap richting de finaledag.',
        'Je vindt de wedstrijd in het programma. Bij de wedstrijd vind je de laatste aftrapgegevens en na de aftrap ook het geregistreerde verloop. De winnaar ontmoet HBS in de halve finale.',
        'De teammanagers bereiden de spelersopgave voor vanuit hun definitieve toernooilijst. De aangestelde scheidsrechter controleert beide opgaven voor de wedstrijd kan beginnen.',
      ],
      image: 'assets/action.webp', category: 'Sir Winston Cup', status: 'published', publishedAt: '2027-06-05T16:30:00+02:00', featured: true,
      tournamentIds: ['HV-CUP-STD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: ['HV-T-101-01', 'HV-T-102-01'],
    },
    {
      id: 'HV-N-003', slug: 'vrouwenbeker-de-weg-naar-de-beslissende-duels', title: 'De Vrouwenbeker gaat de beslissende fase in',
      excerpt: 'De knock-outfase brengt de strijd om de beker naar een nieuw hoofdstuk. Bekijk welke teams zich opmaken voor de volgende ronde.',
      body: [
        'De eerdere knock-outrondes hebben de verhoudingen scherper gemaakt. In de Vrouwenbeker draait de komende ronde om het benutten van kansen en het beheersen van de beslissende momenten.',
        'DUNO VR1 en RKAVV VR1 maken deel uit van het programma van de demodag. Op de toernooipagina staan het knock-outschema en de resultaten die bij dit voorbeeldseizoen horen.',
        'Via Mijn account kun je een team volgen. Daarmee staan de wedstrijden van jouw selectie bij Mijn teams en vind je snel de locatie en geplande aftrap.',
      ],
      image: 'assets/vrouwen.webp', category: 'Vrouwenbeker', status: 'published', publishedAt: '2027-06-05T14:45:00+02:00', featured: true,
      tournamentIds: ['HV-CUP-VR'], clubIds: ['HV-V-108', 'HV-V-107'], teamIds: ['HV-T-108-V1', 'HV-T-107-V1'],
    },
    {
      id: 'HV-N-004', slug: 'hbs-bij-laatste-vier-sir-winston-cup', title: 'HBS bij de laatste vier in de Sir Winston Cup',
      excerpt: 'Een kleine marge maakte het verschil tegen Quick. HBS kijkt vooruit naar de halve finale.',
      body: [
        'HBS heeft in het voorbeeldprogramma met 1–0 gewonnen van Quick. Daarmee is de club zeker van een plek in de halve finale van de Sir Winston Cup.',
        'De tegenstander komt uit de ontmoeting tussen Duindorp SV en SVV Scheveningen. Het bekerschema laat zien hoe beide routes samenkomen.',
        'De halve finale staat voor 9 juni op het programma. De definitieve veld- en aftrapgegevens vind je bij het duel.',
      ],
      image: 'assets/finale.webp', category: 'Wedstrijdnieuws', status: 'published', publishedAt: '2027-06-05T13:20:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD'], clubIds: ['HV-V-103', 'HV-V-104'], teamIds: ['HV-T-103-01', 'HV-T-104-01'],
    },
    {
      id: 'HV-N-005', slug: 'jeugdteams-zien-finaledag-dichterbij-komen', title: 'Jeugdteams zien de finaledag dichterbij komen',
      excerpt: 'De laatste wedstrijden bepalen welke jeugdteams hun seizoen een extra slotstuk geven.',
      body: [
        'Bij de jeugd groeit de spanning nu de finaledag dichterbij komt. Iedere ronde brengt teams uit Haaglanden samen op weg naar Houtrust.',
        'Voor de organisatie zijn meldtijden, kleedkamers en duidelijke veldroutes net zo belangrijk als het speelschema. De praktische informatie wordt per wedstrijd gebundeld.',
        'Teams die zich plaatsen, ontvangen in de demo een plek in het draaiboek van de finaledag. Kijk bij Bezoekers voor het overzicht van de dag.',
      ],
      image: 'assets/velden.webp', category: 'Jeugdbeker', status: 'published', publishedAt: '2027-06-05T11:40:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-JEUGD'], clubIds: ['HV-V-101', 'HV-V-102', 'HV-V-104'], teamIds: ['HV-T-101-13', 'HV-T-102-15', 'HV-T-104-15'],
    },
    {
      id: 'HV-N-006', slug: 'westlandia-o23-en-velo-o23-in-bekerduel', title: 'Westlandia O23 en VELO O23 op het programma',
      excerpt: 'De O23-beker brengt de beloften van de regio bij elkaar. De Hoge Bomen is een van de speellocaties.',
      body: [
        'In de O23-beker krijgen jonge selecties de kans om zich in een eigen bekerroute te laten zien. Westlandia O23 en VELO O23 staan in het voorbeeldprogramma tegenover elkaar.',
        'Het duel wordt bij Westlandia gespeeld. Houd het programma in de gaten voor de laatste aftrapgegevens.',
        'Op de toernooipagina staat de weg naar de finale. Voor aftraptijd en locatie gebruik je het wedstrijdprogramma.',
      ],
      image: 'assets/action.webp', category: 'O23-beker', status: 'published', publishedAt: '2027-06-04T18:15:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-O23'], clubIds: ['HV-V-106', 'HV-V-109'], teamIds: ['HV-T-106-23', 'HV-T-109-23'],
    },
    {
      id: 'HV-N-007', slug: 'zo-bereid-je-de-spelerscontrole-voor', title: 'Zo bereiden teams de spelerscontrole voor',
      excerpt: 'Een definitieve spelerslijst en een complete wedstrijdopgave helpen de scheidsrechter voor de aftrap.',
      body: [
        'Een goede voorbereiding begint met de toernooilijst. De teammanager legt naam, geboortedatum, foto en relatiecode vast en verstuurt de lijst voor gebruik in het toernooi.',
        'Daarna kiest de teammanager de spelers voor een specifieke wedstrijd. De scheidsrechter krijgt beide opgaven ter controle en kan de versie goedkeuren of terugsturen met een toelichting.',
        'Wanneer een aanvullende speler nodig is, dient de club een verzoek in. De toernooileiding behandelt het verzoek voordat de speler voor een wedstrijd kan worden geselecteerd.',
      ],
      image: 'assets/official.webp', category: 'Wedstrijdzaken', status: 'published', publishedAt: '2027-06-04T14:00:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-HMC', 'HV-CUP-VR', 'HV-CUP-O23', 'HV-CUP-JEUGD'], clubIds: [], teamIds: [],
    },
    {
      id: 'HV-N-008', slug: 'duindorp-en-scheveningen-ontvangst-finaledag', title: 'Gastverenigingen stemmen de ontvangst af',
      excerpt: 'Duindorp SV en SVV Scheveningen verdelen de taken voor teams en bezoekers op Houtrust.',
      body: [
        'Op een finaledag komen veel verschillende taken samen. De twee gastverenigingen stemmen daarom de ontvangst, kleedkamerroutes en ondersteuning langs de velden met elkaar af.',
        'In het draaiboek staan de taken per gastteam. De vrijwilligersweergave sluit daarop aan, zodat een afgevinkte taak ook bij de finaledagregie zichtbaar is.',
        'Voor teams vormt de ontvangstbalie het eerste aanspreekpunt op het sportpark. De actuele teaminformatie blijft beschikbaar bij de betreffende wedstrijd.',
      ],
      image: 'assets/club.webp', category: 'Finaledag', status: 'published', publishedAt: '2027-06-04T10:20:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-JEUGD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: [],
    },
    {
      id: 'HV-N-009', slug: 'hvv-richt-zich-op-halve-finale', title: 'HVV richt zich op de halve finale',
      excerpt: 'Na het duel met DUNO wacht voor HVV de volgende stap in het bekerschema.',
      body: [
        'HVV heeft in het voorbeeldprogramma de kwartfinale tegen DUNO met 3–1 afgesloten. De club gaat daarmee door naar de halve finale.',
        'In het bekerschema staat Westlandia aan dezelfde kant van de route. Het programma bundelt de geplande duels voor 9 juni.',
        'De wedstrijdinformatie is ook beschikbaar in de app. Volg jouw team om de komende wedstrijd snel terug te vinden.',
      ],
      image: 'assets/hero.webp', category: 'Wedstrijdnieuws', status: 'published', publishedAt: '2027-06-03T19:10:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD'], clubIds: ['HV-V-105', 'HV-V-108'], teamIds: ['HV-T-105-01', 'HV-T-108-01'],
    },
    {
      id: 'HV-N-010', slug: 'houtrust-velden-en-kleedkamers-in-beeld', title: 'Houtrust, van hoofdingang tot hoofdveld',
      excerpt: 'Een heldere indeling helpt teams en supporters de weg te vinden op de finaledag.',
      body: [
        'Sportpark Houtrust heeft op de finaledag verschillende speelvelden en ontvangstpunten in gebruik. De veldindeling kan gedurende de dag veranderen wanneer een deelveld wordt omgezet naar een heel veld.',
        'De wedstrijdleiding houdt bij welke teams een kleedkamer gebruiken en wanneer de ruimte weer beschikbaar moet zijn. Daardoor kunnen de finales elkaar gedurende de dag opvolgen.',
        'Kijk bij je wedstrijd welk veld is toegewezen. De bezoekerspagina geeft het algemene overzicht van de dag.',
      ],
      image: 'assets/velden.webp', category: 'Op het sportpark', status: 'published', publishedAt: '2027-06-03T15:30:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-HMC', 'HV-CUP-VR', 'HV-CUP-O23', 'HV-CUP-JEUGD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: [],
    },
    {
      id: 'HV-N-011', slug: 'quick-jo15-en-hvv-jo15-ontmoeten-elkaar', title: 'Quick JO15 en HVV JO15 ontmoeten elkaar',
      excerpt: 'De jeugdbeker kent zijn eigen verhaal. Beide teams komen terug in het programma van de demodag.',
      body: [
        'Quick JO15-1 en HVV JO15-1 vormen een van de jeugdduels in dit voorbeeldseizoen. Het programma laat naast de senioren ook de verschillende jeugdcategorieën zien.',
        'De koppeling met een eigen team zorgt ervoor dat nieuws over de jeugdselectie bij de juiste groep terechtkomt. Een artikel kan daarnaast ook bij de vereniging en het toernooi verschijnen.',
        'Supporters vinden de speelgegevens in het wedstrijdcentrum en kunnen hun team toevoegen aan Mijn teams.',
      ],
      image: 'assets/action.webp', category: 'Jeugdbeker', status: 'published', publishedAt: '2027-06-03T12:05:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-JEUGD'], clubIds: ['HV-V-104', 'HV-V-105'], teamIds: ['HV-T-104-15', 'HV-T-105-15'],
    },
    {
      id: 'HV-N-012', slug: 'o23-beker-vooruitblik-op-de-laatste-vier', title: 'O23-beker, vooruitblik op de laatste vier',
      excerpt: 'VUC, Quick, Westlandia en VELO volgen hun eigen route richting de finaledag.',
      body: [
        'De O23-beker geeft vier beloftenploegen een plek in de beslissende fase. In het voorbeeldschema komen VUC en Quick aan de ene kant samen, met Westlandia en VELO aan de andere kant.',
        'De halve finales staan op 9 juni gepland. Controleer bij de wedstrijden welk sportpark en welk veld worden gebruikt.',
        'De laatste wedstrijdinformatie staat altijd bij het duel. Controleer de aftrap en de thuislocatie kort voor vertrek.',
      ],
      image: 'assets/kleedkamer.webp', category: 'O23-beker', status: 'published', publishedAt: '2027-06-02T18:45:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-O23'], clubIds: ['HV-V-110', 'HV-V-104', 'HV-V-106', 'HV-V-109'], teamIds: ['HV-T-110-23', 'HV-T-104-23', 'HV-T-106-23', 'HV-T-109-23'],
    },
    {
      id: 'HV-N-013', slug: 'volg-de-beker-op-je-telefoon', title: 'Volg jouw bekerteam op je telefoon',
      excerpt: 'Met Mijn teams en het wedstrijdprogramma staat de informatie voor je club bij elkaar.',
      body: [
        'Voor veel supporters begint de wedstrijddag met de vraag waar en wanneer hun team speelt. De wedstrijdapp brengt programma, uitslagen en locaties samen.',
        'Bij Mijn teams kies je de teams die je wilt volgen. De selectie blijft in deze demo op je eigen apparaat bewaard.',
        'Je kunt HV Control vanuit je mobiele browser op het startscherm zetten wanneer je browser die mogelijkheid biedt. Bij App staat hoe je deze optie herkent.',
      ],
      image: 'assets/crowd.webp', category: 'Voor supporters', status: 'published', publishedAt: '2027-06-02T13:00:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-HMC', 'HV-CUP-VR', 'HV-CUP-O23', 'HV-CUP-JEUGD'], clubIds: [], teamIds: [],
    },
    {
      id: 'HV-N-014', slug: 'westlandia-en-rkavv-plaats-in-de-bekerroute', title: 'Westlandia zet de volgende stap in de bekerroute',
      excerpt: 'Het voorbeeldduel met RKAVV is met 2–0 afgesloten. Voor Westlandia ligt de halve finale in het verschiet.',
      body: [
        'Westlandia heeft in het voorbeeldprogramma een 2–0 uitslag tegen RKAVV op de kaart gezet. Daarmee blijft de club in de race voor de Sir Winston Cup.',
        'De volgende wedstrijd is terug te vinden in het bekerschema. De datum van de halve finales is 9 juni.',
        'Nieuws over de standaardteams blijft gekoppeld aan het eigen team. Berichten over de O23-selectie of jeugd staan bij hun afzonderlijke teams.',
      ],
      image: 'assets/finale.webp', category: 'Wedstrijdnieuws', status: 'published', publishedAt: '2027-06-01T19:20:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD'], clubIds: ['HV-V-106', 'HV-V-107'], teamIds: ['HV-T-106-01', 'HV-T-107-01'],
    },
    {
      id: 'HV-N-015', slug: 'vrijwilligers-de-mensen-achter-de-finaledag', title: 'De mensen achter de finaledag',
      excerpt: 'Van ontvangst tot prijsuitreiking. Vrijwilligers zorgen dat teams hun aandacht bij het voetbal kunnen houden.',
      body: [
        'Een finaledag bestaat uit meer dan wedstrijden. Het klaarzetten van de ontvangst, het controleren van kleedkamers en de voorbereiding van het podium vragen om een gedeeld draaiboek.',
        'De vrijwilligers van Duindorp SV en SVV Scheveningen nemen verschillende taken op zich. De organisatie ziet per taak hoe ver de voorbereiding is.',
        'Wanneer de planning verschuift, moet ook de ondersteuning aansluiten. Daarom worden planning en ontvangst in dezelfde finaledagregie bij elkaar gehouden.',
      ],
      image: 'assets/club.webp', category: 'Achter de schermen', status: 'published', publishedAt: '2027-06-01T14:40:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-JEUGD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: [],
    },
    {
      id: 'HV-N-016', slug: 'een-eigen-bekerroute-voor-ieder-team', title: 'Een eigen bekerroute voor ieder team',
      excerpt: 'Standaardteams, vrouwen, O23 en jeugd vormen samen het Haaglanden Voetbaltoernooi.',
      body: [
        'Het Haaglanden Voetbaltoernooi brengt verschillende categorieën samen onder één dak. De standaardteams, vrouwen, beloften en jeugd hebben ieder hun eigen programma en route naar de finale.',
        'Op de toernooipagina wissel je tussen de bekers. Je ziet daar het schema, de deelnemersinformatie en het nieuws dat aan de betreffende beker is gekoppeld.',
        'Bij een club of team vind je vervolgens de berichten die specifiek voor die vereniging of selectie zijn gepubliceerd.',
      ],
      image: 'assets/hero.webp', category: 'Het toernooi', status: 'published', publishedAt: '2027-05-31T17:30:00+02:00', featured: false,
      tournamentIds: ['HV-CUP-STD', 'HV-CUP-HMC', 'HV-CUP-VR', 'HV-CUP-O23', 'HV-CUP-JEUGD'], clubIds: [], teamIds: [],
    },
    {
      id: 'HV-N-017', slug: 'concept-prijsuitreiking-finaledag', title: 'Voorbereiding prijsuitreiking finaledag',
      excerpt: 'Concept voor de redactie met de planning van de prijsuitreiking.',
      body: ['Werk de podiumplanning bij zodra de laatste finales zijn bevestigd. Controleer voor publicatie de tijden bij de wedstrijdleiding.'],
      image: 'assets/finale.webp', category: 'Finaledag', status: 'draft', publishedAt: demoNow, featured: false,
      tournamentIds: ['HV-CUP-STD'], clubIds: ['HV-V-101', 'HV-V-102'], teamIds: [],
    },
  ];

  const clone = value => structuredClone(value);
  const newest = (first, second) => Date.parse(second.publishedAt) - Date.parse(first.publishedAt) || first.id.localeCompare(second.id);
  const all = () => clone(store.get(storageKey, seed)).sort(newest);
  function projectMedia(post){if(!post)return post;if(post.mediaId&&!window.HVMedia?.published('articles').some(media=>media.id===post.mediaId&&media.src===post.image))return {...post,image:'assets/action.webp',imageCredit:'',imageUnavailable:true};return post;}
  const get = id => projectMedia(all().find(post => post.id === id || post.slug === id));
  const isPublic = post => post.status === 'published' && Number.isFinite(Date.parse(post.publishedAt)) && Date.parse(post.publishedAt) <= Date.parse(window.HVClock?.now?.()||demoNow);

  function published(context = {}) {
    const filters = [
      ['tournamentIds', context.tournamentId], ['clubIds', context.clubId], ['teamIds', context.teamId],
    ].filter(([, id]) => Boolean(id));
    let result=all().map(post=>post.status==='published'?post:post.publishedSnapshot||null).filter(post => post&&isPublic(post) && (!filters.length || filters.some(([field, id]) => post[field].includes(id)))).map(projectMedia);
    if(context.following){const following=window.HVFollowing?.all()||[],teams=new Set(following.filter(row=>row.kind==='team').map(row=>row.id)),clubs=new Set(following.filter(row=>row.kind==='club').map(row=>row.id)),cups=new Set(following.filter(row=>row.kind==='cup').map(row=>row.id)),matches=new Set(following.filter(row=>row.kind==='match').map(row=>row.id));for(const id of teams){const club=identity.team(id)?.clubId;if(club)clubs.add(club);}for(const id of matches){const match=window.HVFixtures?.get(id);if(match){teams.add(match.homeTeamId);teams.add(match.awayTeamId);}}if(following.length)result=result.filter(post=>post.teamIds.some(id=>teams.has(id))||post.clubIds.some(id=>clubs.has(id))||post.tournamentIds.some(id=>cups.has(id))||matches.has(post.sourceMatchId));}
    return [...new Map(result.map(post=>[post.id,post])).values()];
  }

  function slugFor(title) {
    return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110) || 'nieuws';
  }

  const systemDraftToken=Symbol('official-facts-draft');
  function save(input,capability) {
    if(capability!==systemDraftToken&&window.HVAccess&&!window.HVAccess.can('news.manage'))return{ok:false,error:'Je hebt geen toegang tot nieuwsbeheer.'};
    if (!input || typeof input !== 'object') return { ok: false, error: 'Vul de artikelgegevens in.' };
    const records = all();
    const existing = input.id ? records.find(post => post.id === input.id) : undefined;
    if (input.id && !existing) return { ok: false, error: 'Dit artikel bestaat niet meer. Open de artikellijst opnieuw.' };
    const record = { ...existing, ...input };
    const title = String(record.title || '').trim();
    const excerpt = String(record.excerpt || '').trim();
    const paragraphs = Array.isArray(record.body) ? record.body.map(text => String(text).trim()).filter(Boolean) : [];
    if (!title || title.length > 160) return { ok: false, error: 'Vul een titel in van maximaal 160 tekens.' };
    if (!excerpt || excerpt.length > 340) return { ok: false, error: 'Vul een intro in van maximaal 340 tekens.' };
    if (!paragraphs.length || paragraphs.length > 40 || paragraphs.some(text => text.length > 10_000)) return { ok: false, error: 'Vul de artikeltekst in met maximaal 40 alinea’s.' };
    if(record.mediaId&&!window.HVMedia?.published('articles').some(media=>media.id===record.mediaId&&media.src===record.image))return {ok:false,error:'Dit beeld is niet vrijgegeven voor gebruik bij artikelen. Kies een ander artikelbeeld.'};
    if (!images.includes(record.image) && !window.HVMedia?.published('articles').some(media=>media.src===record.image)) return { ok: false, error: 'Kies een van de beschikbare artikelbeelden.' };
    const category = String(record.category || '').trim();
    if (!category || category.length > 60) return { ok: false, error: 'Vul een rubriek in van maximaal 60 tekens.' };
    if (!['published', 'draft','review'].includes(record.status)) return { ok: false, error: 'Kies Concept, Ter controle of Gepubliceerd.' };
    const publishedAt = record.publishedAt || demoNow;
    if (typeof publishedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt))) return { ok: false, error: 'Vul een geldige publicatiedatum in.' };
    const links = {};
    for (const [field, exists] of [
      ['tournamentIds', id => (window.HVFixtures?.cups||tournaments).some(tournament => tournament.id === id)],
      ['clubIds', id => Boolean(identity.club(id))],
      ['teamIds', id => Boolean(identity.team(id))],
    ]) {
      if (!Array.isArray(record[field] || [])) return { ok: false, error: 'Kies de gekoppelde toernooien, verenigingen en teams opnieuw.' };
      const selected = record[field] || [];
      if (selected.some(id => typeof id !== 'string' || !exists(id))) return { ok: false, error: 'Een gekoppeld toernooi, vereniging of team bestaat niet.' };
      const canonical = id => field === 'clubIds' ? identity.club(id).id : field === 'teamIds' ? identity.team(id).id : id;
      links[field] = [...new Set(selected.map(canonical))];
    }
    const id = existing?.id || 'HV-N-' + crypto.randomUUID().toUpperCase();
    const baseSlug = existing?.slug || slugFor(title);
    const duplicateSlug = records.some(post => post.id !== id && post.slug === baseSlug);
    const slug = duplicateSlug ? baseSlug + '-' + id.slice(-8).toLowerCase() : baseSlug;
    const post = {
      id, slug, title, excerpt, body: paragraphs, image: record.image, mediaId:record.mediaId||null, imageCredit:String(record.imageCredit||'').slice(0,160), category, status: record.status,
      publishedAt: new Date(publishedAt).toISOString(), featured: record.featured === true, ...links,
      revision:existing?(Number(existing.revision)||1)+1:1,author:String(record.author||window.HVAccess?.current?.()?.name||'Redactie Haaglanden').slice(0,100),updatedAt:window.HVClock?.now?.()||new Date().toISOString(),
      sourceMatchId:record.sourceMatchId||null,sourceFingerprint:record.sourceFingerprint||null,sourceFacts:record.sourceFacts?clone(record.sourceFacts):null,reviewNote:String(record.reviewNote||'').slice(0,1000),
      publishedSnapshot:record.status==='published'?null:existing?.status==='published'?{...clone(existing),publishedSnapshot:null}:existing?.publishedSnapshot||null,
    };
    const next = [...records.filter(record => record.id !== id), post];
    if (next.map(post=>post.status==='published'?post:post.publishedSnapshot).filter(post => post&&isPublic(post)&&post.featured).length > 3) {
      return { ok: false, error: 'Er kunnen maximaal drie gepubliceerde artikelen uitgelicht zijn. Zet eerst een ander artikel uit.' };
    }
    const revisions=clone(store.get('newsRevisions',{})),previous=revisions[id]?.length?revisions[id]:existing?[{revision:existing.revision||1,at:existing.updatedAt||existing.publishedAt,by:existing.author||'Redactie',reason:'Oorspronkelijke opgeslagen versie',post:clone(existing)}]:[];revisions[id]=[...previous,{revision:post.revision,at:post.updatedAt,by:window.HVAccess?.context?.()?.accountId||'demo-redactie',reason:String(record.changeReason||'Artikel opgeslagen').slice(0,300),post:clone(post)}];
    store.setMany({[storageKey]:next,newsRevisions:revisions});
    window.HVWorkflow?.audit(existing?'NIEUWS_GEWIJZIGD':'NIEUWS_TOEGEVOEGD',id,existing?{title:existing.title,status:existing.status}:null,{title:post.title,status:post.status},'Redactionele wijziging');
    if(post.status==='published')window.HVWorkflow?.notify('Nieuws uit Haaglanden',post.title,{href:'#nieuwsartikel-'+post.id,role:'all',cupId:post.tournamentIds[0],teamIds:post.teamIds,type:'news'});
    return { ok: true, post: clone(post) };
  }

  function remove(id) {
    const records = all();
    if (!records.some(post => post.id === id)) return { ok: false, error: 'Dit artikel bestaat niet meer.' };
    store.set(storageKey, records.filter(post => post.id !== id));
    return { ok: true };
  }

  function revisions(id){const post=get(id),rows=clone(store.get('newsRevisions',{})[id]||[]);return rows.length?rows:post?[{revision:post.revision||1,at:post.updatedAt||post.publishedAt,by:post.author||'Redactie',reason:'Oorspronkelijke voorbeeldversie',post}]:[];}
  function restore(id,revision,reason){if(String(reason||'').trim().length<8)return{ok:false,error:'Leg de herstelreden vast in minimaal 8 tekens.'};const version=revisions(id).find(row=>row.revision===Number(revision));if(!version)return{ok:false,error:'Deze artikelversie is niet beschikbaar.'};return save({...version.post,id,status:'draft',featured:false,changeReason:'Hersteld uit versie '+revision+': '+reason});}
  function requestReview(id,note=''){const post=get(id);if(!post)return{ok:false,error:'Artikel niet gevonden.'};return save({...post,status:'review',featured:false,reviewNote:String(note).trim()||'Graag tekst, koppelingen en beeldrechten controleren.',changeReason:'Ter redactionele controle aangeboden'});}
  function review(id,approved,reason){if(window.HVAccess&&!window.HVAccess.can('news.review'))return{ok:false,error:'Alleen de bevoegde redactie kan een publicatiebesluit nemen.'};const post=get(id);if(!post||post.status!=='review')return{ok:false,error:'Open een artikel dat ter controle staat.'};if(String(reason||'').trim().length<8)return{ok:false,error:'Geef een redactionele besluitreden van minimaal 8 tekens.'};return save({...post,status:approved?'published':'draft',reviewNote:String(reason).trim(),changeReason:approved?'Redactioneel goedgekeurd':'Terug naar auteur'});}
  function blocks(post){return(post?.body||[]).map(text=>{if(/^##\s+/.test(text))return{type:'heading',text:text.replace(/^##\s+/,'')};if(/^>\s*/.test(text))return{type:'quote',text:text.replace(/^>\s*/,'')};const gallery=text.match(/^\[\[media:([^\]]+)\]\]$/);if(gallery)return{type:'gallery',mediaIds:gallery[1].split(',').map(id=>id.trim()).filter(Boolean)};return{type:'paragraph',text};});}
  function renderBody(target,post){if(!target)return;const nodes=[];for(const block of blocks(post)){if(block.type==='gallery'){const figure=document.createElement('div');figure.className='xp-article-gallery';for(const id of block.mediaIds){const media=window.HVMedia?.published('articles').find(row=>row.id===id);if(!media)continue;const item=document.createElement('figure'),image=document.createElement('img'),credit=document.createElement('figcaption');image.src=media.src;image.alt=media.title;image.loading='lazy';credit.textContent=media.credit;item.append(image,credit);figure.append(item);}if(figure.children.length)nodes.push(figure);continue;}const node=document.createElement(block.type==='heading'?'h3':block.type==='quote'?'blockquote':'p');node.textContent=block.text;nodes.push(node);}target.replaceChildren(...nodes);}
  function saveFactsDraft(input){const game=window.HVFixtures?.get(input?.sourceMatchId),source=input?.sourceFacts;if(!game||game.status!=='finished'||!source||source.homeScore!==game.homeScore||source.awayScore!==game.awayScore)return{ok:false,error:'Het feitenconcept vereist de huidige officiële uitslag.'};const ids=new Set((window.HVMatchCenter?.events(game.id)||[]).filter(event=>event.status==='confirmed').map(event=>event.id));if(!Array.isArray(source.confirmedEventIds)||source.confirmedEventIds.some(id=>!ids.has(id)))return{ok:false,error:'Het concept bevat geen geldige bevestigde gebeurtenissen.'};return save({...input,status:'draft',featured:false,author:'HV Control · feitenconcept'},systemDraftToken);}

  window.HVNews = {
    demoNow, images: [...images], get tournaments(){return clone(window.HVFixtures?.cups||tournaments);}, all, published, get, save, remove,revisions,restore,requestReview,review,blocks,renderBody,saveFactsDraft,
    get clubs() { return identity.listClubs(); },
    get teams() { return identity.listTeams(); },
  };
})();
