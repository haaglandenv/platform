(() => {
  const identity = window.HVIdentity;
  const store = window.HVDemo;
  const today = '2027-06-05';
  const finalDay = '2027-06-12';
  const venueNames = {
    'HV-V-101':'Sportpark Houtrust', 'HV-V-102':'Sportpark Houtrust',
    'HV-V-103':'Sportpark Craeyenhout', 'HV-V-105':'Sportpark De Diepput',
    'HV-V-106':'Sportpark De Hoge Bomen', 'HV-V-110':'Sportpark Het Kleine Loo',
    'HV-V-111':'Sportpark ’t Loo',
  };
  function homeVenue(id) {
    const club = identity.club(id) || identity.club(identity.team(id)?.clubId);
    return club ? store.get('operationsClubProfiles',{})[club.id]?.venue || club.venue || venueNames[club.id] || 'Thuislocatie ' + club.name : 'Thuisclub volgt';
  }
  const activeToday=()=>window.HVEditions?.active?.().demoToday||today,activeFinalDay=()=>window.HVEditions?.active?.().finalDay||finalDay;
  function venueFor(match) { return match.date === activeFinalDay() ? 'Sportpark Houtrust' : homeVenue(match.homeClubId || match.homeTeamId); }
  const customRecords = () => { const saved = store.get('customMatches', []); return Array.isArray(saved) ? saved.filter(row => row && typeof row.id === 'string') : []; };
  const rawRecords = () => [...(store.get('editionActiveId','HV-ED-2026-27')==='HV-ED-2026-27'?records:store.get('editionFixtureRecords',[])),...store.get('competitionBracketMatches',[]),...customRecords()];
  const seedCups = [
    { id:'HV-CUP-STD', key:'senioren', name:'Sir Winston Cup', category:'Standaardteams', description:'De standaardteams spelen rechtstreeks om een plek in de volgende ronde.', teamIds:['101','102','103','104','105','108','106','107'].map(n=>'HV-T-'+n+'-01') },
    { id:'HV-CUP-HMC', key:'halve-maan', name:'Halve Maan Cup', category:'Standaardteams', description:'Een eigen bekerroute voor de standaardteams, van de eerste aftrap tot de finale.', teamIds:['110','113','114','115','116','117','112','109'].map(n=>'HV-T-'+n+'-01') },
    { id:'HV-CUP-VR', key:'vrouwen', name:'Vrouwenbeker', category:'Vrouwen', description:'Ieder duel is beslissend. De winnaar gaat door op weg naar Houtrust.', teamIds:['108','107','111','104','109','103','101','102'].map(n=>'HV-T-'+n+'-V1') },
    { id:'HV-CUP-O23', key:'o23', name:'O23-beker', category:'Onder 23', description:'De beloften van de regio strijden in knock-outduels om de beker.', teamIds:['106','109','110','104','101','102','103','111'].map(n=>'HV-T-'+n+'-23') },
    { id:'HV-CUP-JEUGD', key:'jeugd', name:'Jeugdbeker', category:'Jeugd · JO15', description:'Een eigen knock-outroute voor de jeugd, met de finale op Houtrust.', teamIds:['105','104','106','111','103','108','102','107'].map(n=>'HV-T-'+n+'-15') },
  ];
  const cups=()=>window.HVCompetition?.definitions||seedCups;
  const records = [];
  const quarterIds = [['HV-2701','HV-2702','HV-2706','HV-2707'],['HV-2721','HV-2722','HV-2723','HV-2724'],['HV-2703','HV-2732','HV-2733','HV-2734'],['HV-2704','HV-2742','HV-2743','HV-2744'],['HV-2705','HV-2752','HV-2753','HV-2754']];
  const laterIds = [['HV-2708','HV-2709','HV-2710'],['HV-2725','HV-2726','HV-2727'],['HV-2735','HV-2736','HV-2737'],['HV-2745','HV-2746','HV-2747'],['HV-2755','HV-2756','HV-2757']];
  const qScores = [[[null,null],[1,0],[3,1],[2,0]],[[1,0],[0,0],[2,1],[null,null]],[[2,0],[1,3],[2,1],[null,null]],[[1,3],[0,2],[null,null],[null,null]],[[0,2],[3,1],[1,0],[null,null]]];
  const qTimes = [['19:30','15:00','16:00','17:00'],['19:00','19:30','17:30','20:00'],['16:15','17:00','18:00','19:45'],['17:30','18:30','20:00','20:30'],['18:00','14:00','15:30','11:00']];
  const liveIds = new Set(['HV-2721','HV-2722','HV-2742']);
  const minuteSeed = {'HV-2721':38,'HV-2722':12,'HV-2742':63};
  const parks = ['Sportpark Houtrust','Sportpark Craeyenhout','Sportpark De Diepput','Sportpark De Hoge Bomen','Sportpark Het Kleine Loo'];
  const finalTimes = ['17:00','15:45','14:00','14:45','11:30'];
  function participant(teamId) {
    const team = identity.team(teamId);
    return { name:team?.name || 'Nog niet bekend', teamId:team?.id || null, clubId:team?.clubId || null };
  }
  function make(cup, values) {
    const home = participant(values.homeTeamId), away = participant(values.awayTeamId);
    return { tournamentId:cup.id,cupKey:cup.key,cupName:cup.name,home:home.name,away:away.name,homeClubId:home.clubId,awayClubId:away.clubId,
      homeScore:null,awayScore:null,minute:null,status:'scheduled',seedStatus:values.status||'scheduled',venue:'Sportpark Houtrust',field:'Veld 1',...values };
  }
  seedCups.forEach((cup, ci) => {
    // Eight earlier knock-out matches feed the four quarter-finals.
    const suffix = ci===2?'V1':ci===3?'23':ci===4?'15':'01';
    const opponents = identity.listClubs().map(club=>identity.team('HV-T-'+club.id.slice(-3)+'-'+suffix)).filter(team=>team&&!cup.teamIds.includes(team.id)).slice(0,8);
    cup.teamIds.forEach((teamId, i) => {
      records.push(make(cup,{id:`HV-W-2027-${cup.id.split('-').pop()}-R16-${String(i+1).padStart(2,'0')}`,round:'Achtste finale',roundKey:'last16',date:`2027-05-${[22,23,26,29][Math.floor(i/2)]}`,time:i%2?'20:00':'19:00',homeTeamId:teamId,awayTeamId:opponents[i].id,status:'finished',homeScore:2+i%3,awayScore:i%2,venue:parks[(ci+i)%parks.length],field:'Veld '+(1+i%3)}));
    });
    for(let qi=0;qi<4;qi++) {
      const id=quarterIds[ci][qi], [homeScore,awayScore]=qScores[ci][qi];
      records.push(make(cup,{id,round:'Kwartfinale',roundKey:'quarter',date:ci===4&&qi===3?'2027-06-06':today,time:qTimes[ci][qi],homeTeamId:cup.teamIds[qi*2],awayTeamId:cup.teamIds[qi*2+1],status:liveIds.has(id)?'live':homeScore===null?'scheduled':'finished',homeScore,awayScore,minute:minuteSeed[id]||null,venue:ci===0?[parks[0],parks[1],parks[2],parks[3]][qi]:parks[(ci+qi)%parks.length],field:qi===1&&ci===0?'Hoofdveld':'Veld '+(1+qi%3),isPrimary:id==='HV-2701'}));
    }
    for(let si=0;si<2;si++) records.push(make(cup,{id:laterIds[ci][si],round:'Halve finale',roundKey:'semi',date:'2027-06-09',time:si?'20:00':'19:30',homeSourceId:quarterIds[ci][si*2],awaySourceId:quarterIds[ci][si*2+1],home:`Winnaar kwartfinale ${si*2+1}`,away:`Winnaar kwartfinale ${si*2+2}`,field:'Veld '+(si+1)}));
    records.push(make(cup,{id:laterIds[ci][2],round:'Finale',roundKey:'final',date:'2027-06-12',time:finalTimes[ci],homeSourceId:laterIds[ci][0],awaySourceId:laterIds[ci][1],home:'Winnaar halve finale 1',away:'Winnaar halve finale 2',field:ci===4?'Veld 3A':'Hoofdveld'}));
  });
  // Keep the example calendar coherent across shared teams, grounds and pitch reservations.
  const seedAdjustments={
    'HV-W-2027-STD-R16-04':{date:'2027-05-24'},'HV-W-2027-STD-R16-08':{date:'2027-05-24'},
    'HV-W-2027-HMC-R16-01':{date:'2027-05-24'},'HV-W-2027-HMC-R16-02':{date:'2027-05-24'},'HV-W-2027-HMC-R16-03':{date:'2027-05-24'},'HV-W-2027-HMC-R16-05':{date:'2027-05-25'},
    'HV-W-2027-O23-R16-04':{field:'Veld 2'},'HV-W-2027-JEUGD-R16-06':{field:'Veld 2'},'HV-W-2027-JEUGD-R16-07':{field:'Veld 3'},
    'HV-2707':{field:'Veld 2'},'HV-2734':{field:'Veld 2'},'HV-2747':{field:'Veld 2'},'HV-2727':{field:'Veld 3'},
  };
  records.forEach(record=>Object.assign(record,seedAdjustments[record.id]||{}));
  const overlays = new Map();
  let info = { mode:'demo', updatedAt:null, lastError:null };
  let customProvider = null;
  let refreshJob = null;
  let demoTick = 0;
  const notify = () => { identity.registerFixtures(all()); document.dispatchEvent(new CustomEvent('hv:fixtures')); };
  function all() {
    const changes=store.get('fixtureOverrides',{});
    const list = rawRecords().map(record=>({...record,...overlays.get(record.id),...changes[record.id]}));
    const primary=list.find(game=>game.isPrimary);
    const plan=store.get('planning',store.initialPlan), match=store.matchSnapshot(), result=store.get('result',{});
    if(primary&&(!customProvider||!overlays.has(primary.id))) Object.assign(primary,{date:plan.date,time:plan.time.replace('.',':'),venue:plan.venue,field:plan.field,status:({planned:'scheduled',official:'finished'})[match.status]||match.status,homeScore:match.home??null,awayScore:match.away??null,minute:match.minute??null,winnerTeamId:result.winnerTeamId||null,penHome:result.penHome??null,penAway:result.penAway??null});
    for(const game of list) { const update=window.HVMatchCenter?.overlayFor?.(game.id); if(update&&typeof update==='object') Object.assign(game,Object.fromEntries(Object.entries(update).filter(([,value])=>value!==undefined))); }
    for(const game of list){const update=window.HVCases?.overlayFor?.(game.id);if(update&&typeof update==='object')Object.assign(game,update);}
    const resolved=window.HVCompetition.transformFixtures(list);
    for(const game of resolved) {
      game.editionId=window.HVEditions?.activeId?.()||'HV-ED-2026-27';
      game.venue=venueFor(game);
      const ruleSnapshot=window.HVCompetition.rulesForMatch(game);game.ruleSnapshot=ruleSnapshot;const rules=ruleSnapshot?.rules;
      game.scheduledPlayingMinutes=(rules?.halfMinutes||45)*2+(game.extraTimePlayed&&rules?.extraTime?(rules.extraHalfMinutes||15)*2:0);
      const final=window.HVMatchCenter?.result?.(game.id),recorded=final?.playingMinutes??(game.playingMinutesRecorded?game.playingMinutes:null);
      game.playingMinutesRecorded=Number.isFinite(Number(recorded))&&recorded!==null;game.actualPlayingMinutes=game.playingMinutesRecorded?Number(recorded):null;
      game.playingMinutes=game.playingMinutesRecorded?game.actualPlayingMinutes:game.scheduledPlayingMinutes;
      game.duration=game.duration||(game.scheduledPlayingMinutes+(rules?.halfTimeMinutes??15));
    }
    return resolved.sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id));
  }

  function ingestLive(snapshots) {
    if(!Array.isArray(snapshots)) throw new Error('Een wedstrijdfeed moet een lijst met wedstrijden teruggeven.');
    const known=new Map(rawRecords().map(record=>[record.id,record]));
    const accepted=[];
    for(const row of snapshots) {
      const record=known.get(row?.id);
      if(!record) throw new Error('De feed bevat een onbekend HV-ID.');
      if(record.isPrimary&&!customProvider) continue; // The referee workflow owns the primary demo match.
      if(!['scheduled','live','finished','cancelled','suspended','review'].includes(row.status)) throw new Error('Ongeldige wedstrijdstatus in de feed.');
      for(const key of ['homeScore','awayScore','minute','penHome','penAway']) if(row[key]!==null&&row[key]!==undefined&&(!Number.isInteger(row[key])||row[key]<0||row[key]>(key==='minute'?150:99))) throw new Error('Ongeldige stand of speeltijd in de feed.');
      if(row.winnerTeamId&&![record.homeTeamId,record.awayTeamId].includes(row.winnerTeamId)) throw new Error('Ongeldige winnaar in de feed.');
      accepted.push([row.id,{winnerTeamId:row.winnerTeamId??null,penHome:row.penHome??null,penAway:row.penAway??null,status:row.status,homeScore:row.homeScore??null,awayScore:row.awayScore??null,minute:row.minute??null}]);
    }
    accepted.forEach(([id,value])=>overlays.set(id,value));
    info={...info,updatedAt:new Date().toISOString(),lastError:null};
    notify();return {...info};
  }
  async function refreshLive(date=activeToday(),{signal}={}) {
    if(refreshJob) return refreshJob;
    refreshJob=Promise.resolve().then(async()=>{
      try {
        if(signal?.aborted) throw new DOMException('Afgebroken','AbortError');
        let snapshots;
        if(customProvider) snapshots=await customProvider({date,signal});
        else {
          demoTick++;
          snapshots=rawRecords().filter(record=>liveIds.has(record.id)&&record.date===date).map(record=>({id:record.id,status:'live',homeScore:record.homeScore+(record.id==='HV-2721'&&demoTick>=4?1:0),awayScore:record.awayScore+(record.id==='HV-2722'&&demoTick>=8?1:0),minute:Math.min(89,record.minute+demoTick)}));
        }
        if(signal?.aborted) throw new DOMException('Afgebroken','AbortError');
        return ingestLive(snapshots);
      }catch(error){info={...info,lastError:error.message||'De feed kon niet worden opgehaald.'};notify();throw error;}
      finally{refreshJob=null;}
    });
    return refreshJob;
  }
  const rounds = {first:'Eerste ronde',last16:'Achtste finale',quarter:'Kwartfinale',semi:'Halve finale',final:'Finale'};
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const minutes = time => Number(time.slice(0,2))*60+Number(time.slice(3,5));
  function conflictFor(candidate) {
    if (['cancelled','bye','walkover'].includes(candidate.status) || !candidate.date || !candidate.time) return null;
    return all().find(other => {
      if(other.id===candidate.id || ['cancelled','bye','walkover'].includes(other.status) || other.date!==candidate.date) return false;
      const starts=minutes(candidate.time), otherStarts=minutes(other.time);
      if(starts >= otherStarts+(other.duration||90) || otherStarts >= starts+(candidate.duration||90)) return false;
      const fixedVenue=candidate.date===activeFinalDay()||!!candidate.homeClubId&&!!other.homeClubId;
      const sameField=fixedVenue && other.venue===candidate.venue && other.field.trim().toLocaleLowerCase()===candidate.field.trim().toLocaleLowerCase();
      const sameTeam=[candidate.homeTeamId,candidate.awayTeamId].filter(Boolean).some(id=>[other.homeTeamId,other.awayTeamId].includes(id));
      return sameField || sameTeam;
    }) || null;
  }
  function saveFixture(payload={},options={}) {
    const existing=payload.id ? all().find(game=>game.id===payload.id) : null;
    if(payload.id&&!existing) return {ok:false,error:'Deze wedstrijd is niet gevonden. Maak hem als nieuwe wedstrijd aan.'};
    const input={...existing,...payload};
    if(existing?.isBracketNode&&(input.homeTeamId!==existing.homeTeamId||input.awayTeamId!==existing.awayTeamId||input.tournamentId!==existing.tournamentId||input.roundKey!==existing.roundKey))return {ok:false,error:'Wijzig bekerplekken en teams via Toernooibeheer. De wedstrijdplanning behoudt de gepubliceerde indeling.'};
    if(existing?.isPrimary && (input.homeTeamId!==existing.homeTeamId || input.awayTeamId!==existing.awayTeamId || input.tournamentId!==existing.tournamentId)) return {ok:false,error:'De teams en beker van deze centrale demowedstrijd beheer je in de bestaande wedstrijdomgeving.'};
    const cup=cups().find(cup=>cup.id===input.tournamentId||cup.key===input.cupKey);
    const home=identity.team(input.homeTeamId),away=identity.team(input.awayTeamId);
    if(!cup) return {ok:false,error:'Kies een toernooi.'};
    const permission=window.HVWorkflow?.guard?.(cup.id);if(permission?.ok===false)return permission;
    if(!home||!away) return {ok:false,error:'Kies een geregistreerd thuisteam en uitteam.'};
    if(home.id===away.id) return {ok:false,error:'Het thuisteam en uitteam moeten verschillend zijn.'};
    const permittedTeams=new Set(window.HVCompetition.entrants(cup.id).filter(row=>row.status==='approved').map(row=>row.teamId));
    if(!permittedTeams.has(home.id)||!permittedTeams.has(away.id))return{ok:false,error:'Beide teams moeten eerst als deelnemer aan deze beker zijn goedgekeurd.'};
    if(window.HVWorkflow?.canEnter?.(home.id)===false||window.HVWorkflow?.canEnter?.(away.id)===false||window.HVCases?.isTeamExcluded?.(home.id,cup.id)||window.HVCases?.isTeamExcluded?.(away.id,cup.id))return{ok:false,error:'Een van de teams is uitgesloten. Behandel eerst het uitsluitingsbesluit.'};
    const suffix=cup.suffix||(cup.key==='vrouwen'?'V1':cup.key==='o23'?'23':cup.key==='jeugd'?'15':'01');
    if(!home.id.endsWith('-'+suffix)||!away.id.endsWith('-'+suffix)) return {ok:false,error:'Kies teams uit de categorie van dit toernooi.'};
    if(!validDate(input.date)) return {ok:false,error:'Vul een geldige wedstrijddatum in.'};
    const time=String(input.time||'').replace('.',':');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return {ok:false,error:'Vul een geldige aftraptijd in.'};
    if(!rounds[input.roundKey]) return {ok:false,error:'Kies een speelronde.'};
    const status=input.status==='planned'?'scheduled':input.status;
    if(!['scheduled','live','finished','cancelled','suspended','review'].includes(status)) return {ok:false,error:'Kies een wedstrijdstatus.'};
    const field=String(input.field||'').trim();
    if(!field||field.length>60) return {ok:false,error:'Vul een veld in van maximaal 60 tekens.'};
    const rules=window.HVCompetition.rulesForMatch(existing||{tournamentId:cup.id})?.rules;
    const duration=Number(input.duration||((rules?.halfMinutes||45)*2+(rules?.halfTimeMinutes??15)));
    if(!Number.isInteger(duration)||duration<20||duration>180) return {ok:false,error:'Kies een gereserveerde tijd van 20 tot 180 minuten.'};
    const needsScore=['live','finished','suspended'].includes(status);
    const scoreValue=(value)=>value===''||value===undefined||value===null?null:Number(value);
    const homeScore=scoreValue(input.homeScore),awayScore=scoreValue(input.awayScore);
    if(needsScore&&(!Number.isInteger(homeScore)||homeScore<0||homeScore>99||!Number.isInteger(awayScore)||awayScore<0||awayScore>99)) return {ok:false,error:'Vul voor deze status beide scores in.'};
    const penHome=scoreValue(input.penHome),penAway=scoreValue(input.penAway);
    const validation=window.HVCompetition.validateResult(existing||{tournamentId:cup.id},{...input,status,homeScore,awayScore,penHome,penAway});
    if(!validation.ok)return validation;
    const reason=String(input.reason||'').trim();
    const minute=scoreValue(input.minute);
    if(['cancelled','suspended'].includes(status)&&!reason) return {ok:false,error:'Vermeld de reden van afgelasting of staking.'};
    if(status==='suspended'&&(!Number.isInteger(minute)||minute<0||minute>150)) return {ok:false,error:'Vermeld de minuut waarin de wedstrijd is gestaakt.'};
    if(existing?.isPrimary&& !['scheduled','cancelled'].includes(status)) return {ok:false,error:'Werk het wedstrijdverloop en de uitslag van dit duel bij via de scheidsrechteromgeving.'};
    const id=existing?.id||'HV-W-'+crypto.randomUUID().toUpperCase();
    const candidate=make(cup,{id,seedStatus:existing?.seedStatus||'manual',tournamentId:cup.id,cupKey:cup.key,cupName:cup.name,roundKey:input.roundKey,round:rounds[input.roundKey],homeTeamId:home.id,awayTeamId:away.id,homeSourceId:existing?.homeSourceId||null,awaySourceId:existing?.awaySourceId||null,extraTimePlayed:input.extraTimePlayed===true,home:home.name,away:away.name,homeClubId:home.clubId,awayClubId:away.clubId,date:input.date,time,field,duration,status,homeScore:needsScore?homeScore:null,awayScore:needsScore?awayScore:null,penHome:status==='finished'&&homeScore===awayScore?penHome:null,penAway:status==='finished'&&homeScore===awayScore?penAway:null,minute:needsScore?minute:null,reason:reason.slice(0,600),isPrimary:!!existing?.isPrimary,manual:existing?.manual||!existing,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
    if(status==='finished') candidate.winnerTeamId=validation.winnerSide==='home'?home.id:away.id;
    candidate.venue=venueFor(candidate);
    const conflict=conflictFor(candidate);
    if(conflict) return {ok:false,error:'Deze planning overlapt met '+conflict.home+' – '+conflict.away+' om '+conflict.time+' ('+conflict.venue+' · '+conflict.field+'). Kies een ander tijdstip of veld.',conflictId:conflict.id};
    if(options.validateOnly)return{ok:true,match:candidate};
    if(existing) {
      const next={...store.get('fixtureOverrides',{}),[id]:candidate};
      if(existing.isPrimary) {
        const planning={...store.get('planning',store.initialPlan),date:candidate.date,time:candidate.time.replace(':','.'),venue:candidate.venue,field:candidate.field,status:status==='cancelled'?'cancelled':'planned'};
        if(store.setMany) store.setMany({fixtureOverrides:next,planning}); else {store.set('fixtureOverrides',next);store.set('planning',planning);}
      } else store.set('fixtureOverrides',next);
    } else store.set('customMatches',[...customRecords(),candidate]);
    if(['live','finished','suspended'].includes(status))window.HVCompetition.freezeMatchRules(candidate);
    overlays.delete(id);
    window.HVWorkflow?.audit?.(existing?'fixture.update':'fixture.create',id,existing,candidate,reason||'Wedstrijdplanning gewijzigd');
    window.HVWorkflow?.notify?.(existing?'Wedstrijd gewijzigd':'Wedstrijd toegevoegd',candidate.home+' – '+candidate.away+' · '+candidate.date+' '+candidate.time,{href:'#wedstrijd-'+id,matchId:id,tournamentId:cup.id,teamIds:[candidate.homeTeamId,candidate.awayTeamId],role:'all'});
    return {ok:true,match:all().find(game=>game.id===id)};
  }
  function moveFixture(id,changes={}) {
    const existing=all().find(game=>game.id===id);
    if(!existing) return {ok:false,error:'De wedstrijd is niet gevonden.'};
    const permission=window.HVWorkflow?.guard?.(existing.tournamentId);if(permission?.ok===false)return permission;
    if(existing.status!=='scheduled') return {ok:false,error:'Alleen nog te spelen wedstrijden kun je verplaatsen. Open het wedstrijdformulier voor historische gegevens.'};
    if(!existing.homeTeamId||!existing.awayTeamId) {
      const candidate={...existing,...changes,id};
      candidate.time=String(candidate.time||'').replace('.',':');
      if(!validDate(candidate.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.time)) return {ok:false,error:'Kies een geldige datum en aftraptijd.'};
      candidate.field=String(candidate.field||'').trim();
      if(!candidate.field||candidate.field.length>60) return {ok:false,error:'Vul een geldig veld in.'};
      candidate.venue=venueFor(candidate);
      const conflict=conflictFor(candidate);
      if(conflict) return {ok:false,error:'Deze planning overlapt met '+conflict.home+' – '+conflict.away+' om '+conflict.time+'. Kies een ander tijdstip of veld.'};
      store.set('fixtureOverrides',{...store.get('fixtureOverrides',{}),[id]:candidate});
      window.HVWorkflow?.audit?.('fixture.move',id,existing,candidate,'Voorlopige planning gewijzigd');
      window.HVWorkflow?.notify?.('Wedstrijdplanning gewijzigd',candidate.cupName+' · '+candidate.date+' '+candidate.time,{href:'#wedstrijd-'+id,matchId:id,tournamentId:candidate.tournamentId,role:'all'});
      return {ok:true,match:all().find(game=>game.id===id)};
    }
    return saveFixture({...existing,...changes,id});
  }
  window.HVFixtures={get cups(){return cups();},get today(){return activeToday();},get finalDay(){return activeFinalDay();},clearTransient(){overlays.clear();demoTick=0;info={mode:'demo',updatedAt:null,lastError:null};},all,homeVenue,venueFor,saveFixture,validateFixture:payload=>saveFixture(payload,{validateOnly:true}),moveFixture,conflictFor,rounds,get:id=>all().find(game=>game.id===id),forCup:key=>all().filter(game=>game.cupKey===key||game.tournamentId===key),ingestLive,refreshLive,feedInfo:()=>({...info}),setLiveProvider(provider){if(typeof provider!=='function'&&provider!==null)throw new TypeError('Gebruik een functie als wedstrijdprovider.');customProvider=provider;overlays.clear();info={mode:provider?'api':'demo',updatedAt:null,lastError:null};notify();}};
  document.addEventListener('hv:state',({detail})=>{if(['planning','result','live','matchKickoff','matchEvents','customMatches','fixtureOverrides','competitionBracketMatches','caseOverlays'].includes(detail.key))notify();});
  identity.registerFixtures(all());
})();
