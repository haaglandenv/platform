(() => {
  const root=document.getElementById('werkvoorraad'),M=window.HVMatchday,A=window.HVAccess;if(!root||!M)return;
  const $=s=>root.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let page=0,selectedId=null,opener=null,dirty=false;
  const dialog=$('[data-work-assign-dialog]'),form=$('[data-work-assign-form]');
  const deadlineLabel=value=>new Date(value).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'});
  const localInput=value=>{const p=window.HVClock.localParts(value);return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;};
  const icon=kind=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({open:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',assign:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 10-4m5 1v6m-3-3h6"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 13h4"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'})[kind]+'</svg>';
  const cupName=t=>window.HVFixtures.cups.find(c=>c.id===t.cupId)?.name||'Haaglanden Voetbal';
  function feedback(result,text='De taak is bijgewerkt in de demo.'){$('[data-work-feedback]').textContent=result.ok?text:result.error;$('[data-work-feedback]').dataset.error=String(!result.ok);}
  function render(){
    const all=M.tasks(),cups=window.HVFixtures.cups,old=$('[data-work-cup]').value;
    $('[data-work-cup]').innerHTML='<option value="">Alle toernooien</option>'+cups.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    if(cups.some(c=>c.id===old))$('[data-work-cup]').value=old;
    const kind=$('[data-work-kind]').value,q=$('[data-work-search]').value.toLowerCase(),rows=all.filter(t=>(!old||t.cupId===old)&&(!kind||t.kind===kind)&&(t.title+' '+t.note+' '+(t.owner||'')).toLowerCase().includes(q)),pages=Math.max(1,Math.ceil(rows.length/8));page=Math.min(page,pages-1);
    for(const key of ['rosters','assignments','cases','changes'])$('[data-work-count="'+key+'"]').textContent=all.filter(t=>t.kind===key).length;
    $('[data-work-count-label]').textContent=rows.length+' actuele acties · '+all.filter(t=>t.overdue).length+' over tijd';
    $('[data-work-list]').innerHTML=rows.slice(page*8,page*8+8).map(t=>'<article class="work-task hv-action-row" role="listitem"><div class="hv-action-row__content"><div class="work-task-topline"><span class="work-priority'+(t.overdue?' is-overdue':'')+'">'+(t.overdue?'Over tijd':'Te doen')+'</span><span class="work-task-deadline">'+esc(deadlineLabel(t.deadline))+'</span></div><h3>'+esc(t.title)+'</h3><p>'+esc(t.note)+'</p><div class="work-task-meta"><span>'+esc(cupName(t))+'</span><span>'+esc(t.owner||'Nog geen behandelaar')+'</span></div></div><div class="hv-row-actions"><a class="hv-row-action is-primary" href="'+esc(t.href)+'" aria-label="'+esc('Open actie: '+t.title)+'" title="Open actie" data-hv15-action="'+esc(t.id)+'" data-hv15-match="'+esc(t.matchId||'')+'" data-hv15-team="'+esc(t.teamId||'')+'">'+icon('open')+'</a><button class="hv-row-action" type="button" data-work-assign="'+esc(t.id)+'" aria-label="'+esc((t.ownerId?'Toewijzing wijzigen: ':'Taak toewijzen: ')+t.title)+'" title="'+(t.ownerId?'Toewijzing wijzigen':'Taak toewijzen')+'">'+icon('assign')+'</button></div></article>').join('')||'<p class="hv15-empty">Geen openstaande acties voor deze selectie.</p>';
    $('[data-work-page]').textContent=(page+1)+' / '+pages;$('[data-work-prev]').disabled=page===0;$('[data-work-next]').disabled=page===pages-1;
  }
  function close(){dialog.close();selectedId=null;dirty=false;if(opener?.isConnected)opener.focus({preventScroll:true});else $('[data-work-search]').focus({preventScroll:true});}
  function openAssignment(id,source){const task=M.tasks().find(t=>t.id===id);if(!task){feedback({ok:false,error:'Deze taak is opgelost of niet meer beschikbaar.'});render();return;}
    selectedId=id;opener=source;dirty=false;const owners=M.eligibleOwners(id),owner=task.ownerId||(owners.some(a=>a.id===A.current().id)?A.current().id:owners[0]?.id);
    $('[data-work-dialog-title]').textContent=task.ownerId?'Toewijzing wijzigen':'Taak toewijzen';$('[data-work-dialog-task]').textContent=task.title;$('[data-work-dialog-note]').textContent=task.note;$('[data-work-dialog-cup]').textContent=cupName(task);
    form.elements.ownerId.innerHTML=owners.map(a=>'<option value="'+esc(a.id)+'"'+(owner===a.id?' selected':'')+'>'+esc(a.name)+'</option>').join('');form.elements.deadline.value=localInput(task.deadline);
    $('[data-work-dialog-save]').disabled=!owners.length;$('[data-work-dialog-remind]').hidden=!task.ownerId;$('[data-work-dialog-error]').hidden=true;$('[data-work-dialog-discard]').hidden=true;
    if(!owners.length){$('[data-work-dialog-error]').textContent='Er is geen bevoegde behandelaar beschikbaar.';$('[data-work-dialog-error]').hidden=false;}
    dialog.showModal();
  }
  function requestClose(){if(dirty){$('[data-work-dialog-discard]').hidden=false;$('[data-work-dialog-keep]').focus();}else close();}
  for(const key of ['cup','kind','search'])$('[data-work-'+key+']').addEventListener(key==='search'?'input':'change',()=>{page=0;render();});
  root.addEventListener('click',event=>{
    const assign=event.target.closest('[data-work-assign]');if(assign)openAssignment(assign.dataset.workAssign,assign);
    if(event.target.closest('[data-work-dialog-close]'))requestClose();
    if(event.target.closest('[data-work-dialog-keep]')){$('[data-work-dialog-discard]').hidden=true;$('[data-work-dialog-save]').focus();}
    if(event.target.closest('[data-work-dialog-discard-confirm]'))close();
    if(event.target.closest('[data-work-dialog-remind]')){const result=M.remindTask(selectedId);$('[data-work-dialog-error]').textContent=result.ok?'De herinnering staat klaar in de demo.':result.error;$('[data-work-dialog-error]').dataset.error=String(!result.ok);$('[data-work-dialog-error]').hidden=false;}
  });
  form.addEventListener('input',()=>dirty=true);form.addEventListener('change',()=>dirty=true);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const parts=form.elements.deadline.value.split('T'),result=M.assignTask(selectedId,form.elements.ownerId.value,window.HVClock.instant(parts[0],parts[1]));if(!result.ok){$('[data-work-dialog-error]').textContent=result.error;$('[data-work-dialog-error]').dataset.error='true';$('[data-work-dialog-error]').hidden=false;return;}close();feedback(result,'Behandelaar en deadline zijn bijgewerkt.');render();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  for(const type of ['hv:access','hv:edition','hv:route'])document.addEventListener(type,()=>{if(dialog.open)close();});
  $('[data-work-prev]').addEventListener('click',()=>{page--;render();});$('[data-work-next]').addEventListener('click',()=>{page++;render();});
  window.HVRender.watch(root,['hv:fixtures','hv:registrations','hv:cases','hv:operations','hv:media','hv:matchday','hv:access','hv:clock'],render);if(!root.hidden)render();
})();
