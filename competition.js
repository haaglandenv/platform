(() => {
  const store=window.HVDemo, identity=window.HVIdentity;
  if(!store||!identity)return;
  const seedDefinitions=[
    {id:'HV-CUP-STD',key:'senioren',name:'Sir Winston Cup',suffix:'01',category:'Standaardteams',teamIds:['101','102','103','104','105','108','106','107'].map(n=>'HV-T-'+n+'-01')},
    {id:'HV-CUP-HMC',key:'halve-maan',name:'Halve Maan Cup',suffix:'01',category:'Standaardteams',teamIds:['110','113','114','115','116','117','112','109'].map(n=>'HV-T-'+n+'-01')},
    {id:'HV-CUP-VR',key:'vrouwen',name:'Vrouwenbeker',suffix:'V1',category:'Vrouwen',teamIds:['108','107','111','104','109','103','101','102'].map(n=>'HV-T-'+n+'-V1')},
    {id:'HV-CUP-O23',key:'o23',name:'O23-beker',suffix:'23',category:'Onder 23',teamIds:['106','109','110','104','101','102','103','111'].map(n=>'HV-T-'+n+'-23')},
    {id:'HV-CUP-JEUGD',key:'jeugd',name:'Jeugdbeker',suffix:'15',category:'Jeugd · JO15',teamIds:['105','104','106','111','103','108','102','107'].map(n=>'HV-T-'+n+'-15')},
  ].map(cup=>({...cup,bracketSize:16,description:'Directe uitschakeling. Iedere ronde brengt de beker dichterbij.'}));
  const roundNames={first:'Eerste ronde',last16:'Achtste finale',quarter:'Kwartfinale',semi:'Halve finale',final:'Finale'};
  const roundOrder=['first','last16','quarter','semi','final'];
  const previous={last16:'first',quarter:'last16',semi:'quarter',final:'semi'},next={first:'last16',last16:'quarter',quarter:'semi',semi:'final'};
  const sizes={first:16,last16:8,quarter:4,semi:2,final:1};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const fail=error=>({ok:false,error});
  const settings=()=>store.get('competitionSettings',{}),frozen=()=>store.get('competitionMatchRules',{});
  const entryStore=()=>store.get('competitionEntries',{});
  function definitions(){return [...(store.get('editionActiveId','HV-ED-2026-27')==='HV-ED-2026-27'?seedDefinitions:[]),...store.get('competitionDefinitions',[])].map(cup=>({...clone(cup),teamIds:entryStore()[cup.id]?entryStore()[cup.id].filter(row=>row.status==='approved').map(row=>row.teamId):[...(cup.teamIds||[])]}));}
  const definition=value=>definitions().find(cup=>cup.id===value||cup.key===value);
  function guard(cupId){const check=window.HVWorkflow?.guard?.(cupId);return check?.ok===false?check:{ok:true};}
  function notify(cupId,action){
    document.dispatchEvent(new CustomEvent('hv:competition',{detail:{cupId,action}}));
    if(window.HVFixtures)identity.registerFixtures?.(window.HVFixtures.all());
    document.dispatchEvent(new CustomEvent('hv:fixtures',{detail:{cupId,action}}));
  }
  function defaults(cup){
    const youth=cup.suffix==='15',under23=cup.suffix==='23',edition=window.HVEditions?.active?.();
    const rules={halfMinutes:youth?35:45,halfTimeMinutes:15,extraTime:false,extraHalfMinutes:15,penalties:true,
      minAge:youth?12:under23||cup.suffix==='V1'?16:18,maxAge:youth?14:under23?22:null,ageReference:'season',referenceDate:edition?.referenceDate||'2027-01-01',maxDispensations:3,
      starterCount:11,minimumPlayers:7,maxSquadSize:18,requiredGoalkeeper:true,substitutionMode:'limited',maxSubstitutions:5,yellowThreshold:3,
      refereeType:'neutral',assistantsRequired:2,extraTimeRounds:[...roundOrder],effectiveFrom:edition?.startDate||'2026-08-01',
      tournamentText:'Het toernooi wordt gespeeld volgens directe uitschakeling. Alleen spelers uit de goedgekeurde toernooilijst mogen deelnemen. De toernooileiding behandelt uitzonderingen en stelt wijzigingen vast.',
      matchText:'De teamleiding dient de spelersopgave voor de aftrap in. De scheidsrechter controleert beide opgaven en bevestigt het definitieve wedstrijdbeeld. Bij gelijkspel volgt de ingestelde beslisprocedure.'};
    return {cupId:cup.id,key:cup.key,name:cup.name,bracketSize:cup.bracketSize||16,version:1,rules,ruleVersions:[{version:1,rules:clone(rules),at:'2026-11-01T12:00:00.000Z'}],progression:{first:'auto',last16:'auto',quarter:'auto',semi:'auto'},drafts:{},layouts:{},releases:{},history:[]};
  }
  function get(value){
    const cup=definition(value);if(!cup)return null;
    const base=defaults(cup),saved=settings()[cup.id]||{};
    return clone({...base,...saved,cupId:cup.id,key:cup.key,name:cup.name,rules:{...base.rules,...saved.rules},progression:{...base.progression,...saved.progression},drafts:saved.drafts||{},layouts:saved.layouts||{},releases:saved.releases||{},history:saved.history||[],ruleVersions:saved.ruleVersions||base.ruleVersions});
  }
  function persist(config,message,action,additional={}){
    const permitted=guard(config.cupId);if(!permitted.ok)return permitted;
    const before=get(config.cupId);
    config.history=[{at:now(),message},...config.history].slice(0,80);
    const patch={...additional,competitionSettings:{...settings(),[config.cupId]:config}};
    if(store.setMany)store.setMany(patch);else for(const[key,value]of Object.entries(patch))store.set(key,value);
    window.HVWorkflow?.audit?.('competition.'+action,config.cupId,before,config,message);
    window.HVWorkflow?.notify?.(message,'De gekoppelde toernooigegevens zijn bijgewerkt.',{href:'#toernooibeheer',tournamentId:config.cupId,role:'leadership'});
    return {ok:true,settings:get(config.cupId)};
  }
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  function saveRules(value,input={}){
    const config=get(value);if(!config)return fail('Kies een bekend toernooi.');
    const permitted=guard(config.cupId);if(!permitted.ok)return permitted;
    const rules={...config.rules,...input};
    for(const [key,min,max,label]of [['halfMinutes',10,60,'speelduur per helft'],['halfTimeMinutes',0,30,'rustduur'],['extraHalfMinutes',1,30,'verlengingshelft'],['maxDispensations',0,30,'maximum dispensaties'],['starterCount',3,11,'aantal basisspelers'],['minimumPlayers',3,11,'minimum aanwezige spelers'],['maxSquadSize',3,30,'selectiegrootte'],['maxSubstitutions',0,20,'aantal wissels'],['yellowThreshold',1,10,'gele-kaartengrens'],['assistantsRequired',0,2,'assistenten']]){
      rules[key]=Number(rules[key]);if(!Number.isInteger(rules[key])||rules[key]<min||rules[key]>max)return fail('Vul voor '+label+' een waarde van '+min+' tot en met '+max+' in.');
    }
    if(rules.minimumPlayers>rules.starterCount)return fail('De minimale bezetting mag niet hoger zijn dan het aantal basisspelers.');
    if(rules.maxSquadSize<rules.starterCount)return fail('De selectiegrootte mag niet kleiner zijn dan het aantal basisspelers.');
    for(const key of ['minAge','maxAge']){rules[key]=rules[key]===''||rules[key]==null?null:Number(rules[key]);if(rules[key]!==null&&(!Number.isInteger(rules[key])||rules[key]<0||rules[key]>99))return fail('Vul geldige leeftijdsgrenzen in.');}
    if(rules.minAge!==null&&rules.maxAge!==null&&rules.minAge>rules.maxAge)return fail('De minimumleeftijd mag niet boven de maximumleeftijd liggen.');
    if(!['match','season'].includes(rules.ageReference))return fail('Kies een geldige leeftijdspeildatum.');
    if(!validDate(rules.referenceDate||'2027-01-01')||!validDate(rules.effectiveFrom))return fail('Vul een geldige peildatum en ingangsdatum in.');
    if(!['continuous','limited'].includes(rules.substitutionMode)||!['neutral','club'].includes(rules.refereeType))return fail('Kies een geldig wisselbeleid en type scheidsrechter.');
    if(['extraTime','penalties','requiredGoalkeeper'].some(key=>typeof rules[key]!=='boolean'))return fail('Controleer de keuzes voor verlenging, strafschoppen en keeper.');
    if(!Array.isArray(rules.extraTimeRounds)||rules.extraTimeRounds.some(round=>!roundOrder.includes(round)))return fail('Kies geldige rondes voor verlenging.');
    rules.extraTimeRounds=[...new Set(rules.extraTimeRounds)];
    if(rules.extraTime&&!rules.extraTimeRounds.length)return fail('Wijs minimaal één ronde aan waarin wordt verlengd.');
    rules.tournamentText=String(rules.tournamentText??'').trim();rules.matchText=String(rules.matchText??'').trim();
    if(!rules.tournamentText||!rules.matchText)return fail('Vul zowel het toernooireglement als het wedstrijdreglement in.');
    if(rules.tournamentText.length>12000||rules.matchText.length>12000)return fail('Gebruik maximaal 12.000 tekens per reglement.');
    config.rules=rules;config.version+=1;config.updatedAt=now();config.ruleVersions=[...config.ruleVersions,{version:config.version,rules:clone(rules),at:config.updatedAt}];
    return persist(config,'Reglement versie '+config.version+' opgeslagen.','rules');
  }
  function effectiveRules(config,rules,match){const normalized={...defaults(definition(config.cupId)).rules,...rules};normalized.extraTime=!!normalized.extraTime&&(!normalized.extraTimeRounds.length||!match?.roundKey||normalized.extraTimeRounds.includes(match.roundKey));return normalized;}
  function rulesForMatch(match){
    if(typeof match==='string')match=window.HVFixtures?.get(match);
    const config=match&&get(match.tournamentId||match.cupKey);if(!config)return null;
    const snapshot=frozen()[match.id];
    if(snapshot)return clone({rules:effectiveRules(config,snapshot.rules,match),version:snapshot.version,cupId:config.cupId,name:config.name});
    let version=['live','finished','walkover'].includes(match.seedStatus)&&!match.manual?config.ruleVersions[0]:{rules:config.rules,version:config.version};
    if(match.date&&version.rules.effectiveFrom>match.date){const eligible=config.ruleVersions.filter(row=>(row.rules.effectiveFrom||'')<=match.date);version=eligible.at(-1)||config.ruleVersions[0];}
    return clone({rules:effectiveRules(config,version.rules,match),version:version.version,cupId:config.cupId,name:config.name});
  }
  function freezeMatchRules(match){
    if(typeof match==='string')match=window.HVFixtures?.get(match);if(!match)return fail('Deze wedstrijd is niet gevonden.');
    if(frozen()[match.id])return {ok:true,...rulesForMatch(match)};
    const snapshot=rulesForMatch(match);if(!snapshot)return fail('Het wedstrijdreglement ontbreekt.');
    store.set('competitionMatchRules',{...frozen(),[match.id]:{...snapshot,at:now(),participants:{home:match.home,away:match.away,homeTeamId:match.homeTeamId,awayTeamId:match.awayTeamId,homeClubId:match.homeClubId,awayClubId:match.awayClubId}}});
    return {ok:true,...snapshot};
  }
  function validateResult(match,input={}){
    if(!match)return fail('Deze wedstrijd is niet gevonden.');if(['bye','walkover'].includes(match.status))return fail('Deze plek wordt via een vrijloting of reglementair besluit verwerkt.');
    if(input.status!=='finished'&&input.verdict!=='played'&&input.status!=='official')return {ok:true,winnerSide:null};
    const rules=rulesForMatch(match)?.rules;if(!rules)return fail('Het wedstrijdreglement ontbreekt.');
    const rawHome=input.homeScore??input.home,rawAway=input.awayScore??input.away,home=Number(rawHome),away=Number(rawAway);
    if(rawHome==null||rawHome===''||rawAway==null||rawAway===''||!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home>99||away>99)return fail('Vul een geldige eindstand in.');
    if(home!==away)return {ok:true,winnerSide:home>away?'home':'away'};
    if(rules.extraTime&&input.extraTimePlayed!==true)return fail('Volgens dit wedstrijdreglement moet eerst de verlenging zijn gespeeld.');
    if(!rules.penalties)return fail('Dit reglement kent geen strafschoppen. Een gelijke eindstand vraagt om een besluit van de toernooileiding.');
    const h=Number(input.penHome),a=Number(input.penAway);
    if(input.penHome==null||input.penHome===''||input.penAway==null||input.penAway===''||!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0||h>99||a>99||h===a)return fail('Vul een beslissende strafschoppenserie in volgens het wedstrijdreglement.');
    return {ok:true,winnerSide:h>a?'home':'away'};
  }
  function stage(list,cupId,round){const matching=list.filter(game=>game.tournamentId===cupId&&game.roundKey===round);const primary=matching.filter(game=>!game.manual||game.isGeneratedBracket);return primary.sort((a,b)=>(a.bracketOrder??999)-(b.bracketOrder??999)||a.id.localeCompare(b.id)).slice(0,sizes[round]||matching.length);}
  function winner(game){
    if(['bye','walkover'].includes(game.status))return game.qualifierTeamId||game.winnerTeamId||null;
    if(game.status!=='finished')return null;
    if(game.winnerTeamId&&[game.homeTeamId,game.awayTeamId].includes(game.winnerTeamId))return game.winnerTeamId;
    if(!Number.isInteger(game.homeScore)||!Number.isInteger(game.awayScore))return null;
    if(game.homeScore!==game.awayScore)return game.homeScore>game.awayScore?game.homeTeamId:game.awayTeamId;
    if(Number.isInteger(game.penHome)&&Number.isInteger(game.penAway)&&game.penHome!==game.penAway)return game.penHome>game.penAway?game.homeTeamId:game.awayTeamId;
    return null;
  }
  const signature=games=>games.map(game=>[game.id,game.status,winner(game),game.homeScore,game.awayScore,game.penHome,game.penAway].join(':')).sort().join('|');
  function participantCommitted(game){
    if(['live','finished','review','suspended','walkover'].includes(game.status))return true;
    if(game.isPrimary&&Object.values(store.get('lineups',{})).some(sheet=>sheet?.status==='submitted'))return true;
    const session=store.get('officialMatchSessions',{})[game.id];
    const sheets=store.get('registrationLineups',{});const submitted=Object.values(sheets).some(sheet=>sheet?.matchId===game.id&&sheet?.status==='submitted');
    return submitted||!!(session?.confirmed&&(session.approved?.home||session.approved?.away));
  }
  function locked(game,list){if(participantCommitted(game))return true;return !!(next[game.roundKey]&&stage(list,game.tournamentId,next[game.roundKey]).some(participantCommitted));}
  function fillSide(game,side,id,label){const team=identity.team(id);game[side+'TeamId']=team?.id||null;game[side+'ClubId']=team?.clubId||null;game[side]=team?.name||label||'Deelnemer volgt';}
  function transformFixtures(input){
    const list=input.map(game=>({...game})),byId=new Map(list.map(game=>[game.id,game])),originals=new Map(input.map(game=>[game.id,game]));
    for(const game of list){game.isBracketNode=false;delete game.homeBye;delete game.awayBye;delete game.qualifierTeamId;}
    for(const cup of definitions())for(const round of roundOrder)stage(list,cup.id,round).forEach((game,index)=>{game.isBracketNode=true;game.bracketOrder=index;});
    for(const cup of definitions())for(const round of roundOrder){const sources=previous[round]?stage(list,cup.id,previous[round]):[];stage(list,cup.id,round).forEach((game,index)=>{if(locked(game,list))return;for(const [offset,side]of ['home','away'].entries())if(!game[side+'SourceId']&&sources[index*2+offset])game[side+'SourceId']=sources[index*2+offset].id;});}
    for(const cup of definitions()){
      const config=get(cup.id);
      for(const [round,layout]of Object.entries(config.layouts))stage(list,cup.id,round).forEach(game=>{
        const placement=layout.matches?.find(row=>row.id===game.id);if(!placement)return;
        for(const side of ['home','away']){const id=placement[side];game[side+'SourceId']=null;game[side+'Bye']=id==='bye';fillSide(game,side,id,id==='bye'?'Vrijgeloot':'Deelnemer volgt');}
        const other=game.homeBye?game.awayTeamId:game.awayBye?game.homeTeamId:null;
        if(other){game.status='bye';game.qualifierTeamId=other;game.winnerTeamId=other;game.homeScore=null;game.awayScore=null;game.minute=null;}
      });
    }
    const resolving=new Set(),resolved=new Set();
    function resolve(game){
      if(resolved.has(game.id)||resolving.has(game.id))return;resolving.add(game.id);
      const snap=frozen()[game.id];if(snap?.participants&&['live','finished','review','suspended','walkover'].includes(game.status)){Object.assign(game,snap.participants);resolving.delete(game.id);resolved.add(game.id);return;}
      for(const side of ['home','away']){const sourceId=game[side+'SourceId'];if(!sourceId)continue;const source=byId.get(sourceId);if(source)resolve(source);const config=get(game.tournamentId),roundGames=source?stage(list,game.tournamentId,source.roundKey):[];const manual=source&&config?.progression[source.roundKey]==='manual';const releaseGate=source?window.HVCases?.canReleaseRound?.(game.tournamentId,game.roundKey):null;const released=releaseGate?.ok!==false&&(!manual||config.releases[source.roundKey]?.signature===signature(roundGames));const qualified=source&&released?winner(source):null;fillSide(game,side,qualified,!released?'Besluit / vrijgave volgt':originals.get(game.id)?.[side]||'Winnaar vorig duel');}
      resolving.delete(game.id);resolved.add(game.id);
    }
    list.forEach(resolve);return list;
  }
  function fixtureList(){return window.HVFixtures?.all()||[];}
  function saveProgression(value,round,mode){const config=get(value);if(!config)return fail('Kies een bekend toernooi.');if(!next[round]||!['auto','manual'].includes(mode))return fail('Kies een geldige ronde en wijze van doorstromen.');if(stage(fixtureList(),config.cupId,next[round]).some(participantCommitted))return fail('De volgende ronde is al gestart of een spelersopgave is gecontroleerd.');config.progression[round]=mode;delete config.releases[round];return persist(config,roundNames[round]+': '+(mode==='manual'?'handmatig vrijgeven of opnieuw loten.':'automatisch doorstromen.'),'progression');}
  function entrants(value,fixtureContext){
    const cup=definition(value);if(!cup)return[];
    const saved=entryStore()[cup.id];
    const ids=[...new Set([...(cup.teamIds||[]),...(fixtureContext||fixtureList()).filter(game=>game.tournamentId===cup.id).flatMap(game=>[game.homeTeamId,game.awayTeamId])].filter(Boolean))];
    const base=saved||ids.map(teamId=>({teamId,status:'approved',reason:'Deelnemer aan de voorbeeldeditie.',at:'2026-11-01T12:00:00.000Z'}));
    return clone(base).map(row=>({...row,team:identity.team(row.teamId),clubId:identity.team(row.teamId)?.clubId}));
  }
  function saveEntries(cup,rows,action,reason){const permitted=guard(cup.id);if(!permitted.ok)return permitted;const before=entrants(cup.id);store.set('competitionEntries',{...entryStore(),[cup.id]:rows.map(({team,clubId,...row})=>row)});window.HVWorkflow?.audit?.('competition.'+action,cup.id,before,rows,reason);return{ok:true,entries:entrants(cup.id)};}
  function registerEntry(value,teamId,reason='Inschrijving door vereniging'){
    const cup=definition(value),team=identity.team(teamId);if(!cup)return fail('Kies een bekend toernooi.');if(!team||!team.id.endsWith('-'+cup.suffix))return fail('Kies een geregistreerd team uit de categorie van deze beker.');
    if(window.HVWorkflow?.canEnter?.(team.id)===false||window.HVCases?.isTeamExcluded?.(team.id,cup.id))return fail('Dit team is uitgesloten. De toernooileiding moet eerst het uitsluitingsbesluit behandelen.');
    const rows=entrants(cup.id),existing=rows.find(row=>row.teamId===team.id);if(existing&&!['returned'].includes(existing.status))return fail('Dit team staat al ingeschreven.');
    const entry={teamId:team.id,status:'pending',reason:String(reason).trim().slice(0,600),at:now()};return saveEntries(cup,existing?rows.map(row=>row.teamId===team.id?entry:row):[...rows,entry],'entry.register',entry.reason);
  }
  function reviewEntry(value,teamId,status,reason){
    const cup=definition(value);if(!cup)return fail('Kies een bekend toernooi.');status=status==='review'?'pending':status;
    if(!['pending','approved','returned','excluded'].includes(status))return fail('Kies een geldige inschrijvingsstatus.');
    const note=String(reason||'').trim();if(note.length<3||note.length>600)return fail('Vermeld een duidelijke reden van 3 tot 600 tekens.');
    const rows=entrants(cup.id);if(!rows.some(row=>row.teamId===teamId))return fail('Dit team is niet ingeschreven.');
    if(status==='approved'&&(window.HVWorkflow?.canEnter?.(teamId)===false||window.HVCases?.isTeamExcluded?.(teamId,cup.id)))return fail('Hef eerst het uitsluitingsbesluit voor dit team op.');
    if(status==='approved'&&rows.filter(row=>row.status==='approved'&&row.teamId!==teamId).length>=(cup.bracketSize||16))return fail('De beker is vol. Kies een grotere beker voordat je meer teams toelaat.');
    return saveEntries(cup,rows.map(row=>row.teamId===teamId?{...row,status,reason:note,at:now()}:row),'entry.'+status,note);
  }
  function createCup(input={}){
    const permitted=guard(null);if(!permitted.ok)return permitted;
    const name=String(input.name||'').trim(),category=String(input.category||'').trim(),suffix=String(input.suffix||'01'),bracketSize=Number(input.bracketSize||16);
    if(name.length<3||name.length>80||category.length<2||category.length>70)return fail('Vul een toernooinaam en categorie in.');
    if(!['01','V1','23','15'].includes(suffix)||![8,16,32].includes(bracketSize))return fail('Kies een geldige categorie en 8, 16 of 32 bekerplekken.');
    if(definitions().some(cup=>cup.name.toLocaleLowerCase('nl')===name.toLocaleLowerCase('nl')))return fail('Er bestaat al een beker met deze naam.');
    const tail=crypto.randomUUID().replace(/-/g,'').slice(0,6),slug=name.toLocaleLowerCase('nl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const cup={id:'HV-CUP-'+tail.toUpperCase(),editionId:window.HVEditions?.activeId?.()||'HV-ED-2026-27',key:slug+'-'+tail,name,category,suffix,bracketSize,description:'Knock-out · '+bracketSize+' bekerplekken',teamIds:[],createdAt:now()};
    store.set('competitionDefinitions',[...store.get('competitionDefinitions',[]),cup]);window.HVWorkflow?.audit?.('competition.create',cup.id,null,cup,'Nieuw knock-outtoernooi');return{ok:true,cup:clone(cup)};
  }
  function initializeBracket(value,provided){
    const cup=definition(value),config=get(value);if(!cup||!config)return fail('Kies een bekend toernooi.');const permitted=guard(cup.id);if(!permitted.ok)return permitted;
    const current=fixtureList().filter(game=>game.tournamentId===cup.id);if(current.some(participantCommitted))return fail('Dit toernooi is al begonnen of gecontroleerd. Bestaande wedstrijden blijven behouden.');
    const approved=entrants(cup.id).filter(row=>row.status==='approved').map(row=>row.teamId),size=cup.bracketSize||16;
    let slots=provided||approved;if(!Array.isArray(slots)||slots.length<2||slots.length>size)return fail('Kies minimaal twee goedgekeurde teams binnen de bekeromvang.');
    if(slots.some(id=>id!=='bye'&&!approved.includes(id)))return fail('Alleen goedgekeurde deelnemers kunnen worden ingedeeld.');
    if(slots.some(id=>id!=='bye'&&(window.HVWorkflow?.canEnter?.(id)===false||window.HVCases?.isTeamExcluded?.(id,cup.id))))return fail('Een uitgesloten team kan geen bekerplek krijgen.');
    const assigned=slots.filter(id=>id!=='bye');if(new Set(assigned).size!==assigned.length)return fail('Een team kan maar één plek krijgen.');
    if(slots.length!==size){const filled=Array(size).fill('bye');assigned.slice(0,size/2).forEach((id,index)=>filled[index*2]=id);assigned.slice(size/2).forEach((id,index)=>filled[index*2+1]=id);slots=filled;}
    if(slots.some((id,index)=>index%2===0&&id==='bye'&&slots[index+1]==='bye'))return fail('Twee vrijlotingen kunnen niet tegenover elkaar staan. Kies een kleinere beker of voeg teams toe.');
    const opening=size===32?'first':size===16?'last16':'quarter',startIndex=roundOrder.indexOf(opening),rounds=roundOrder.slice(startIndex),matches=[];
    for(const [roundIndex,round]of rounds.entries())for(let index=0;index<sizes[round];index++){
      const existing=stage(current,cup.id,round)[index],id=existing?.id||'HV-W-'+cup.id.slice(7)+'-'+round.toUpperCase()+'-'+String(index+1).padStart(2,'0');
      const source=roundIndex?matches.filter(game=>game.roundKey===rounds[roundIndex-1]):[];
      const home=roundIndex?null:slots[index*2],away=roundIndex?null:slots[index*2+1];
      const row={id,editionId:window.HVEditions?.activeId?.()||'HV-ED-2026-27',tournamentId:cup.id,cupKey:cup.key,cupName:cup.name,roundKey:round,round:roundNames[round],bracketOrder:index,isGeneratedBracket:true,manual:false,seedStatus:'scheduled',status:'scheduled',date:({first:'2027-05-20',last16:'2027-05-27',quarter:'2027-06-03',semi:'2027-06-09',final:'2027-06-12'})[round],time:round==='final'?'19:30':'13:00',field:round==='final'?'Hoofdveld':'Veld '+(1+index%3),planningConfirmed:false,homeScore:null,awayScore:null,minute:null,homeSourceId:source[index*2]?.id||null,awaySourceId:source[index*2+1]?.id||null};
      if(window.HVEditions&&!window.HVEditions.isSeed()){const final=window.HVEditions.active().finalDay,offset={first:35,last16:28,quarter:14,semi:7,final:0}[round],date=new Date(final+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-offset);row.date=date.toISOString().slice(0,10);}
      const sourceRound=roundIndex?roundNames[rounds[roundIndex-1]].toLocaleLowerCase('nl'):null;
      fillSide(row,'home',home,sourceRound?'Winnaar '+sourceRound+' '+(index*2+1):home==='bye'?'Vrijgeloot':'Deelnemer volgt');
      fillSide(row,'away',away,sourceRound?'Winnaar '+sourceRound+' '+(index*2+2):away==='bye'?'Vrijgeloot':'Deelnemer volgt');matches.push(row);
    }
    const layout=matches.filter(row=>row.roundKey===opening).map((game,index)=>({id:game.id,home:slots[index*2],away:slots[index*2+1]}));
    config.layouts={[opening]:{matches:layout,slots:[...slots],at:now()}};config.drafts={};config.releases={};
    const rows=[...store.get('competitionBracketMatches',[]).filter(game=>game.tournamentId!==cup.id),...matches];
    const saved=persist(config,'Bekerindeling met '+assigned.length+' teams en '+(size-assigned.length)+' vrijlotingen gepubliceerd.','initialize',{competitionBracketMatches:rows});
    return saved.ok?{ok:true,cup:clone(cup),matches:matches.length,initialRound:opening}:saved;
  }
  function eligibleTeams(config,round,list){
    const previousGames=previous[round]?stage(list,config.cupId,previous[round]):[];
    const ids=previousGames.length?previousGames.map(winner).filter(Boolean):entrants(config.cupId).filter(row=>row.status==='approved').map(row=>row.teamId);
    for(const game of stage(list,config.cupId,round))if(!previousGames.length||previousGames.some(row=>!winner(row))||locked(game,list))ids.push(game.homeTeamId,game.awayTeamId);
    const excluded=new Set(entrants(config.cupId).filter(row=>row.status==='excluded').map(row=>row.teamId));
    const lockedIds=new Set(stage(list,config.cupId,round).filter(row=>locked(row,list)).flatMap(row=>[row.homeTeamId,row.awayTeamId]));
    return[...new Set(ids.filter(Boolean))].map(id=>identity.team(id)).filter(team=>team&&team.id.endsWith('-'+definition(config.cupId).suffix)&&((!excluded.has(team.id)&&window.HVWorkflow?.canEnter?.(team.id)!==false&&!window.HVCases?.isTeamExcluded?.(team.id,config.cupId))||lockedIds.has(team.id))).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  }
  function editor(value,round='quarter'){
    const config=get(value);if(!config)return null;const list=fixtureList(),games=stage(list,config.cupId,round);
    const matches=games.map(game=>({id:game.id,homeTeamId:game.homeTeamId,awayTeamId:game.awayTeamId,homeLabel:game.home,awayLabel:game.away,status:game.status,locked:locked(game,list),homeBye:!!game.homeBye,awayBye:!!game.awayBye}));
    const slots=games.flatMap(game=>[game.homeBye?'bye':game.homeTeamId||'',game.awayBye?'bye':game.awayTeamId||'']);
    const previousGames=previous[round]?stage(list,config.cupId,previous[round]):[];
    return{cupId:config.cupId,round,matches,teams:eligibleTeams(config,round,list),slots,draft:clone(config.drafts[round]||null),locked:matches.length>0&&matches.every(game=>game.locked),previousComplete:previousGames.every(game=>!!winner(game))};
  }
  function validateSlots(value,round,slots,publishing=false){
    const config=get(value),data=editor(value,round);if(!config||!data||!roundOrder.includes(round)||!data.matches.length)return fail('Kies een geldige beker en bestaande ronde.');
    const permitted=guard(config.cupId);if(!permitted.ok)return permitted;
    if(!Array.isArray(slots)||slots.length!==data.matches.length*2)return fail('Vul alle plekken van deze ronde in.');
    const clean=slots.map(id=>id||''),assigned=clean.filter(id=>id&&id!=='bye');if(new Set(assigned).size!==assigned.length)return fail('Een team kan maar één plek in deze ronde krijgen.');
    const allowed=new Set(data.teams.map(team=>team.id));if(assigned.some(id=>!allowed.has(id)))return fail('Kies uitsluitend deelnemende, gekwalificeerde teams in deze categorie.');
    for(let index=0;index<data.matches.length;index++){const pair=clean.slice(index*2,index*2+2),original=data.slots.slice(index*2,index*2+2);if(data.matches[index].locked&&pair.some((id,i)=>id!==original[i]))return fail('Een gestarte of gecontroleerde wedstrijd kan niet opnieuw worden ingedeeld.');if(pair.every(id=>id==='bye'))return fail('Twee vrijlotingen kunnen niet tegenover elkaar staan.');if(pair.includes('bye')&&!pair.some(id=>id&&id!=='bye'))return fail('Koppel een vrijloting aan een team.');if(publishing&&pair.some(id=>!id))return fail('Kies voor iedere plek een team of een vrijloting voordat je publiceert.');}
    if(publishing&&previous[round]){const release=window.HVCases?.canReleaseRound?.(config.cupId,round);if(release?.ok===false)return release;}
    if(publishing&&!data.previousComplete)return fail('De voorgaande ronde is nog niet volledig beslist. Bewaar de indeling eerst als concept.');
    return{ok:true,slots:clean,matches:data.matches.map((game,index)=>({...game,home:clean[index*2],away:clean[index*2+1]}))};
  }
  function saveDraft(value,round,slots){const check=validateSlots(value,round,slots);if(!check.ok)return check;const config=get(value);config.drafts[round]={slots:check.slots,at:now()};return persist(config,'Conceptindeling '+roundNames[round]+' bewaard.','draft');}
  function publishBracket(value,round,slots){const check=validateSlots(value,round,slots,true);if(!check.ok)return check;const config=get(value),list=fixtureList();config.layouts[round]={matches:check.matches.map(game=>({id:game.id,home:game.home,away:game.away})),slots:check.slots,at:now()};config.drafts[round]={slots:check.slots,at:now()};if(previous[round])config.releases[previous[round]]={signature:signature(stage(list,config.cupId,previous[round])),at:now()};return persist(config,roundNames[round]+' opnieuw ingedeeld en gepubliceerd; wedstrijd-ID’s blijven behouden.','bracket');}
  function releaseRound(value,round){const config=get(value);if(!config||!next[round])return fail('Kies een ronde met een vervolgronde.');const permitted=guard(config.cupId);if(!permitted.ok)return permitted;const release=window.HVCases?.canReleaseRound?.(config.cupId,next[round]);if(release?.ok===false)return release;const list=fixtureList(),games=stage(list,config.cupId,round);if(!games.length||games.some(game=>!winner(game)))return fail('Rond eerst alle wedstrijden of vrijlotingen in deze ronde af.');config.releases[round]={signature:signature(games),at:now()};return persist(config,roundNames[round]+' vrijgegeven voor '+roundNames[next[round]].toLowerCase()+'.','release');}
  function roundsForCup(value){const cup=definition(value);if(!cup)return[];const list=fixtureList();return roundOrder.filter(round=>stage(list,cup.id,round).length);}
  document.addEventListener('hv:state',({detail})=>{if(['competitionSettings','competitionDefinitions','competitionEntries','competitionBracketMatches'].includes(detail?.key))notify(null,'sync');});
  window.HVCompetition={get,saveRules,rulesForMatch,freezeMatchRules,validateResult,saveProgression,transformFixtures,editor,saveDraft,publishBracket,releaseRound,preview:(cup,round,slots)=>validateSlots(cup,round,slots),roundNames,roundOrder,roundsForCup,createCup,entrants,registerEntry,reviewEntry,initializeBracket,get definitions(){return definitions();}};
})();
