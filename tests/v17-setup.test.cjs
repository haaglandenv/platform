const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {boot,okay}=require('./v15-system.test.cjs');
const root=path.resolve(__dirname,'..');
function setup(initial={}){const e=boot(initial);vm.runInContext(fs.readFileSync(path.join(root,'setup.js'),'utf8'),e.w,{filename:'setup.js',timeout:20000});return e;}
const cup=(name='Nieuwe regiobeker',extra={})=>({name,suffix:'01',bracketSize:8,...extra});
const teams=e=>e.w.HVIdentity.listTeams().filter(t=>t.id.endsWith('-01')).map(t=>t.id);
const plain=value=>JSON.parse(JSON.stringify(value));
const tests=[],test=(name,fn)=>tests.push([name,fn]);
test('a new cup saves rules, progression and pending participants as a concept without matches',()=>{
  const e=setup(),{w}=e,original=w.HVFixtures.all().map(m=>m.id),ids=teams(e).slice(0,4);
  const r=okay(w.HVSetup.createCup(cup('  Regio   Cup  ',{teamIds:ids,halfMinutes:'40',halfTimeMinutes:'10',extraTime:true,extraHalfMinutes:10,penalties:true,maxDispensations:2,tournamentText:'Eigen toernooiregels.',matchText:'Eigen wedstrijdregels.',progression:'manual'})));
  assert.equal(r.cup.name,'Regio Cup');assert.equal(r.cup.editionId,w.HVEditions.activeId());assert.equal(r.entries.length,4);assert(r.entries.every(row=>row.status==='pending'));
  const rules=w.HVCompetition.get(r.cup.id);assert.equal(rules.rules.halfMinutes,40);assert.equal(rules.rules.maxDispensations,2);assert.equal(rules.rules.tournamentText,'Eigen toernooiregels.');assert(Object.values(rules.progression).every(x=>x==='manual'));
  assert.deepEqual(w.HVFixtures.all().map(m=>m.id),original);assert.equal(w.HVFixtures.forCup(r.cup.id).length,0);
  for(const teamId of ids){const roster=w.HVRegistrations.getRoster(r.cup.id,teamId);assert.equal(roster.status,'draft');assert.equal(roster.players.length,0);assert.equal(roster.history.length,0);}
});
test('only explicit initialization with sufficient approved entries generates a real bracket',()=>{
  const e=setup(),S=e.w.HVSetup,ids=teams(e).slice(0,4),before=e.saved();
  assert.equal(S.createCup(cup('Te weinig deelnemers',{teamIds:ids.slice(0,3),approveEntries:true,initializeBracket:true})).ok,false);
  assert.equal(S.createCup(cup('Niet beoordeeld',{teamIds:ids,initializeBracket:true})).ok,false);assert.deepEqual(e.saved(),before);
  const result=okay(S.createCup(cup('Expliciete bekerindeling',{teamIds:ids,approveEntries:true,initializeBracket:true}))),games=e.w.HVFixtures.forCup(result.cup.id);
  assert.equal(result.initialized,true);assert.equal(games.length,7);assert.equal(games.filter(m=>m.status==='bye').length,4);assert(games.every(m=>m.editionId===e.w.HVEditions.activeId()));
  assert(games.every(m=>!m.homeBye||!m.awayBye));assert(result.entries.every(r=>r.status==='approved'));
});
test('club identity stores normalized public location and private practical contacts',()=>{
  const e=setup(),{w}=e,S=w.HVSetup;
  const result=okay(S.createClub({name:'  VV   Testregio ',shortName:'VVT',city:'Den Haag',venue:'Sportpark Testveld',address:'Testlaan 3',postcode:'2491ab',contactName:'  J.  Test ',email:'Club@Example.test',phone:'+31 (0)70 123 4567'})),club=result.club,profile=e.state().operationsClubProfiles[club.id];
  assert.equal(club.name,'VV Testregio');assert.equal(club.postcode,'2491 AB');assert.equal(club.venue,'Sportpark Testveld');assert.equal(profile.contactVisible,false);assert.equal(profile.contactName,'J. Test');assert.equal(profile.email,'club@example.test');assert.equal(w.HVPrivacy.publicContact(club.id),null);assert.equal('email' in club,false);
  const team=okay(S.saveTeam({clubId:club.id,name:'VV Testregio 1',suffix:'01',cupIds:[]})).team;
  assert.equal(w.HVFixtures.homeVenue(club.id),'Sportpark Testveld');assert.equal(w.HVFixtures.homeVenue(team.id),'Sportpark Testveld');
  const restored=setup(e.saved());assert.equal(restored.w.HVIdentity.club(club.id).venue,'Sportpark Testveld');assert.equal(restored.w.HVFixtures.homeVenue(team.id),'Sportpark Testveld');
});
test('duplicate names collapse spaces and case, including direct identity edits',()=>{
  const e=setup(),S=e.w.HVSetup,I=e.w.HVIdentity;
  const club=okay(S.createClub({name:'VV Regio'})).club,other=okay(S.createClub({name:'Andere club'})).club;
  assert.equal(S.createClub({name:' vv   REGIO '}).ok,false);assert.equal(I.saveClub({id:other.id,name:' vv REGIO '}).ok,false);
  okay(S.saveTeam({clubId:club.id,name:'VV Regio 1',suffix:'01'}));assert.equal(S.saveTeam({clubId:club.id,name:' vv   regio 1 ',suffix:'01'}).ok,false);
  okay(S.saveTeam({clubId:other.id,name:'VV Regio 1',suffix:'01'}));
  okay(S.createCup(cup('Beker Regio')));assert.equal(S.createCup(cup(' beker   REGIO ')).ok,false);
  assert.equal(I.saveClub({id:'UNKNOWN',name:'Nieuwe vereniging'}).ok,false);assert.equal(I.saveTeam({id:'UNKNOWN',clubId:club.id,name:'Nieuw team',suffix:'01'}).ok,false);
});
test('new teams support every identity category and link to multiple eligible cups atomically',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,c1=okay(S.createCup(cup('Teamkoppeling één'))).cup,c2=okay(S.createCup(cup('Teamkoppeling twee'))).cup;
  assert.equal(S.teamCategories.length,14);assert.equal(S.categories.length,4);
  const result=okay(S.saveTeam({mode:'new',clubId:'CL-101',name:'Duindorp testselectie',suffix:'01',cupIds:[c1.id,c2.id],approveEntries:true}));
  assert.equal(result.team.clubId,'HV-V-101');assert(result.team.id.startsWith('HV-T-'));assert(result.team.id.endsWith('-01'));assert.equal(result.entries.length,2);assert(result.entries.every(r=>r.status==='approved'));
  for(const cupId of [c1.id,c2.id]){const r=w.HVRegistrations.getRoster(cupId,result.team.id);assert.equal(r.players.length,0);assert.equal(r.status,'draft');assert.equal(r.example,false);}
  const youth=okay(S.saveTeam({clubId:'HV-V-101',name:'Duindorp test JO9',suffix:'09',cupIds:[]}));assert(youth.team.id.endsWith('-09'));assert.equal(S.saveTeam({clubId:'HV-V-101',name:'Andere JO9',suffix:'09',cupIds:[c1.id]}).ok,false);
});
test('existing team links retain canonical identity and cannot move club or category',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,c=okay(S.createCup(cup('Bestaande teamkoppeling'))).cup,before=plain(w.HVIdentity.team('HV-T-101-01'));
  const result=okay(S.saveTeam({mode:'existing',clubId:'CL-101',teamId:'T-101-01',name:'Wordt genegeerd',suffix:'01',cupIds:[c.id]}));assert.deepEqual(plain(result.team),before);assert.equal(result.team.id,'HV-T-101-01');
  assert.equal(S.saveTeam({mode:'existing',clubId:'HV-V-102',teamId:before.id,suffix:'01',cupIds:[c.id]}).ok,false);
  assert.equal(S.saveTeam({mode:'existing',clubId:'HV-V-101',teamId:before.id,suffix:'15',cupIds:[]}).ok,false);
  assert.equal(w.HVIdentity.saveTeam({id:before.id,clubId:before.clubId,name:before.name,suffix:'15'}).ok,false);
  assert.equal(S.saveTeam({mode:'existing',clubId:before.clubId,teamId:before.id,suffix:'01',cupIds:[c.id]}).ok,false);
  const r=w.HVRegistrations.getRoster(c.id,before.id);assert.equal(r.status,'draft');assert.equal(r.players.length,0);
});
test('aliases, invalid rules and duplicate selections fail without changing state',()=>{
  const e=setup(),S=e.w.HVSetup,before=e.saved();
  for(const input of [cup('Dubbel aliasteam',{teamIds:['T-101-01','HV-T-101-01']}),cup('Onjuiste categorie',{teamIds:['HV-T-101-15']}),cup('Onjuiste duur',{halfMinutes:''}),cup('Onjuist getal',{halfTimeMinutes:[]}),cup('Ongeldige keuze',{approveEntries:'true'}),cup('Geen tekst',{matchText:''}),null])assert.equal(S.createCup(input).ok,false);
  for(const input of [{name:'Club fout',email:'geen-email'},{name:'Club fout',postcode:'ab'},{name:'Club fout',phone:'tekst'},null])assert.equal(S.createClub(input).ok,false);
  assert.deepEqual(e.saved(),before);
});
test('leadership and both season and cup governance are enforced before creation or linking',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,c=okay(S.createCup(cup('Afgesloten doelbeker'))).cup;
  e.as('team',{teamId:'HV-T-101-01'});let before=e.saved();assert.equal(S.createClub({name:'Onbevoegde club'}).ok,false);assert.equal(S.createCup(cup()).ok,false);assert.equal(S.saveTeam({clubId:'HV-V-101',name:'Onbevoegd team',suffix:'01'}).ok,false);assert.deepEqual(e.saved(),before);
  e.as('leadership');e.store.set('workflowGovernance',{seasonLocked:true,cups:{}});before=e.saved();assert.equal(S.createClub({name:'Gesloten club'}).ok,false);assert.equal(w.HVIdentity.saveTeam({clubId:'HV-V-101',name:'Gesloten team',suffix:'01'}).ok,false);assert.deepEqual(e.saved(),before);
  e.store.set('workflowGovernance',{seasonLocked:false,cups:{[c.id]:{finalized:true}}});before=e.saved();assert.equal(S.saveTeam({clubId:'HV-V-101',name:'Geen nieuw team',suffix:'01',cupIds:[c.id]}).ok,false);assert.deepEqual(e.saved(),before);
});
test('exclusions and capacity include pending entries and respect revoked exclusions',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,c=okay(S.createCup(cup('Volle beker',{teamIds:teams(e).slice(0,8)}))).cup;
  assert.equal(S.saveTeam({clubId:'HV-V-101',name:'Negende team',suffix:'01',cupIds:[c.id],approveEntries:false}).ok,false);
  okay(w.HVWorkflow.excludeClub('HV-V-101',true,'Een gemotiveerd uitsluitingsbesluit voor deze test.'));assert.equal(S.createCup(cup('Uitgesloten deelnemer',{teamIds:['HV-T-101-01']})).ok,false);
  const open=okay(S.createCup(cup('Open doelbeker'))).cup;assert.equal(S.saveTeam({clubId:'HV-V-101',name:'Uitgesloten nieuw team',suffix:'01',cupIds:[open.id]}).ok,false);
  okay(w.HVWorkflow.excludeClub('HV-V-101',false,'Het uitsluitingsbesluit is formeel opgeheven.'));okay(S.saveTeam({clubId:'HV-V-101',name:'Weer toegelaten team',suffix:'01',cupIds:[open.id]}));
});
test('late rules, second entry and bracket failures publish no partial state or events',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,C=w.HVCompetition,events=[];
  for(const type of ['hv:identity','hv:competition','hv:fixtures','hv:setup'])e.document.addEventListener(type,()=>events.push(type));
  const original={saveRules:C.saveRules,registerEntry:C.registerEntry,initializeBracket:C.initializeBracket};
  let before=e.saved();C.saveRules=()=>({ok:false,error:'Reglement geweigerd'});assert.equal(S.createCup(cup('Mislukt reglement')).ok,false);assert.deepEqual(e.saved(),before);assert.equal(events.length,0);C.saveRules=original.saveRules;
  let count=0;C.registerEntry=(...args)=>++count===2?{ok:false,error:'Tweede inschrijving mislukt'}:original.registerEntry(...args);before=e.saved();assert.equal(S.createCup(cup('Mislukte tweede inschrijving',{teamIds:teams(e).slice(0,3)})).ok,false);assert.deepEqual(e.saved(),before);assert.equal(events.length,0);C.registerEntry=original.registerEntry;
  C.initializeBracket=()=>{throw Error('Late indelingsfout');};before=e.saved();assert.equal(S.createCup(cup('Mislukte bekerindeling',{teamIds:teams(e).slice(0,4),approveEntries:true,initializeBracket:true})).ok,false);assert.deepEqual(e.saved(),before);assert.equal(events.length,0);C.initializeBracket=original.initializeBracket;
  okay(S.createCup(cup('Herstel na mislukte opdracht')));assert(events.length>0);
});
test('a second cup failure leaves no orphan team and successful observers see every link together',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,C=w.HVCompetition,c1=okay(S.createCup(cup('Atomair team één'))).cup,c2=okay(S.createCup(cup('Atomair team twee'))).cup,before=e.saved(),original=C.registerEntry;
  C.registerEntry=(id,...args)=>id===c2.id?{ok:false,error:'Tweede beker geweigerd'}:original(id,...args);
  const input={clubId:'HV-V-101',name:'Atomair team',suffix:'01',cupIds:[c1.id,c2.id],approveEntries:true};assert.equal(S.saveTeam(input).ok,false);assert.deepEqual(e.saved(),before);C.registerEntry=original;
  const observations=[];e.document.addEventListener('hv:state',()=>{const t=w.HVIdentity.listTeams().find(t=>t.name===input.name);if(t)observations.push([C.entrants(c1.id).some(x=>x.teamId===t.id),C.entrants(c2.id).some(x=>x.teamId===t.id)]);});
  okay(S.saveTeam(input));assert(observations.length>0);assert(observations.every(x=>x.every(Boolean)));
});
test('request IDs make double submissions idempotent and reject conflicting payloads',()=>{
  const e=setup(),S=e.w.HVSetup,input={name:'Idempotente vereniging',requestId:'club-request-1'},first=okay(S.createClub(input)),before=e.saved();
  const again=okay(S.createClub(input));assert.equal(again.club.id,first.club.id);assert.deepEqual(e.saved(),before);assert.equal(S.createClub({...input,name:'Andere vereniging'}).ok,false);assert.deepEqual(e.saved(),before);
  const cinput=cup('Idempotente beker',{requestId:'cup-request-1'}),c=okay(S.createCup(cinput));assert.equal(okay(S.createCup(cinput)).cup.id,c.cup.id);
});
test('the actual browser store retains its previous snapshot when persistent storage rejects a creation',()=>{
  const e=setup(),{w}=e,captured=e.store,seed=JSON.stringify(e.saved());let reject=true,writes=0;
  w.localStorage={getItem:()=>seed,setItem(){writes++;if(reject)throw Error('Storage full');}};
  const source=fs.readFileSync(path.join(root,'site.js'),'utf8'),end=source.indexOf('  const pages =');assert(end>0);
  vm.runInContext(source.slice(0,end)+'\n})();',w,{filename:'site.js:actual-store'});
  Object.assign(captured,w.HVDemo);w.HVDemo=captured;
  const before=captured.snapshot(),events=[];for(const type of ['hv:identity','hv:competition','hv:fixtures','hv:setup'])e.document.addEventListener(type,()=>events.push(type));
  const input={name:'Vereniging bij volle opslag',requestId:'failed-storage'};assert.equal(w.HVSetup.createClub(input).ok,false);assert.deepEqual(captured.snapshot(),before);assert.equal(events.length,0);assert.equal(writes,1);
  reject=false;const created=okay(w.HVSetup.createClub(input));assert(captured.get('identityClubs').some(row=>row.id===created.club.id));assert(events.length>0);assert.equal(writes,2);
});
test('a previously unopened registration store never invents players for a newly created team',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,c=okay(S.createCup(cup('Verse spelerslijsten'))).cup;
  e.store.set('registrationData',null);
  const team=okay(S.saveTeam({clubId:'HV-V-101',name:'Verse selectie zonder spelers',suffix:'01',cupIds:[c.id],approveEntries:true})).team;
  const roster=w.HVRegistrations.getRoster(c.id,team.id);assert.equal(roster.status,'draft');assert.equal(roster.players.length,0);assert.equal(roster.history.length,0);
  assert.equal(w.HVIdentity.people().some(row=>row.teamId===team.id),false);assert.equal(w.HVRegistrations.submitRoster(c.id,team.id).ok,false);
  const reloaded=setup(e.saved());assert.equal(reloaded.w.HVRegistrations.getRoster(c.id,team.id).players.length,0);
});
test('ID generation rejects deterministic collisions without overwriting an earlier entity',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,original=w.crypto.randomUUID;
  w.crypto.randomUUID=()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  try{
    const first=okay(S.createClub({name:'Eerste unieke vereniging'})),before=e.saved();assert.equal(S.createClub({name:'Tweede unieke vereniging'}).ok,false);assert.deepEqual(e.saved(),before);assert.equal(w.HVIdentity.club(first.club.id).name,'Eerste unieke vereniging');
    const team=okay(S.saveTeam({clubId:first.club.id,name:'Eerste uniek team',suffix:'01'})),teamBefore=e.saved();assert.equal(S.saveTeam({clubId:first.club.id,name:'Tweede uniek team',suffix:'01'}).ok,false);assert.deepEqual(e.saved(),teamBefore);assert.equal(w.HVIdentity.team(team.team.id).name,'Eerste uniek team');
    okay(S.createCup(cup('Eerste unieke beker')));const cupBefore=e.saved();assert.equal(S.createCup(cup('Tweede unieke beker')).ok,false);assert.deepEqual(e.saved(),cupBefore);
  }finally{w.crypto.randomUUID=original;}
});
test('global identities survive edition switching while cups and their registrations stay scoped',()=>{
  const e=setup(),{w}=e,S=w.HVSetup,club=okay(S.createClub({name:'Editievaste vereniging'})).club,team=okay(S.saveTeam({clubId:club.id,name:'Editievast team',suffix:'01'})).team,c=okay(S.createCup(cup('Beker van huidige editie',{teamIds:[team.id],approveEntries:true}))).cup;
  const edition=okay(w.HVEditions.create({label:'2027/28',startDate:'2027-08-01',endDate:'2028-07-31',finalDay:'2028-06-10',referenceDate:'2028-01-01',copyCups:false,copyEntries:false,copyPlayers:false})).edition;
  okay(w.HVEditions.activate(edition.id));assert(w.HVIdentity.club(club.id));assert(w.HVIdentity.team(team.id));assert.equal(w.HVCompetition.get(c.id),null);
  const next=okay(S.createCup(cup('Beker van huidige editie',{teamIds:[team.id]}))).cup;assert.equal(next.editionId,edition.id);assert.notEqual(next.id,c.id);assert.equal(w.HVRegistrations.getRoster(next.id,team.id).players.length,0);
  okay(w.HVEditions.activate('HV-ED-2026-27'));assert(w.HVCompetition.get(c.id));assert.equal(w.HVCompetition.get(next.id),null);assert(w.HVIdentity.team(team.id));
});
function run(){let failures=0;for(const [name,fn]of tests){try{fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}console.log((tests.length-failures)+'/'+tests.length+' v17 creation checks passed');process.exitCode=failures?1:0;}
if(require.main===module)run();module.exports={setup,run};
