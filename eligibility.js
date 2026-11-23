(() => {
  const store = window.HVDemo;
  const identities = window.HVIdentity;
  const match = identities.fixture;
  const sides = ['home', 'away'];
  const category = 'senioren';
  const seasonReference = '2027-01-01';
  const samplePhoto = 'assets/demo-player-1.webp';
  const names = {
    home: ['Milan|Vermeer','Jasper|van Dalen','Niels|Groeneveld','Ruben|Wisse','Daan|Hofman','Lucas|van Houten','Mats|de Vries','Sven|Boers','Tijn|Smit','Bram|Koster','Jesse|Veldman','Sem|de Bruin','Wout|Dekker','Ivo|Visser','Tim|Vink','Koen|Verhoeven'],
    away: ['Noah|van der Meer','Stijn|Blom','Finn|van Leeuwen','Thomas|Roos','Mees|van Beek','Lars|Meijer','Adam|van der Laan','Julian|Bos','Olivier|Bakker','Tobias|Hendriks','Mick|van Wijk','Rens|van den Berg','Bas|Mol','Joost|Peters','Jelle|Vos','Cas|van Rijn'],
  };
  const submittedAt = '2027-06-05T16:10:00.000Z';
  const seededPlayers = (side) => names[side].map((parts, index) => {
    const [firstName, lastName] = parts.split('|');
    const suffix = String(index + 1).padStart(2, '0');
    const id = side + '-' + suffix;
    return {
      id, hvId: identities.issuedPlayerId(id),
      firstName, lastName, name: firstName + ' ' + lastName,
      birthDate: index === 14 ? '2009-08-27' : (1998 + (index % 8)) + '-04-' + suffix,
      relationCode: (side === 'home' ? 'DEMOH' : 'DEMOA') + suffix,
      photo: 'assets/demo-player-' + (1 + (side === 'away' ? 2 : 0) + (index % 2)) + '.webp',
      dispensationApproved: index === 14,
    };
  });
  const initialRosters = {
    home: { ...match.home, status: 'submitted', submittedAt, players: seededPlayers('home') },
    away: { ...match.away, status: 'draft', players: seededPlayers('away') },
  };
  const seedLineups = Object.fromEntries(sides.map(side => {
    const players = initialRosters[side].players.map(({ id, hvId, name }, index) => ({
      id, name, playerHvId: hvId, number: index + 1,
      position: index < 11 ? 'starter' : index < 15 ? 'sub' : 'absent',
      captain: index === 5,
    }));
    const entry = { version: 1, submittedAt, changes: [], reason: '' };
    const sheet = side === 'home'
      ? { ...entry, status: 'submitted', players, eligibilityAttested: true, history: [entry] }
      : { status: 'draft', version: 0, players, eligibilityAttested: false };
    return [side, { ...sheet, matchId: match.id, ...match[side] }];
  }));
  const seededRequests = [{
    id: 'request-home-01', side: 'home', status: 'pending', requestedAt: '2027-06-04T09:50:00.000Z',
    ...match.home,
    reason: 'Extra keeper voor de resterende bekerrondes.',
    player: {
      id: 'home-extra-01', hvId: 'HV-P-00033', firstName: 'Jules', lastName: 'van Rijn', name: 'Jules van Rijn',
      birthDate: '2009-07-18', relationCode: 'DEMOH17', photo: samplePhoto, dispensationApproved: false,
    },
  }];
  const defaults = {
    senioren: { minAge: 18, maxAge: null, maxDispensations: 1, reference: 'match' },
    vrouwen: { minAge: 16, maxAge: null, maxDispensations: 1, reference: 'match' },
    o23: { minAge: null, maxAge: 22, maxDispensations: 2, reference: 'season' },
    jeugd: { minAge: null, maxAge: 18, maxDispensations: 1, reference: 'season' },
  };
  const getRules = () => ({ ...defaults, ...store.get('eligibilityRules', {}) });
  const getRosters = () => {
    const saved = store.get('tournamentRosters', null);
    if (saved) return saved;
    const legacy = store.get('lineups', {});
    return Object.fromEntries(sides.map(side => [side,
      legacy[side]?.status === 'submitted' ? {
        ...initialRosters[side], status: 'submitted', submittedAt: legacy[side].submittedAt || submittedAt,
      } : initialRosters[side],
    ]));
  };
  const getRoster = (side) => getRosters()[side];
  const allRequests = () => store.get('rosterRequests', seededRequests);
  const getRequests = (side) => allRequests().filter(request => !side || request.side === side);
  const fail = error => ({ ok: false, error });
  const now = () => new Date().toISOString();
  const plan = () => store.get('planning', store.initialPlan);
  const isCancelled = () => {
    const result = store.get('result', null);
    return plan().status === 'cancelled' || (result?.verdict === 'cancelled' && result.status !== 'queued');
  };
  const hasKickedOff = () => Boolean(store.get('matchKickoff', null));
  const player = (side, id) => {
    const roster = getRoster(side);
    return roster?.status === 'submitted' ? roster.players.find(person => person.id === id) || null : null;
  };

  function migratePlayerIds() {
    const byRelation = { ...store.get('playerIdentities', {}) };
    const aliases = { ...store.get('playerHvAliases', {}) };
    function link(record) {
      if (!record?.id) return record;
      const code = record.relationCode;
      const mapped = code && Object.hasOwn(byRelation, code) ? byRelation[code] : '';
      const hvId = mapped || record.hvId || identities.playerId(record.id);
      if (code) byRelation[code] = hvId;
      if (hvId !== identities.issuedPlayerId(record.id)) aliases[record.id] = hvId;
      return { ...record, hvId };
    }
    function assigned(key, project) {
      const current = store.get(key, null);
      if (!current) return;
      const next = project(current);
      if (JSON.stringify(next) !== JSON.stringify(current)) updates[key] = next;
    }
    const updates = {};
    for (const roster of Object.values(initialRosters)) roster.players.forEach(link);
    seededRequests.forEach(request => link(request.player));
    assigned('tournamentRosters', current => Object.fromEntries(Object.entries(current).map(([side, roster]) =>
      [side, { ...roster, ...match[side], players: roster.players.map(link) }])));
    assigned('rosterRequests', current => current.map(request =>
      ({ ...request, ...match[request.side], player: link(request.player) })));
    for (const key of ['lineupDrafts', 'lineups']) {
      assigned(key, current => Object.fromEntries(Object.entries(current).map(([side, sheet]) => [side, {
        ...sheet, matchId: match.id, ...match[side],
        players: sheet.players.map(player => ({ ...player, playerHvId: aliases[player.id] || identities.playerId(player.id) })),
      }])));
    }
    if (JSON.stringify(byRelation) !== JSON.stringify(store.get('playerIdentities', {}))) updates.playerIdentities = byRelation;
    if (JSON.stringify(aliases) !== JSON.stringify(store.get('playerHvAliases', {}))) updates.playerHvAliases = aliases;
    if (Object.keys(updates).length) store.setMany(updates);
  }

  function rememberIdentity(record) {
    return { ...store.get('playerIdentities', {}), [record.relationCode]: record.hvId };
  }

  function dateExists(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const value = new Date(date + 'T12:00:00.000Z');
    return !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === date;
  }

  function ageOn(birthDate, reference) {
    if (!dateExists(birthDate) || !dateExists(reference) || birthDate > reference) return null;
    const age = Number(reference.slice(0, 4)) - Number(birthDate.slice(0, 4));
    return age - Number(reference.slice(5) < birthDate.slice(5));
  }

  function normalizePlayer(input) {
    const firstName = (input.firstName || '').trim();
    const lastName = (input.lastName || '').trim();
    const birthDate = String(input.birthDate || '');
    const relationCode = (input.relationCode || '').trim().toUpperCase();
    const photo = String(input.photo || '');
    if (!firstName || !lastName || firstName.length > 65 || lastName.length > 90) return fail('Vul een voornaam en achternaam in.');
    if (!dateExists(birthDate) || birthDate < '1900-01-01' || birthDate > plan().date) return fail('Vul een geldige geboortedatum in.');
    if (!/^[A-Z0-9]{5,12}$/.test(relationCode)) return fail('Vul een relatiecode van 5 tot 12 letters of cijfers in.');
    const existing = Object.values(getRosters()).some(roster => roster.players.some(person => person.relationCode === relationCode));
    if (existing || allRequests().some(request => request.status === 'pending' && request.player.relationCode === relationCode)) {
      return fail('Deze relatiecode staat al op een spelerslijst of in een openstaand verzoek.');
    }
    const embedded = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo);
    if (!/^assets\/demo-player-[1-4]\.webp$/.test(photo) && (!embedded || photo.length > 48_000)) {
      return fail('Kies een geldige foto of gebruik de voorbeeldfoto.');
    }
    const registered = store.get('playerIdentities', {});
    const hvId = registered[relationCode] || 'HV-P-' + crypto.randomUUID().toUpperCase();
    return { ok: true, player: {
      id: hvId, hvId, firstName, lastName, name: firstName + ' ' + lastName,
      birthDate, relationCode, photo, dispensationApproved: false,
    } };
  }

  function replaceRoster(side, next, record) {
    const tournamentRosters = { ...getRosters(), [side]: next };
    if (record) store.setMany({ tournamentRosters, playerIdentities: rememberIdentity(record) });
    else store.set('tournamentRosters', tournamentRosters);
    return { ok: true };
  }

  function addDraftPlayer(side, fields) {
    const roster = getRoster(side);
    if (roster?.status !== 'draft') return fail('De spelerslijst is verstuurd. Dien een spelersverzoek in.');
    const normalized = normalizePlayer(fields);
    if (!normalized.ok) return normalized;
    return replaceRoster(side, { ...roster, players: [...roster.players, normalized.player] }, normalized.player);
  }

  function removeDraftPlayer(side, id) {
    const roster = getRoster(side);
    if (roster?.status !== 'draft') return fail('De spelerslijst is verstuurd en vergrendeld.');
    return replaceRoster(side, { ...roster, players: roster.players.filter(person => person.id !== id) });
  }

  function submitRoster(side) {
    const roster = getRoster(side);
    if (roster?.status !== 'draft') return fail('Deze spelerslijst is al verstuurd.');
    if (!roster.players.length) return fail('Voeg minstens één speler toe voordat je de spelerslijst verstuurt.');
    return replaceRoster(side, { ...roster, status: 'submitted', submittedAt: now() });
  }

  function requestPlayer(side, fields, reason) {
    if (getRoster(side)?.status !== 'submitted') return fail('Verstuur eerst de spelerslijst.');
    const note = String(reason || '').trim();
    if (!note || note.length > 300) return fail('Geef een reden van maximaal 300 tekens.');
    const normalized = normalizePlayer(fields);
    if (!normalized.ok) return normalized;
    const request = {
      id: crypto.randomUUID(), side, ...match[side], player: normalized.player, reason: note, status: 'pending', requestedAt: now(),
    };
    store.setMany({ rosterRequests: [...allRequests(), request], playerIdentities: rememberIdentity(request.player) });
    return { ok: true };
  }

  function decideRequest(id, decision, note) {
    const requests = allRequests();
    const current = requests.find(request => request.id === id);
    if (current?.status !== 'pending' || !['approved', 'rejected'].includes(decision)) return fail('Dit verzoek staat niet open.');
    const roster = getRoster(current.side);
    const decisionNote = String(note || '').trim();
    if (decisionNote.length > 300 || (decision === 'rejected' && !decisionNote)) return fail('Vul een reden van maximaal 300 tekens in.');
    if (decision === 'approved' && roster?.status !== 'submitted') return fail('De club moet de spelerslijst eerst versturen.');
    if (decision === 'approved' && Object.values(getRosters()).some(team => team.players.some(person => person.relationCode === current.player.relationCode))) {
      return fail('Deze speler staat al op een spelerslijst.');
    }
    const next = requests.map(request => request.id === id
      ? { ...request, status: decision, decisionNote, decidedAt: now() } : request);
    if (decision === 'approved') {
      store.setMany({
        tournamentRosters: { ...getRosters(), [current.side]: { ...roster, players: [...roster.players, current.player] } },
        rosterRequests: next,
      });
    } else store.set('rosterRequests', next);
    return { ok: true };
  }

  function setDispensation(side, id, allowed) {
    if (hasKickedOff()) return fail('De wedstrijd is begonnen. De dispensatiebesluiten staan voor dit duel vast.');
    const roster = getRoster(side);
    if (!player(side, id)) return fail('Deze speler staat nog niet op de verstuurde spelerslijst.');
    return replaceRoster(side, { ...roster, players: roster.players.map(person =>
      person.id === id ? { ...person, dispensationApproved: allowed === true } : person) });
  }

  function saveRule(key, fields) {
    if (!Object.hasOwn(defaults, key)) return fail('Kies een geldige categorie.');
    if (key === category && hasKickedOff()) return fail('De reglementen voor deze wedstrijd staan sinds de aftrap vast.');
    const { minAge, maxAge, maxDispensations, reference } = fields;
    const validAge = value => value === null || (Number.isInteger(value) && value >= 0 && value <= 99);
    if (!validAge(minAge) || !validAge(maxAge) || (minAge !== null && maxAge !== null && minAge > maxAge)) {
      return fail('Vul geldige leeftijdsgrenzen in.');
    }
    if (!Number.isInteger(maxDispensations) || maxDispensations < 0 || maxDispensations > 99) {
      return fail('Kies een maximum van 0 tot 99 dispensaties.');
    }
    if (!['match', 'season'].includes(reference)) return fail('Kies een geldige peildatum.');
    store.set('eligibilityRules', { ...getRules(), [key]: { minAge, maxAge, maxDispensations, reference } });
    return { ok: true };
  }

  function evaluateLineup(side, entries) {
    const rule = getRules()[category];
    const referenceDate = rule.reference === 'season' ? seasonReference : plan().date;
    const active = (entries || []).filter(entry => ['starter', 'sub'].includes(entry.position));
    const errors = [];
    const dispensationIds = [];
    if (getRoster(side)?.status !== 'submitted') errors.push('Verstuur eerst je spelerslijst voor dit toernooi.');
    if (!active.length) errors.push('Selecteer spelers voor de wedstrijdopgaaf.');
    if (new Set(active.map(entry => entry.id)).size !== active.length) errors.push('Een speler staat dubbel op de wedstrijdopgaaf.');
    for (const entry of active) {
      const record = player(side, entry.id);
      if (!record) {
        errors.push('Selecteer uitsluitend spelers van de verstuurde spelerslijst.');
        continue;
      }
      const age = ageOn(record.birthDate, referenceDate);
      if (age === null) {
        errors.push('Controleer de geboortedatum van ' + record.name + '.');
        continue;
      }
      const needsDispensation = (rule.minAge !== null && age < rule.minAge) || (rule.maxAge !== null && age > rule.maxAge);
      if (!needsDispensation) continue;
      dispensationIds.push(record.id);
      if (!record.dispensationApproved) errors.push(record.name + ' vereist een goedgekeurde leeftijdsdispensatie.');
    }
    const used = dispensationIds.length;
    const limit = rule.maxDispensations;
    if (used > limit) errors.push('Te veel dispensaties: ' + used + ' geselecteerd, maximaal ' + limit + ' per team.');
    return { ok: errors.length === 0, blocked: errors.length > 0, errors: [...new Set(errors)], used, limit, dispensationIds, rule, referenceDate };
  }

  function canReferee() {
    const appointment = store.get('arbitration', {})?.featured;
    const confirmed = appointment ? appointment.status === 'confirmed' && !appointment.blockedReason : store.get('officialSession', {})?.confirmed;
    return Boolean(confirmed && !isCancelled());
  }

  function reviewState(side) {
    const roster = getRoster(side);
    const sheet = store.get('lineups', seedLineups)[side];
    const official = store.get('officialSession', {});
    const eligibility = evaluateLineup(side, sheet?.players);
    const active = (sheet?.players || []).filter(entry => ['starter', 'sub'].includes(entry.position));
    const total = sheet?.status === 'submitted' ? active.length : 0;
    const reviewed = active.map(entry => store.playerCheckStatus(entry, sheet, official.checks?.[side]?.[entry.id]));
    const checked = total ? reviewed.filter(status => status === 'seen' || status === 'absent').length : 0;
    const matchPlan = plan();
    const appointment = store.get('arbitration', {})?.featured;
    const approvalKey = JSON.stringify([
      sheet?.version, matchPlan.date, matchPlan.time, matchPlan.venue, matchPlan.field, appointment?.refereeId || 'sam',
      eligibility.rule, active.map(entry => [entry.id, store.playerSignature(entry), player(side, entry.id)?.dispensationApproved]),
    ]);
    const previous = official.reviews?.[side];
    const review = previous?.key === approvalKey ? previous : undefined;
    let status = 'pending';
    if (sheet?.status !== 'submitted') status = 'missing';
    else if (review?.status === 'returned') status = 'returned';
    else if (!eligibility.ok) status = 'blocked';
    else if (review?.status === 'approved' && checked === total && total) status = 'approved';
    const canApprove = canReferee() && status === 'pending' && total > 0 && checked === total;
    return { status, roster, sheet, eligibility, checked, total, canApprove, review, approvalKey };
  }

  function reviewLineup(side, decision, text) {
    const state = reviewState(side);
    const note = String(text || '').trim();
    if (!canReferee()) return fail('Bevestig eerst de aanstelling voor deze wedstrijd.');
    if (hasKickedOff()) return fail('De spelersopgaven staan sinds de aftrap vast.');
    if (state.sheet?.status !== 'submitted') return fail('Er staat nog geen spelersopgaaf klaar.');
    if (!['approved', 'returned'].includes(decision)) return fail('Kies een beslissing.');
    if (decision === 'approved' && !state.canApprove) {
      return fail(state.eligibility.errors[0] || 'Rond eerst de identiteitscontrole van de actuele opgaaf af.');
    }
    if (decision === 'returned' && (!note || note.length > 300)) return fail('Geef een reden op van maximaal 300 tekens.');
    const official = store.get('officialSession', {});
    const review = { status: decision, key: state.approvalKey, version: state.sheet.version, note, at: now() };
    store.set('officialSession', { ...official, reviews: { ...official.reviews, [side]: review } });
    return { ok: true };
  }

  function isReady() {
    return canReferee() && sides.every(side => reviewState(side).status === 'approved');
  }

  function startMatch() {
    if (hasKickedOff() || store.get('result', null)) return fail('De wedstrijd is al gestart of afgesloten.');
    if (!isReady()) return fail('Bevestig de aanstelling en keur beide geldige spelersopgaven goed om te starten.');
    window.HVCompetition?.freezeMatchRules(window.HVFixtures?.get(match.id)||{...match,tournamentId:'HV-CUP-STD'});
    store.setMany({
      matchKickoff: { at: now(), ...identities.fixtureFields(match) },
      live: { home: 0, away: 0, minute: 0 },
    });
    return { ok: true };
  }

  window.HVEligibility = {
    category, samplePhoto, seedLineups, getRules, getRosters, getRoster, getRequests, player, ageOn,
    addDraftPlayer, removeDraftPlayer, submitRoster, requestPlayer, decideRequest, setDispensation, saveRule,
    evaluateLineup, canReferee, reviewState, reviewLineup, isReady, hasKickedOff, startMatch, isCancelled,
  };
  migratePlayerIds();
  // Keep legacy primary-match consumers on the same reviewed registration data.
  if(window.HVRegistrations){
    const R=window.HVRegistrations,cupId='HV-CUP-STD',legacyGetRoster=getRoster;
    const teamFor=side=>match[side]?.teamId;
    const converted=side=>{const roster=R.getRoster(cupId,teamFor(side));if(!roster)return legacyGetRoster(side);return {...roster,status:roster.status==='approved'?'submitted':roster.status,players:roster.players.map(p=>({...p,id:p.legacyId||p.id,hvId:p.id}))};};
    const canonicalEntries=(side,entries)=>{const people=R.getRoster(cupId,teamFor(side))?.players||[];return (entries||[]).map(e=>({...e,id:people.find(p=>p.id===e.id||p.legacyId===e.id)?.id||e.id}));};
    Object.assign(window.HVEligibility,{
      _legacyGetRoster:legacyGetRoster,
      getRoster:converted,getRosters:()=>Object.fromEntries(sides.map(side=>[side,converted(side)])),
      player:(side,id)=>converted(side)?.status==='submitted'?converted(side).players.find(p=>p.id===id||p.hvId===id)||null:null,
      evaluateLineup:(side,entries)=>R.validateLineup(window.HVFixtures.get(match.id),side,canonicalEntries(side,entries)),
      getRules:()=>Object.fromEntries(['senioren','vrouwen','o23','jeugd'].map(key=>{const r=window.HVCompetition?.get(key)?.rules||defaults[key];return[key,{...r,reference:r.ageReference||r.reference||'match'}];})),
      reviewState:side=>R.reviewState(match.id,side),reviewLineup:(side,decision,note)=>R.reviewLineup(match.id,side,decision,note),
      isReady:()=>R.canStart(match.id).ok,
      canReferee:()=>Boolean(window.HVOperations?.assignment?.(match.id)?.confirmed||store.get('officialMatchSessions',{})[match.id]?.confirmed||store.get('officialSession',{})?.confirmed),
      startMatch:()=>window.HVMatchCenter?.startMatch(match.id)||{ok:false,error:'Wedstrijdmodule wordt geladen.'},
    });
  }
})();
