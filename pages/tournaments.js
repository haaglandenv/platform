(() => {
  const page=document.querySelector('#toernooien'),fixtures=window.HVFixtures;if(!page||!fixtures)return;
  const tabs=page.querySelector('.tour-tabs'),target=page.querySelector('[data-tournament-news]'),template=page.querySelector('[data-hv-cup-panel]');
  const selections=new Map(),motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;let selected='senioren',signature='';
  const date=value=>value?new Date(value+'T12:00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'long'}):'Datum volgt';
  const games=key=>fixtures.forCup(key);
  function syncDirectory(){
    const cups=fixtures.cups,sig=cups.map(cup=>cup.id+cup.name).join('|');if(sig===signature)return;signature=sig;
    tabs.replaceChildren();
    for(const cup of cups){
      const button=document.createElement('button');button.type='button';button.dataset.hvCup=cup.key;button.setAttribute('aria-controls','toernooien-'+cup.key);button.textContent=cup.name;tabs.append(button);
      let panel=page.querySelector('[data-hv-cup-panel="'+cup.key+'"]');
      if(!panel){panel=template.cloneNode(true);panel.dataset.hvCupPanel=cup.key;panel.id='toernooien-'+cup.key;panel.hidden=true;tabs.parentNode.insertBefore(panel,page.querySelector('[data-tournament-news]')?.closest('section')||null);}
      const heading=panel.querySelector('h2');heading.textContent=cup.name;heading.id='tour-title-'+cup.key;panel.setAttribute('aria-labelledby',heading.id);
      panel.querySelector('.hv-eyebrow').textContent=cup.category+' · Knock-out';panel.querySelector('.tour-description').textContent=cup.description||'Van de eerste aftrap tot de finale. Ieder duel bepaalt wie doorgaat.';
      const reg=panel.querySelector('.tour-facts a');reg.href='#reglement-'+cup.key;reg.setAttribute('aria-label','Bekijk het reglement van '+cup.name);
      panel.querySelector('.tour-actions a').href='#schema-'+cup.key;
      const select=panel.querySelector('[data-tour-team]');select.dataset.tourTeam=cup.key;select.id='tour-team-'+cup.key;select.setAttribute('aria-label','Team in de '+cup.name);panel.querySelector('.tour-team-panel label').htmlFor=select.id;
    }
    const legacy=page.querySelector('[data-hv-published-draw]');if(legacy)legacy.hidden=true;
  }
  function renderTeam(key){
    const panel=page.querySelector('[data-hv-cup-panel="'+key+'"]'),cup=fixtures.cups.find(cup=>cup.key===key);if(!panel||!cup)return;
    const select=panel.querySelector('[data-tour-team]'),matches=games(key).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const ids=[...new Set([...(cup.teamIds||[]),...matches.flatMap(game=>[game.homeTeamId,game.awayTeamId])].filter(Boolean))];
    const teams=ids.map(id=>window.HVIdentity?.team(id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
    const previous=selections.get(key)||'',sig=teams.map(team=>team.id).join('|');if(select.dataset.options!==sig){select.replaceChildren(new Option('Alle teams',''),...teams.map(team=>new Option(team.name,team.id)));select.dataset.options=sig;}
    select.value=teams.some(team=>team.id===previous)?previous:'';const teamId=select.value,own=teamId?matches.filter(game=>game.homeTeamId===teamId||game.awayTeamId===teamId):matches;
    const next=own.find(game=>['scheduled','live','suspended','review'].includes(game.status)&&game.date>=fixtures.today),last=own.filter(game=>['finished','walkover'].includes(game.status)).at(-1);
    const lost=last&&teamId&&last.winnerTeamId&&last.winnerTeamId!==teamId;
    panel.querySelector('[data-tour-status]').textContent=next?.status==='live'?'Nu op het veld':lost&&!next?'Uitgeschakeld':teamId?'Nog in het toernooi':'Knock-out · één duel per ronde';
    panel.querySelector('[data-tour-next]').textContent=next?date(next.date)+' · '+next.time.replace(':','.'):teamId?'Geen volgend duel ingepland':'Indeling volgt';
    panel.querySelector('[data-tour-opponent]').textContent=next?(teamId?'Tegen '+(next.homeTeamId===teamId?next.away:next.home):next.home+' – '+next.away):'Bekijk het bekerschema voor de route';
    const link=panel.querySelector('[data-tour-match-link]');link.href=next?'#wedstrijd-'+next.id:'#schema-'+key;link.textContent=next?'Open de wedstrijd':'Bekijk het bekerschema';
  }
  function renderNews(){const cup=fixtures.cups.find(cup=>cup.key===selected);if(!cup)return;page.querySelector('[data-tournament-news-title]').textContent='Nieuws uit de '+cup.name;window.HVNewsUI?.feed(target,{context:{tournamentId:cup.id},limit:3});}
  function select(key,animate=false){
    syncDirectory();if(!fixtures.cups.some(cup=>cup.key===key))key=fixtures.cups[0]?.key;if(!key)return;const changed=selected!==key;selected=key;
    tabs.querySelectorAll('[data-hv-cup]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hvCup===key)));page.querySelectorAll('[data-hv-cup-panel]').forEach(panel=>panel.hidden=panel.dataset.hvCupPanel!==key);renderTeam(key);renderNews();
    if(changed&&animate&&motion)page.querySelector('[data-hv-cup-panel="'+key+'"]').animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
  }
  function fromHash(){const key=location.hash.replace('#toernooien-','');if(fixtures.cups.some(cup=>cup.key===key))select(key);}
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-hv-cup]');if(button)select(button.dataset.hvCup,true);});
  page.addEventListener('change',event=>{const select=event.target.closest('[data-tour-team]');if(select){selections.set(select.dataset.tourTeam,select.value);renderTeam(select.dataset.tourTeam);}});
  window.addEventListener('hashchange',fromHash);window.HVRender.watch(page,['hv:fixtures','hv:competition','hv:state'],()=>select(selected));select(selected);fromHash();
})();
