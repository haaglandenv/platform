(() => {
  const root=document.getElementById('toernooibeheer'),core=window.HVCompetition,fixtures=window.HVFixtures;
  if(!root||!core||!fixtures)return;
  const $=selector=>root.querySelector(selector),rulesForm=$('[data-comp-rules-form]'),cupSelect=$('[data-comp-cup]'),roundSelect=$('[data-comp-round]');
  const fields=name=>rulesForm.elements.namedItem(name);
  const rounds=[['first','Eerste ronde'],['last16','Achtste finales'],['quarter','Kwartfinales'],['semi','Halve finales']];
  const state={cup:window.HVDemo?.get('competitionSelectedCup',fixtures.cups[0]?.id)||'HV-CUP-STD',tab:'rules',round:'quarter',slots:[],editor:null,dirty:false,rulesDirty:false,saving:false,loadedCup:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const feedback=(text,error=false)=>{const el=$('[data-comp-feedback]');el.textContent=text||'';el.dataset.error=String(error);};
  const chosen=()=>core.get(state.cup);
  function outcome(result,success){if(result?.ok){feedback(success);return true;}feedback(result?.error||'De wijziging kon niet worden opgeslagen.',true);return false;}
  function change(action,success,resetEditor=false){state.saving=true;let result;try{result=action();}catch(error){result={ok:false,error:error.message};}finally{state.saving=false;}if(outcome(result,success)){if(resetEditor)state.dirty=false;render();}return result;}
  function setRulesDirty(value){state.rulesDirty=value;$('[data-comp-unsaved]').hidden=!value;}
  function ruleSummary(){
    $('[data-comp-reference-date]').hidden=fields('ageReference').value!=='season';fields('referenceDate').disabled=fields('ageReference').value!=='season';
    const extra=fields('extraTime').checked,penalty=fields('penalties').checked,limited=fields('substitutionMode').value==='limited';
    fields('extraHalfMinutes').disabled=!extra;$('[data-comp-extra-wrap]').hidden=!extra;
    fields('maxSubstitutions').disabled=!limited;$('[data-comp-max-subs]').hidden=!limited;
    $('[data-comp-rounds-wrap]').dataset.disabled=String(!extra);
    rulesForm.querySelectorAll('[name="extraTimeRounds"]').forEach(input=>input.disabled=!extra);
    $('[data-comp-rounds-note]').textContent=extra?'Vink de rondes aan waarin na een gelijke stand wordt verlengd.':'Er wordt niet verlengd. De gekozen rondes blijven bewaard voor een volgende versie.';
    $('[data-comp-rule-summary]').textContent=extra?(penalty?'Verlenging in de aangevinkte rondes, daarna zo nodig strafschoppen.':'Verlenging in de aangevinkte rondes; daarna een besluit van de toernooileiding.'):(penalty?'Bij gelijkspel direct strafschoppen.':'De toernooileiding bepaalt de beslissing.');
  }
  function renderRules(config){
    const defaults={minAge:null,maxAge:null,ageReference:'match',referenceDate:'2027-01-01',maxDispensations:0,starterCount:11,minimumPlayers:7,maxSquadSize:18,requiredGoalkeeper:true,substitutionMode:'limited',maxSubstitutions:5,yellowThreshold:3,refereeType:'neutral',assistantsRequired:2,effectiveFrom:'2026-08-01'};
    const rules={...defaults,...config.rules};
    for(const name of ['halfMinutes','halfTimeMinutes','extraHalfMinutes','tournamentText','matchText','minAge','maxAge','ageReference','referenceDate','maxDispensations','starterCount','minimumPlayers','maxSquadSize','substitutionMode','maxSubstitutions','yellowThreshold','refereeType','assistantsRequired','effectiveFrom'])fields(name).value=rules[name]??'';
    for(const name of ['extraTime','penalties','requiredGoalkeeper'])fields(name).checked=!!rules[name];
    const extraRounds=Array.isArray(rules.extraTimeRounds)?rules.extraTimeRounds:['first','last16','quarter','semi','final'];
    rulesForm.querySelectorAll('[name="extraTimeRounds"]').forEach(input=>input.checked=extraRounds.includes(input.value));
    state.loadedCup=config.cupId||state.cup;setRulesDirty(false);ruleSummary();
  }
  function renderProgression(config){
    $('[data-comp-progression-list]').innerHTML=rounds.map(([key,name])=>{
      const mode=config.progression?.[key]||'auto';
      return `<article class="comp-round-row"><div><h3>${name}</h3><p>${mode==='manual'?'Winnaars wachten op een besluit van de toernooileiding.':'Bevestigde winnaars stromen direct door.'}</p></div><label>Doorstroming<select data-comp-progression="${key}" aria-label="Voortgang na ${name.toLocaleLowerCase('nl')}"><option value="auto"${mode==='auto'?' selected':''}>Automatisch</option><option value="manual"${mode==='manual'?' selected':''}>Handmatig</option></select></label><button type="button" class="hv-button hv-button-outline" data-comp-release="${key}"${mode!=='manual'?' disabled':''}>Ronde vrijgeven</button></article>`;
    }).join('');
  }
  function refreshCups(){
    const cups=fixtures.cups,signature=cups.map(cup=>cup.id+':'+cup.name).join('|');
    if(cupSelect.dataset.options!==signature){cupSelect.replaceChildren(...cups.map(cup=>new Option(cup.name,cup.id)));cupSelect.dataset.options=signature;}
    if(!cups.some(cup=>cup.id===state.cup))state.cup=cups[0]?.id;
    const target=$('[data-comp-anchors]');if(target)target.replaceChildren(...cups.map(cup=>{const anchor=document.createElement('span');anchor.id='toernooibeheer-'+cup.key;return anchor;}));
    cupSelect.value=state.cup||'';
  }
  function lock(index){return !!state.editor?.matches?.[Math.floor(index/2)]?.locked;}
  function normalSlots(editor){const values=editor?.draft?.slots||editor?.slots||[];return values.map((slot,index)=>{const value=editor?.matches?.[Math.floor(index/2)]?.locked?editor.slots[index]:slot;return typeof value==='string'?value:value?.teamId||'';});}
  function loadEditor(){state.editor=core.editor(state.cup,state.round);state.slots=normalSlots(state.editor);state.dirty=false;}
  function slotLabel(index){const row=state.editor?.matches?.[Math.floor(index/2)];return (index%2?row?.awayLabel:row?.homeLabel)||'Open plek';}
  function renderSeedings(){
    const editor=state.editor||{},teams=editor.teams||[],count=Math.ceil(state.slots.length/2);
    $('[data-comp-bracket-state]').textContent=state.dirty?'Gewijzigd concept':editor.draft?'Bewaard concept':'Huidige indeling';
    $('[data-comp-seeding]').innerHTML=Array.from({length:count},(_,matchIndex)=>{
      const row=editor.matches?.[matchIndex]||{},locked=!!row.locked;
      const controls=[0,1].map(side=>{const index=matchIndex*2+side,value=state.slots[index]||'',up=index-1,down=index+1,placeholder=(side?row.awayTeamId:row.homeTeamId)?'Kies een team':slotLabel(index);
        return `<div class="comp-seed-slot"><label>${side?'Uitteam':'Thuisteam'}<select data-comp-slot="${index}" aria-label="${side?'Uitteam':'Thuisteam'} wedstrijd ${matchIndex+1}"${locked?' disabled':''}><option value="">${esc(placeholder)}</option><option value="bye"${value==='bye'?' selected':''}>Vrijloting</option>${teams.map(team=>`<option value="${esc(team.id)}"${value===team.id?' selected':''}>${esc(team.name)}</option>`).join('')}</select></label><div class="comp-seed-actions"><button type="button" data-comp-swap="${index}" data-direction="-1" aria-label="Verplaats ${side?'uitteam':'thuisteam'} wedstrijd ${matchIndex+1} een plek omhoog"${locked||up<0||lock(up)?' disabled':''}>Omhoog</button><button type="button" data-comp-swap="${index}" data-direction="1" aria-label="Verplaats ${side?'uitteam':'thuisteam'} wedstrijd ${matchIndex+1} een plek omlaag"${locked||down>=state.slots.length||lock(down)?' disabled':''}>Omlaag</button></div></div>`;
      }).join('');
      return `<article class="comp-seeding-match"><header><h3>Wedstrijd ${matchIndex+1}</h3><span>${locked?'Vastgelegd':'Bewerkbaar'}</span></header>${controls}${locked?'<p class="comp-seed-locked">Deelnemers blijven behouden bij een begonnen of gespeelde wedstrijd.</p>':''}</article>`;
    }).join('');
    if(!count)$('[data-comp-seeding]').innerHTML='<p class="comp-seed-locked">Voor deze ronde is nog geen indeling beschikbaar. Richt de deelnemers en openingsronde in bij Seizoensbeheer.</p><a class="hv-button hv-button-outline" href="#seizoen">Naar seizoensbeheer</a>';
    $('[data-comp-save-draft]').disabled=!count||!!editor.locked;
    $('[data-comp-publish]').disabled=!count||!!editor.locked;
  }
  function renderPreview(check=false){
    const output=$('[data-comp-preview-output]');
    if(!check){output.innerHTML='<p>Controleer het concept voordat je de indeling publiceert.</p>';return;}
    let result;try{result=core.preview(state.cup,state.round,[...state.slots]);}catch(error){result={ok:false,error:error.message};}
    if(!result?.ok){output.innerHTML='<p data-error="true">'+esc(result?.error||'De indeling is nog niet volledig.')+'</p>';return;}
    const teams=new Map((state.editor?.teams||[]).map(team=>[team.id,team.name]));
    const name=(value,index)=>value==='bye'?'Vrijloting':value?teams.get(value)||slotLabel(index):'Open plek';
    output.innerHTML='<ol>'+Array.from({length:state.slots.length/2},(_,i)=>'<li>'+esc(name(state.slots[i*2],i*2))+' – '+esc(name(state.slots[i*2+1],i*2+1))+'</li>').join('')+'</ol>';
  }
  function renderHistory(config){
    const history=config.history||[];
    $('[data-comp-history]').innerHTML=history.length?history.slice(0,5).map(item=>{const value=new Date(item.at);const date=Number.isNaN(value.getTime())?'Zojuist':value.toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'});return '<li><time'+(item.at?' datetime="'+esc(item.at)+'"':'')+'>'+esc(date)+'</time><span>'+esc(item.message||item.text||'Toernooiconfiguratie bijgewerkt.')+'</span></li>';}).join(''):'<li><time>Demoversie</time><span>Het basisreglement en de standaardindeling staan klaar.</span></li>';
  }
  function selectTab(tab,animate=true){
    if(!['rules','progression','bracket'].includes(tab))return;
    state.tab=tab;root.querySelectorAll('[data-comp-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.compTab===tab)));root.querySelectorAll('[data-comp-panel]').forEach(panel=>panel.hidden=panel.dataset.compPanel!==tab);
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('[data-comp-panel="'+tab+'"]').animate([{opacity:.4},{opacity:1}],{duration:210,easing:'ease-out'});
  }
  function render(){
    refreshCups();const config=chosen();if(!config)return;
    $('[data-comp-version]').textContent='Versie '+(config.version||1);
    if(!state.rulesDirty||state.loadedCup!==state.cup)renderRules(config);
    renderProgression(config);if(!state.dirty)loadEditor();renderSeedings();renderPreview();renderHistory(config);selectTab(state.tab,false);
  }
  function chooseCup(id){if(!fixtures.cups.some(cup=>cup.id===id))return;state.cup=id;state.dirty=false;setRulesDirty(false);feedback('');render();}
  cupSelect.addEventListener('change',()=>{chooseCup(cupSelect.value);window.HVDemo?.set('competitionSelectedCup',state.cup);});
  roundSelect.addEventListener('change',()=>{state.round=roundSelect.value;feedback('');loadEditor();renderSeedings();renderPreview();});
  rulesForm.addEventListener('input',()=>{setRulesDirty(true);ruleSummary();});
  rulesForm.addEventListener('change',()=>{setRulesDirty(true);ruleSummary();});
  rulesForm.addEventListener('submit',event=>{
    event.preventDefault();
    const number=name=>fields(name).value.trim()===''?null:Number(fields(name).value);
    const rules={...chosen().rules,halfMinutes:number('halfMinutes'),halfTimeMinutes:number('halfTimeMinutes'),extraTime:fields('extraTime').checked,extraHalfMinutes:number('extraHalfMinutes')||15,penalties:fields('penalties').checked,tournamentText:fields('tournamentText').value.trim(),matchText:fields('matchText').value.trim(),minAge:number('minAge'),maxAge:number('maxAge'),ageReference:fields('ageReference').value,referenceDate:fields('referenceDate').value||'2027-01-01',maxDispensations:number('maxDispensations'),starterCount:number('starterCount'),minimumPlayers:number('minimumPlayers'),maxSquadSize:number('maxSquadSize'),requiredGoalkeeper:fields('requiredGoalkeeper').checked,substitutionMode:fields('substitutionMode').value,maxSubstitutions:number('maxSubstitutions'),yellowThreshold:number('yellowThreshold'),refereeType:fields('refereeType').value,assistantsRequired:number('assistantsRequired'),effectiveFrom:fields('effectiveFrom').value,extraTimeRounds:[...rulesForm.querySelectorAll('[name="extraTimeRounds"]:checked')].map(input=>input.value)};
    state.saving=true;let result;try{result=core.saveRules(state.cup,rules);}catch(error){result={ok:false,error:error.message};}finally{state.saving=false;}
    if(outcome(result,'De nieuwe reglementsversie is opgeslagen.')){setRulesDirty(false);render();}
  });
  root.addEventListener('change',event=>{
    const progression=event.target.closest('[data-comp-progression]');if(progression){change(()=>core.saveProgression(state.cup,progression.dataset.compProgression,progression.value),'De voortgang van deze ronde is bijgewerkt.');return;}
    const slot=event.target.closest('[data-comp-slot]');if(slot){const index=Number(slot.dataset.compSlot);if(lock(index))return;state.slots[index]=slot.value;state.dirty=true;$('[data-comp-bracket-state]').textContent='Gewijzigd concept';renderPreview();}
  });
  root.addEventListener('click',event=>{
    const tab=event.target.closest('[data-comp-tab]');if(tab){selectTab(tab.dataset.compTab);return;}
    if(event.target.closest('[data-comp-open-bracket]')){selectTab('bracket');return;}
    const release=event.target.closest('[data-comp-release]');if(release){change(()=>core.releaseRound(state.cup,release.dataset.compRelease),'De gekwalificeerde teams zijn vrijgegeven voor de volgende ronde.');return;}
    const swap=event.target.closest('[data-comp-swap]');if(swap){const index=Number(swap.dataset.compSwap),other=index+Number(swap.dataset.direction);if(other<0||other>=state.slots.length||lock(index)||lock(other))return;[state.slots[index],state.slots[other]]=[state.slots[other],state.slots[index]];state.dirty=true;renderSeedings();renderPreview();return;}
    if(event.target.closest('[data-comp-preview]')){renderPreview(true);return;}
    if(event.target.closest('[data-comp-save-draft]')){change(()=>core.saveDraft(state.cup,state.round,[...state.slots]),'Het concept is bewaard. Publiceer om de indeling vast te leggen.',true);return;}
    if(event.target.closest('[data-comp-publish]')){change(()=>core.publishBracket(state.cup,state.round,[...state.slots]),'De nieuwe bracketindeling is gepubliceerd.',true);}
  });
  window.HVRender.watch(root,['hv:competition','hv:fixtures'],()=>{if(!state.saving){if(!state.dirty)render();else renderHistory(core.get(state.cup));}});
  document.addEventListener('hv:state',({detail})=>{if(detail?.key==='competitionSelectedCup'&&detail.value!==state.cup)chooseCup(detail.value);});
  function route(){if(location.hash.startsWith('#toernooibeheer-')){const key=location.hash.slice('#toernooibeheer-'.length),cup=fixtures.cups.find(cup=>cup.key===key||cup.id===key);if(cup)chooseCup(cup.id);}}
  window.addEventListener('hashchange',route);
  render();route();
})();
