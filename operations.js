(() => {
  const store=window.HVDemo, fixtures=()=>window.HVFixtures, identity=window.HVIdentity;
  if(!store||!identity)return;
  const now=()=>window.HVClock?.now?.()||new Date().toISOString(),clone=value=>JSON.parse(JSON.stringify(value)),fail=error=>({ok:false,error});
  const clean=value=>String(value??'').trim();
  const officials=[
    {id:'HV-O-001',name:'Sam Verduin',level:'HV-gekwalificeerd · Senioren / jeugd',categories:['01','V1','23','15'],from:'13:00',until:'23:00'},
    {id:'HV-O-002',name:'Nadia de Vries',level:'HV-gekwalificeerd · Senioren / vrouwen',categories:['01','V1','23'],from:'13:00',until:'23:00'},
    {id:'HV-O-003',name:'Peter van Dijk',level:'HV-gekwalificeerd · Senioren / O23',categories:['01','23'],from:'15:00',until:'23:00'},
    {id:'HV-O-004',name:'Ilse van Leeuwen',level:'HV-gekwalificeerd · Vrouwen / jeugd',categories:['V1','15'],from:'10:00',until:'21:00'},
    {id:'HV-O-005',name:'Youssef El Amrani',level:'HV-gekwalificeerd · Alle categorieën',categories:['01','V1','23','15'],from:'10:00',until:'23:00'},
    {id:'HV-O-006',name:'René Jansen',level:'Clubscheidsrechter · Jeugd',categories:['15'],from:'10:00',until:'18:00'},
    {id:'HV-O-007',name:'Marieke Smit',level:'HV-gekwalificeerd · Alle categorieën',categories:['01','V1','23','15'],from:'10:00',until:'23:00'},
    {id:'HV-O-008',name:'Daan Bakker',level:'HV-gekwalificeerd · Alle categorieën',categories:['01','V1','23','15'],from:'10:00',until:'23:00'},
  ];
  const minute=time=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
  const duration=match=>Number(match.duration)||105;
  const allMatches=()=>fixtures()?.all().filter(match=>!['bye','walkover'].includes(match.status))||[];
  const guard=match=>window.HVWorkflow?.guard(match?.tournamentId)||{ok:true};
  function audit(action,entity,before,after,reason){window.HVWorkflow?.audit(action,entity,before,after,reason);}
  function notification(title,body,meta={}){
    if(window.HVWorkflow?.notify)return window.HVWorkflow.notify(title,body,meta);
    const item={id:'HV-NOT-'+crypto.randomUUID(),title,body,at:now(),role:'all',href:'#berichten',...meta};
    store.set('opsNotifications',[item,...store.get('opsNotifications',[])].slice(0,150));return item;
  }
  function changed(kind,detail={}){document.dispatchEvent(new CustomEvent('hv:operations',{detail:{kind,...detail}}));}
  function seedAssignment(match,index){
    const candidate=officials[index%officials.length],closed=['finished','live','suspended','walkover'].includes(match.status);
    if(match.id==='HV-2701'){
      const legacy=store.get('arbitration',null),name=legacy?.featured?.name||legacy?.candidate?.name||legacy?.name||'Sam Verduin';
      const chosen=officials.find(person=>person.name===name)||officials[0];
      const confirmed=!!store.get('officialSession',{}).confirmed||legacy?.featured?.status==='confirmed'||!!store.get('officialConfirmed',false)||!!store.get('official',{}).confirmed||!!store.get('officialAssignmentConfirmed',false);
      return {matchId:match.id,officialId:chosen.id,name:chosen.name,status:confirmed?'confirmed':'pending',confirmed,history:[]};
    }
    return {matchId:match.id,officialId:candidate.id,name:candidate.name,status:closed?'confirmed':'pending',confirmed:closed,history:[]};
  }
  function assignments(){
    const saved=store.get('operationsAssignments',{}),matches=allMatches().sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id)),result=[],reservations=[];
    function reserve(match,value){result.push(value);if(value.officialId)reservations.push({match,officialId:value.officialId});}
    for(const match of matches)if(saved[match.id]||match.isPrimary)reserve(match,saved[match.id]||seedAssignment(match,0));
    for(const match of matches){
      if(saved[match.id]||match.isPrimary)continue;
      const suffix=identity.team(match.homeTeamId)?.id.split('-').at(-1)||fixtures().cups.find(cup=>cup.id===match.tournamentId)?.suffix||(match.cupKey==='jeugd'?'15':match.cupKey==='vrouwen'?'V1':match.cupKey==='o23'?'23':'01'),start=minute(match.time),end=start+duration(match);
      const person=officials.find(candidate=>candidate.categories.includes(suffix)&&start>=minute(candidate.from)&&end<=minute(candidate.until)&&!reservations.some(other=>other.officialId===candidate.id&&other.match.date===match.date&&start<minute(other.match.time)+duration(other.match)+30&&minute(other.match.time)<end+30));
      const closed=['finished','live','suspended'].includes(match.status),value={matchId:match.id,officialId:person?.id||null,name:person?.name||'Nog geen official',status:person?(closed?'confirmed':'pending'):'open',confirmed:!!person&&closed,history:[]};reserve(match,value);
    }
    if(matches.some(match=>!saved[match.id]))store.set('operationsAssignments',Object.fromEntries(result.map(value=>[value.matchId,value])));
    return result;
  }
  function assignment(matchId){return assignments().find(item=>item.matchId===matchId)||null;}
  function availability(matchId,officialId){
    const match=fixtures()?.get(matchId),person=officials.find(item=>item.id===officialId);if(!match||!person)return fail('Kies een wedstrijd en scheidsrechter.');
    const suffix=identity.team(match.homeTeamId)?.id.split('-').at(-1)||fixtures().cups.find(cup=>cup.id===match.tournamentId)?.suffix||(match.cupKey==='jeugd'?'15':match.cupKey==='vrouwen'?'V1':match.cupKey==='o23'?'23':'01');
    if(!person.categories.includes(suffix))return fail('Deze scheidsrechter is niet bevoegd voor deze categorie.');
    const start=minute(match.time),end=start+duration(match);
    if(start<minute(person.from)||end>minute(person.until))return fail('De wedstrijd valt buiten de opgegeven beschikbaarheid.');
    const conflict=assignments().find(item=>{
      if(item.matchId===matchId||item.officialId!==officialId)return false;
      const other=fixtures().get(item.matchId);if(!other||other.date!==match.date||['cancelled','bye'].includes(other.status))return false;
      const otherStart=minute(other.time);return start<otherStart+duration(other)+30&&otherStart<end+30;
    });
    return conflict?fail('Dubbele aanstelling: '+fixtures().get(conflict.matchId).home+' – '+fixtures().get(conflict.matchId).away+'. Houd ook 30 minuten overdracht/reistijd vrij.'):{ok:true,official:clone(person)};
  }
  function assign(matchId,officialId,reason=''){
    const match=fixtures()?.get(matchId);if(!match)return fail('Wedstrijd niet gevonden.');const allowed=guard(match);if(!allowed.ok)return allowed;
    if(['live','finished','suspended','walkover'].includes(match.status))return fail('Voor een begonnen wedstrijd is de aanstelling vastgezet.');
    const check=availability(matchId,officialId);if(!check.ok)return check;
    const before=assignment(matchId),value={matchId,officialId,name:check.official.name,status:'pending',confirmed:false,at:now(),history:[{at:now(),text:'Aangesteld: '+check.official.name+(clean(reason)?' · '+clean(reason):'')},...(before?.history||[])]};
    store.set('operationsAssignments',{...store.get('operationsAssignments',{}),[matchId]:value});
    const session=store.get('officialMatchSessions',{})[matchId]||{};store.set('officialMatchSessions',{...store.get('officialMatchSessions',{}),[matchId]:{...session,confirmed:false}});
    if(match.isPrimary){store.set('arbitration',{...store.get('arbitration',{}),featured:{...value,id:value.officialId}});store.set('officialSession',{...store.get('officialSession',{}),confirmed:false});}
    audit('OFFICIAL_ASSIGNED',matchId,before,value,reason);notification('Nieuwe aanstelling',check.official.name+' is aangesteld voor '+match.home+' – '+match.away+'.',{href:'#official',matchId,cupId:match.tournamentId,teamIds:[match.homeTeamId,match.awayTeamId],role:'official',type:'assignment'});changed('assignment',{matchId});return {ok:true,assignment:clone(value)};
  }
  function confirmAssignment(matchId){
    const match=fixtures()?.get(matchId),before=assignment(matchId);if(!match||!before?.officialId)return fail('Er staat nog geen aanstelling klaar.');const allowed=guard(match);if(!allowed.ok)return allowed;
    const available=availability(matchId,before.officialId);if(!available.ok)return available;
    const value={...before,status:'confirmed',confirmed:true,confirmedAt:now(),history:[{at:now(),text:'Aanstelling bevestigd door '+before.name},...(before.history||[])]};
    store.set('operationsAssignments',{...store.get('operationsAssignments',{}),[matchId]:value});
    const sessions=store.get('officialMatchSessions',{});store.set('officialMatchSessions',{...sessions,[matchId]:{...sessions[matchId],confirmed:true}});
    if(match.isPrimary){const arb=store.get('arbitration',{});store.set('officialSession',{...store.get('officialSession',{}),confirmed:true});store.set('arbitration',{...arb,name:value.name,candidate:{id:value.officialId,name:value.name},featured:{...value,id:value.officialId},confirmed:true});}
    audit('OFFICIAL_CONFIRMED',matchId,before,value,'Aanstelling geaccepteerd');changed('assignment',{matchId});return {ok:true,assignment:clone(value)};
  }
  const changes=()=>clone(store.get('operationsChanges',[]));
  function proposeFixtureChange(matchId,input={}){
    const match=fixtures()?.get(matchId);if(!match)return fail('Wedstrijd niet gevonden.');const allowed=guard(match);if(!allowed.ok)return allowed;
    if(match.status!=='scheduled')return fail('Alleen nog te spelen wedstrijden kunnen worden afgestemd.');
    if(!match.homeTeamId||!match.awayTeamId)return fail('Wacht tot beide deelnemers bekend zijn.');
    const date=clean(input.date),time=clean(input.time).replace('.',':'),field=clean(input.field),reason=clean(input.reason);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!field||field.length>60)return fail('Vul een geldige datum, tijd en veld in.');
    if(reason.length<8||reason.length>600)return fail('Geef een duidelijke reden van 8 tot 600 tekens.');
    if(changes().some(item=>item.matchId===matchId&&['requested','opponent-approved'].includes(item.status)))return fail('Voor deze wedstrijd staat al een voorstel open.');
    const proposed={...match,date,time,field,venue:fixtures().venueFor({...match,date})},conflict=fixtures().conflictFor(proposed);if(conflict)return fail('Deze optie overlapt met '+conflict.home+' – '+conflict.away+' om '+conflict.time+'.');
    const value={id:'HV-CHANGE-'+crypto.randomUUID(),matchId,cupId:match.tournamentId,homeTeamId:match.homeTeamId,awayTeamId:match.awayTeamId,before:{date:match.date,time:match.time,field:match.field},proposed:{date,time,field},reason,status:'requested',at:now(),history:[{at:now(),text:'Thuisclub heeft een voorstel ingediend.'}]};
    store.set('operationsChanges',[value,...changes()]);audit('FIXTURE_CHANGE_REQUESTED',matchId,value.before,value.proposed,reason);notification('Voorstel voor een nieuwe aftrap',match.home+' – '+match.away+': '+date+' om '+time+'.',{href:'#club',matchId,cupId:match.tournamentId,teamIds:[match.awayTeamId],role:'club',type:'fixture'});changed('change',{matchId});return {ok:true,change:clone(value)};
  }
  function saveChange(value){store.set('operationsChanges',changes().map(item=>item.id===value.id?value:item));changed('change',{matchId:value.matchId});return {ok:true,change:clone(value)};}
  function approveChangeOpponent(id){const value=changes().find(item=>item.id===id);if(!value||value.status!=='requested')return fail('Dit voorstel wacht niet op de tegenstander.');const allowed=guard(fixtures().get(value.matchId));if(!allowed.ok)return allowed;value.status='opponent-approved';value.opponentApprovedAt=now();value.history.unshift({at:now(),text:'Uitclub akkoord. Toernooileiding beoordeelt het voorstel.'});audit('FIXTURE_CHANGE_OPPONENT_APPROVED',value.matchId,'requested',value.status,'Akkoord uitclub');notification('Wedstrijdvoorstel ter beoordeling',value.reason,{href:'#club',matchId:value.matchId,cupId:value.cupId,role:'leadership',type:'fixture'});return saveChange(value);}
  function decideChange(id,approved,note){
    const value=changes().find(item=>item.id===id);if(!value||!['requested','opponent-approved'].includes(value.status))return fail('Dit voorstel is al afgehandeld.');
    const match=fixtures().get(value.matchId),allowed=guard(match);if(!allowed.ok)return allowed;
    const reason=clean(note);if(reason.length<8||reason.length>600)return fail('Vul een besluitreden van 8 tot 600 tekens in.');
    if(approved&&value.status!=='opponent-approved')return fail('De uitclub moet eerst akkoord geven.');
    if(approved){if(['date','time','field'].some(key=>match[key]!==value.before[key]))return fail('De planning is ondertussen gewijzigd. Dien een nieuw voorstel in.');const result=fixtures().moveFixture(value.matchId,value.proposed);if(!result.ok)return result;}
    value.status=approved?'approved':'rejected';value.decidedAt=now();value.decisionReason=reason;value.history.unshift({at:now(),text:(approved?'Goedgekeurd en gepubliceerd: ':'Afgewezen: ')+reason});audit('FIXTURE_CHANGE_DECIDED',value.matchId,value.before,approved?value.proposed:value.before,reason);notification(approved?'Nieuwe aftrap bevestigd':'Wijzigingsvoorstel afgewezen',reason,{href:'#programma',matchId:value.matchId,cupId:value.cupId,teamIds:[value.homeTeamId,value.awayTeamId],role:'all',type:'fixture'});return saveChange(value);
  }
  const finals=()=>allMatches().filter(match=>match.date===fixtures().finalDay&&match.roundKey==='final').sort((a,b)=>a.time.localeCompare(b.time));
  function finalDetails(matchId){const match=fixtures()?.get(matchId),index=Math.max(0,fixtures()?.cups.findIndex(cup=>cup.id===match?.tournamentId)||0);return {homeRoom:String(index*2%10+1),awayRoom:String(index*2%10+2),homeArrival:'expected',awayArrival:'expected',...store.get('operationsFinals',{})[matchId]};}
  function updateFinal(matchId,input={}){
    const match=fixtures()?.get(matchId);if(!match||match.roundKey!=='final'||match.date!==fixtures().finalDay)return fail('Selecteer een finale uit de centrale kalender.');const allowed=guard(match);if(!allowed.ok)return allowed;
    const before=finalDetails(matchId),value={...before};
    for(const key of ['homeRoom','awayRoom'])if(input[key]!==undefined){if(!/^(10|[1-9])$/.test(String(input[key])))return fail('Kies een kleedkamer van 1 tot en met 10.');value[key]=String(input[key]);}
    if(value.homeRoom===value.awayRoom)return fail('Beide teams moeten een eigen kleedkamer hebben.');
    for(const side of ['home','away'])if(input[side+'Arrival']!==undefined){if(!['expected','here','late'].includes(input[side+'Arrival']))return fail('Kies een geldige aankomststatus.');value[side+'Arrival']=input[side+'Arrival'];}
    const time=input.time===undefined?match.time:clean(input.time),field=input.field===undefined?match.field:clean(input.field);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!field)return fail('Vul een geldige tijd en veld in.');
    const starts=minute(time)-45,ends=minute(time)+duration(match)+20;
    const roomConflict=finals().find(other=>{if(other.id===matchId)return false;const details=finalDetails(other.id),otherStart=minute(other.time)-45,otherEnd=minute(other.time)+duration(other)+20;return starts<otherEnd&&otherStart<ends&&[value.homeRoom,value.awayRoom].some(room=>[details.homeRoom,details.awayRoom].includes(room));});
    if(roomConflict)return fail('Een kleedkamer is al gereserveerd voor '+roomConflict.cupName+'. Kies een andere ruimte.');
    if(time!==match.time||field!==match.field){const result=fixtures().moveFixture(matchId,{date:match.date,time,field});if(!result.ok)return result;}
    value.updatedAt=now();store.set('operationsFinals',{...store.get('operationsFinals',{}),[matchId]:value});
    const legacy=store.get('finalday',{}),arrivals={...legacy.arrivals,[matchId+'-home']:value.homeArrival,[matchId+'-away']:value.awayArrival};store.set('finalday',{...legacy,arrivals,updatedAt:now(),log:[{at:now(),text:match.cupName+' · Ontvangst en kleedkamers bijgewerkt.'},...(legacy.log||[])].slice(0,40)});
    audit('FINALDAY_UPDATED',matchId,before,{...value,time,field},clean(input.reason)||'Finaledagafspraak bijgewerkt');changed('final',{matchId});return {ok:true,details:clone(value)};
  }
  function publishUpdate(text){const message=clean(text);if(message.length<8||message.length>500)return fail('Gebruik 8 tot 500 tekens.');const before=store.get('finalday',{});store.set('finalday',{...before,update:message,updatedAt:now(),log:[{at:now(),text:'Publieke update: '+message},...(before.log||[])].slice(0,40)});notification('Update finaledag',message,{href:'#finaledag',role:'all'});audit('FINALDAY_UPDATE','finalday',before.update,message,'Publieke update');changed('final');return {ok:true};}
  function excludeClub(clubId,excluded,reason){if(window.HVWorkflow?.excludeClub)return window.HVWorkflow.excludeClub(clubId,excluded,reason);if(!identity.club(clubId))return fail('Vereniging niet gevonden.');const allowed=window.HVWorkflow?.guard()||{ok:true};if(!allowed.ok)return allowed;const note=clean(reason);if(note.length<8)return fail('Vul een duidelijke besluitreden in.');const old=store.get('workflowExcludedClubs',{})[clubId]||null,value={excluded:!!excluded,reason:note,at:now()};store.set('workflowExcludedClubs',{...store.get('workflowExcludedClubs',{}),[clubId]:value});audit('CLUB_EXCLUSION',clubId,old,value,note);changed('club',{clubId});return {ok:true};}
  const notificationSeeds=[{id:'HV-OPS-NOT-SEED-1',title:'Samen voorbereid op de finaledag',body:'De vijf bekerfinales komen rechtstreeks uit de centrale kalender. Controleer aankomst, kleedkamers en arbitrage.',at:'2027-06-04T12:00:00+02:00',role:'all',href:'#finaleregie'},{id:'HV-OPS-NOT-SEED-2',title:'Spelerslijsten beoordelen',body:'Nieuwe lijsten en correcties staan klaar in Spelersbeheer. Iedere beslissing blijft in de geschiedenis staan.',at:'2027-06-05T09:00:00+02:00',role:'leadership',href:'#spelersbeheer'}];
  function notifications(){const shared=window.HVWorkflow?.notifications?.()||store.get('workflowNotifications',[]);return [...new Map([...shared,...store.get('opsNotifications',[]),...notificationSeeds].map(item=>[item.id,{...item,body:item.body||item.message||'',at:item.at||item.createdAt||now(),href:item.href||'#berichten'}])).values()].sort((a,b)=>b.at.localeCompare(a.at));}
  function threads(){return clone(store.get('operationsThreads',[{id:'HV-THREAD-1',subject:'Afstemming ontvangst finaledag',roles:['leadership','club'],clubId:'HV-V-101',messages:[{id:'HV-MSG-SEED',from:'Toernooileiding',body:'De ontvangstbalie opent 45 minuten voor de eerste finale. Geef wijzigingen in de teambegeleiding hier door.',at:'2027-06-04T10:00:00+02:00'}]}]));}
  function send(threadId,body,from='Teamleiding'){const value=clean(body);if(value.length<2||value.length>1000)return fail('Gebruik 2 tot 1000 tekens.');const rows=threads(),thread=rows.find(item=>item.id===threadId);if(!thread)return fail('Gesprek niet gevonden.');thread.messages.push({id:'HV-MSG-'+crypto.randomUUID(),from:clean(from).slice(0,60)||'Teamleiding',body:value,at:now()});store.set('operationsThreads',rows);changed('message');return {ok:true};}
  function newThread(subject,role,body){const title=clean(subject),message=clean(body);if(title.length<3||title.length>100||message.length<2||message.length>1000)return fail('Vul een onderwerp en bericht in.');const value={id:'HV-THREAD-'+crypto.randomUUID(),subject:title,roles:[role,'leadership'],messages:[{id:'HV-MSG-'+crypto.randomUUID(),from:role,body:message,at:now()}]};store.set('operationsThreads',[value,...threads()]);changed('message');return {ok:true,thread:value};}
  const readState=()=>store.get('operationsRead',{});
  function markRead(id,read=true){store.set('operationsRead',{...readState(),[id]:!!read});changed('read');}
  const volunteerPeople=[{id:'HV-VOL-001',name:'Jamie de Groot',clubId:'HV-V-101',from:'09:00',until:'21:00'},{id:'HV-VOL-002',name:'Noor van Beek',clubId:'HV-V-102',from:'12:00',until:'18:00'},{id:'HV-VOL-003',name:'Robin Smit',clubId:'HV-V-101',from:'09:00',until:'15:00'}];
  const timeText=minutes=>String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  function shifts(){const rows=finals(),last=rows.length?Math.max(...rows.map(match=>minute(match.time)+duration(match))):18*60;return [
    {id:'HV-SHIFT-001',title:'Ontvangstbalie',location:'Hoofdingang',clubId:'HV-V-101',from:'10:30',until:'14:30',capacity:3},
    {id:'HV-SHIFT-002',title:'Veldcoördinatie',location:'Hoofdveld en Veld 2',clubId:'HV-V-102',from:'13:00',until:timeText(last+15),capacity:2,matchIds:rows.map(match=>match.id)},
    {id:'HV-SHIFT-003',title:'Kantine en gastvrijheid',location:'Clubhuis',clubId:'HV-V-101',from:'11:00',until:'15:00',capacity:4},
    {id:'HV-SHIFT-004',title:'Podium en prijsuitreiking',location:'Podium',clubId:'HV-V-102',from:timeText(last+15),until:timeText(last+45),capacity:3,matchIds:rows.map(match=>match.id)},
    {id:'HV-SHIFT-005',title:'Gezamenlijke afsluiting',location:'Sportpark Houtrust',clubId:'HV-V-101',from:timeText(last+45),until:timeText(last+90),capacity:4},
  ];}
  function volunteerAvailability(personId){const person=volunteerPeople.find(item=>item.id===personId);return person?{from:person.from,until:person.until,...store.get('operationsVolunteerAvailability',{})[personId]}:null;}
  function setVolunteerAvailability(personId,input){const person=volunteerPeople.find(item=>item.id===personId);if(!person)return fail('Kies een vrijwilliger.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.from)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.until)||minute(input.from)>=minute(input.until))return fail('Kies een geldige begin- en eindtijd.');const value={from:input.from,until:input.until},conflict=shiftSignups().filter(item=>item.personId===personId).map(item=>shifts().find(shift=>shift.id===item.shiftId)).find(shift=>shift&&(minute(shift.from)<minute(value.from)||minute(shift.until)>minute(value.until)));if(conflict)return fail('Je bent al ingeschreven voor '+conflict.title+'. Meld je eerst af of kies een passende beschikbaarheid.');store.set('operationsVolunteerAvailability',{...store.get('operationsVolunteerAvailability',{}),[personId]:value});audit('VOLUNTEER_AVAILABILITY',personId,null,value,'Beschikbaarheid gewijzigd');changed('volunteer');return {ok:true};}
  const shiftSignups=()=>clone(store.get('operationsShiftSignups',[]));
  function signupShift(personId,shiftId){const person=volunteerPeople.find(item=>item.id===personId),shift=shifts().find(item=>item.id===shiftId);if(!person||!shift)return fail('Kies een vrijwilliger en dienst.');const rows=shiftSignups();if(rows.some(item=>item.personId===personId&&item.shiftId===shiftId))return fail('Je staat al voor deze dienst ingeschreven.');if(rows.filter(item=>item.shiftId===shiftId).length>=shift.capacity)return fail('Deze dienst is vol. Kies een andere taak.');const available=volunteerAvailability(personId);if(minute(shift.from)<minute(available.from)||minute(shift.until)>minute(available.until))return fail('Deze dienst valt buiten jouw beschikbaarheid.');const conflict=rows.filter(item=>item.personId===personId).map(item=>shifts().find(row=>row.id===item.shiftId)).find(other=>other&&minute(shift.from)<minute(other.until)&&minute(other.from)<minute(shift.until));if(conflict)return fail('Deze dienst overlapt met '+conflict.title+'.');const value={personId,shiftId,at:now()};store.set('operationsShiftSignups',[...rows,value]);audit('VOLUNTEER_SIGNUP',shiftId,null,value,'Vrijwilliger heeft zich ingeschreven');notification('Nieuwe dienstinschrijving',person.name+' helpt bij '+shift.title+' van '+shift.from+' tot '+shift.until+'.',{href:'#vrijwilligers',role:'leadership',type:'assignment'});changed('volunteer');return {ok:true};}
  function leaveShift(personId,shiftId){const before=shiftSignups(),rows=before.filter(item=>!(item.personId===personId&&item.shiftId===shiftId));if(rows.length===before.length)return fail('Deze inschrijving bestaat niet.');store.set('operationsShiftSignups',rows);audit('VOLUNTEER_WITHDRAWAL',shiftId,{personId,shiftId},null,'Vrijwilliger heeft zich afgemeld');changed('volunteer');return {ok:true};}
  let baseline=null,syncing=false;
  function syncFixtures(){if(syncing||!fixtures())return;syncing=true;try{const rows=allMatches(),next=new Map(rows.map(match=>[match.id,JSON.stringify([match.date,match.time,match.field,match.status,match.homeScore,match.awayScore])]));if(baseline)for(const match of rows){const signature=next.get(match.id);if(baseline.get(match.id)===signature)continue;notification(baseline.has(match.id)?'Wedstrijd bijgewerkt':'Wedstrijd toegevoegd',match.home+' – '+match.away+' · '+match.date+' '+match.time+' · '+match.venue+' · '+match.field+(Number.isInteger(match.homeScore)?' · '+match.homeScore+'–'+match.awayScore:''),{href:'#wedstrijd-'+match.id,matchId:match.id,cupId:match.tournamentId,teamIds:[match.homeTeamId,match.awayTeamId],role:'all',type:match.status==='finished'?'result':'fixture'});}baseline=next;}finally{syncing=false;}}
  window.HVOperations={volunteers:()=>clone(volunteerPeople),shifts,volunteerAvailability,setVolunteerAvailability,shiftSignups,signupShift,leaveShift,officials:()=>clone(officials),assignments,assignment,availability,assign,confirmAssignment,changes,proposeFixtureChange,approveChangeOpponent,decideChange,finals,finalDetails,updateFinal,publishUpdate,excludeClub,notifications,threads,send,newThread,markRead,readState};
  window.HVArbitration={confirm:()=>confirmAssignment('HV-2701').ok,assignment:()=>assignment('HV-2701')};
  document.addEventListener('hv:fixtures',syncFixtures);syncFixtures();
})();
