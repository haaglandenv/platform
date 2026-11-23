(() => {
  const S=window.HVDemo,I=window.HVIdentity,C=window.HVCompetition,W=window.HVWorkflow;
  if(!S||!I||!C||!W)return;
  const clone=value=>value===undefined?undefined:structuredClone(value);
  const clean=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
  const key=value=>clean(value).toLocaleLowerCase('nl');
  const integer=value=>['number','string'].includes(typeof value)&&/^\d+$/.test(String(value).trim())?Number(value):NaN;
  const validInput=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const fail=(error,field,step=0)=>({ok:false,error,field,step});
  const categories=Object.freeze([
    Object.freeze({suffix:'01',label:'Standaardteams',teamLabel:'1',halfMinutes:45}),
    Object.freeze({suffix:'V1',label:'Vrouwen',teamLabel:'VR1',halfMinutes:45}),
    Object.freeze({suffix:'23',label:'Onder 23',teamLabel:'O23',halfMinutes:45}),
    Object.freeze({suffix:'15',label:'Jeugd · JO15',teamLabel:'JO15-1',halfMinutes:35}),
  ]);
  const teamCategories=Object.freeze([
    ['01','Standaardteams','1'],['09','Jeugd · JO9','JO9-1'],['10','Jeugd · JO10','JO10-1'],
    ['11','Jeugd · JO11','JO11-1'],['12','Jeugd · JO12','JO12-1'],['13','Jeugd · JO13','JO13-1'],
    ['15','Jeugd · JO15','JO15-1'],['17','Jeugd · JO17','JO17-1'],['19','Jeugd · JO19','JO19-1'],
    ['23','Onder 23','O23'],['V1','Vrouwen','VR1'],['M11','Meiden · MO11','MO11-1'],
    ['M15','Meiden · MO15','MO15-1'],['M17','Meiden · MO17','MO17-1'],
  ].map(([suffix,label,teamLabel])=>Object.freeze({suffix,label,teamLabel})));
  const category=suffix=>categories.find(row=>row.suffix===suffix);
  const editionId=()=>window.HVEditions?.activeId?.()||'HV-ED-2026-27';
  function guard(cupId){
    if(window.HVAccess?.can?.('identity.manage')!==true)return fail('Alleen de toernooileiding kan verenigingen, teams en bekers aanmaken of koppelen.');
    const result=W.guard(cupId);return result?.ok===false?{...result,step:0}:{ok:true};
  }
  function selection(input,field,resolve,step){
    const values=input[field]??[];
    if(!Array.isArray(values))return fail('Kies een geldige lijst met '+(field==='teamIds'?'teams.':'bekers.'),field,step);
    const ids=[];
    for(const value of values){
      const found=typeof value==='string'&&resolve(clean(value));
      if(!found)return fail('Een gekozen '+(field==='teamIds'?'team':'beker')+' is niet meer beschikbaar.',field,step);
      if(ids.includes(found.id))return fail('Kies ieder '+(field==='teamIds'?'team':'toernooi')+' maar één keer.',field,step);
      ids.push(found.id);
    }
    return {ok:true,ids};
  }
  function booleanFields(input,fields,step){
    const invalid=fields.find(field=>input[field]!==undefined&&typeof input[field]!=='boolean');
    return invalid?fail('Controleer deze keuze.',invalid,step):{ok:true};
  }
  function validateCup(input={}){
    const permitted=guard();if(!permitted.ok)return permitted;
    if(!validInput(input))return fail('Controleer de toernooigegevens.');
    const name=clean(input.name),suffix=clean(input.suffix),type=category(suffix),bracketSize=integer(input.bracketSize);
    if(name.length<3||name.length>80)return fail('Vul een toernooinaam van 3 tot 80 tekens in.','name');
    if(C.definitions.some(row=>key(row.name)===key(name)))return fail('Er bestaat al een beker met deze naam.','name');
    if(!type)return fail('Kies een geldige categorie.','suffix');
    if(![8,16,32].includes(bracketSize))return fail('Kies 8, 16 of 32 bekerplekken.','bracketSize');
    const result={name,suffix,category:type.label,bracketSize};
    for(const [field,min,max,fallback,label]of [
      ['halfMinutes',10,60,type.halfMinutes,'speelduur per helft'],['halfTimeMinutes',0,30,15,'rustduur'],
      ['extraHalfMinutes',1,30,15,'verlengingshelft'],['maxDispensations',0,30,3,'maximum dispensaties'],
    ]){
      const value=input[field]===undefined?fallback:integer(input[field]);
      if(input[field]===''||input[field]===null||!Number.isInteger(value)||value<min||value>max)return fail('Vul voor '+label+' een waarde van '+min+' tot en met '+max+' in.',field,1);
      result[field]=value;
    }
    const choices=booleanFields(input,['extraTime','penalties'],1);if(!choices.ok)return choices;
    result.extraTime=input.extraTime??false;result.penalties=input.penalties??true;
    for(const [field,fallback]of [
      ['tournamentText','Het toernooi wordt gespeeld volgens directe uitschakeling. Alleen goedgekeurde deelnemers mogen spelen. De toernooileiding beoordeelt uitzonderingen.'],
      ['matchText','De teamleiding dient de spelersopgave voor de aftrap in. De scheidsrechter controleert de opgaven en bevestigt de eindstand.'],
    ]){
      const value=input[field]===undefined?fallback:String(input[field]??'').trim();
      if(!value||value.length>12000)return fail('Vul een reglementtekst van 1 tot 12.000 tekens in.',field,1);
      result[field]=value;
    }
    result.progression=input.progression??'auto';
    if(!['auto','manual'].includes(result.progression))return fail('Kies automatisch of handmatig doorstromen.','progression',1);
    const selected=selection(input,'teamIds',id=>I.team(id),2);if(!selected.ok)return selected;
    result.teamIds=selected.ids;
    if(selected.ids.length>bracketSize)return fail('Er zijn meer teams gekozen dan beschikbare bekerplekken.','teamIds',2);
    for(const id of selected.ids){
      if(!id.endsWith('-'+suffix))return fail('Kies alleen teams uit de categorie van deze beker.','teamIds',2);
      if(W.canEnter?.(id)===false||window.HVCases?.isTeamExcluded?.(id,null))return fail('Een gekozen team is uitgesloten van deelname.','teamIds',2);
    }
    const entryChoices=booleanFields(input,['approveEntries','initializeBracket'],2);if(!entryChoices.ok)return entryChoices;
    result.approveEntries=input.approveEntries??false;result.initializeBracket=input.initializeBracket??false;
    if(result.initializeBracket&&(!result.approveEntries||selected.ids.length<bracketSize/2))return fail('Keur minimaal '+(bracketSize/2)+' deelnemers goed voordat je de bekerindeling aanmaakt.','initializeBracket',2);
    return {ok:true,input:result};
  }
  function validateClub(input={}){
    const permitted=guard();if(!permitted.ok)return permitted;
    if(!validInput(input))return fail('Controleer de verenigingsgegevens.');
    const result={name:clean(input.name)};
    if(result.name.length<2||result.name.length>90)return fail('Vul een verenigingsnaam van 2 tot 90 tekens in.','name');
    if(I.listClubs().some(row=>key(row.name)===key(result.name)))return fail('Deze vereniging bestaat al.','name');
    for(const [field,max,step]of [['shortName',30,0],['city',80,0],['venue',120,0],['address',160,0],['postcode',10,0],['contactName',100,1],['email',254,1],['phone',40,1]]){
      result[field]=clean(input[field]);if(result[field].length>max)return fail('Gebruik maximaal '+max+' tekens.',field,step);
    }
    if(result.postcode){const postcode=result.postcode.toUpperCase().replace(/\s/g,'');if(!/^[1-9]\d{3}[A-Z]{2}$/.test(postcode))return fail('Vul een geldige Nederlandse postcode in.','postcode');result.postcode=postcode.slice(0,4)+' '+postcode.slice(4);}
    result.email=result.email.toLocaleLowerCase('nl');
    if(result.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))return fail('Vul een geldig e-mailadres in.','email',1);
    if(result.phone&&(!/^[+\d ()/.-]+$/.test(result.phone)||result.phone.replace(/\D/g,'').length<6||result.phone.replace(/\D/g,'').length>20))return fail('Vul een geldig telefoonnummer in.','phone',1);
    return {ok:true,input:result};
  }
  function validateTeam(input={}){
    const permitted=guard();if(!permitted.ok)return permitted;
    if(!validInput(input))return fail('Controleer de teamgegevens.');
    const mode=input.mode??'new',club=I.club(clean(input.clubId)),suffix=clean(input.suffix);
    if(!['new','existing'].includes(mode))return fail('Kies een nieuw of bestaand team.','mode');
    if(!club)return fail('Kies een bestaande vereniging.','clubId');
    if(!teamCategories.some(row=>row.suffix===suffix))return fail('Kies een geldige categorie.','suffix');
    const result={mode,clubId:club.id,suffix};let team;
    if(mode==='existing'){
      team=I.team(clean(input.teamId));
      if(!team||team.clubId!==club.id)return fail('Kies een bestaand team van deze vereniging.','teamId');
      if(!team.id.endsWith('-'+suffix))return fail('Het gekozen team hoort bij een andere categorie.','suffix');
      result.teamId=team.id;result.name=team.name;
    }else{
      result.name=clean(input.name);
      if(result.name.length<2||result.name.length>110)return fail('Vul een teamnaam van 2 tot 110 tekens in.','name');
      if(I.listTeams().some(row=>row.clubId===club.id&&key(row.name)===key(result.name)))return fail('Deze teamnaam bestaat al bij de gekozen vereniging.','name');
    }
    const selected=selection(input,'cupIds',id=>C.definitions.find(row=>row.id===id||row.key===id),1);if(!selected.ok)return selected;
    result.cupIds=selected.ids;
    const choices=booleanFields(input,['approveEntries'],1);if(!choices.ok)return choices;
    result.approveEntries=input.approveEntries??false;
    if(mode==='existing'&&!selected.ids.length)return fail('Kies minimaal één beker om dit team aan te koppelen.','cupIds',1);
    for(const id of selected.ids){
      const cup=C.definitions.find(row=>row.id===id),gate=guard(id);if(!gate.ok)return {...gate,field:'cupIds',step:1};
      if(cup.suffix!==suffix)return fail('Kies alleen bekers uit de categorie van dit team.','cupIds',1);
      if(W.excludedClubs?.()[club.id]?.excluded||team&&W.canEnter?.(team.id)===false||team&&window.HVCases?.isTeamExcluded?.(team.id,id))return fail('Dit team of deze vereniging is uitgesloten van deelname.','cupIds',1);
      const entries=C.entrants(id);
      if(team&&entries.some(row=>I.team(row.teamId)?.id===team.id))return fail('Dit team staat al ingeschreven voor '+cup.name+'.','cupIds',1);
      if(entries.filter(row=>['pending','approved'].includes(row.status)).length>=(cup.bracketSize||16))return fail(cup.name+' heeft geen vrije bekerplekken.','cupIds',1);
    }
    return {ok:true,input:result};
  }
  let busy=false;
  // Existing commands share the store object. Stage them synchronously, then publish
  // one complete patch so observers cannot see half a creation or half its links.
  function staged(action){
    if(busy)return fail('Deze registratie wordt al verwerkt.');busy=true;
    const original={get:S.get,set:S.set,setMany:S.setMany,snapshot:S.snapshot,transaction:S.transaction,restore:S.restore,dispatch:document.dispatchEvent};
    const before=clone(original.snapshot?.call(S)||{}),state=clone(before),patch={},events=[];
    let result;
    try{
      S.get=(name,fallback)=>state[name]??fallback;
      S.setMany=values=>{for(const [name,value]of Object.entries(values)){state[name]=clone(value);patch[name]=state[name];}};
      S.set=(name,value)=>{S.setMany({[name]:value});return value;};
      S.snapshot=()=>clone(state);S.transaction=S.setMany;
      document.dispatchEvent=event=>{events.push(event);return true;};
      result=action();
    }catch(error){result=fail(error?.message||'De registratie kon niet worden voltooid.');}
    finally{
      S.get=original.get;S.set=original.set;S.setMany=original.setMany;S.snapshot=original.snapshot;S.transaction=original.transaction;
      document.dispatchEvent=original.dispatch;
    }
    try{
      if(result?.ok!==true)return result||fail('De registratie kon niet worden voltooid.');
      if(original.restore){
        // restore persists before publishing and retains the previous in-memory state
        // when storage rejects the snapshot. Publish only the keys this command changed.
        let saved;
        document.dispatchEvent=()=>true;
        try{saved=original.restore.call(S,{...before,...patch});}finally{document.dispatchEvent=original.dispatch;}
        if(saved===false)return fail('De registratie kon niet blijvend worden opgeslagen. Maak ruimte op dit apparaat en probeer opnieuw.');
        for(const [name,value]of Object.entries(patch))original.dispatch.call(document,new CustomEvent('hv:state',{detail:{key:name,value}}));
      }else original.setMany.call(S,patch);
      for(const event of events)original.dispatch.call(document,event);
      original.dispatch.call(document,new CustomEvent('hv:setup',{detail:{action:result.cup?'cup':result.club?'club':'team'}}));
      return clone(result);
    }catch(error){
      if(S.restore)S.restore(before);
      return fail(error?.message||'De registratie kon niet worden opgeslagen.');
    }finally{busy=false;}
  }
  function command(kind,input,validate,action){
    const permitted=guard();if(!permitted.ok)return permitted;
    if(!validInput(input))return fail('Controleer de registratiegegevens.');
    const requestId=clean(input?.requestId),replayKey=[editionId(),kind,requestId].join('::'),payload=JSON.stringify(input,Object.keys(input||{}).filter(k=>k!=='requestId').sort());
    if(requestId.length>120)return fail('Gebruik een kortere registratiecode.','requestId');
    const replay=requestId&&S.get('identitySetupRequests',{})[replayKey];
    if(replay)return replay.payload===payload?clone(replay.result):fail('Deze registratiecode is al gebruikt voor andere gegevens.','requestId');
    const valid=validate(input);if(!valid.ok)return valid;
    return staged(()=>{
      const result=action(valid.input);if(!result.ok)return result;
      if(requestId)S.set('identitySetupRequests',{...S.get('identitySetupRequests',{}),[replayKey]:{payload,result:clone(result)}});
      return result;
    });
  }
  function link(cupId,teamId,approve){
    let result=C.registerEntry(cupId,teamId,'Inschrijving via de aanmaakwizard van de toernooileiding.');if(!result.ok)return {...result,field:'cupIds',step:1};
    if(approve){result=C.reviewEntry(cupId,teamId,'approved','De toernooileiding heeft deze deelnemer bij het aanmaken gecontroleerd.');if(!result.ok)return {...result,field:'cupIds',step:1};}
    if(window.HVRegistrations?.ensureRoster){result=window.HVRegistrations.ensureRoster(cupId,teamId);if(!result.ok)return result;}
    return {ok:true};
  }
  function createCup(input={}){
    return command('cup',input,validateCup,value=>{
      if(value.teamIds.length)window.HVRegistrations?.allRosters?.();
      const existing=new Set(C.definitions.map(row=>row.id)),created=C.createCup(value);if(!created.ok)return created;
      const cup=created.cup;if(existing.has(cup.id))return fail('Een uniek bekernummer kon niet worden aangemaakt. Probeer het opnieuw.');
      const rules=Object.fromEntries(['halfMinutes','halfTimeMinutes','extraTime','extraHalfMinutes','penalties','maxDispensations','tournamentText','matchText'].map(field=>[field,value[field]]));
      let result=C.saveRules(cup.id,rules);if(!result.ok)return {...result,step:1};
      for(const round of C.roundOrder.filter(round=>round!=='final')){result=C.saveProgression(cup.id,round,value.progression);if(!result.ok)return {...result,step:1};}
      for(const teamId of value.teamIds){result=link(cup.id,teamId,value.approveEntries);if(!result.ok)return {...result,field:'teamIds',step:2};}
      if(value.initializeBracket){result=C.initializeBracket(cup.id);if(!result.ok)return {...result,field:'initializeBracket',step:2};}
      return {ok:true,cup:C.definitions.find(row=>row.id===cup.id),entries:C.entrants(cup.id),initialized:value.initializeBracket};
    });
  }
  function createClub(input={}){return command('club',input,validateClub,value=>I.saveClub(value));}
  function saveTeam(input={}){
    return command('team',input,validateTeam,value=>{
      if(value.cupIds.length)window.HVRegistrations?.allRosters?.();
      const created=value.mode==='new'?I.saveTeam(value):{ok:true,team:I.team(value.teamId)};if(!created.ok)return created;
      for(const cupId of value.cupIds){const result=link(cupId,created.team.id,value.approveEntries);if(!result.ok)return result;}
      return {ok:true,team:created.team,entries:value.cupIds.map(cupId=>({cupId,...C.entrants(cupId).find(row=>row.teamId===created.team.id)})),existing:value.mode==='existing'};
    });
  }
  window.HVSetup={categories,teamCategories,validateCup,createCup,validateClub,createClub,validateTeam,saveTeam};
})();
