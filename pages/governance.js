(() => {
  const root=document.getElementById('beheerlog'),core=window.HVWorkflow;if(!root||!core)return;
  const $=s=>root.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),select=$('[data-gov-cup]');let tab='decisions',query='';
  const feedback=result=>{const el=$('[data-gov-feedback]');el.textContent=result.ok?'Het besluit is vastgelegd.':result.error;el.dataset.error=String(!result.ok);};
  const stamp=v=>new Date(v).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'});
  function render(){
    const cupId=select.value,cups=window.HVFixtures?.cups||[];select.innerHTML=cups.map(cup=>'<option value="'+esc(cup.id)+'">'+esc(cup.name)+'</option>').join('');if(cups.some(cup=>cup.id===cupId))select.value=cupId;
    const value=core.governance();$('[data-gov-season-state]').textContent=value.seasonLocked?'Seizoen vergrendeld':'Editie '+(window.HVEditions?.active().label||'2026/27')+' · Open';
    const logs=core.logs().filter(row=>JSON.stringify(row).toLowerCase().includes(query)).slice(0,50);
    $('[data-gov-log]').innerHTML=logs.length?logs.map(row=>'<article class="gov-log-row"><time>'+esc(stamp(row.at))+'</time><div><h3>'+esc(row.action.replaceAll('_',' ').toLowerCase())+'</h3><p>'+esc(row.actor?.label||row.actor?.role||'Demogebruiker')+' · '+esc(row.reason||'Wijziging vastgelegd')+'</p><small>'+esc(row.entity)+'</small><details><summary>Bekijk de wijziging</summary><pre>'+esc(JSON.stringify({voor:row.before,na:row.after},null,2))+'</pre></details></div></article>').join(''):'<p class="gov-empty">Geen besluiten gevonden voor deze zoekopdracht.</p>';
    const list=core.checklist(select.value);$('[data-gov-checklist]').innerHTML=list.items.map(item=>'<div><span>'+esc(item.label)+'</span><strong>'+esc(item.count===0?'✓':item.count)+'</strong></div>').join('');
    $('[data-gov-finalize]').disabled=!list.ready||!!value.cups?.[select.value]?.finalized||value.seasonLocked;
    $('[data-gov-reopen]').disabled=!value.cups?.[select.value]?.finalized||value.seasonLocked;
    $('[data-gov-cups]').innerHTML=cups.map(cup=>'<div><span>'+esc(cup.name)+'</span><b>'+esc(value.cups?.[cup.id]?.finalized?'Afgesloten':'Open')+'</b></div>').join('');
  }
  root.addEventListener('click',e=>{const button=e.target.closest('[data-gov-tab]');if(button){tab=button.dataset.govTab;root.querySelectorAll('[data-gov-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.govTab===tab)));root.querySelectorAll('[data-gov-panel]').forEach(el=>el.hidden=el.dataset.govPanel!==tab);}if(e.target.closest('[data-gov-reopen]'))feedback(core.reopenTournament(select.value,$('[data-gov-close-form]').elements.reason.value));if(e.target.closest('[data-gov-unlock]'))feedback(core.unlockSeason($('[data-gov-season-form]').elements.reason.value));});
  $('[data-gov-close-form]').addEventListener('submit',e=>{e.preventDefault();feedback(core.finalizeTournament(select.value,e.currentTarget.elements.reason.value));});
  $('[data-gov-season-form]').addEventListener('submit',e=>{e.preventDefault();feedback(core.lockSeason(e.currentTarget.elements.reason.value));});
  $('[data-gov-search]').addEventListener('input',e=>{query=e.target.value.toLowerCase();render();});select.addEventListener('change',render);window.HVRender.watch(root,['hv:workflow','hv:fixtures','hv:cases'],render);render();
})();
