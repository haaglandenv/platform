(() => {
  const store = window.HVDemo;
  const identity = window.HVIdentity;
  const fixtures = window.HVFixtures;
  if (!store || !identity || !fixtures) return;
  const primaryId = identity.fixture.id;
  const sides = ['home', 'away'];
  const labels = {goal:'Doelpunt','penalty-goal':'Benutte strafschop','own-goal':'Eigen doelpunt',yellow:'Gele kaart','second-yellow':'Tweede gele kaart',red:'Rode kaart',substitution:'Wissel',incident:'Bijzonderheid'};
  const goalTypes = new Set(['goal','penalty-goal','own-goal']);
  const firstNames = ['Milan','Noah','Daan','Sem','Lucas','Finn','Jesse','Mees','Ruben','Bram','Sven','Tijn','Lars','Jasper','Niels','Tim'];
  const lastNames = ['de Vries','Jansen','van Dijk','Bakker','Visser','Smit','Meijer','de Boer','Mulder','de Groot','Bos','Vos','Peters','Hendriks','van Leeuwen','Dekker'];
  const now = () => window.HVClock?.now?.()||new Date().toISOString();
  const saved = () => store.get('matchCenterEvents', []);
  const decisions = () => store.get('matchCenterDecisions', {});
  const baselines = () => store.get('matchCenterBase', {});
  const results = () => store.get('matchCenterResults', {});
  const game = id => fixtures.get(id);
  const fail = error => ({ok:false,error});
  const access=(action,scope)=>!window.HVAccess||window.HVAccess.can(action,scope)?{ok:true}:fail('Deze handeling valt buiten jouw actieve rol en wedstrijdtoewijzing.');
  let notifying = false;
  function notify(matchId) {
    if (notifying) return;
    notifying = true;
    try {
      if(matchId===primaryId&&!store.get('result',null)&&store.get('matchKickoff',null)){
        const live=overlayFor(primaryId),previous=store.get('live',{});
        if(live&&['homeScore','awayScore','minute'].some((key,index)=>live[key]!==previous[['home','away','minute'][index]])) store.set('live',{home:live.homeScore,away:live.awayScore,minute:live.minute});
      }
      identity.registerFixtures?.(fixtures.all());
      document.dispatchEvent(new CustomEvent('hv:match-events',{detail:{matchId}}));
      document.dispatchEvent(new CustomEvent('hv:fixtures',{detail:{matchId}}));
    } finally { notifying = false; }
  }
  function playerRows(teamId,cupId) {
    if(window.HVRegistrations)return window.HVRegistrations.playersForTeam(teamId,cupId);
    const team = identity.team(teamId);
    if (!team) return [];
    const primarySide = sides.find(side=>identity.fixture[side].teamId===team.id);
    if (primarySide && window.HVEligibility) {
      const roster = window.HVEligibility.getRoster(primarySide);
      const sheet = store.get('lineups',window.HVEligibility.seedLineups)?.[primarySide];
      return (roster?.players || []).map((person,index)=>{
        const entry = sheet?.players?.find(row=>row.id===person.id);
        return {...person,id:person.hvId||identity.playerId(person.id),legacyId:person.id,number:entry?.number||index+1,position:entry?.position||(index<11?'starter':'sub'),teamId:team.id,clubId:team.clubId,approved:roster.status==='submitted'};
      });
    }
    const suffix = team.id.split('-').at(-1);
    const year = suffix==='15'?2012:suffix==='23'?2005:2000;
    const offset = Number(team.clubId.slice(-3))%16;
    const names=suffix==='V1'?['Fleur','Noor','Sophie','Emma','Julia','Tess','Lotte','Sara','Evi','Lynn','Mila','Maud','Sanne','Nina','Roos','Jade']:firstNames;
    return Array.from({length:16},(_,i)=>({
      id:'HV-P-'+team.id.slice(5)+'-'+String(i+1).padStart(2,'0'),name:names[(i+offset)%16]+' '+lastNames[(i*3+offset)%16],number:i+1,position:i<11?'starter':'sub',teamId:team.id,clubId:team.clubId,
      birthDate:(year+i%2)+'-'+String(1+(i%10)).padStart(2,'0')+'-'+String(2+i).padStart(2,'0'),photo:'assets/demo-player-'+(1+(i+offset)%4)+'.webp',approved:true,
    }));
  }
  function players(matchId,side,fixtureContext) {
    const match = fixtureContext?.id===matchId?fixtureContext:game(matchId);
    if (!match || !sides.includes(side)) return [];
    if(window.HVRegistrations)return window.HVRegistrations.lineupPlayers(matchId,side,match);
    let rows = playerRows(match[side+'TeamId']);
    if (matchId===primaryId) {
      const roster=window.HVEligibility?.getRoster(side);
      const sheet=store.get('lineups',window.HVEligibility?.seedLineups)?.[side];
      if (roster?.status!=='submitted') return [];
      rows=rows.filter(row=>sheet?.players?.some(entry=>entry.id===row.legacyId&&['starter','sub'].includes(entry.position)));
    }
    const checks=matchId===primaryId?store.get('officialSession',{}).checks?.[side]:store.get('officialMatchSessions',{})[matchId]?.checks?.[side];
    return rows.map(row=>({...row,available:checks?.[row.legacyId||row.id]?.status!=='absent'&&checks?.[row.legacyId||row.id]!=='absent'}));
  }
  function makeEvent(match,values) {
    const side=values.side;
    const scoreSide=values.type==='own-goal'?(side==='home'?'away':'home'):side;
    return {matchId:match.id,teamId:match[side+'TeamId']||null,clubId:match[side+'ClubId']||null,scoreSide:goalTypes.has(values.type)?scoreSide:null,scoreTeamId:goalTypes.has(values.type)?match[scoreSide+'TeamId']||null:null,...values};
  }
  function seededEvents(match) {
    const base0=baselines()[match.id]||match;if(base0.replayed)return [];
    const base=base0.seedScores||base0;
    const isHistorical=match.status==='finished';
    const isLive=match.status==='live';
    const seededHistorical=match.seedStatus==='finished'&&!match.manual;
    const attributedSeed=!match.manual&&['finished','live'].includes(match.seedStatus);
    if(!isHistorical&&!isLive&&!results()[match.id])return [];
    const rows=[],regulationMinutes=(Number(match.ruleSnapshot?.rules?.halfMinutes)||Number(window.HVCompetition?.rulesForMatch(match)?.rules?.halfMinutes)||45)*2;
    for(const side of sides){
      const count=Math.max(0,Number(base[side+'Score'])||0), list=playerRows(match[side+'TeamId']);
      for(let index=0;index<count;index++){
        const person=attributedSeed?list[(index*3+(side==='home'?2:4))%Math.max(1,list.length)]:null;
        rows.push(makeEvent(match,{id:match.id+'-demo-goal-'+side+'-'+index,type:'goal',side,playerId:person?.id||null,playerName:person?.name||'Doelpuntenmaker niet vastgelegd',minute:attributedSeed?Math.min(regulationMinutes-2,12+index*19+(side==='away'?6:0)):90,note:attributedSeed?'Voorbeeldregistratie':'Eindstandregistratie · doelpuntenmaker en doelpuntminuut niet vastgelegd',source:'referee',status:'confirmed',createdAt:'2027-06-05T16:00:00.000Z',seeded:true}));
      }
      if(seededHistorical&&isHistorical&&list.length){
        const person=list[side==='home'?5:7];
        rows.push(makeEvent(match,{id:match.id+'-demo-yellow-'+side,type:'yellow',side,playerId:person.id,playerName:person.name,minute:Math.min(regulationMinutes-2,side==='home'?32:57),note:'Voorbeeldregistratie',source:'referee',status:'confirmed',seeded:true}));
        if(side==='home'&&[...match.id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%9===0){const sentOff=list[3];rows.push(makeEvent(match,{id:match.id+'-demo-red-'+side,type:'red',side,playerId:sentOff.id,playerName:sentOff.name,minute:Math.min(regulationMinutes-2,76),note:'Voorbeeldregistratie directe rode kaart',source:'referee',status:'confirmed',seeded:true}));}
        rows.push(makeEvent(match,{id:match.id+'-demo-sub-'+side,type:'substitution',side,playerId:list[8].id,playerName:list[8].name,relatedPlayerId:list[11].id,relatedPlayerName:list[11].name,minute:Math.min(regulationMinutes-2,side==='home'?61:68),note:'Voorbeeldwissel',source:'referee',status:'confirmed',seeded:true}));
      }
    }
    return rows;
  }
  function legacyEvents(match) {
    if(match.id!==primaryId)return [];
    return store.get('matchEvents',[]).map(row=>makeEvent(match,{...row,id:row.id||'legacy-'+row.createdAt,playerId:row.playerHvId||(row.playerId?identity.playerId(row.playerId):null),legacyPlayerId:row.playerId,playerName:row.playerName||row.name||window.HVEligibility?.player(row.side,row.playerId)?.name||'Niet toegewezen',note:row.description||row.note||'',source:'referee',status:row.voidedAt||row.active===false?'rejected':'confirmed'}));
  }
  function result(matchId) {
    const own=results()[matchId];
    if(own)return {...own};
    if(matchId!==primaryId)return null;
    const old=store.get('result',null);
    if(!old||old.status==='queued')return null;
    return {status:old.verdict==='cancelled'?'cancelled':old.verdict==='suspended'?'suspended':old.status==='official'?'finished':'review',homeScore:old.home??null,awayScore:old.away??null,minute:old.stoppedMinute??null,reason:old.note||old.reason||'',penHome:old.penHome??null,penAway:old.penAway??null,extraTimePlayed:old.extraTimePlayed===true,rulesVersion:old.rulesVersion,confirmedAt:old.publishedAt};
  }
  function events(matchId,fixtureContext,providedRules) {
    const match=fixtureContext?.id===matchId?fixtureContext:game(matchId);
    if(!match)return [];
    const archived=new Set(store.get('matchCenterArchives',{})[matchId]?.eventIds||[]);
    const old=legacyEvents(match).filter(row=>!archived.has(row.id)), own=saved().filter(row=>row.matchId===matchId&&!archived.has(row.id));
    const seed=(matchId===primaryId&&(old.length||own.length))?[]:seededEvents(match);
    const map=new Map([...seed,...old,...own].map(row=>[row.id,{...row,...decisions()[row.id]}]));
    let rows=[...map.values()];
    const final=result(matchId);
    if(final&&['finished','suspended'].includes(final.status)){
      rows=rows.map(row=>row.status==='provisional'?{...row,status:'confirmed'}:row);
      for(const side of sides){
        const target=Number(final[side+'Score'])||0;
        const goals=rows.filter(row=>row.status!=='rejected'&&goalTypes.has(row.type)&&row.scoreSide===side).sort((a,b)=>a.minute-b.minute);
        if(goals.length>target){const rejected=new Set(goals.slice(target).map(row=>row.id));rows=rows.map(row=>rejected.has(row.id)?{...row,status:'rejected',rejectionReason:'Niet bevestigd in de definitieve uitslag.'}:row);}
        for(let i=goals.length;i<target;i++)rows.push(makeEvent(match,{id:matchId+'-score-confirmed-'+side+'-'+i,type:'goal',side,playerId:null,playerName:'Doelpuntenmaker niet vastgelegd',minute:final.minute||90,note:'Door scheidsrechter bevestigde scorecorrectie',source:'referee',status:'confirmed',seeded:true}));
      }
    }
    const timing=matchTiming(match,rows,providedRules),sorted=sortEvents(rows,match,timing);return sorted.map(row=>({...row,elapsedMinute:timing.elapsed(row),observations:copy(store.get('matchCenterObservations',{})[row.id]||[])}));
  }
  function approvedForEvent(matchId,side) {
    if(window.HVRegistrations)return window.HVRegistrations.reviewState(matchId,side).status==='approved';
    if(matchId!==primaryId)return true;
    return window.HVEligibility?.reviewState(side).status==='approved'&&window.HVEligibility.hasKickedOff();
  }
  function rememberBase(match) {
    const bases=baselines();
    if(!bases[match.id])store.set('matchCenterBase',{...bases,[match.id]:{homeScore:match.homeScore||0,awayScore:match.awayScore||0,minute:match.minute||0,status:match.status}});
  }
  const copy=value=>JSON.parse(JSON.stringify(value));
  const phaseLabels={'not-started':'Voor de aftrap',first:'Eerste helft','half-time':'Rust',second:'Tweede helft','full-time':'Reguliere speeltijd afgelopen','extra-first':'Eerste helft verlenging','extra-break':'Pauze verlenging','extra-second':'Tweede helft verlenging',shootout:'Strafschoppenserie',finished:'Wedstrijd afgelopen'};
  const playingPhases=new Set(['first','second','extra-first','extra-second']);
  const phases=['not-started','first','half-time','second','full-time','extra-first','extra-break','extra-second','shootout','finished'];
  const clockRows=()=>store.get('matchClocks',{});
  function phaseRange(match,phase){const rules=match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules||{},half=Number(rules.halfMinutes)||45,extra=Number(rules.extraHalfMinutes)||15;return phase==='second'?{base:half,length:half}:phase==='extra-first'?{base:half*2,length:extra}:phase==='extra-second'?{base:half*2+extra,length:extra}:{base:0,length:half};}
  function clock(matchId,fixtureContext){const match=fixtureContext?.id===matchId?fixtureContext:game(matchId);if(!match)return null;let value=clockRows()[matchId];if(!value){const minute=Number(match.minute)||0,half=Number((match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules)?.halfMinutes)||45,phase=match.status==='finished'?'finished':match.status==='scheduled'?'not-started':minute>half?'second':'first',range=phaseRange(match,phase);value={phase,elapsedSeconds:Math.max(0,minute-range.base)*60,running:false,history:[],seeded:true};}const elapsedSeconds=Math.max(0,Number(value.elapsedSeconds)||0)+(value.running&&value.runningSince?Math.max(0,(Date.now()-(value.runningSinceMs||Date.parse(value.runningSince)))/1000):0),ended=Object.hasOwn(value.completedPhases||{},'extra-second')?'extra-second':'second',displayPhase=playingPhases.has(value.phase)?value.phase:({'half-time':'first','full-time':'second','extra-break':'extra-first',shootout:ended,finished:ended})[value.phase]||'first',range=phaseRange(match,displayPhase),displaySeconds=playingPhases.has(value.phase)?elapsedSeconds:value.phase==='not-started'?0:Math.max(range.length*60,Number(value.completedPhases?.[displayPhase])||0),within=Math.floor(displaySeconds/60),normal=range.base+Math.min(within,range.length),added=Math.max(0,within-range.length);return {...copy(value),elapsedSeconds:Math.floor(elapsedSeconds),phaseLabel:phaseLabels[value.phase]||value.phase,minute:value.phase==='not-started'?0:normal,addedMinutes:added,minuteDisplay:value.phase==='not-started'?'0':String(normal)+(added?'+'+added:''),durationMinutes:range.length,baseMinute:range.base};}
  function storeClock(matchId,value,action,reason=''){const before=clockRows()[matchId]||null,next={...value,updatedAt:now(),history:[...(value.history||[]),{action,phase:value.phase,elapsedSeconds:value.elapsedSeconds,at:now(),reason:String(reason)}]};store.set('matchClocks',{...clockRows(),[matchId]:next});window.HVWorkflow?.audit?.('MATCH_CLOCK_'+action.toUpperCase(),matchId,before,next,reason);document.dispatchEvent(new CustomEvent('hv:clock',{detail:{matchId}}));notify(matchId);return {ok:true,clock:clock(matchId)};}
  function clockCommand(matchId,action,input={}){const permission=access('official.control',{matchId});if(!permission.ok)return permission;const match=game(matchId),value=clock(matchId);if(!match||!value)return fail('Wedstrijd niet gevonden.');const checked=window.HVWorkflow?.guard?.(match.tournamentId);if(checked&&!checked.ok)return checked;if(result(matchId))return fail('Het wedstrijdbeeld is definitief vastgelegd.');if(!secondarySession(match).confirmed&&!window.HVOperations?.assignment?.(matchId)?.confirmed)return fail('Bevestig eerst je aanstelling.');if(match.status!=='live')return fail('Registreer eerst de aftrap of laat een onderbroken wedstrijd hervatten.');const next={...value,elapsedSeconds:value.elapsedSeconds,runningSince:null,running:false};delete next.phaseLabel;delete next.minuteDisplay;delete next.durationMinutes;delete next.baseMinute;delete next.minute;delete next.addedMinutes;if(action==='pause'){if(!value.running)return fail('De klok staat al stil.');return storeClock(matchId,next,'pause',input.reason||'Klok gepauzeerd door scheidsrechter');}if(action==='resume'){if(value.running||!playingPhases.has(value.phase))return fail('Start de volgende speelhelft of hervat een gepauzeerde speelklok.');return storeClock(matchId,{...next,running:true,runningSince:now(),runningSinceMs:Date.now()},'resume',input.reason||'Speelklok hervat');}if(action==='correct'){if(String(input.reason||'').trim().length<5)return fail('Licht de klokcorrectie toe.');const seconds=Number(input.elapsedSeconds);if(!Number.isInteger(seconds)||seconds<0||seconds>7200)return fail('Vul een geldige verstreken tijd voor deze helft in.');return storeClock(matchId,{...next,elapsedSeconds:seconds,running:value.running,runningSince:value.running?now():null,runningSinceMs:value.running?Date.now():null},'correct',input.reason);}if(action!=='phase'||!phases.includes(input.phase))return fail('Kies een geldige klokhandeling.');const rules=match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules||{},tied=Number(match.homeScore)===Number(match.awayScore),allowed={first:['half-time'],'half-time':['second'],second:['full-time'],'full-time':tied?[...(rules.extraTime?['extra-first']:[]),...(!rules.extraTime&&rules.penalties?['shootout']:[])]:['finished'],'extra-first':['extra-break'],'extra-break':['extra-second'],'extra-second':tied&&rules.penalties?['shootout']:['finished'],shootout:['finished']};if(!(allowed[value.phase]||[]).includes(input.phase))return fail('Deze fase volgt niet op de huidige wedstrijdfase volgens het reglement.');if(input.phase==='finished'&&value.phase==='shootout'&&!shootout(matchId).complete)return fail('Rond eerst de beslissende strafschoppenserie af.');return storeClock(matchId,{...next,completedPhases:{...(value.completedPhases||{}),...(playingPhases.has(value.phase)?{[value.phase]:value.elapsedSeconds}:{})},phase:input.phase,elapsedSeconds:0,running:playingPhases.has(input.phase),runningSince:playingPhases.has(input.phase)?now():null,runningSinceMs:playingPhases.has(input.phase)?Date.now():null},'phase',phaseLabels[input.phase]);}
  function eventTime(input,match){const text=String(input.minute??'').trim(),parsed=/^(\d{1,3})(?:\+(\d{1,2}))?$/.exec(text),minute=parsed?Number(parsed[1]):NaN,addedMinutes=input.addedMinutes==null?(parsed?.[2]?Number(parsed[2]):0):Number(input.addedMinutes),half=Number((match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules)?.halfMinutes)||45,extra=Number((match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules)?.extraHalfMinutes)||15;const phase=input.phase|| (minute<=half?'first':minute<=half*2?'second':minute<=half*2+extra?'extra-first':'extra-second');if(phase.startsWith('extra-')&&!(match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules)?.extraTime)return fail('Dit reglement kent geen verlenging. Gebruik de toegevoegde tijd van de juiste speelhelft.');if(!Number.isInteger(minute)||minute<0||minute>150||!Number.isInteger(addedMinutes)||addedMinutes<0||addedMinutes>30||!playingPhases.has(phase))return fail('Gebruik een geldige speelminuut en toegevoegde tijd.');const range=phaseRange(match,phase);if(input.phase&&(minute<range.base||minute>range.base+range.length))return fail('De minuut valt buiten de gekozen speelhelft.');if(addedMinutes&&minute!==range.base+range.length)return fail('Toegevoegde tijd hoort bij de laatste minuut van de speelhelft.');return {ok:true,minute,addedMinutes,phase,minuteDisplay:String(minute)+(addedMinutes?'+'+addedMinutes:''),sequenceMinute:minute+addedMinutes};}
  function matchTiming(match,rows=[],providedRules){const rules=providedRules||match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules||{},half=Number(rules.halfMinutes)||45,extra=Number(rules.extraHalfMinutes)||15,order=['first','second','extra-first','extra-second'],base=[0,half,half*2,half*2+extra],length=[half,half,extra,extra],infer=minute=>Number(minute)<=half?'first':Number(minute)<=half*2?'second':Number(minute)<=half*2+extra?'extra-first':'extra-second',index=row=>Math.max(0,order.indexOf(row.phase||infer(row.minute))),added=[0,0,0,0],completed=clockRows()[match.id]?.completedPhases||{};for(const row of rows)added[index(row)]=Math.max(added[index(row)],Number(row.addedMinutes)||0);for(const [phase,seconds]of Object.entries(completed)){const i=order.indexOf(phase);if(i>=0)added[i]=Math.max(added[i],Math.max(0,Math.floor(Number(seconds)/60)-length[i]));}const elapsed=row=>Math.max(0,(Number(row.minute)||0)+(Number(row.addedMinutes)||0)+added.slice(0,index(row)).reduce((a,b)=>a+b,0)),sortKey=row=>index(row)*1000+(Number(row.minute)||0)+(Number(row.addedMinutes)||0),extraPlayed=match.extraTimePlayed===true||['extra-first','extra-break','extra-second'].includes(clockRows()[match.id]?.phase)||Object.keys(completed).some(p=>p.startsWith('extra-')),duration=half*2+(extraPlayed?extra*2:0)+added.slice(0,extraPlayed?4:2).reduce((a,b)=>a+b,0);return {elapsed,sortKey,duration,infer,added};}
  function sortEvents(rows,match,timing=matchTiming(match,rows)){return rows.slice().sort((a,b)=>timing.sortKey(a)-timing.sortKey(b)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));}
  function playerTimeline(matchId,side,options={}){const match=options.fixtureContext?.id===matchId?options.fixtureContext:game(matchId);if(!match)return [];const allRows=options.events||events(matchId,match),timing=matchTiming(match,allRows,options.rules),duration=Math.max(0,Number(options.duration??result(matchId)?.playingMinutes)||timing.duration),limit=Number.isFinite(options.minute)?{minute:Math.max(0,options.minute),...(options.phase?{phase:options.phase}:{}),addedMinutes:Number(options.addedMinutes)||0}:null,at=limit?timing.elapsed(limit):duration,cutoff=limit?timing.sortKey(limit):Infinity,raw=players(matchId,side,match);const map=new Map(raw.map(person=>{const p={...person,available:person.available!==false&&(!person.lateArrival||Number(person.lateArrival.minute)<=Number(options.minute??Infinity))};return [p.id,{...p,playerId:p.id,position:p.position,started:p.position==='starter'&&p.available!==false,appeared:p.position==='starter'&&p.available!==false,state:p.available===false?'absent':p.position==='starter'?'field':'bench',onField:p.position==='starter'&&p.available!==false,sentOff:false,intervals:[],from:p.position==='starter'&&p.available!==false?0:null}];}));const rows=sortEvents(allRows.filter(e=>e.side===side&&e.status!=='rejected'&&(!options.confirmedOnly||e.status==='confirmed')&&timing.sortKey(e)<=cutoff),match,timing);for(const event of rows){const minute=Math.min(at,timing.elapsed(event)),out=map.get(event.playerId),incoming=map.get(event.relatedPlayerId);if(event.type==='substitution'){if(out?.onField){out.intervals.push({from:out.from,to:minute});out.from=null;out.onField=false;out.state='substituted';}if(incoming&&!incoming.sentOff&&incoming.available!==false){incoming.from=minute;incoming.onField=true;incoming.state='field';incoming.appeared=true;}}if(['red','second-yellow'].includes(event.type)&&out){if(out.onField)out.intervals.push({from:out.from,to:minute});out.from=null;out.onField=false;out.sentOff=true;out.state='sent-off';}}return [...map.values()].map(p=>{const intervals=[...p.intervals,...(p.onField&&p.from!=null?[{from:p.from,to:at}]:[])].filter(row=>row.to>=row.from);delete p.from;return {...p,intervals,minutes:intervals.reduce((n,row)=>n+Math.max(0,row.to-row.from),0)};});}
  function playerIntervals(matchId,side,options={}){return playerTimeline(matchId,side,options);}
  function playerStates(matchId,side,minute=Infinity,options={}){if(typeof side==='number'){options=typeof minute==='object'?minute:{};minute=side;side=null;}const choose=sides.includes(side)?[side]:sides;return choose.flatMap(value=>playerTimeline(matchId,value,{...options,minute}));}
  function validateChronology(match,entry,exceptIds=[]){const rules=match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules||{},all=sortEvents([...events(match.id,match).filter(e=>e.side===entry.side&&e.status!=='rejected'&&!exceptIds.includes(e.id)),entry],match),list=players(match.id,entry.side,match),active=new Set(list.filter(p=>p.position==='starter'&&p.available!==false).map(p=>p.id)),sentOff=new Set(),wentOff=new Set();for(const row of all){if(row.type==='substitution'){if(sentOff.has(row.relatedPlayerId))return fail('Een definitief uitgesloten speler mag niet terugkeren.');if(!active.has(row.playerId)||active.has(row.relatedPlayerId))return fail('De wissel past niet in het chronologische wedstrijdverloop. Controleer eerdere en latere registraties.');const incoming=list.find(p=>p.id===row.relatedPlayerId);if(incoming?.lateArrival&&Number(incoming.lateArrival.minute)>Number(row.sequenceMinute??row.minute))return fail('Deze speler was op het moment van de wissel nog niet toegelaten.');if(rules.substitutionMode==='limited'&&wentOff.has(row.relatedPlayerId))return fail('Een gewisselde speler mag volgens dit reglement niet opnieuw invallen.');active.delete(row.playerId);wentOff.add(row.playerId);active.add(row.relatedPlayerId);}else if(goalTypes.has(row.type)&&row.playerId&&!active.has(row.playerId))return fail('De doelpuntenmaker stond op dit moment niet op het veld of was uitgesloten.');if(['red','second-yellow'].includes(row.type)){active.delete(row.playerId);sentOff.add(row.playerId);}}return {ok:true};}
  function observationFingerprint(input){const parts=String(input.minute).split('+');return JSON.stringify([input.matchId,input.side,input.type,input.playerId||'',input.relatedPlayerId||'',Number(parts[0]),Number(input.addedMinutes??parts[1])||0]);}
  function sameObservation(row,input,match){const a=eventTime(row,match),b=eventTime(input,match);return a.ok&&b.ok&&row.side===input.side&&row.type===input.type&&(row.playerId||'')===(input.playerId||'')&&(row.relatedPlayerId||'')===(input.relatedPlayerId||'')&&a.phase===b.phase&&Math.abs((a.minute+a.addedMinutes)-(b.minute+b.addedMinutes))<=1&&(row.type!=='incident'||String(row.note||'').trim().toLowerCase()===String(input.note||'').trim().toLowerCase());}
  function possibleDuplicate(matchId,input){const match=game(matchId);return match&&events(matchId,match).find(row=>row.status!=='rejected'&&sameObservation(row,input,match));}
  function linkObservation(matchId,eventId,input,actor={}){const permission=access(actor.role==='team'?'match.event':'official.control',{matchId,teamId:actor.teamId});if(!permission.ok)return permission;const match=game(matchId),row=events(matchId).find(e=>e.id===eventId);if(!match||!row||row.status==='rejected'||result(matchId))return fail('Deze gebeurtenis kan niet meer worden gekoppeld.');if(!['referee','team'].includes(actor.role)||actor.role==='team'&&(actor.side!==row.side||actor.teamId&&actor.teamId!==match[row.side+'TeamId']))return fail('Koppel alleen een eigen teammelding of een scheidsrechterswaarneming.');const moment=eventTime(input,match);if(!moment.ok)return moment;if(!sameObservation(row,{...input,...moment,matchId},match))return fail('Deze waarneming hoort niet bij dezelfde gebeurtenis.');if(actor.role==='referee'){const chronological=validateChronology(match,{...row,...moment},[row.id]);if(!chronological.ok)return chronological;}const observations=store.get('matchCenterObservations',{}),observation={id:'HV-OBS-'+crypto.randomUUID().toUpperCase(),source:actor.role==='team'?'team-'+row.side:'referee',at:now(),note:String(input.note||'').slice(0,600),minute:moment.minute,addedMinutes:moment.addedMinutes,phase:moment.phase,minuteDisplay:moment.minuteDisplay,commandId:input.commandId||input.requestId||null},previous=observations[eventId]||[];if(observation.commandId&&previous.some(item=>item.commandId===observation.commandId))return {ok:true,event:row,idempotent:true};store.set('matchCenterObservations',{...observations,[eventId]:[...previous,observation]});if(actor.role==='referee'){const next={...decisions(),[eventId]:{...decisions()[eventId],...moment,status:'confirmed',reviewedBy:'referee',reviewedAt:now()}};store.set('matchCenterDecisions',next);}notify(matchId);return {ok:true,event:events(matchId).find(e=>e.id===eventId),linked:true};}
  const shots=()=>store.get('matchShootouts',{});
  function shootout(matchId){const rows=copy(shots()[matchId]?.shots||[]).filter(row=>!row.voided),score={home:0,away:0},taken={home:0,away:0};for(const row of rows){taken[row.side]++;if(row.scored)score[row.side]++;}let complete=false,winnerSide=null;if(taken.home<=5&&taken.away<=5){if(score.home>score.away+Math.max(0,5-taken.away)){complete=true;winnerSide='home';}if(score.away>score.home+Math.max(0,5-taken.home)){complete=true;winnerSide='away';}}if(taken.home>=5&&taken.away>=5&&taken.home===taken.away&&score.home!==score.away){complete=true;winnerSide=score.home>score.away?'home':'away';}const eligible=shots()[matchId]?.eligible||Object.fromEntries(sides.map(side=>[side,playerStates(matchId,side).filter(p=>p.onField&&!p.sentOff&&p.available!==false).map(p=>p.id)]));return {eligible,shots:rows,history:copy(shots()[matchId]?.history||[]),homeScore:score.home,awayScore:score.away,taken,complete,winnerSide,nextSide:rows.length?(rows.at(-1).side==='home'?'away':'home'):(shots()[matchId]?.firstSide||'home')};}
  function setShootoutEligible(matchId,homeIds,awayIds,reason){const permission=access('official.control',{matchId});if(!permission.ok)return permission;const checked=window.HVWorkflow?.guard?.(game(matchId)?.tournamentId);if(checked&&!checked.ok)return checked;if(clock(matchId)?.phase!=='shootout'||shootout(matchId).shots.length||result(matchId))return fail('Stel de nemers vóór de eerste strafschop vast.');if(String(reason||'').trim().length<5)return fail('Licht de selectie van strafschopnemers toe.');const selected={home:homeIds,away:awayIds};if(!Array.isArray(homeIds)||!Array.isArray(awayIds)||!homeIds.length||homeIds.length!==awayIds.length||sides.some(side=>new Set(selected[side]).size!==selected[side].length||selected[side].some(id=>!playerStates(matchId,side).some(p=>p.id===id&&p.onField&&!p.sentOff&&p.available!==false))))return fail('Kies voor beide teams evenveel verschillende, aanwezige veldspelers die niet zijn uitgesloten.');const all=shots(),before=all[matchId]||{shots:[],history:[]};store.set('matchShootouts',{...all,[matchId]:{...before,eligible:copy(selected),history:[...before.history,{action:'eligible-players',at:now(),reason:String(reason),eligible:copy(selected)}]}});return {ok:true,shootout:shootout(matchId)};}
  function addShootoutKick(matchId,input={}){const permission=access('official.control',{matchId});if(!permission.ok)return permission;const match=game(matchId),checked=window.HVWorkflow?.guard?.(match?.tournamentId);if(checked&&!checked.ok)return checked;const value=clock(matchId),series=shootout(matchId);if(!match||value?.phase!=='shootout'||result(matchId))return fail('Open eerst de strafschoppenserie na de speelhelften.');if(series.complete)return fail('De strafschoppenserie is beslist.');if(!sides.includes(input.side)||series.shots.length&&input.side!==series.nextSide)return fail('Houd de beurtvolgorde van de strafschoppenserie aan.');if(typeof input.scored!=='boolean')return fail('Kies raak of mis.');const person=players(matchId,input.side,match).find(p=>p.id===input.playerId),state=playerStates(matchId,input.side).find(p=>p.id===input.playerId);if(!person||person.available===false||state?.sentOff||!series.eligible[input.side]?.includes(person.id))return fail('Kies een toegelaten veldspeler uit de vastgelegde nemerslijst.');if(series.eligible.home.length!==series.eligible.away.length)return fail('Leg vóór de eerste strafschop voor beide teams een even grote nemerslijst vast.');const eligible=players(matchId,input.side,match).filter(p=>series.eligible[input.side].includes(p.id)),own=series.shots.filter(p=>p.side===input.side),cycle=Math.floor(own.length/Math.max(1,eligible.length)),used=own.slice(cycle*eligible.length);if(used.some(row=>row.playerId===person.id))return fail('Laat eerst iedere beschikbare speler een strafschop nemen voordat iemand opnieuw neemt.');const all=shots(),before=all[matchId]||{shots:[],history:[]},row={id:'HV-PEN-'+crypto.randomUUID().toUpperCase(),side:input.side,playerId:person.id,playerName:person.name,scored:input.scored,at:now()};store.set('matchShootouts',{...all,[matchId]:{...before,firstSide:before.firstSide||input.side,eligible:series.eligible,shots:[...before.shots,row],history:[...before.history,{action:'kick',at:now(),shotId:row.id,side:row.side,scored:row.scored}]}});document.dispatchEvent(new CustomEvent('hv:clock',{detail:{matchId}}));return {ok:true,shot:row,shootout:shootout(matchId)};}
  function undoShootoutKick(matchId,reason){const permission=access('official.control',{matchId});if(!permission.ok)return permission;const checked=window.HVWorkflow?.guard?.(game(matchId)?.tournamentId);if(checked&&!checked.ok)return checked;if(result(matchId)||String(reason||'').trim().length<5)return fail('Een correctie vereist een reden en een open wedstrijdbeeld.');const all=shots(),before=all[matchId],last=before?.shots.filter(row=>!row.voided).at(-1);if(!last)return fail('Er staat geen strafschop klaar om te corrigeren.');store.set('matchShootouts',{...all,[matchId]:{...before,shots:before.shots.map(row=>row.id===last.id?{...row,voided:true,voidReason:String(reason),voidedAt:now()}:row),history:[...before.history,{action:'kick-corrected',at:now(),shotId:last.id,reason:String(reason)}]}});return {ok:true,shootout:shootout(matchId)};}
  function addEvent(input,actor={}) {
    const match=game(input?.matchId);
    if(!match)return fail('Kies een bestaande wedstrijd.');
    const permission=access(actor.role==='team'?'match.event':'official.control',{matchId:match.id,teamId:actor.role==='team'?match[input.side+'TeamId']:undefined});if(!permission.ok)return permission;
    const gate=window.HVWorkflow?.guard?.(match.tournamentId);if(gate&&!gate.ok)return gate;
    const commandId=input.commandId||input.requestId||null,previous=commandId?saved().find(row=>row.matchId===match.id&&row.commandId===commandId):null;if(previous)return observationFingerprint(previous)===observationFingerprint(input)?{ok:true,event:events(match.id).find(row=>row.id===previous.id),idempotent:true}:fail('Dit verzoeknummer is al voor een andere gebeurtenis gebruikt.');
    if(result(match.id)||['finished','cancelled','suspended','review'].includes(match.status))return fail('Deze wedstrijd staat niet open voor live invoer.');
    if(match.status!=='live')return fail('De wedstrijd moet eerst zijn gestart.');
    if(!['team','referee'].includes(actor.role))return fail('Open de invoer vanuit de team- of scheidsrechteromgeving.');
    if(!sides.includes(input.side))return fail('Kies het betrokken team.');
    if(actor.role==='team'&&(actor.side!==input.side||(actor.teamId&&actor.teamId!==match[input.side+'TeamId'])))return fail('Je kunt alleen gebeurtenissen voor je eigen spelende team vastleggen.');
    if(!Object.hasOwn(labels,input.type))return fail('Kies een geldige gebeurtenis.');
    const moment=eventTime(input,match);if(!moment.ok)return moment;const minute=moment.minute;
    const duplicate=possibleDuplicate(match.id,{...input,...moment});if(duplicate&&!input.allowSeparate)return {ok:false,duplicate:true,existingEventId:duplicate.id,existingEvent:duplicate,error:'Deze gebeurtenis lijkt al geregistreerd. Koppel jouw waarneming of leg gemotiveerd vast dat dit een ander moment is.'};if(duplicate&&input.allowSeparate&&(actor.role!=='referee'||String(input.separateReason||'').trim().length<5))return fail('Alleen de scheidsrechter kan met een reden twee verschillende gebeurtenissen op hetzelfde moment vastleggen.');
    if(!approvedForEvent(match.id,input.side))return fail('De spelersopgave moet zijn goedgekeurd en de aftrap bevestigd.');
    const list=players(match.id,input.side), person=list.find(row=>row.id===input.playerId), incoming=list.find(row=>row.id===input.relatedPlayerId);
    if(input.type!=='incident'&&(!person||person.available===false))return fail('Kies een aanwezige, goedgekeurde speler uit de wedstrijdopgave.');
    if(!window.HVRegistrations&&match.id===primaryId&&person){const sheet=store.get('lineups',window.HVEligibility.seedLineups)[input.side];const entry=sheet.players.find(row=>row.id===person.legacyId);const check=store.get('officialSession',{}).checks?.[input.side]?.[person.legacyId];if(store.playerCheckStatus(entry,sheet,check)!=='seen')return fail('Deze speler is nog niet als aanwezig gecontroleerd.');}
    if(input.type==='substitution'&&(!incoming||incoming.available===false||incoming.id===person.id))return fail('Kies twee verschillende aanwezige spelers voor de wissel.');
    if(input.type==='substitution'){const rules=window.HVCompetition.rulesForMatch(match)?.rules||{},used=events(match.id).filter(row=>row.side===input.side&&row.type==='substitution'&&row.status!=='rejected').length;if(rules.substitutionMode==='limited'&&used>=Number(rules.maxSubstitutions??5))return fail('Het maximale aantal wissels volgens dit wedstrijdreglement is bereikt.');}
    const chronological=validateChronology(match,{...input,...moment,createdAt:now()});if(!chronological.ok)return chronological;
    const note=String(input.note||'').trim();
    if(note.length>600)return fail('Gebruik maximaal 600 tekens voor de toelichting.');
    if(input.type==='incident'&&!note)return fail('Beschrijf de bijzonderheid.');
    rememberBase(match);
    const row=makeEvent(match,{id:'HV-E-'+crypto.randomUUID().toUpperCase(),type:input.type,side:input.side,playerId:person?.id||null,playerName:person?.name||'',relatedPlayerId:incoming?.id||null,relatedPlayerName:incoming?.name||'',...moment,minute,note,commandId,separateReason:duplicate?String(input.separateReason||''):null,source:actor.role==='team'?'team-'+input.side:'referee',status:actor.role==='team'?'provisional':'confirmed',createdAt:now(),audit:[{action:'created',by:actor.role,at:now()}]});
    store.set('matchCenterEvents',[...saved(),row]);notify(match.id);return {ok:true,event:{...row}};
  }
  function decision(matchId,eventId,status,reason='') {
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    if(result(matchId))return fail('Het wedstrijdbeeld is al bevestigd.');
    const row=events(matchId).find(event=>event.id===eventId);
    if(!row)return fail('Deze gebeurtenis is niet gevonden.');
    if(status==='rejected'&&!String(reason).trim())return fail('Vermeld waarom je deze gebeurtenis afwijst.');
    if(status==='rejected'){const chronological=validateChronology(game(matchId),{side:row.side,type:'validation',minute:0},[eventId]);if(!chronological.ok)return fail('Deze correctie maakt een latere registratie ongeldig. Beoordeel eerst die latere gebeurtenis.');}
    const change={status,rejectionReason:status==='rejected'?String(reason).trim():'',reviewedBy:'referee',reviewedAt:now()};
    store.set('matchCenterDecisions',{...decisions(),[eventId]:change});notify(matchId);return {ok:true,event:{...row,...change}};
  }
  function confirmAll(matchId) {
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    const next={...decisions()};
    events(matchId).filter(row=>row.status==='provisional').forEach(row=>{next[row.id]={status:'confirmed',reviewedBy:'referee',reviewedAt:now()};});
    store.set('matchCenterDecisions',next);notify(matchId);return {ok:true};
  }
  function secondarySession(match) {
    const explicit=store.get('officialMatchSessions',{})[match.id];
    return explicit || (match.status==='live'?{confirmed:true,approved:{home:true,away:true}}:{confirmed:false,approved:{}});
  }
  function startMatch(matchId) {
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    const match=game(matchId);
    if(!match)return fail('Wedstrijd niet gevonden.');
    const guard=window.HVWorkflow?.guard?.(match.tournamentId);if(guard&&!guard.ok)return guard;
    if(matchId===primaryId&&!window.HVRegistrations)return window.HVEligibility.startMatch();
    if(match.status==='live'){window.HVCompetition.freezeMatchRules(match);return {ok:true};}
    if(match.status!=='scheduled'||result(matchId))return fail('Deze wedstrijd kan niet meer worden gestart.');
    if(!match.homeTeamId||!match.awayTeamId||!players(matchId,'home').length||!players(matchId,'away').length)return fail('Beide teams en spelersopgaven moeten bekend zijn.');
    const session=secondarySession(match);
    if(window.HVRegistrations){const ready=window.HVRegistrations.canStart(match);if(!ready.ok)return ready;if(!(window.HVOperations?.assignment?.(matchId)?.confirmed||session.confirmed))return fail('Bevestig eerst je aanstelling.');const locked=window.HVRegistrations.freezeLineups(matchId);if(!locked.ok)return locked;}
    else if(!session.confirmed||!session.approved?.home||!session.approved?.away)return fail('Bevestig de aanstelling en keur beide spelersopgaven goed.');
    window.HVCases?.clearOverlay?.(matchId);
    window.HVCompetition.freezeMatchRules(match);
    const matchBase={homeScore:0,awayScore:0,minute:0,status:'live'};
    store.set('matchCenterBase',{...baselines(),[matchId]:matchBase});
    storeClock(matchId,{phase:'first',elapsedSeconds:0,running:true,runningSince:now(),runningSinceMs:Date.now(),history:[]},'start','Aftrap geregistreerd');
    if(matchId===primaryId)store.setMany({matchKickoff:{at:now(),matchId},live:{home:0,away:0,minute:0}});
    window.HVWorkflow?.audit?.('MATCH_STARTED',matchId,null,matchBase,'Aftrap door scheidsrechter');notify(matchId);return {ok:true};
  }
  function finalize(matchId,input) {
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    const match=game(matchId);
    if(!match)return fail('Wedstrijd niet gevonden.');
    const guard=window.HVWorkflow?.guard?.(match.tournamentId);if(guard&&!guard.ok)return guard;
    if(result(matchId))return fail('De scheidsrechter heeft deze wedstrijd al afgerond.');
    if(!['finished','cancelled','suspended'].includes(input?.status))return fail('Kies een geldige wedstrijdstatus.');
    const session=secondarySession(match);
    if(window.HVRegistrations){if(!(window.HVOperations?.assignment?.(matchId)?.confirmed||session.confirmed))return fail('Bevestig eerst je aanstelling voor deze wedstrijd.');if(input.status==='finished'&&!window.HVRegistrations.canStart(match).ok)return fail('Keur eerst beide geldige spelersopgaven goed.');}
    else if(matchId===primaryId){if(!window.HVEligibility?.canReferee())return fail('Bevestig eerst je aanstelling.');if(input.status==='finished'&&!window.HVEligibility.isReady())return fail('Keur eerst beide spelersopgaven goed.');}
    else if(!session.confirmed)return fail('Bevestig eerst je aanstelling voor deze wedstrijd.');
    else if(input.status==='finished'&&(!session.approved?.home||!session.approved?.away))return fail('Keur eerst beide spelersopgaven goed.');
    if(input.status==='finished'&&match.status!=='live')return fail('Registreer eerst de aftrap.');
    if(input.status==='cancelled'&&match.status==='live')return fail('Gebruik Gestaakt voor een wedstrijd die al is gestart.');
    const reason=String(input.reason||'').trim();
    if(input.playingMinutes!=null&&(!Number.isInteger(Number(input.playingMinutes))||Number(input.playingMinutes)<1||Number(input.playingMinutes)>240))return fail('Vul een geldige werkelijke speelduur van 1 tot en met 240 minuten in.');
    if(reason.length>600)return fail('Gebruik maximaal 600 tekens voor de toelichting.');
    if(input.status!=='finished'&&!reason)return fail('Vermeld de reden van afgelasting of staking.');
    if(input.status==='suspended'&&match.status!=='live')return fail('Alleen een lopende wedstrijd kan worden gestaakt.');
    const homeScore=Number(input.homeScore),awayScore=Number(input.awayScore),minute=Number(input.minute);
    if(input.status!=='cancelled'&&(!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||homeScore<0||awayScore<0||homeScore>99||awayScore>99))return fail('Vul een geldige stand in.');
    if(input.status==='suspended'&&(!Number.isInteger(minute)||minute<0||minute>150))return fail('Vul de minuut van staking in.');
    const series=shootout(matchId);if(input.status==='finished'&&series.shots.length&&!series.complete)return fail('De geregistreerde strafschoppenserie is nog niet beslist.');
    const penHome=series.shots.length?series.homeScore:input.penHome===''||input.penHome==null?null:Number(input.penHome),penAway=series.shots.length?series.awayScore:input.penAway===''||input.penAway==null?null:Number(input.penAway);
    const actualExtraTime=input.extraTimePlayed===true||['extra-first','extra-break','extra-second'].includes(clockRows()[matchId]?.phase)||Object.keys(clockRows()[matchId]?.completedPhases||{}).some(phase=>phase.startsWith('extra-'));
    const validation=window.HVCompetition.validateResult(match,{...input,extraTimePlayed:actualExtraTime,homeScore,awayScore,penHome,penAway});
    if(!validation.ok)return validation;
    if(input.status==='finished'&&input.eventsComplete===true){const rows=events(matchId);if(rows.some(row=>row.status==='provisional'))return fail('Controleer alle voorlopige gebeurtenissen voordat je het wedstrijdverloop als volledig bevestigt.');for(const side of sides){const goals=rows.filter(row=>row.status==='confirmed'&&goalTypes.has(row.type)&&row.scoreSide===side);if(goals.length!==Number(side==='home'?homeScore:awayScore)||goals.some(row=>!row.playerId))return fail('Een volledig wedstrijdverloop vraagt een passende doelpuntenregistratie met doelpuntenmakers. Corrigeer de invoer of bevestig alleen de uitslag.');}}
    const winner=validation.winnerSide;
    const frozen=window.HVCompetition.freezeMatchRules(match);
    const timing=matchTiming(match,events(matchId));const final={matchId,status:input.status,playingMinutes:input.status==='finished'?Number(input.playingMinutes)||timing.duration:null,eventsComplete:input.status==='finished'&&input.eventsComplete===true,dataCompleteness:input.status==='finished'&&input.eventsComplete===true?'complete':'score-only',homeScore:input.status==='cancelled'?null:homeScore,awayScore:input.status==='cancelled'?null:awayScore,minute:input.status==='suspended'?minute:null,reason,penHome,penAway,extraTimePlayed:actualExtraTime,rulesVersion:frozen.version,winnerTeamId:winner?match[winner+'TeamId']:null,confirmedAt:now(),confirmedBy:'Scheidsrechter'};
    const c=clock(matchId);if(c)store.set('matchClocks',{...clockRows(),[matchId]:{...c,phase:input.status==='finished'?'finished':c.phase,running:false,runningSince:null,elapsedSeconds:c.elapsedSeconds}});
    confirmAll(matchId);
    store.set('matchCenterResults',{...results(),[matchId]:final});
    if(matchId===primaryId){
      const canonical=identity.fixture;
      store.set('result',{...identity.fixtureFields(canonical),status:input.status==='finished'?'official':'review',verdict:input.status==='finished'?'played':input.status,home:final.homeScore,away:final.awayScore,stoppedMinute:final.minute,note:reason,penHome,penAway,extraTimePlayed:final.extraTimePlayed,playingMinutes:final.playingMinutes,eventsComplete:final.eventsComplete,dataCompleteness:final.dataCompleteness,rulesVersion:final.rulesVersion,winnerTeamId:final.winnerTeamId,winner:winner?identity.team(final.winnerTeamId)?.clubName:'',publishedAt:now()});
    }
    window.HVWorkflow?.audit?.('REFEREE_RESULT_CONFIRMED',matchId,{status:match.status,homeScore:match.homeScore,awayScore:match.awayScore},final,reason||'Definitief wedstrijdbeeld door scheidsrechter');
    window.HVWorkflow?.notify?.('Wedstrijdbeeld bevestigd',match.home+' – '+match.away+' · '+(final.homeScore??'–')+'–'+(final.awayScore??'–'),{href:'#wedstrijd-'+matchId,teamIds:[match.homeTeamId,match.awayTeamId],cupId:match.tournamentId,role:'all'});
    notify(matchId);return {ok:true,result:{...final}};
  }
  function overlayFor(matchId) {
    const final=result(matchId);
    if(final)return {status:final.status,homeScore:final.homeScore,awayScore:final.awayScore,minute:final.minute,winnerTeamId:final.winnerTeamId,penHome:final.penHome,penAway:final.penAway,extraTimePlayed:final.extraTimePlayed,playingMinutes:final.playingMinutes,eventsComplete:final.eventsComplete,dataCompleteness:final.dataCompleteness,rulesVersion:final.rulesVersion};
    const base=baselines()[matchId];
    if(!base)return null;
    const rows=saved().filter(row=>row.matchId===matchId).map(row=>({...row,...decisions()[row.id]})).filter(row=>row.status!=='rejected');
    let homeScore=base.homeScore||0,awayScore=base.awayScore||0,minute=base.minute||0;
    for(const row of rows){if(base.excludedEventIds?.includes(row.id))continue;if(goalTypes.has(row.type)){if(row.scoreSide==='home')homeScore++;else awayScore++;}minute=Math.max(minute,row.minute||0);}
    return {status:base.status,homeScore,awayScore,minute};
  }
  function resume(matchId,input={}){
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    const match=game(matchId);if(!match)return fail('Wedstrijd niet gevonden.');
    const scores=['homeScore','awayScore','minute'].map(key=>Number(input[key]));if(scores.some(value=>!Number.isInteger(value)||value<0)||scores[0]>99||scores[1]>99||scores[2]>150)return fail('Vul een geldige hervattingsstand en minuut in.');
    const previous=baselines()[matchId]||match,finals={...results()};delete finals[matchId];
    const existing=saved().filter(row=>row.matchId===matchId&&({...row,...decisions()[row.id]}).status!=='rejected');
    const base={homeScore:scores[0],awayScore:scores[1],minute:scores[2],status:'live',excludedEventIds:existing.map(row=>row.id),seedScores:previous.seedScores||{homeScore:previous.homeScore||0,awayScore:previous.awayScore||0},resumedAt:now()};
    const priorClock=clock(matchId),snapshot=input.clockSnapshot&&phases.includes(input.clockSnapshot.phase)?input.clockSnapshot:null,resumePhase=snapshot?.phase||(scores[2]>(Number((match?.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(match)?.rules)?.halfMinutes)||45)?'second':'first'),range=phaseRange(match,resumePhase),resumeSeconds=snapshot&&Number.isFinite(Number(snapshot.elapsedSeconds))?Math.max(0,Number(snapshot.elapsedSeconds)):Math.max(0,scores[2]-range.base)*60;
    store.setMany({matchClocks:{...clockRows(),[matchId]:{...priorClock,phase:resumePhase,elapsedSeconds:resumeSeconds,completedPhases:copy(snapshot?.completedPhases||priorClock?.completedPhases||{}),running:playingPhases.has(resumePhase),runningSince:playingPhases.has(resumePhase)?now():null,runningSinceMs:playingPhases.has(resumePhase)?Date.now():null,history:[...(priorClock?.history||[]),{action:'resume-decision',at:now(),minute:scores[2]}]}},matchCenterResults:finals,matchCenterBase:{...baselines(),[matchId]:base},...(matchId===primaryId?{result:null,matchKickoff:{at:now(),matchId,resumed:true},live:{home:scores[0],away:scores[1],minute:scores[2]}}:{})});notify(matchId);return {ok:true,result:base};
  }
  function resetForReplay(matchId,input={}){
    const permission=access('official.control',{matchId});if(!permission.ok)return permission;
    const match=game(matchId);if(!match)return fail('Wedstrijd niet gevonden.');const oldEvents=events(matchId),finals={...results()};delete finals[matchId];
    const previous=store.get('matchCenterArchives',{})[matchId]||{eventIds:[],history:[]},archive={eventIds:[...new Set([...previous.eventIds,...oldEvents.map(row=>row.id)])],history:[...previous.history,{at:now(),reason:String(input.reason||'Wedstrijd wordt overgespeeld'),result:result(matchId),events:oldEvents,clock:clock(matchId),shootout:shootout(matchId)}]};
    const sessions={...store.get('officialMatchSessions',{})};delete sessions[matchId];
    const resetClocks={...clockRows()},resetShots={...shots()};delete resetClocks[matchId];delete resetShots[matchId];
    store.setMany({matchClocks:resetClocks,matchShootouts:resetShots,matchCenterArchives:{...store.get('matchCenterArchives',{}),[matchId]:archive},matchCenterResults:finals,officialMatchSessions:sessions,matchCenterBase:{...baselines(),[matchId]:{homeScore:0,awayScore:0,minute:0,status:'scheduled',replayed:true}},...(matchId===primaryId?{result:null,matchKickoff:null,live:{home:0,away:0,minute:0},planning:{...store.get('planning',store.initialPlan),status:'planned'}}:{})});
    window.HVRegistrations?.resetMatch?.(matchId);notify(matchId);return {ok:true};
  }
  window.HVMatchCenter={phaseLabels,clock,clockCommand,shootout,setShootoutEligible,addShootoutKick,undoShootoutKick,playerIntervals,playerStates,possibleDuplicate,linkObservation,labels,goalTypes:[...goalTypes],playersForTeam:playerRows,players,events,addEvent,confirmEvent:(matchId,id)=>decision(matchId,id,'confirmed'),rejectEvent:(matchId,id,reason)=>decision(matchId,id,'rejected',reason),confirmAll,finalize,startMatch,resume,resetForReplay,result,overlayFor,allPlayers:()=>[...new Map(identity.listTeams().flatMap(team=>playerRows(team.id)).map(person=>[person.id,person])).values()]};
  document.addEventListener('hv:state',({detail})=>{
    if(detail.key==='result'&&detail.value?.status==='official'){
      const next={...decisions()};
      saved().filter(row=>row.matchId===primaryId&&row.status==='provisional').forEach(row=>{next[row.id]={status:'confirmed',reviewedBy:'referee',reviewedAt:now()};});
      store.set('matchCenterDecisions',next);notify(primaryId);
    }
    if(['lineups','tournamentRosters','registrationData','matchKickoff','officialSession','officialMatchSessions','matchEvents'].includes(detail.key))notify(primaryId);
    if(['matchCenterEvents','matchCenterResults','matchCenterBase','matchCenterDecisions','matchCenterObservations'].includes(detail.key))notify(null);
  });
})();
