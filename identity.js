(() => {
  const store = window.HVDemo;
  const clubs = new Map();
  const teams = new Map();
  const squadSuffixes = {
    '01': '1', '09': 'JO9-1', '10': 'JO10-1', '11': 'JO11-1', '12': 'JO12-1', '13': 'JO13-1',
    '15': 'JO15-1', '17': 'JO17-1', '19': 'JO19-1', '23': 'O23',
    V1: 'VR1', M11: 'MO11-1', M15: 'MO15-1', M17: 'MO17-1',
  };

  function addClub(number, name, suffixes) {
    const legacyId = 'CL-' + number;
    const id = 'HV-V-' + number;
    const club = Object.freeze({ id, legacyId, name });
    clubs.set(id, club);
    clubs.set(legacyId, club);
    for (const suffix of suffixes.split(' ')) {
      const teamId = 'HV-T-' + number + '-' + suffix;
      const legacyTeamId = 'T-' + number + '-' + suffix;
      const team = Object.freeze({
        id: teamId, legacyId: legacyTeamId, clubId: id, clubName: name, name: name + ' ' + squadSuffixes[suffix],
      });
      teams.set(teamId, team);
      teams.set(legacyTeamId, team);
    }
  }

  addClub('101', 'Duindorp SV', '01 11 13 19 15 23 V1');
  addClub('102', 'SVV Scheveningen', '01 15 19 23 V1');
  addClub('103', 'HBS', '01 15 19 V1 M11 M15 23');
  addClub('104', 'Quick', '01 15 17 19 23 V1');
  addClub('105', 'HVV', '01 15 23 V1');
  addClub('106', 'Westlandia', '01 12 17 19 23 15 V1');
  addClub('107', 'RKAVV', '01 17 V1 15 23');
  addClub('108', 'DUNO', '01 10 15 19 V1 23');
  addClub('109', 'VELO', '01 09 15 19 23 V1 M17');
  addClub('110', 'VUC', '01 12 23 15 V1');
  addClub('111', 'Forum Sport', '01 17 V1 M15 M17 15 23');
  addClub('112', 'HVC ’10', '01 13 M17 15 23 V1');
  addClub('113', 'Wilhelmus', '01 15 23 V1');
  addClub('114', 'Quick Steps', '01 09 15 23 V1');
  addClub('115', 'Die Haghe', '01 10 15 23 V1');
  addClub('116', 'KMD', '01 11 15 23 V1');
  addClub('117', 'Sportclub Monster', '01 M11 15 23 V1');

  const appAliases = {
    duindorp: 'T-101-01', scheveningen: 'T-102-01', hbs: 'T-103-01', quick: 'T-104-01',
    'duno-vr': 'T-108-V1', 'rkavv-vr': 'T-107-V1',
    'westlandia-o23': 'T-106-23', 'velo-o23': 'T-109-23',
    'hvv-jo15': 'T-105-15', 'quick-jo15': 'T-104-15',
  };
  for (const [alias, code] of Object.entries(appAliases)) teams.set(alias, teams.get(code));

  const clone=value=>JSON.parse(JSON.stringify(value));
  const customClubs=()=>store.get('identityClubs',[]);
  const customTeams=()=>store.get('identityTeams',[]);
  const team = id => id ? customTeams().find(row=>row.id===id||row.legacyId===id)||teams.get(id) : undefined;
  const club = id => id ? customClubs().find(row=>row.id===id||row.legacyId===id)||clubs.get(id) : undefined;
  const listClubs = () => [...new Map([...new Set(clubs.values()),...customClubs()].map(row=>[row.id,row])).values()];
  const listTeams = () => [...new Map([...new Set(teams.values()),...customTeams()].map(row=>[row.id,row])).values()];
  function participant(id) {
    const record = team(id);
    return Object.freeze({ teamId: record.id, clubId: record.clubId });
  }

  const fixtures = new Map([
    ['HV-2701', 'T-101-01', 'T-102-01'],
    ['HV-2702', 'T-103-01', 'T-104-01'],
    ['HV-2703', 'T-108-V1', 'T-107-V1'],
    ['HV-2704', 'T-106-23', 'T-109-23'],
    ['HV-2705', 'T-105-15', 'T-104-15'],
    ['HV-2706', 'T-105-01', 'T-108-01'],
    ['HV-2707', 'T-106-01', 'T-107-01'],
  ].map(([id, home, away]) => [id, Object.freeze({ id, home: participant(home), away: participant(away) })]));
  fixtures.set('HV-2708', Object.freeze({ id:'HV-2708', home:{teamId:null,clubId:null}, away:participant('T-103-01') }));
  fixtures.set('HV-2709', Object.freeze({ id:'HV-2709', home:participant('T-105-01'), away:participant('T-106-01') }));
  fixtures.set('HV-2710', Object.freeze({ id:'HV-2710', home:{teamId:null,clubId:null}, away:{teamId:null,clubId:null} }));
  const fixture = fixtures.get('HV-2701');
  const matchById = id => fixtures.get(id);
  function registerFixtures(records) {
    for (const row of records) fixtures.set(row.id, Object.freeze({
      id:row.id,
      home:Object.freeze({teamId:row.homeTeamId || null,clubId:row.homeClubId || null}),
      away:Object.freeze({teamId:row.awayTeamId || null,clubId:row.awayClubId || null}),
    }));
  }
  const fixtureFields = (match) => ({
    matchId: match.id,
    homeTeamId: match.home.teamId, awayTeamId: match.away.teamId,
    homeClubId: match.home.clubId, awayClubId: match.away.clubId,
  });

  function issuedPlayerId(legacyId) {
    if (typeof legacyId !== 'string' || !legacyId) return '';
    if (legacyId.startsWith('HV-P-')) return legacyId;
    const seed = /^(home|away)-(0[1-9]|1[0-6])$/.exec(legacyId);
    if (seed) {
      const number = Number(seed[2]) + (seed[1] === 'away' ? 16 : 0);
      return 'HV-P-' + String(number).padStart(5, '0');
    }
    if (legacyId === 'home-extra-01') return 'HV-P-00033';
    return 'HV-P-LEGACY-' + legacyId.toUpperCase();
  }

  function playerId(id) {
    const aliases = store.get('playerHvAliases', {});
    return Object.hasOwn(aliases, id) ? aliases[id] : issuedPlayerId(id);
  }

  const now=()=>new Date().toISOString(),fail=error=>({ok:false,error}),clean=value=>String(value||'').trim();
  const canonicalPersonId=id=>{const aliases=store.get('identityPersonAliases',{});let current=id,seen=new Set();while(aliases[current]&&!seen.has(current)){seen.add(current);current=aliases[current];}return current;};
  function rosterPeople(){const data=store.get('registrationData',{});return Object.values(data.rosters||{}).flatMap(roster=>(roster.players||[]).map(row=>({...row,editionId:roster.editionId||window.HVEditions?.activeId?.()||'HV-ED-2026-27',cupId:roster.cupId,teamId:roster.teamId,clubId:roster.clubId,rosterStatus:roster.status})));}
  function people(){const map=new Map();for(const row of [...rosterPeople(),...store.get('identityPeople',[])]){if(row.mergedInto)continue;const id=canonicalPersonId(row.hvId||row.id);if(!id)continue;const before=map.get(id)||{};map.set(id,{...before,...row,id,hvId:id,memberships:undefined});}return [...map.values()].filter(row=>!row.mergedInto).map(clone);}
  function person(value){const code=clean(value).toUpperCase();return people().find(row=>row.id===canonicalPersonId(value)||clean(row.relationCode).toUpperCase()===code)||null;}
  function membershipStatus(row,date=window.HVClock?.today?.()||window.HVFixtures?.today||new Date().toISOString().slice(0,10)){if(row.status==='pending')return 'pending';if(row.from&&row.from>date)return 'scheduled';if(row.until&&row.until<=date)return 'ended';return row.status==='ended'&&row.until&&row.until>date?'active':row.status||'active';}
  function memberships(personId){const id=personId&&canonicalPersonId(personId),map=new Map();for(const row of rosterPeople()){const pid=canonicalPersonId(row.hvId||row.id);const key=[pid,row.teamId,row.editionId,row.cupId].join('::');map.set(key,{id:key,personId:pid,teamId:row.teamId,clubId:row.clubId,editionId:row.editionId,cupId:row.cupId,from:row.editionId==='HV-ED-2026-27'?'2026-08-01':null,until:null,status:row.rosterStatus==='approved'&&row.approvalStatus==='approved'?'active':'pending',source:'toernooilijst'});}for(const row of store.get('identityMemberships',[])){const key=[canonicalPersonId(row.personId),row.teamId,row.editionId,row.cupId].join('::');map.set(key,{...row,personId:canonicalPersonId(row.personId)});}return [...map.values()].filter(row=>!id||row.personId===id).map(row=>clone({...row,effectiveStatus:membershipStatus(row)}));}
  function retainPeople(){const rows=people().map(({teamId,clubId,cupId,editionId,approvalStatus,approved,dispensationApproved,review,dispensationDecision,...row})=>row),links=memberships();store.setMany({identityPeople:rows,identityMemberships:links});return {people:rows.length,memberships:links.length};}
  function resolvePerson(input={},scope={}){const relationCode=clean(input.relationCode).toUpperCase(),existing=person(input.id||input.hvId)||person(relationCode),name=clean(input.name)||[clean(input.firstName),clean(input.lastName)].filter(Boolean).join(' ');if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate||''))return fail('Controleer naam en geboortedatum van de persoon.');if(existing&&existing.birthDate&&existing.birthDate!==input.birthDate)return fail('Deze relatiecode hoort bij een andere geboortedatum. Laat de toernooileiding de persoonskoppeling beoordelen.');const id=existing?.id||input.hvId||input.id||'HV-P-'+crypto.randomUUID().toUpperCase(),proposed={...existing,id,hvId:id,firstName:clean(input.firstName),lastName:clean(input.lastName),name,birthDate:input.birthDate,relationCode,photo:input.photo||existing?.photo||'assets/hv-app-192.png',createdAt:existing?.createdAt||now(),updatedAt:now()},row=existing?{...clone(existing),id,hvId:id}:proposed;const list=store.get('identityPeople',[]).filter(value=>canonicalPersonId(value.id)!==id);store.set('identityPeople',[...list,row]);if(scope.teamId){const clubId=team(scope.teamId)?.clubId;if(!clubId)return fail('Kies een bestaand team voor de koppeling.');const editionId=scope.editionId||window.HVEditions?.activeId?.()||'HV-ED-2026-27',current=store.get('identityMemberships',[]),found=current.find(value=>canonicalPersonId(value.personId)===id&&value.teamId===scope.teamId&&value.editionId===editionId&&value.cupId===(scope.cupId||null)),status=scope.approved===true?'active':found?.status||'pending';if(!found)store.set('identityMemberships',[...current,{id:'HV-LID-'+crypto.randomUUID().toUpperCase(),personId:id,teamId:scope.teamId,clubId,editionId,cupId:scope.cupId||null,from:scope.from||window.HVEditions?.active?.()?.startDate||'2026-08-01',until:null,status,source:'Persoonskoppeling bij spelerslijst'}]);else if(found.status!==status)store.set('identityMemberships',current.map(value=>value.id===found.id?{...value,status}:value));}document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,person:clone(row),existing:!!existing};}
  function correctPerson(personId,input={},reason){if(window.HVAccess?.can&&!window.HVAccess.can('identity.manage'))return fail('Alleen de toernooileiding kan een beoordeelde persoonscorrectie vaststellen.');const existing=person(personId);if(!existing)return fail('De persoonsidentiteit is niet gevonden.');if(clean(reason).length<8)return fail('Leg de beoordelingsreden voor de persoonscorrectie vast.');const birthDate=input.birthDate||existing.birthDate,firstName=clean(input.firstName||existing.firstName),lastName=clean(input.lastName||existing.lastName),relationCode=clean(input.relationCode||existing.relationCode).toUpperCase();if(!firstName||!lastName||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||Number.isNaN(Date.parse(birthDate+'T12:00:00Z'))||new Date(birthDate+'T12:00:00Z').toISOString().slice(0,10)!==birthDate)return fail('Controleer de gecorrigeerde persoonsgegevens.');const owner=person(relationCode);if(owner&&owner.id!==existing.id)return fail('Deze relatiecode hoort bij een andere persoonsidentiteit.');const next={...existing,id:existing.id,hvId:existing.id,firstName,lastName,name:firstName+' '+lastName,birthDate,relationCode,photo:input.photo||existing.photo,updatedAt:now()},history=store.get('identityPersonRevisions',{});store.setMany({identityPeople:[...store.get('identityPeople',[]).filter(row=>row.id!==existing.id),next],identityPersonRevisions:{...history,[existing.id]:[...(history[existing.id]||[]),{at:now(),before:existing,after:clone(next),reason:clean(reason)}]}});window.HVWorkflow?.audit?.('PERSOON_GECORRIGEERD',existing.id,existing,next,reason);document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,person:clone(next)};}
  function transferPerson(personId,input={}){if(window.HVAccess?.can&&!window.HVAccess.can('identity.manage'))return fail('Alleen de toernooileiding beheert teamovergangen.');const current=person(personId),destination=team(input.toTeamId),reason=clean(input.reason);if(!current||!destination)return fail('Kies een bestaande speler en een geldig nieuw team.');if(reason.length<8||!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate||''))return fail('Geef de ingangsdatum en een duidelijke reden voor de teamovergang.');const editionId=input.editionId||window.HVEditions?.activeId?.()||'HV-ED-2026-27',rows=memberships(current.id),allActive=rows.filter(row=>row.editionId===editionId&&row.status==='active');if(!input.fromTeamId&&new Set(allActive.map(row=>row.teamId)).size>1)return fail('Kies vanuit welk team deze overgang wordt vastgelegd. Andere teamrelaties blijven behouden.');const active=allActive.filter(row=>!input.fromTeamId||row.teamId===input.fromTeamId);if(!active.length)return fail('Er is geen actieve bronrelatie voor deze teamovergang. Rond eerst de spelersbeoordeling af.');if(active.some(row=>row.teamId===destination.id))return fail('Deze speler is al actief gekoppeld aan het gekozen team.');const updates=active.map(row=>({...row,status:'ended',until:input.fromDate,reason})),next={id:'HV-LID-'+crypto.randomUUID().toUpperCase(),personId:current.id,teamId:destination.id,clubId:destination.clubId,editionId,cupId:null,from:input.fromDate,until:null,status:'active',reason,source:'Teamovergang'};const ids=new Set(updates.map(row=>row.id));store.set('identityMemberships',[...store.get('identityMemberships',[]).filter(row=>!ids.has(row.id)),...updates,next]);window.HVWorkflow?.audit?.('SPELER_TEAMOVERGANG',current.id,active,next,reason);document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,person:current,membership:clone(next)};}
  function mergePeople(sourceId,targetId,reason){if(window.HVAccess?.can&&!window.HVAccess.can('identity.manage'))return fail('Alleen de toernooileiding koppelt identiteiten.');const source=person(sourceId),target=person(targetId);if(!source||!target||source.id===target.id)return fail('Kies twee verschillende geregistreerde personen.');if(clean(reason).length<10)return fail('Leg de reden voor de samenvoeging vast.');if(source.birthDate!==target.birthDate)return fail('De geboortedata verschillen. Los de identiteitsafwijking eerst op.');const games=window.HVFixtures?.all?.()||[],committed=games.filter(game=>['live','finished','suspended','review'].includes(game.status));const sm=memberships(source.id),tm=memberships(target.id);if(sm.some(a=>tm.some(b=>a.cupId&&a.cupId===b.cupId&&a.teamId!==b.teamId&&committed.some(game=>game.tournamentId===a.cupId&&[game.homeTeamId,game.awayTeamId].includes(a.teamId)&&[game.homeTeamId,game.awayTeamId].includes(b.teamId)))))return fail('Beide identiteiten zijn betrokken bij een vastgelegde onderlinge wedstrijd. Behandel dit als identiteitsdossier.');store.set('identityPersonAliases',{...store.get('identityPersonAliases',{}),[source.id]:target.id});store.set('identityPeople',store.get('identityPeople',[]).map(row=>row.id===source.id?{...row,mergedInto:target.id}:row));window.HVWorkflow?.audit?.('PERSOON_GEKOPELD',target.id,source,target,reason);document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,person:person(target.id),alias:source.id};}
  const normalizedName=value=>clean(value).normalize('NFKC').replace(/\s+/g,' ');
  const nameKey=value=>normalizedName(value).toLocaleLowerCase('nl');
  function identityGuard(){
    if(window.HVAccess?.can&&!window.HVAccess.can('identity.manage'))return fail('Alleen de toernooileiding registreert verenigingen en teams.');
    const check=window.HVWorkflow?.guard?.();return check?.ok===false?check:{ok:true};
  }
  function issueIdentity(prefix,suffix,lookup){
    for(let attempt=0;attempt<8;attempt++){const id=prefix+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase()+suffix;if(!lookup(id))return id;}
    return null;
  }
  function saveClub(input={}){
    const permitted=identityGuard();if(!permitted.ok)return permitted;
    const name=normalizedName(input.name),current=club(input.id);
    if(input.id&&!current)return fail('Deze vereniging is niet gevonden.');
    if(name.length<2||name.length>90)return fail('Vul een geldige verenigingsnaam in.');
    if(listClubs().some(row=>row.id!==current?.id&&nameKey(row.name)===nameKey(name)))return fail('Deze vereniging bestaat al.');
    const row={...current,id:current?.id||issueIdentity('HV-V-','',club),name};
    if(!row.id)return fail('Een uniek verenigingsnummer kon niet worden aangemaakt. Probeer het opnieuw.');
    for(const [key,max]of [['shortName',30],['city',80],['venue',120],['address',160],['postcode',10]]){
      const value=normalizedName(input[key]??current?.[key]??'');if(value.length>max)return fail('Houd '+key+' binnen '+max+' tekens.');row[key]=value;
    }
    if(row.postcode){row.postcode=row.postcode.toUpperCase().replace(/\s/g,'');if(!/^[1-9]\d{3}[A-Z]{2}$/.test(row.postcode))return fail('Vul een geldige Nederlandse postcode in.');row.postcode=row.postcode.slice(0,4)+' '+row.postcode.slice(4);}
    const profiles=store.get('operationsClubProfiles',{}),before=profiles[row.id],profile={...before,contactVisible:before?.contactVisible===true};
    for(const [key,max]of [['contactName',100],['email',254],['phone',40],['venue',120],['address',160],['postcode',10],['city',80]]){
      const value=normalizedName(input[key]??before?.[key]??row[key]??'');if(value.length>max)return fail('Controleer de contact- en locatiegegevens.');profile[key]=key==='email'?value.toLocaleLowerCase('nl'):key==='postcode'?row.postcode:value;
    }
    if(profile.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))return fail('Vul een geldig e-mailadres in.');
    if(profile.phone&&(!/^[+\d ()/.-]+$/.test(profile.phone)||profile.phone.replace(/\D/g,'').length<6||profile.phone.replace(/\D/g,'').length>20))return fail('Vul een geldig telefoonnummer in.');
    store.setMany({identityClubs:[...customClubs().filter(item=>item.id!==row.id),row],operationsClubProfiles:{...profiles,[row.id]:profile}});
    window.HVWorkflow?.audit?.('VERENIGING_OPGESLAGEN',row.id,current,row,'Verenigingsgegevens bijgewerkt');
    document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,club:clone(row)};
  }
  function saveTeam(input={}){
    const permitted=identityGuard();if(!permitted.ok)return permitted;
    const association=club(input.clubId),name=normalizedName(input.name),suffix=clean(input.suffix||'01'),current=team(input.id);
    if(input.id&&!current)return fail('Dit team is niet gevonden.');
    if(!association||name.length<2||name.length>110||!Object.hasOwn(squadSuffixes,suffix))return fail('Kies een vereniging, categorie en geldige teamnaam.');
    if(current&&current.clubId!==association.id)return fail('Een bestaand team behoudt zijn vereniging. Maak voor een ander clubverband een nieuw team aan.');
    if(current&&!current.id.endsWith('-'+suffix))return fail('Een bestaand team behoudt zijn categorie. Maak voor een andere categorie een nieuw team aan.');
    if(listTeams().some(row=>row.id!==current?.id&&row.clubId===association.id&&nameKey(row.name)===nameKey(name)))return fail('Deze teamnaam bestaat al bij de gekozen vereniging.');
    const row={...current,id:current?.id||issueIdentity('HV-T-','-'+suffix,team),clubId:association.id,clubName:association.name,name,suffix};
    if(!row.id)return fail('Een uniek teamnummer kon niet worden aangemaakt. Probeer het opnieuw.');
    store.set('identityTeams',[...customTeams().filter(item=>item.id!==row.id),row]);
    window.HVWorkflow?.audit?.('TEAM_OPGESLAGEN',row.id,current,row,'Teamgegevens bijgewerkt');
    document.dispatchEvent(new CustomEvent('hv:identity'));return {ok:true,team:clone(row)};
  }
  window.HVIdentity = { club, team, listClubs, listTeams, fixture, matchById, registerFixtures, fixtureFields, playerId, issuedPlayerId,person,people,memberships,resolvePerson,transferPerson,mergePeople,canonicalPersonId,saveClub,saveTeam,retainPeople,correctPerson,membershipStatus };
  document.querySelectorAll('[data-hv-fixture]').forEach(node => {
    const match = matchById(node.dataset.hvFixture);
    if (match) Object.assign(node.dataset, fixtureFields(match));
  });
})();
