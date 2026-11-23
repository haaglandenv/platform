(() => {
  const page=document.querySelector('#planning'), source=window.HVFixtures, identity=window.HVIdentity;
  if(!page||!source||!identity) return;
  const $=selector=>page.querySelector(selector), form=$('[data-plan-form]'), dialog=$('[data-plan-dialog]'), canvas=$('[data-plan-canvas]');
  const field=name=>form.elements.namedItem(name);
  let moveProposal=null;
  const state={view:'day',date:source.today,cup:'',status:'',query:'',selected:'HV-2701',drag:null,mode:'new',undo:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateOf=value=>new Date(value+'T12:00:00Z');
  const iso=date=>date.toISOString().slice(0,10);
  const add=(value,days)=>{const date=dateOf(value);date.setUTCDate(date.getUTCDate()+days);return iso(date);};
  const monday=value=>add(value,-(dateOf(value).getUTCDay()+6)%7);
  const fmt=(value,options)=>dateOf(value).toLocaleDateString('nl-NL',{timeZone:'UTC',...options});
  const labels={scheduled:'Gepland',live:'Bezig',finished:'Gespeeld',cancelled:'Afgelast',suspended:'Gestaakt',review:'In beoordeling'};
  const playable=()=>source.all().filter(game=>game.status!=='bye');
  const all=()=>playable().filter(game=>(!state.cup||game.cupKey===state.cup)&&(!state.status||game.status===state.status)&&(!state.query||[game.home,game.away,game.id,game.venue].join(' ').toLocaleLowerCase('nl').includes(state.query)));
  function message(text,tone='success'){const node=$('[data-plan-message]');node.textContent=text;node.parentElement.dataset.tone=tone;$('[data-plan-undo]').hidden=!state.undo;}
  function card(game,compact=false){
    const movable=game.status==='scheduled';
    return `<button type="button" class="plan-card ${compact?'is-compact':''} is-${esc(game.status)}" data-plan-match="${esc(game.id)}" draggable="${movable}" aria-pressed="${state.selected===game.id}" aria-label="${esc(game.time+' '+game.home+' tegen '+game.away+', '+labels[game.status])}"><span class="plan-card-time"><time>${esc(game.time)}</time><span>${movable?'⠿':labels[game.status]}</span></span><strong>${esc(game.home)}<br>${esc(game.away)}</strong><small>${esc(game.cupName)} · ${esc(game.round)}<br>${esc(game.venue)} · ${esc(game.field)}</small><em>${esc(game.id)}</em></button>`;
  }
  function week(games){
    const start=monday(state.date);
    return `<div class="plan-week">${Array.from({length:7},(_,i)=>{const day=add(start,i),matches=games.filter(game=>game.date===day);return `<section class="plan-week-day ${day===source.today?'is-today':''}" data-plan-drop="${day}"><header><button type="button" data-plan-day="${day}"><span>${fmt(day,{weekday:'short'})}</span><strong>${fmt(day,{day:'numeric',month:'short'})}</strong></button><small>${matches.length} duels</small></header><div>${matches.length?matches.map(game=>card(game)).join(''):'<p class="plan-drop-hint">Sleep een duel naar deze dag</p>'}</div></section>`;}).join('')}</div>`;
  }
  function month(games){
    const date=dateOf(state.date);date.setUTCDate(1);const start=monday(iso(date));
    return '<div class="plan-month"><div class="plan-weekdays">'+['ma','di','wo','do','vr','za','zo'].map(day=>'<span>'+day+'</span>').join('')+'</div><div class="plan-month-grid">'+Array.from({length:42},(_,i)=>{const day=add(start,i),matches=games.filter(game=>game.date===day);return `<section class="plan-month-day ${day.slice(0,7)!==state.date.slice(0,7)?'is-outside':''} ${day===source.today?'is-today':''}" data-plan-drop="${day}"><button type="button" class="plan-day-number" data-plan-day="${day}" aria-label="${fmt(day,{weekday:'long',day:'numeric',month:'long'})}">${Number(day.slice(-2))}</button>${matches.slice(0,2).map(game=>card(game,true)).join('')}${matches.length>2?`<button type="button" class="plan-more" data-plan-day="${day}">+${matches.length-2} wedstrijden</button>`:''}</section>`;}).join('')+'</div></div>';
  }
  const timelineStart=13*60,timelineEnd=23*60,timelineStep=30;
  const timeMinutes=value=>{const [hour,minute]=String(value||'00:00').split(':').map(Number);return hour*60+minute;};
  const clockMinutes=value=>String(Math.floor(value/60)%24).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
  function timelineBar(game){
    const start=timeMinutes(game.time),end=start+(Number(game.duration)||90);
    const outside=end<=timelineStart||start>=timelineEnd;
    const offset=outside?(start<timelineStart?0:79):Math.max(0,(start-timelineStart)/(timelineEnd-timelineStart)*100);
    const span=outside?21:Math.max(2,(Math.min(end,timelineEnd)-Math.max(start,timelineStart))/(timelineEnd-timelineStart)*100);
    const clipped=start<timelineStart||end>timelineEnd;
    const movable=game.status==='scheduled';
    const actualTime=game.time+' – '+clockMinutes(end);
    return `<button type="button" class="plan-card plan-timeline-bar is-${esc(game.status)} ${outside?'is-outside-window':''}" data-plan-match="${esc(game.id)}" draggable="${movable}" aria-pressed="${state.selected===game.id}" style="--plan-bar-offset:${offset}%;--plan-bar-span:${span}%" aria-label="${esc(actualTime+' '+game.home+' tegen '+game.away+', '+labels[game.status]+(clipped?', buiten tijdvenster 13:00 tot 23:00':''))}"><span class="plan-card-time"><time>${esc(actualTime)}</time><span aria-hidden="true">${movable?'⠿':''}</span></span><strong>${esc(outside?'Buiten tijdvenster':game.cupName)}</strong><small>${esc(clipped&&!outside?'Deels buiten tijdvenster':labels[game.status])}</small></button>`;
  }
  function timelineLane(game){
    return `<div class="plan-timeline-lane" data-plan-timeline-lane data-plan-drop="${state.date}" aria-label="Tijdlijn ${game?esc(game.home+' tegen '+game.away):'lege speeldag'}"><div class="plan-timeline-slots" aria-hidden="true">${Array.from({length:20},()=>'<span></span>').join('')}</div>${game?timelineBar(game):'<p class="plan-timeline-empty">Geen wedstrijden op deze dag. Voeg een duel toe of kies een andere dag.</p>'}</div>`;
  }
  function day(games){
    const matches=games.filter(game=>game.date===state.date).slice().sort((a,b)=>(a.time+a.id).localeCompare(b.time+b.id));
    const hours=Array.from({length:11},(_,i)=>`<time style="--plan-hour:${i*10}%">${clockMinutes(timelineStart+i*60)}</time>`).join('');
    const rows=matches.length?matches.map(game=>`<div class="plan-timeline-row" data-plan-timeline-row><div class="plan-timeline-match ${state.selected===game.id?'is-selected':''}"><strong>${esc(game.home)} <span>–</span> ${esc(game.away)}</strong><span>${esc(game.venue)} · ${esc(game.field)}</span><small>${esc(game.id)} · ${esc(game.round)}</small></div>${timelineLane(game)}</div>`).join(''):`<div class="plan-timeline-row is-empty" data-plan-timeline-row data-plan-timeline-empty><div class="plan-timeline-match"><strong>Geen wedstrijden</strong><span>${esc(fmt(state.date,{weekday:'long',day:'numeric',month:'long'}))}</span></div>${timelineLane(null)}</div>`;
    return `<div class="plan-day plan-timeline" data-plan-timeline><header class="plan-timeline-head"><div class="plan-timeline-corner"><strong>Wedstrijden</strong><span>${matches.length} ${matches.length===1?'duel':'duels'} · 13:00–23:00</span></div><div class="plan-timeline-axis" aria-label="Tijdstippen van 13:00 tot 23:00">${hours}</div></header>${rows}</div>`;
  }
  function timelineDrop(event){
    const lane=event.target.closest('[data-plan-timeline-lane]');
    if(!lane)return null;
    const box=lane.getBoundingClientRect();
    const fraction=Math.max(0,Math.min(.999999,(event.clientX-box.left)/Math.max(1,box.width)));
    const minutes=timelineStart+Math.floor(fraction*((timelineEnd-timelineStart)/timelineStep))*timelineStep;
    return {target:lane,date:lane.dataset.planDrop,time:clockMinutes(minutes),offset:(minutes-timelineStart)/(timelineEnd-timelineStart)*100};
  }
  function detail(){
    const game=source.get(state.selected),target=$('[data-plan-detail]');
    if(!game){target.innerHTML='<h2 id="plan-detail-heading">Selecteer een wedstrijd</h2><p>Open een duel op het bord om de planning te bekijken.</p>';return;}
    target.innerHTML=`<div><p class="hv-eyebrow">${esc(game.cupName)} · ${esc(game.round)}</p><h2 id="plan-detail-heading">${esc(game.home)} – ${esc(game.away)}</h2><p>${esc(fmt(game.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))} · ${esc(game.time)}<br>${esc(game.venue)} · ${esc(game.field)}</p><small>${esc(game.id)} · ${esc(labels[game.status])}${Number.isInteger(game.homeScore)?' · '+game.homeScore+'–'+game.awayScore:''}</small></div><div class="plan-detail-actions"><button type="button" class="hv-button hv-button-dark" data-plan-edit="${esc(game.id)}">Wedstrijd bewerken</button><button type="button" class="hv-button hv-button-outline" data-plan-move="${esc(game.id)}" ${game.status!=='scheduled'?'disabled':''}>Verplaatsen</button><a class="hv-button hv-button-outline" href="${game.isPrimary?'#official':'#programma'}">${game.isPrimary?'Scheidsrechteromgeving':'Open wedstrijdkalender'}</a></div>`;
  }
  function consumeContext(){const c=window.HVDemo.get('contextNavigateV15',null),game=source.get(c?.matchId);if(page.hidden||c?.href?.split('-')[0]!=='#planning'||!game)return;state.selected=game.id;state.date=game.date;state.view='day';window.HVDemo.set('contextNavigateV15',null);}
  function render(animate=false){consumeContext();
    const cupPicker=$("[data-plan-cup]"),formPicker=field("tournamentId"),previousCup=cupPicker.value,previousForm=formPicker.value,signature=source.cups.map(cup=>cup.id+cup.name).join("|");
    if(cupPicker.dataset.signature!==signature){cupPicker.replaceChildren(new Option("Alle toernooien",""),...source.cups.map(cup=>new Option(cup.name,cup.key)));formPicker.replaceChildren(...source.cups.map(cup=>new Option(cup.name,cup.id)));cupPicker.value=previousCup;formPicker.value=source.cups.some(cup=>cup.id===previousForm)?previousForm:source.cups[0]?.id||"";cupPicker.dataset.signature=signature;}
    const games=all(),start=monday(state.date),end=add(start,6);
    const visible=state.view==='day'?games.filter(game=>game.date===state.date):state.view==='week'?games.filter(game=>game.date>=start&&game.date<=end):games.filter(game=>game.date.slice(0,7)===state.date.slice(0,7));
    $('[data-plan-title]').textContent=state.view==='day'?fmt(state.date,{weekday:'long',day:'numeric',month:'long'}):state.view==='week'?fmt(start,{day:'numeric',month:'short'})+' – '+fmt(end,{day:'numeric',month:'short',year:'numeric'}):fmt(state.date,{month:'long',year:'numeric'});
    page.querySelectorAll('[data-plan-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.planView===state.view)));
    for(const [key,value] of Object.entries({scheduled:playable().filter(game=>game.status==='scheduled').length,finished:playable().filter(game=>game.status==='finished').length,manual:playable().filter(game=>game.manual).length})) $('[data-plan-kpi="'+key+'"]').textContent=value;
    canvas.innerHTML=({day,week,month}[state.view])(games);canvas.dataset.view=state.view;
    $('[data-plan-instruction]').innerHTML='<span aria-hidden="true">⠿</span> '+(state.view==='day'?'Sleep een gepland duel horizontaal naar een nieuwe aftrap, per halfuur. Op je telefoon kies je Verplaatsen.':'Sleep een gepland duel naar een andere dag. Op je telefoon open je een duel en kies je Verplaatsen.');
    $('[data-plan-count]').textContent=visible.length+' wedstrijden in deze '+({day:'dag',week:'week',month:'maand'}[state.view]);
    detail();
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)canvas.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
  }
  function populateTeams(home='',away=''){
    const cup=source.cups.find(cup=>cup.id===field('tournamentId').value),suffix=cup?.key==='vrouwen'?'V1':cup?.key==='o23'?'23':cup?.key==='jeugd'?'15':'01';
    const teams=identity.listTeams().filter(team=>team.id.endsWith('-'+suffix)).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
    for(const [name,current] of [['homeTeamId',home],['awayTeamId',away]]){field(name).replaceChildren(new Option('Kies een team',''),...teams.map(team=>new Option(team.name,team.id)));if(teams.some(team=>team.id===current))field(name).value=current;}
  }
  function formRules(){
    const cup=source.cups.find(cup=>cup.id===field('tournamentId').value),existing=source.get(field('id').value);
    const match=existing?.tournamentId===field('tournamentId').value?existing:{tournamentId:field('tournamentId').value,cupKey:cup?.key};
    const settings=window.HVCompetition?.rulesForMatch(match);
    return settings?.rules||{halfMinutes:cup?.key==='jeugd'?35:45,halfTimeMinutes:cup?.key==='jeugd'?10:15,extraTime:false,extraHalfMinutes:15,penalties:true};
  }
  function setDefaultDuration(){const rules=formRules();field('duration').value=Number(rules.halfMinutes)*2+Number(rules.halfTimeMinutes);}
  function updateForm(){
    field('venue').value=source.venueFor({date:field('date').value,homeTeamId:field('homeTeamId').value,homeClubId:identity.team(field('homeTeamId').value)?.clubId});
    const rules=formRules(),moving=state.mode==='move',status=field('status').value,needsScore=!moving&&['live','finished','suspended'].includes(status),needsReason=!moving&&['cancelled','suspended'].includes(status),tied=needsScore&&status==='finished'&&field('homeScore').value!==''&&field('awayScore').value!==''&&field('homeScore').value===field('awayScore').value,extra=tied&&!!rules.extraTime,penalty=tied&&!!rules.penalties;
    $('[data-plan-rules-summary]').textContent='Reguliere speeltijd: 2 × '+rules.halfMinutes+' min · '+rules.halfTimeMinutes+' min rust. '+(rules.extraTime?'Verlenging: 2 × '+rules.extraHalfMinutes+' min. ':'Geen verlenging. ')+(rules.penalties?'Bij gelijke stand na de geldende speeltijd volgen strafschoppen.':'Bij een gelijke eindstand is een commissiebesluit nodig.');
    $('[data-plan-scores]').hidden=!needsScore;
    for(const name of ['homeScore','awayScore']){field(name).required=needsScore;field(name).disabled=!needsScore;}
    $('[data-plan-extra-time]').hidden=!extra;field('extraTimePlayed').disabled=!extra;if(!extra)field('extraTimePlayed').checked=false;
    $('[data-plan-extra-time-label]').textContent='Verlenging gespeeld (2 × '+rules.extraHalfMinutes+' min)';
    $('[data-plan-penalties]').hidden=!penalty;$('[data-plan-penalty-note]').hidden=!tied;
    $('[data-plan-penalty-note]').textContent=rules.penalties?(rules.extraTime?'Vul de beslissende strafschoppenserie in en bevestig dat de verlenging is gespeeld.':'Vul de beslissende strafschoppenserie in volgens het wedstrijdreglement.'):'Commissiebesluit nodig: dit reglement staat geen strafschoppen toe. Een gelijke eindstand kan nog niet als definitieve uitslag worden opgeslagen.';
    for(const name of ['penHome','penAway']){field(name).required=penalty;field(name).disabled=!penalty;}
    $('[data-plan-reason]').hidden=!needsReason;field('reason').required=needsReason;field('reason').disabled=!needsReason;
    $('[data-plan-minute-wrap]').hidden=status!=='suspended';field('minute').required=needsReason&&status==='suspended';field('minute').disabled=!needsReason||status!=='suspended';
  }
  function openForm(mode='new',id){
    const game=id?source.get(id):null;state.mode=mode;form.reset();field('id').value=game?.id||'';
    $('[data-plan-form-error]').hidden=true;
    $('#plan-dialog-title').textContent=mode==='new'?'Wedstrijd toevoegen':mode==='move'?'Wedstrijd verplaatsen':'Wedstrijd bewerken';
    $('[data-plan-form-context]').textContent=game?.id||'Toernooileiding · Nieuwe wedstrijd';
    $('[data-plan-form-help]').textContent=mode==='move'?'Kies een nieuwe datum en aftrap. Buiten de finaledag blijft de thuisclub de speellocatie.':'Ook historische uitslagen kun je invoeren. Bij een gelijke eindstand vul je de strafschoppenserie in.';
    field('tournamentId').value=game?.tournamentId||source.cups[0].id;populateTeams(game?.homeTeamId,game?.awayTeamId);
    for(const name of ['roundKey','date','time','field','duration','status','homeScore','awayScore','penHome','penAway','minute','reason']) if(game?.[name]!==undefined&&game[name]!==null)field(name).value=game[name];
    if(!game){field('date').value=state.date;field('time').value='19:30';field('roundKey').value='last16';field('status').value='scheduled';setDefaultDuration();field('field').value='Veld 1';}
    field('extraTimePlayed').checked=!!game?.extraTimePlayed;
    const moving=mode==='move';$('[data-plan-editor-fields]').hidden=moving;$('[data-plan-duration-wrap]').hidden=moving;$('[data-plan-status-wrap]').hidden=moving;
    for(const name of ['tournamentId','roundKey','homeTeamId','awayTeamId'])field(name).disabled=moving||!!game?.isPrimary;
    field('duration').disabled=moving;field('status').disabled=moving;
    $('[data-plan-save]').textContent=moving?'Wijziging opslaan':'Wedstrijd opslaan';updateForm();
    dialog.showModal();
  }
  page.addEventListener('click',event=>{
    const view=event.target.closest('[data-plan-view]'),step=event.target.closest('[data-plan-step]'),match=event.target.closest('[data-plan-match]'),selectedDay=event.target.closest('[data-plan-day]'),edit=event.target.closest('[data-plan-edit]'),move=event.target.closest('[data-plan-move]');
    if(view){state.view=view.dataset.planView;render(true);}else if(step){const delta=Number(step.dataset.planStep);if(state.view==='month'){const d=dateOf(state.date);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);state.date=iso(d);}else state.date=add(state.date,delta*(state.view==='week'?7:1));render(true);}else if(event.target.closest('[data-plan-today]')){state.date=source.today;render(true);}else if(selectedDay){state.date=selectedDay.dataset.planDay;state.view='day';render(true);}else if(match){state.selected=match.dataset.planMatch;detail();canvas.querySelectorAll('[data-plan-match]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.planMatch===state.selected)));canvas.querySelectorAll('[data-plan-timeline-row]').forEach(row=>row.querySelector('.plan-timeline-match')?.classList.toggle('is-selected',row.querySelector('[data-plan-match]')?.dataset.planMatch===state.selected));}else if(event.target.closest('[data-plan-new]'))openForm('new');else if(edit)openForm('edit',edit.dataset.planEdit);else if(move)openForm('move',move.dataset.planMove);
    if(event.target.closest('[data-plan-close]'))dialog.close();
    if(event.target.closest('[data-plan-undo]')&&state.undo){const previous=state.undo;state.undo=null;const result=source.moveFixture(previous.id,previous);if(result.ok){state.date=previous.date;render();}message(result.ok?'De verplaatsing is teruggedraaid.':result.error,result.ok?'success':'error');}
  });
  page.querySelectorAll('[data-plan-view]').forEach(button=>button.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const values=['day','week','month'],current=values.indexOf(state.view);state.view=values[(current+(event.key==='ArrowRight'?1:2))%3];render(true);page.querySelector('[data-plan-view="'+state.view+'"]').focus();}}));
  $('[data-plan-cup]').addEventListener('change',event=>{state.cup=event.target.value;render();});$('[data-plan-status]').addEventListener('change',event=>{state.status=event.target.value;render();});$('[data-plan-search]').addEventListener('input',event=>{state.query=event.target.value.trim().toLocaleLowerCase('nl');render();});
  canvas.addEventListener('dragstart',event=>{const node=event.target.closest('[data-plan-match]');if(!node||node.draggable!==true){event.preventDefault();return;}state.drag=node.dataset.planMatch;event.dataTransfer.setData('text/plain',state.drag);event.dataTransfer.effectAllowed='move';node.classList.add('is-dragging');});
  canvas.addEventListener('dragover',event=>{const timeline=timelineDrop(event),target=timeline?.target||event.target.closest('[data-plan-drop]');if(!target||!state.drag)return;event.preventDefault();event.dataTransfer.dropEffect='move';canvas.querySelectorAll('[data-over]').forEach(el=>delete el.dataset.over);target.dataset.over='true';if(timeline){target.style.setProperty('--plan-drop-offset',timeline.offset+'%');target.dataset.dropTime=timeline.time;}});
  const clearDrag=()=>{canvas.querySelectorAll('[data-over]').forEach(el=>delete el.dataset.over);canvas.querySelectorAll('.is-dragging').forEach(el=>el.classList.remove('is-dragging'));state.drag=null;};
  canvas.addEventListener('dragend',clearDrag);
  function previewMove(id,changes){const previous=source.get(id),r=window.HVOperations.proposePlan(id,changes);if(!r.ok){message(r.error,'error');return false;}moveProposal=r.proposal;const p=r.proposal;$('[data-plan-impact-content]').innerHTML='<div class="ops-summary"><div><span>'+esc(previous.home+' – '+previous.away)+'</span><strong>'+esc(p.before.date+' '+p.before.time)+' wordt '+esc(p.proposed.date+' '+p.proposed.time)+'</strong><small>'+esc(previous.venue+' · '+p.proposed.field)+'</small></div></div><h3>Deze betrokkenen ontvangen de wijziging</h3><div class="ops-list">'+p.affected.map(x=>'<article class="ops-row"><div><strong>'+esc(x.label)+'</strong><small>'+esc(x.kind==='official'?'Scheidsrechter':'Spelend team')+'</small></div></article>').join('')+'</div>'+(p.warnings.length?'<div class="ops-impact-warning"><strong>Opvolging nodig</strong><ul>'+p.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'<p>Geen overlap of rusttijdconflict in de bekende planning.</p>');$('[data-plan-impact-feedback]').textContent='De oorspronkelijke wedstrijdafspraak blijft geldig totdat je publiceert.';$('[data-plan-impact-form]').reset();$('[data-plan-impact-dialog]').showModal();return true;}
  canvas.addEventListener('drop',event=>{const timeline=timelineDrop(event),target=timeline?.target||event.target.closest('[data-plan-drop]'),id=state.drag||event.dataTransfer.getData('text/plain');if(!target||!id)return;event.preventDefault();const previous=source.get(id);if(!previous)return;const changes={date:timeline?.date||target.dataset.planDrop,time:timeline?.time||target.dataset.planDropTime||previous.time,field:timeline?previous.field:target.dataset.planDropField||previous.field};clearDrag();previewMove(id,changes);});
  $('[data-plan-impact-cancel]').addEventListener('click',()=>$('[data-plan-impact-dialog]').close());$('[data-plan-impact-form]').addEventListener('submit',event=>{event.preventDefault();if(!moveProposal)return;const r=window.HVOperations.publishPlan(moveProposal.id,event.currentTarget.elements.reason.value);$('[data-plan-impact-feedback]').textContent=r.ok?'Gewijzigde afspraak gepubliceerd.':r.error;if(r.ok){state.selected=r.match.id;state.date=r.match.date;state.undo={id:r.match.id,...moveProposal.before};$('[data-plan-impact-dialog]').close();render();message('Wijziging gepubliceerd. Betrokkenen kunnen de ontvangst bevestigen.');}});
  field('tournamentId').addEventListener('change',()=>{populateTeams();if(state.mode==='new')setDefaultDuration();updateForm();});
  for(const name of ['homeTeamId','date','status','homeScore','awayScore'])field(name).addEventListener('change',updateForm);
  form.addEventListener('submit',event=>{event.preventDefault();const names=['id','tournamentId','roundKey','homeTeamId','awayTeamId','date','time','field','duration','status','homeScore','awayScore','penHome','penAway','minute','reason'];const input=Object.fromEntries(names.map(name=>[name,field(name).value]));if(!input.id)delete input.id;input.extraTimePlayed=!field('extraTimePlayed').disabled&&field('extraTimePlayed').checked;
    let result;
    if(state.mode==='move'){dialog.close();previewMove(input.id,{date:input.date,time:input.time,field:input.field});return;}else result=source.saveFixture(input);
    if(!result.ok){$('[data-plan-form-error]').textContent=result.error;$('[data-plan-form-error]').hidden=false;return;}
    state.selected=result.match.id;state.date=result.match.date;state.undo=null;dialog.close();render(true);message((state.mode==='new'?'Wedstrijd toegevoegd':'Wijziging opgeslagen')+' · '+result.match.id+'. De kalender en statistieken zijn bijgewerkt.');
  });

  function renderPolicies(){const C=window.HVOperations,v=C.planningSettings(),f=$('[data-plan-policy]');if(!f.contains(document.activeElement)){f.elements.minRestMinutes.value=v.minRestMinutes;f.elements.transferMinutes.value=v.transferMinutes;}const venues=[...new Set(source.all().map(m=>m.venue).filter(Boolean))].sort();for(const selector of ['[data-plan-travel]','[data-plan-field-rule]']){const f=$(selector);if(f.contains(document.activeElement))continue;for(const e of f.elements)if(e.tagName==='SELECT'){const old=e.value;e.replaceChildren(...venues.map(name=>new Option(name,name)));if(venues.includes(old))e.value=old;}}$('[data-plan-policies]').innerHTML=Object.entries(v.travelMinutes).map(([route,mins])=>'<article class="ops-row"><div><strong>'+esc(route.replace('|',' ↔ '))+'</strong><small>'+mins+' minuten reistijd</small></div></article>').join('')+Object.entries(v.fieldRules).map(([key,r])=>'<article class="ops-row"><div><strong>'+esc(key.replace('|',' · '))+'</strong><small>Beschikbaar tot '+esc(r.close)+' · '+(r.lights?'met verlichting':'zonder verlichting')+'</small></div></article>').join('');}
  for(const selector of ['[data-plan-policy]','[data-plan-travel]','[data-plan-field-rule]'])$(selector).addEventListener('submit',event=>{event.preventDefault();const f=event.currentTarget,x=Object.fromEntries(new FormData(f)),C=window.HVOperations,v=C.planningSettings();let input;if(f.matches('[data-plan-policy]'))input={minRestMinutes:Number(x.minRestMinutes),transferMinutes:Number(x.transferMinutes)};if(f.matches('[data-plan-travel]')){if(x.from===x.to){message('Kies twee verschillende locaties.','error');return;}input={travelMinutes:{...v.travelMinutes,[[x.from,x.to].sort().join('|')]:Number(x.minutes)}};}if(f.matches('[data-plan-field-rule]'))input={fieldRules:{...v.fieldRules,[x.venue+'|'+x.field.trim()]:{close:x.close,lights:f.elements.lights.checked}}};const r=C.savePlanningSettings(input);message(r.ok?'Planningsafspraken bewaard.':r.error,r.ok?'success':'error');if(r.ok)renderPolicies();});
  window.HVRender.watch(page,['hv:operations'],renderPolicies);renderPolicies();

  $('[data-plan-cup]').append(...source.cups.map(cup=>new Option(cup.name,cup.key)));field('tournamentId').append(...source.cups.map(cup=>new Option(cup.name,cup.id)));
  document.addEventListener('hv:state',({detail})=>{if(!page.hidden&&detail?.key==='contextNavigateV15'&&detail.value?.href?.split('-')[0]==='#planning')render();});window.HVRender.watch(page,['hv:fixtures','hv:competition'],()=>{render();if(dialog.open)updateForm();});render();
})();
