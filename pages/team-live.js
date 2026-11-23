(() => {
  const root=document.getElementById('teamlive'),core=window.HVMatchCenter,fixtures=window.HVFixtures,identity=window.HVIdentity;
  if(!root||!core||!fixtures)return;
  const $=selector=>root.querySelector(selector);
  const teamSelect=$('[data-tlive-team]'),matchSelect=$('[data-tlive-match]'),form=$('[data-tlive-form]'),fields=$('[data-tlive-fields]'),feedback=$('[data-tlive-feedback]');
  const field=name=>form.elements.namedItem(name);
  const liveMatch=fixtures.all().find(match=>match.status==='live');
  let teamId=window.HVDemo.get('teamLiveTeam',liveMatch?.homeTeamId||identity.fixture.home.teamId),matchId=liveMatch?.id||identity.fixture.id,duplicateInput=null,duplicateEventId=null;
  const labels={scheduled:'Gepland',live:'Live',finished:'Definitief',cancelled:'Afgelast',suspended:'Gestaakt',review:'Bij de commissie'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalDate=date=>new Date(date+'T12:00:00Z').toLocaleDateString('nl-NL',{day:'numeric',month:'long',timeZone:'UTC'});
  const current=()=>fixtures.get(matchId);
  const sideOf=match=>match.homeTeamId===teamId?'home':match.awayTeamId===teamId?'away':null;
  function teams(){
    const used=new Set(fixtures.all().flatMap(match=>[match.homeTeamId,match.awayTeamId]).filter(Boolean));
    const rows=identity.listTeams().filter(team=>used.has(team.id)&&(!window.HVAccess||window.HVAccess.can('team.manage',{teamId:team.id}))).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
    if(!rows.some(team=>team.id===teamId))teamId=rows[0]?.id;
    teamSelect.replaceChildren(...rows.map(team=>new Option(team.name,team.id)));teamSelect.value=teamId;
  }
  function matches(){
    const rows=fixtures.all().filter(match=>match.status!=='bye'&&(match.homeTeamId===teamId||match.awayTeamId===teamId)).sort((a,b)=>Number(b.status==='live')-Number(a.status==='live')||(b.date+b.time).localeCompare(a.date+a.time));
    if(!rows.some(match=>match.id===matchId))matchId=rows[0]?.id;
    matchSelect.replaceChildren(...rows.map(match=>new Option(normalDate(match.date)+' · '+match.time+' · '+match.home+' – '+match.away,match.id)));matchSelect.value=matchId||'';
  }
  function renderForm(){
    const match=current(),side=match&&sideOf(match);
    let gate='';
    if(!match||!side)gate='Selecteer een wedstrijd waarbij jouw team speelt.';
    else if(core.result(match.id))gate='De scheidsrechter heeft het wedstrijdbeeld bevestigd. De registratie is gesloten.';
    else if(match.status!=='live')gate=match.status==='scheduled'?'Je kunt registreren zodra de scheidsrechter de wedstrijd heeft gestart.':'Deze wedstrijd staat niet open voor live invoer.';
    else if(match.id===identity.fixture.id&&(!window.HVEligibility?.hasKickedOff()||window.HVEligibility.reviewState(side).status!=='approved'))gate='De spelersopgave moet zijn goedgekeurd en de aftrap bevestigd.';
    const list=match&&side?core.players(match.id,side).filter(person=>person.available!==false):[];
    if(!gate&&!list.length)gate='Er staan nog geen goedgekeurde spelers klaar voor dit team.';
    fields.disabled=!!gate;
    $('[data-tlive-gate]').textContent=gate||'Je registreert voor '+identity.team(teamId).name+'. De scheidsrechter ziet jouw invoer direct ter controle.';
    const player=field('playerId').value,incoming=field('relatedPlayerId').value;
    field('playerId').replaceChildren(new Option('Kies een speler',''),...list.map(person=>new Option(person.number+' · '+person.name,person.id)));
    field('relatedPlayerId').replaceChildren(new Option('Kies een speler',''),...list.map(person=>new Option(person.number+' · '+person.name,person.id)));
    if(list.some(person=>person.id===player))field('playerId').value=player;
    if(list.some(person=>person.id===incoming))field('relatedPlayerId').value=incoming;
    const substitution=field('type').value==='substitution',incident=field('type').value==='incident';
    $('[data-tlive-incoming-wrap]').hidden=!substitution;
    field('relatedPlayerId').required=substitution;
    field('playerId').required=!incident;
    field('note').required=incident;
    $('[data-tlive-player-label]').firstChild.textContent=substitution?'Speler eruit':'Speler';
    if(!field('minute').value)field('minute').value=String(match?.minute||0);
  }
  function renderScore(){
    const match=current();if(!match){$('[data-tlive-score]').textContent='Geen wedstrijd geselecteerd.';return;}
    const hasScore=Number.isInteger(match.homeScore)&&Number.isInteger(match.awayScore);
    $('[data-tlive-score]').innerHTML='<div class="tlive-score-team"><h3>'+esc(match.home)+'</h3><small>'+esc(match.homeTeamId===teamId?'Jouw team':'Thuisteam')+'</small></div><div class="tlive-score-centre"><strong>'+esc(hasScore?match.homeScore+'–'+match.awayScore:'–')+'</strong><span>'+esc((labels[match.status]||'Gepland')+(match.status==='live'?' '+match.minute+'′':''))+'</span></div><div class="tlive-score-team"><h3>'+esc(match.away)+'</h3><small>'+esc(match.awayTeamId===teamId?'Jouw team':'Uitteam')+'</small></div><p class="tlive-score-meta">'+esc(match.id+' · '+match.cupName+' · '+normalDate(match.date)+' · '+match.time+' · '+match.venue+' · '+match.field)+'</p>';
  }
  function renderEvents(){
    const match=current(),rows=match?core.events(match.id):[],queued=match?window.HVSync?.pending?.(match.id)||[]:[];
    $('[data-tlive-pending]').textContent=rows.filter(row=>row.status==='provisional').length+' ter controle'+(queued.length?' · '+queued.length+' lokaal bewaard':'');
    $('[data-tlive-events]').innerHTML=rows.length?rows.slice().reverse().map(row=>'<article class="tlive-event" data-status="'+esc(row.status)+'"><time>'+esc(row.minuteDisplay||row.minute)+'′</time><div><h3>'+esc(core.labels[row.type]||row.type)+(row.playerName?' · '+esc(row.playerName):'')+'</h3><p>'+esc((row.side==='home'?match.home:match.away)+(row.relatedPlayerName?' · '+row.relatedPlayerName+' erin':''))+'</p>'+(row.note?'<p>'+esc(row.note)+'</p>':'')+(row.rejectionReason?'<p>'+esc(row.rejectionReason)+'</p>':'')+'<span class="tlive-event-status">'+esc(row.status==='provisional'?'Voorlopig · teammanager':row.status==='rejected'?'Afgewezen door scheidsrechter':'Bevestigd')+'</span></div></article>').join(''):'<p class="tlive-event-empty">De wedstrijdgeschiedenis begint hier. Goedgekeurde registraties van beide teams verschijnen in dit overzicht.</p>';if(queued.length){const row=document.createElement('p');row.className='tlive-gate';row.textContent=queued.length+' registraties staan nog op dit apparaat. ';const a=document.createElement('a');a.href='#werkzekerheid';a.textContent='Open de synchronisatiewachtrij';row.append(a);$('[data-tlive-events]').prepend(row);}
  }
  function renderBrief(){window.HVCompetitionUI?.renderMatchBrief($('[data-tlive-brief]'),current());}
  function render(){matches();renderScore();renderBrief();renderForm();renderEvents();}
  teamSelect.addEventListener('change',()=>{teamId=teamSelect.value;matchId='';window.HVDemo.set('teamLiveTeam',teamId);feedback.textContent='';render();});
  matchSelect.addEventListener('change',()=>{matchId=matchSelect.value;field('minute').value='';feedback.textContent='';renderScore();renderBrief();renderForm();renderEvents();});
  field('type').addEventListener('change',renderForm);
  form.addEventListener('submit',event=>{
    event.preventDefault();const match=current();if(!match)return;
    const payload={matchId,type:field('type').value,minute:Number(field('minute').value),addedMinutes:Number(field('addedMinutes').value)||0,commandId:'HV-CMD-'+crypto.randomUUID(),side:sideOf(match),playerId:field('playerId').value,relatedPlayerId:field('type').value==='substitution'?field('relatedPlayerId').value:null,note:field('note').value};
    const result=core.addEvent(payload,{role:'team',teamId,side:sideOf(match)});
    feedback.dataset.error=String(!result.ok);feedback.textContent=result.ok?(result.queued?'Op dit apparaat bewaard; nog niet verwerkt. Bekijk de wachtrij in Werkzekerheid.':'Gedeeld met de scheidsrechter in deze demo. Je registratie is voorlopig.'):result.error;if(result.duplicate){duplicateInput=payload;duplicateEventId=result.existingEventId;$('[data-tlive-duplicate-note]').textContent=(core.labels[result.existingEvent.type]||'Gebeurtenis')+' · '+(result.existingEvent.minuteDisplay||result.existingEvent.minute)+'′ · '+result.existingEvent.playerName;$('[data-tlive-duplicate]').hidden=false;}
    if(result.ok){$('[data-tlive-duplicate]').hidden=true;duplicateInput=null;duplicateEventId=null;field('note').value='';field('playerId').value='';field('relatedPlayerId').value='';render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$('[data-tlive-score]').animate([{opacity:.5},{opacity:1}],{duration:260});}
  });
  $('[data-tlive-link]').addEventListener('click',()=>{const match=current();if(!match||!duplicateInput||!duplicateEventId)return;const result=core.linkObservation(match.id,duplicateEventId,duplicateInput,{role:'team',teamId,side:sideOf(match)});feedback.textContent=result.ok?'Jouw waarneming is gekoppeld aan dezelfde gebeurtenis. De score telt eenmaal.':result.error;feedback.dataset.error=String(!result.ok);if(result.ok){$('[data-tlive-duplicate]').hidden=true;duplicateInput=null;duplicateEventId=null;render();}});
  if(window.HVRender)window.HVRender.watch(root,['hv:fixtures','hv:match-events','hv:sync','hv:clock','hv:access'],()=>{teams();render();});else{document.addEventListener('hv:fixtures',render);document.addEventListener('hv:match-events',render);}
  if(window.HVRender)window.HVRender.watch(root,['hv:kits','hv:competition'],renderBrief);else{document.addEventListener('hv:kits',renderBrief);document.addEventListener('hv:competition',renderBrief);}
  teams();render();
})();
