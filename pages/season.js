(() => {
  const page=document.getElementById('seizoen'),core=window.HVCompetition,fixtures=window.HVFixtures,identity=window.HVIdentity,store=window.HVDemo;
  if(!page||!core||!fixtures||!identity)return;
  const $=selector=>page.querySelector(selector),cupSelect=$('[data-season-cup]'),registerForm=$('[data-season-register-form]'),reviewDialog=$('[data-season-review-dialog]'),reviewForm=$('[data-season-review-form]');
  // The dialog is a sibling of the workspace, but remains inside the page section.
  const state={cup:store.get('seasonSelectedCup',fixtures.cups[0]?.id),view:'entries',preview:[],csvSignature:'',busy:false};
  const labels={approved:'Goedgekeurd',review:'Te beoordelen',pending:'Te beoordelen',returned:'Aanvulling nodig',excluded:'Uitgesloten'};
  const gameLabels={scheduled:'Gepland',live:'Live',finished:'Gespeeld',cancelled:'Afgelast',suspended:'Gestaakt',review:'In behandeling',bye:'Vrijloting',walkover:'Reglementair beslist'};
  const node=(tag,text,cls)=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;if(cls)element.className=cls;return element;};
  const notice=(text,error=false)=>{const target=$('[data-season-notice]');target.textContent=text||'';target.dataset.error=String(error);};
  const selected=()=>core.definitions.find(cup=>cup.id===state.cup)||fixtures.cups.find(cup=>cup.id===state.cup);
  const matches=()=>fixtures.all().filter(game=>game.tournamentId===state.cup);
  function describeError(result,fallback){return result?.error||fallback;}
  function success(result,text){if(!result?.ok){notice(describeError(result,'De wijziging kon niet worden opgeslagen.'),true);return false;}notice(text);render();return true;}
  function cupOptions(){
    const cups=core.definitions;
    if(!cups.some(cup=>cup.id===state.cup))state.cup=cups[0]?.id;
    const signature=cups.map(cup=>cup.id+':'+cup.name).join('|');
    if(cupSelect.dataset.options!==signature){cupSelect.replaceChildren(...cups.map(cup=>new Option(cup.name,cup.id)));cupSelect.dataset.options=signature;}
    cupSelect.value=state.cup||'';
  }
  function entries(){return core.entrants(state.cup)||[];}
  function renderEntries(){
    const rows=entries(),cup=selected(),registered=new Set(rows.map(entry=>entry.teamId));
    $('[data-season-count]').textContent=rows.filter(entry=>entry.status==='approved').length+' goedgekeurd · '+rows.length+' ingeschreven';
    const teamSelect=registerForm.elements.namedItem('teamId'),previous=teamSelect.value;
    const available=identity.listTeams().filter(team=>team.id.endsWith('-'+(cup?.suffix||'01'))&&!registered.has(team.id)).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
    teamSelect.replaceChildren(new Option(available.length?'Kies een team':'Alle beschikbare teams zijn ingeschreven',''),...available.map(team=>new Option(team.name,team.id)));
    if(available.some(team=>team.id===previous))teamSelect.value=previous;
    teamSelect.disabled=!available.length;registerForm.querySelector('button').disabled=!available.length;
    const list=$('[data-season-entries]');
    if(!rows.length){list.replaceChildren(node('p','Voor deze beker zijn nog geen teams ingeschreven. Voeg de eerste deelnemers hierboven toe.','season-empty'));return;}
    list.replaceChildren(...rows.map(entry=>{
      const team=typeof entry.team==='object'?entry.team:identity.team(entry.teamId),row=node('article',null,'season-row'),copy=node('div',null,'season-row-copy');
      copy.append(node('strong',team?.name||entry.teamId),node('p',team?.clubName||identity.club(team?.clubId)?.name||'Vereniging volgt'),node('small',[entry.teamId,team?.clubId].filter(Boolean).join(' · ')));
      if(entry.reason)copy.append(node('p',entry.reason));
      const badge=node('span',labels[entry.status]||entry.status,'season-row-status');badge.dataset.status=entry.status;
      const action=node('button','Beoordelen','hv-button hv-button-outline');action.type='button';action.dataset.seasonReview=entry.teamId;action.setAttribute('aria-label','Beoordeel inschrijving '+(team?.name||entry.teamId));
      row.append(copy,badge,action);return row;
    }));
  }
  function renderDraw(){
    const cup=selected(),all=matches(),bracket=all.filter(game=>game.isBracketNode!==false),approved=entries().filter(entry=>entry.status==='approved');
    const size=cup?.bracketSize||16,started=bracket.some(game=>['live','finished','suspended','review','walkover'].includes(game.status));
    const summary=$('[data-season-draw-summary]');summary.replaceChildren(node('strong',approved.length+' goedgekeurde teams'),node('span',size+' plekken in de startbracket'),node('span',bracket.length+' gekoppelde wedstrijden'));
    const initialize=$('[data-season-initialize]');initialize.disabled=started||!approved.length||approved.length>size;
    initialize.textContent=started?'Bestaande wedstrijdhistorie blijft behouden':bracket.length?'Startbracket opnieuw voorbereiden':'Maak bracket met goedgekeurde teams';
    $('[data-season-open-bracket]').href='#schema-'+(cup?.key||'senioren');
    const target=$('[data-season-draw-result]');
    if(!bracket.length){target.replaceChildren(node('p','Er is nog geen bekerindeling. Schrijf teams in, keur de deelnemers goed en maak de startbracket.','season-empty'));return;}
    const list=node('div',null,'season-match-list');
    for(const game of bracket.slice().sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id))){
      const row=node('article',null,'season-match-row'),copy=node('div');copy.append(node('strong',game.status==='bye'?(game.homeTeamId?game.home:game.away)+' · Vrijloting':game.home+' – '+game.away),node('small',game.id));
      const meta=node('div',null,'season-match-meta');meta.append(node('p',(game.round||fixtures.rounds?.[game.roundKey]||'Ronde')+' · '+(gameLabels[game.status]||game.status)),node('p',game.status==='bye'?'Rechtstreeks door':game.date+' · '+game.time+' · '+game.venue+' · '+game.field));
      const score=node('span',Number.isInteger(game.homeScore)&&Number.isInteger(game.awayScore)?game.homeScore+'–'+game.awayScore:game.status==='bye'?'Vrij':'–','season-match-score');row.append(copy,meta,score);list.append(row);
    }
    target.replaceChildren(list);
  }
  function selectView(view){
    state.view=['entries','draw','import','create','editions','identity'].includes(view)?view:'entries';
    page.querySelectorAll('[data-season-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.seasonView===state.view)));
    page.querySelectorAll('[data-season-panel]').forEach(panel=>panel.hidden=panel.dataset.seasonPanel!==state.view);
  }
  function render(){cupOptions();renderEntries();renderDraw();selectView(state.view);}
  document.addEventListener('hv:setup',event=>{const cupId=event.detail?.cupId;if(cupId&&core.definitions.some(c=>c.id===cupId)){state.cup=cupId;state.view='entries';resetPreview();render();}});
  cupSelect.addEventListener('change',()=>{state.cup=cupSelect.value;store.set('seasonSelectedCup',state.cup);resetPreview();notice('Je beheert nu '+selected().name+'.');render();});
  page.querySelectorAll('[data-season-view]').forEach(button=>button.addEventListener('click',()=>selectView(button.dataset.seasonView)));
  registerForm.addEventListener('submit',event=>{event.preventDefault();success(core.registerEntry(state.cup,registerForm.elements.teamId.value),'Het team is ingeschreven en staat klaar voor beoordeling.');});
  $('[data-season-entries]').addEventListener('click',event=>{
    const action=event.target.closest('[data-season-review]');if(!action)return;
    const entry=entries().find(item=>item.teamId===action.dataset.seasonReview),team=identity.team(action.dataset.seasonReview);if(!entry)return;
    reviewForm.elements.teamId.value=entry.teamId;reviewForm.elements.status.value=entry.status==='approved'?'approved':entry.status==='excluded'?'review':'approved';reviewForm.elements.reason.value='';$('[data-season-review-team]').textContent=team?.name||entry.teamId;$('[data-season-review-error]').hidden=true;reviewDialog.showModal();
  });
  page.querySelectorAll('[data-season-review-close]').forEach(button=>button.addEventListener('click',()=>reviewDialog.close()));
  reviewForm.addEventListener('submit',event=>{event.preventDefault();const result=core.reviewEntry(state.cup,reviewForm.elements.teamId.value,reviewForm.elements.status.value,reviewForm.elements.reason.value.trim());if(!result?.ok){$('[data-season-review-error]').textContent=describeError(result,'Het besluit kon niet worden opgeslagen.');$('[data-season-review-error]').hidden=false;return;}reviewDialog.close();notice('Het deelnemersbesluit is vastgelegd.');render();});
  $('[data-season-initialize]').addEventListener('click',()=>success(core.initializeBracket(state.cup),'De startbracket staat klaar. De wedstrijden zijn direct zichtbaar in het bekerschema en de centrale kalender.'));
  $('[data-season-open-competition]').addEventListener('click',()=>store.set('competitionSelectedCup',state.cup));

  const aliases={tournamentid:'tournamentId',toernooi:'tournamentId',beker:'tournamentId',cup:'tournamentId',cupkey:'tournamentId',roundkey:'roundKey',ronde:'roundKey',round:'roundKey',date:'date',datum:'date',time:'time',tijd:'time',aftrap:'time',hometeamid:'homeTeamId',thuisteam:'homeTeamId',home:'homeTeamId',awayteamid:'awayTeamId',uitteam:'awayTeamId',away:'awayTeamId',field:'field',veld:'field',status:'status',homescore:'homeScore',doelpuntenthuis:'homeScore',thuisscore:'homeScore',awayscore:'awayScore',doelpuntenuit:'awayScore',uitscore:'awayScore',penhome:'penHome',strafschoppenthuis:'penHome',penaway:'penAway',strafschoppenuit:'penAway',extratimeplayed:'extraTimePlayed',verlenginggespeeld:'extraTimePlayed',minute:'minute',minuut:'minute',reason:'reason',reden:'reason',duration:'duration',duur:'duration'};
  const norm=value=>String(value??'').trim().toLocaleLowerCase('nl').replace(/[\s_\-]/g,'');
  function parseCSV(text){
    const source=String(text||'').replace(/^\uFEFF/,'').trim();if(!source)return [];
    if(source.length>1000000)throw new Error('Het CSV-bestand is te groot. Gebruik maximaal 1 MB per import.');
    const heading=source.split(/\r?\n/,1)[0],delimiter=(heading.match(/;/g)||[]).length>=(heading.match(/,/g)||[]).length?';':',';
    const rows=[];let row=[],cell='',quoted=false;
    for(let index=0;index<source.length;index++){
      const char=source[index];
      if(char==='"'){if(quoted&&source[index+1]==='"'){cell+='"';index++;}else if(quoted||!cell.trim())quoted=!quoted;else throw new Error('Ongeldige aanhalingstekens in het CSV-bestand.');}
      else if(char===delimiter&&!quoted){row.push(cell.trim());cell='';}
      else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[index+1]==='\n')index++;row.push(cell.trim());if(row.some(value=>value!==''))rows.push(row);row=[];cell='';}
      else cell+=char;
    }
    if(quoted)throw new Error('Een aanhalingsteken in het CSV-bestand is niet afgesloten.');
    row.push(cell.trim());if(row.some(value=>value!==''))rows.push(row);
    if(rows.length>201)throw new Error('Importeer maximaal 200 wedstrijden tegelijk.');
    return rows;
  }
  function normalizedTeam(value){const direct=identity.team(String(value||'').trim());if(direct)return direct;const found=identity.listTeams().filter(team=>norm(team.name)===norm(value));return found.length===1?found[0]:null;}
  const roundAliases={first:'first',eersteronde:'first',last32:'first',zestiendefinale:'first',last16:'last16',achtstefinale:'last16',achtstefinales:'last16',quarter:'quarter',kwartfinale:'quarter',kwartfinales:'quarter',semi:'semi',halvefinale:'semi',halvefinales:'semi',final:'final',finale:'final'};
  const statusAliases={scheduled:'scheduled',planned:'scheduled',gepland:'scheduled',live:'live',bezig:'live',finished:'finished',afgelopen:'finished',gespeeld:'finished',uitgespeeld:'finished',historisch:'finished',cancelled:'cancelled',afgelast:'cancelled',suspended:'suspended',gestaakt:'suspended',review:'review',inbehandeling:'review'};
  const dateValid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const numeric=value=>value==null||value===''?null:Number(value);
  const minuteTime=time=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
  function overlap(a,b){if(a.date!==b.date||['cancelled','bye','walkover'].includes(a.status)||['cancelled','bye','walkover'].includes(b.status))return false;const aStart=minuteTime(a.time),bStart=minuteTime(b.time);if(aStart+(a.duration||105)<=bStart||bStart+(b.duration||105)<=aStart)return false;return a.homeTeamId===b.homeTeamId||a.homeTeamId===b.awayTeamId||a.awayTeamId===b.homeTeamId||a.awayTeamId===b.awayTeamId||a.venue===b.venue&&norm(a.field)===norm(b.field);}
  const signature=game=>[game.tournamentId,game.roundKey,game.date,game.time,game.homeTeamId,game.awayTeamId].join('|');
  function previewCSV(text,cupId=state.cup){
    const matrix=parseCSV(text);if(matrix.length<2)throw new Error('Voeg een kopregel en minstens één wedstrijd toe.');
    const headings=matrix[0].map(header=>aliases[norm(header)]||'');
    for(const required of ['date','time','homeTeamId','awayTeamId'])if(!headings.includes(required))throw new Error('De verplichte kolom '+required+' ontbreekt.');
    const mapped=headings.filter(Boolean);if(new Set(mapped).size!==mapped.length)throw new Error('Een kolom is dubbel gekoppeld. Gebruik iedere ondersteunde kopnaam één keer.');
    const existing=fixtures.all(),seen=new Set(),staged=[];
    return matrix.slice(1).map((cells,index)=>{
      const row={number:index+2,state:'valid',errors:[],payload:null},input=Object.fromEntries(headings.map((key,i)=>[key,cells[i]||'']).filter(([key])=>key));
      if(cells.length!==matrix[0].length)row.errors.push('Het aantal kolommen wijkt af van de kopregel.');
      const cup=core.definitions.find(item=>[item.id,item.key].includes(input.tournamentId)||norm(item.name)===norm(input.tournamentId))||(!input.tournamentId?core.definitions.find(item=>item.id===cupId):null);
      const home=normalizedTeam(input.homeTeamId),away=normalizedTeam(input.awayTeamId);
      if(!cup)row.errors.push('Onbekend toernooi.');if(!home)row.errors.push('Onbekend thuisteam: '+input.homeTeamId+'.');if(!away)row.errors.push('Onbekend uitteam: '+input.awayTeamId+'.');
      if(home&&away&&home.id===away.id)row.errors.push('Een team kan niet tegen zichzelf spelen.');
      if(cup&&[home,away].some(team=>team&&!team.id.endsWith('-'+cup.suffix)))row.errors.push('Een team past niet bij de categorie van deze beker.');
      const date=input.date,time=input.time.replace('.',':').replace(/:(\d\d):00$/,':$1'),roundKey=roundAliases[norm(input.roundKey||'first')],status=statusAliases[norm(input.status||'scheduled')];
      if(!dateValid(date))row.errors.push('Gebruik een geldige datum als JJJJ-MM-DD.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))row.errors.push('Gebruik een geldige aftrap als UU:MM.');if(!roundKey)row.errors.push('Onbekende speelronde.');if(!status)row.errors.push('Onbekende wedstrijdstatus.');
      const rules=core.rulesForMatch({tournamentId:cup?.id})?.rules||{},duration=input.duration?Number(input.duration):(Number(rules.halfMinutes)||45)*2+Number(rules.halfTimeMinutes??15),field=input.field||'Veld 1';
      const needsScore=['live','finished','suspended'].includes(status),homeScore=numeric(input.homeScore),awayScore=numeric(input.awayScore),penHome=numeric(input.penHome),penAway=numeric(input.penAway),minute=numeric(input.minute),reason=String(input.reason||'').trim();
      if(needsScore&&[homeScore,awayScore].some(value=>!Number.isInteger(value)||value<0||value>99))row.errors.push('Voor deze status zijn twee geldige scores nodig.');
      if(!Number.isInteger(duration)||duration<20||duration>180)row.errors.push('De gereserveerde tijd moet 20 tot 180 minuten zijn.');if(field.length>60)row.errors.push('Gebruik maximaal 60 tekens voor het veld.');if(reason.length>600)row.errors.push('Gebruik maximaal 600 tekens voor de reden.');if(['cancelled','suspended'].includes(status)&&!reason)row.errors.push('Afgelasting of staking vereist een reden.');if(status==='suspended'&&(!Number.isInteger(minute)||minute<0||minute>150))row.errors.push('Vul de minuut van staking in.');
      const payload={tournamentId:cup?.id,roundKey,date,time,homeTeamId:home?.id,awayTeamId:away?.id,field,duration,status,homeScore,awayScore,penHome,penAway,extraTimePlayed:['true','ja','1','yes'].includes(norm(input.extraTimePlayed)),minute,reason};
      row.payload=payload;row.title=(home?.name||input.homeTeamId)+' – '+(away?.name||input.awayTeamId);row.details=[cup?.name,date,time,field].filter(Boolean).join(' · ');
      if(cup){const guard=window.HVWorkflow?.guard(cup.id);if(guard?.ok===false)row.errors.push(guard.error);const result=core.validateResult({tournamentId:cup.id,status:'scheduled'},payload);if(!result.ok)row.errors.push(result.error);}
      if(!row.errors.length){
        const key=signature(payload);if(seen.has(key))row.errors.push('Deze wedstrijd staat dubbel in het CSV-bestand.');else seen.add(key);
        const duplicate=existing.find(game=>signature(game)===key);if(duplicate)row.errors.push('Deze wedstrijd bestaat al: '+duplicate.id+'.');
        const candidate={...payload,homeClubId:home.clubId,awayClubId:away.clubId};candidate.venue=fixtures.venueFor(candidate);
        const conflict=fixtures.conflictFor(candidate)||staged.find(game=>overlap(candidate,game));if(conflict)row.errors.push('Overlap in team of veld met '+(conflict.home||identity.team(conflict.homeTeamId)?.name||'een andere wedstrijd')+' om '+conflict.time+'.');
        if(typeof fixtures.validateFixture==='function'){const check=fixtures.validateFixture(payload);if(!check.ok)row.errors.push(check.error);}
        if(!row.errors.length)staged.push(candidate);
      }
      if(row.errors.length)row.state='error';return row;
    });
  }
  window.HVSeasonImport={parseCSV,previewCSV};
  function resetPreview(){state.preview=[];state.csvSignature='';$('[data-season-import]').disabled=true;$('[data-season-import]').textContent='Importeer geldige regels';$('[data-season-preview]').replaceChildren(node('p','Controleer de CSV om wedstrijden klaar te zetten voor de centrale kalender.'));}
  function renderPreview(){
    const good=state.preview.filter(row=>row.state==='valid').length,invalid=state.preview.filter(row=>['error','failed'].includes(row.state)).length,imported=state.preview.filter(row=>row.state==='imported').length;
    const summary=node('p',[good+' klaar',invalid+' aandacht nodig',imported?imported+' geïmporteerd':''].filter(Boolean).join(' · '),'season-preview-summary'),list=node('div',null,'season-preview-list');
    for(const entry of state.preview){const row=node('article',null,'season-preview-row');row.dataset.state=entry.state;row.append(node('strong','Regel '+entry.number+' · '+entry.title),node('p',entry.details));for(const error of entry.errors)row.append(node('p',error));if(entry.resultId)row.append(node('small','Toegevoegd aan de kalender · '+entry.resultId));else if(entry.state==='valid')row.append(node('small','Gecontroleerd · krijgt na import een uniek HV-ID'));list.append(row);}
    $('[data-season-preview]').replaceChildren(summary,list);$('[data-season-import]').textContent=good?'Importeer '+good+' geldige '+(good===1?'regel':'regels'):'Geen regels klaar voor import';$('[data-season-import]').disabled=state.busy||!good;
  }
  $('[data-season-csv]').addEventListener('input',resetPreview);
  $('[data-season-file]').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw new Error('Gebruik een CSV-bestand van maximaal 1 MB.');if(!/\.csv$/i.test(file.name))throw new Error('Exporteer het bestand uit Excel als CSV en kies dat CSV-bestand.');$('[data-season-csv]').value=await file.text();resetPreview();notice(file.name+' is ingelezen. Controleer de regels voordat je importeert.');}catch(error){notice(error.message,true);}});
  $('[data-season-template]').addEventListener('click',()=>{
    const cup=selected(),teams=identity.listTeams().filter(team=>team.id.endsWith('-'+(cup?.suffix||'01'))),home=teams[0],away=teams[1];
    $('[data-season-csv]').value=['tournamentId;roundKey;date;time;homeTeamId;awayTeamId;field;status;homeScore;awayScore',[cup?.id,'first','2027-05-01','14:00',home?.id,away?.id,'Veld 1','finished','2','1'].join(';')].join('\n');resetPreview();notice('Bewerkbaar voorbeeld ingevuld. Pas datum, teams en uitslag aan en controleer de CSV.');
  });
  $('[data-season-check]').addEventListener('click',()=>{try{state.preview=previewCSV($('[data-season-csv]').value);state.csvSignature=$('[data-season-csv]').value;renderPreview();notice('CSV gecontroleerd. De voorbeeldweergave toont per regel wat wordt toegevoegd en wat aandacht nodig heeft.');}catch(error){resetPreview();notice(error.message,true);}});
  $('[data-season-import]').addEventListener('click',()=>{
    if(state.busy||state.csvSignature!==$('[data-season-csv]').value)return;
    state.busy=true;let count=0;
    try{for(const entry of state.preview.filter(row=>row.state==='valid')){const result=fixtures.saveFixture(entry.payload);if(result?.ok){entry.state='imported';entry.resultId=result.match.id;count++;}else{entry.state='failed';entry.errors=[describeError(result,'De regel kon niet worden toegevoegd.')];}}}
    finally{state.busy=false;renderPreview();render();}
    const failed=state.preview.filter(row=>row.state==='failed').length;notice(count+' '+(count===1?'wedstrijd toegevoegd':'wedstrijden toegevoegd')+' aan de centrale kalender.'+(failed?' '+failed+' regels konden bij het opslaan niet worden toegevoegd; bekijk het resultaat.':''),failed>0);
    if(count)window.HVWorkflow?.audit('FIXTURES_IMPORTED',state.cup,null,{count},'CSV-import door toernooileiding');
  });
  function exportCSV(filename,columns,rows){const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"',text='\uFEFF'+[columns,...rows].map(row=>row.map(quote).join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('[data-season-export-entries]').addEventListener('click',()=>exportCSV('HV-deelnemers-'+(selected()?.key||'beker')+'.csv',['tournamentId','teamId','team','clubId','club','status','reason'],entries().map(entry=>{const team=identity.team(entry.teamId);return[state.cup,entry.teamId,team?.name,team?.clubId,team?.clubName,entry.status,entry.reason];})));
  $('[data-season-export-matches]').addEventListener('click',()=>{const columns=['tournamentId','roundKey','date','time','homeTeamId','awayTeamId','field','status','duration','homeScore','awayScore','penHome','penAway','extraTimePlayed','minute','reason'];exportCSV('HV-wedstrijden-'+(selected()?.key||'beker')+'.csv',columns,matches().filter(game=>!['bye','walkover'].includes(game.status)&&game.homeTeamId&&game.awayTeamId).map(game=>columns.map(key=>game[key])));});
  window.HVRender.watch(page,['hv:competition','hv:fixtures'],render);
  render();
})();

(() => {
  const page=document.getElementById('seizoen'),core=window.HVEditions,identity=window.HVIdentity,store=window.HVDemo;if(!page||!core||!identity)return;
  const $=s=>page.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const feedback=result=>{const target=$('[data-season-notice]');target.textContent=result.ok?(result.message||'De wijziging is zorgvuldig vastgelegd.'):result.error;target.dataset.error=String(!result.ok);};
  function options(select,rows){if(!select)return;const old=select.value;select.replaceChildren(...rows.map(row=>new Option(row.label,row.value)));if(rows.some(row=>row.value===old))select.value=old;}
  function editions(){const list=core.list();options($('[data-edition-select]'),list.map(row=>({value:row.id,label:row.label+(row.active?' · Actief geopend':' · Beschikbaar')})));$('[data-edition-select]').value=core.activeId();options($('[data-edition-source]'),list.map(row=>({value:row.id,label:row.label})));const current=core.active(),matches=window.HVFixtures?.all().length||0;$('[data-edition-summary]').innerHTML=[['Geopende editie',current.label],['Periode',current.startDate+' — '+current.endDate],['Finaledag',current.finalDay],['Wedstrijden',matches]].map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');}
  function persons(){const query=$('[data-person-search]').value.trim().toLowerCase(),rows=identity.people().filter(row=>!query||[row.name,row.relationCode,row.id].some(value=>String(value||'').toLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name,'nl')).slice(0,70);options($('[data-person-select]'),rows.map(row=>({value:row.id,label:row.name+' · '+row.id})));options($('[data-person-merge-target]'),[{value:'',label:'Kies de identiteit die behouden blijft'},...rows.map(row=>({value:row.id,label:row.name+' · '+row.id}))]);options($('[data-person-team]'),identity.listTeams().map(row=>({value:row.id,label:row.name})));detail();}
  function detail(){const person=identity.person($('[data-person-select]').value),links=person?identity.memberships(person.id):[];const sourceIds=[...new Set(links.filter(row=>row.editionId===core.activeId()&&row.status==='active').map(row=>row.teamId))];options($('[data-person-source-team]'),sourceIds.length?sourceIds.map(id=>({value:id,label:identity.team(id)?.name||id})):[{value:'',label:'Nog geen actieve teamrelatie'}]);$('[data-person-detail]').innerHTML=person?'<header><div><span class="hv-eyebrow">Blijvende spelersidentiteit</span><h3>'+esc(person.name)+'</h3><small>'+esc(person.id)+' · Handmatig vastgelegde KNVB-relatiecode '+esc(person.relationCode)+'</small></div><span class="season-count">'+links.length+' teamrelaties</span></header><div class="identity-memberships">'+links.map(row=>'<div><strong>'+esc(identity.team(row.teamId)?.name||row.teamId)+'</strong><span>'+esc(core.get(row.editionId)?.label||row.editionId)+' · '+esc(row.effectiveStatus==='scheduled'?'Gepland vanaf '+row.from:row.effectiveStatus==='ended'?'Afgesloten per '+row.until:row.effectiveStatus==='pending'?'Wacht op beoordeling':'Actief vanaf '+(row.from||'registratie'))+'</span><small>'+esc(row.cupId?window.HVFixtures?.cups.find(cup=>cup.id===row.cupId)?.name||'Historische bekerinschrijving':'Teamverband')+'</small></div>').join('')+'</div>':'<p>Geen personen gevonden. Spelers uit de ingediende lijsten verschijnen hier met hun blijvende HV-ID.</p>';}
  $('[data-edition-create]').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,input=Object.fromEntries(new FormData(form));for(const key of ['copyCups','copyRules','copyEntries','copyPlayers'])input[key]=form.elements.namedItem(key).checked;const result=core.create(input);feedback(result.ok?{ok:true,message:'Editie '+result.edition.label+' staat klaar. Open de editie wanneer je de voorbereiding wilt bekijken.'}:result);if(result.ok)editions();});
  $('[data-edition-open]').addEventListener('click',()=>{const selected=$('[data-edition-select]').value,result=core.activate(selected,'Editie geselecteerd in Seizoensbeheer');feedback(result.ok?{ok:true,message:'Je werkt nu in editie '+result.edition.label+'. De eerdere editie blijft afzonderlijk bewaard.'}:result);if(result.ok){editions();persons();}});
  $('[data-person-search]').addEventListener('input',persons);$('[data-person-select]').addEventListener('change',detail);
  $('[data-person-transfer]').addEventListener('submit',event=>{event.preventDefault();const input=Object.fromEntries(new FormData(event.currentTarget)),result=identity.transferPerson($('[data-person-select]').value,{...input,editionId:core.activeId()});feedback(result);if(result.ok){event.currentTarget.reset();persons();}});
  $('[data-person-merge]').addEventListener('submit',event=>{event.preventDefault();const result=identity.mergePeople($('[data-person-select]').value,$('[data-person-merge-target]').value,event.currentTarget.elements.reason.value);feedback(result);if(result.ok){event.currentTarget.reset();persons();}});
  window.HVRender.watch(page,['hv:edition','hv:identity','hv:registrations'],()=>{editions();persons();});editions();persons();
})();
