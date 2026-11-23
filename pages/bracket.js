(() => {
  const page=document.querySelector('#schema'),root=page?.querySelector('[data-bracket]'),fixtures=window.HVFixtures;
  if(!root||!fixtures)return;
  const tabs=root.querySelector('.bracket-cup-tabs'),anchors=root.querySelector('.bracket-anchor'),tree=root.querySelector('[data-bracket-tree]'),roundSelect=root.querySelector('[data-bracket-round-select]'),detail=root.querySelector('[data-bracket-detail]'),title=root.querySelector('[data-bracket-title]');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),order=['first','last16','quarter','semi','final'];
  const names={first:'Eerste ronde',last16:'Achtste finales',quarter:'Kwartfinales',semi:'Halve finales',final:'Finale'};
  const labels={scheduled:'Gepland',live:'Live',finished:'Afgelopen',cancelled:'Afgelast',suspended:'Gestaakt',review:'In beoordeling',bye:'Vrijloting',walkover:'Reglementair'};
  let cupKey=fixtures.cups[0]?.key||'senioren',selectedId=null,activeRound='quarter',cupSignature='',roundSignature='';
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const shortDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):'Datum volgt';
  const games=()=>fixtures.forCup(cupKey).filter(game=>game.isBracketNode!==false);
  const sort=(a,b)=>(a.bracketOrder??999)-(b.bracketOrder??999)||a.id.localeCompare(b.id);
  const qualifier=game=>window.HVIdentity?.team(game.qualifierTeamId||game.winnerTeamId)?.name||(game.homeBye?game.away:game.home);
  function syncCups(){
    const cups=fixtures.cups,sig=cups.map(cup=>cup.id+cup.name).join('|');if(sig===cupSignature)return;cupSignature=sig;
    tabs.replaceChildren();anchors.replaceChildren();
    for(const cup of cups){const button=node('button',cup.name);button.type='button';button.dataset.bracketCup=cup.key;button.setAttribute('aria-pressed',String(cup.key===cupKey));tabs.append(button);const anchor=node('span');anchor.id='schema-'+cup.key;anchors.append(anchor);}
  }
  function showDetail(){
    const game=selectedId&&fixtures.get(selectedId);detail.replaceChildren();
    if(!game){const copy=node('div');copy.append(node('p','De route naar de beker','bracket-eyebrow'),node('h3','De indeling volgt'),node('p','Na publicatie verschijnen de deelnemers en alle bekerplekken hier.'));detail.append(copy);return;}
    const bye=game.status==='bye',walkover=game.status==='walkover',copy=node('div',undefined,'bracket-detail-copy');copy.append(node('p',game.round,'bracket-eyebrow'),node('h3',bye?qualifier(game)+' · Vrijloting':game.home+' – '+game.away));
    copy.append(node('p',bye?'Dit team gaat zonder wedstrijd rechtstreeks door.':walkover?'De toernooileiding heeft de doorgang reglementair vastgesteld.':[shortDate(game.date),game.time||'Tijd volgt',game.venue||'Locatie volgt',game.field||''].filter(Boolean).join(' · '),'bracket-detail-meta'));
    const outcome=node('div',undefined,'bracket-detail-outcome'),hasScore=Number.isInteger(game.homeScore)&&Number.isInteger(game.awayScore);
    outcome.append(node('strong',bye?'Rechtstreeks door':walkover?'Reglementair':hasScore?game.homeScore+'–'+game.awayScore:game.time||'Tijd volgt'),node('span',(labels[game.status]||'Gepland')+(game.status==='live'?' · '+game.minute+'′':'')));
    if(!bye){const link=node('a','Open wedstrijd','hv-button hv-button-dark');link.href='#wedstrijd-'+game.id;outcome.append(link);}detail.append(copy,outcome);detail.dataset.matchId=game.id;
  }
  function selection(){root.querySelectorAll('[data-schema-game]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.matchId===selectedId)));showDetail();}
  function matchCard(game,round,index){
    const button=node('button',undefined,'bracket-game'+(game.status==='live'?' bracket-live':''));button.type='button';button.dataset.schemaGame=round+'-'+index;button.dataset.matchId=game.id;button.setAttribute('aria-pressed',String(game.id===selectedId));
    const summary=node('small');if(game.status==='bye'||game.status==='walkover'){summary.append(node('span',labels[game.status]));button.append(summary,node('b',qualifier(game)),node('b',game.status==='bye'?'Rechtstreeks door':'Reglementair door'),node('em',game.status==='bye'?'Geen wedstrijd nodig':'Besluit toernooileiding'));button.setAttribute('aria-label',qualifier(game)+', '+labels[game.status]);return button;}
    if(game.status==='live')summary.append(node('i'));summary.append(node('span',game.status==='live'?'Live · '+game.minute+'′':game.status==='finished'?'Afgelopen · '+shortDate(game.date):shortDate(game.date)+' · '+(game.time||'Tijd volgt')));
    for(const side of ['home','away']){const row=node('b');row.append(node('span',game[side],'bracket-team-name'),node('strong',Number.isInteger(game[side+'Score'])?String(game[side+'Score']):'–','bracket-team-score'));if(side==='home')button.append(summary);button.append(row);}
    button.append(node('em',game.field||'Veld volgt'));button.setAttribute('aria-label',game.home+' tegen '+game.away+', '+shortDate(game.date)+', '+labels[game.status]);return button;
  }
  function render(animate=false){
    syncCups();const cup=fixtures.cups.find(cup=>cup.key===cupKey)||fixtures.cups[0];if(!cup)return;cupKey=cup.key;title.textContent=cup.name;const drawLink=root.querySelector('[data-bracket-draw]');if(drawLink){drawLink.hidden=!window.HVDraw?.publicRecord?.(cup.id);drawLink.dataset.cupId=cup.id;}const context=root.querySelector('.bracket-board-head .hv-eyebrow');if(context)context.textContent='Knock-out · Editie '+(window.HVEditions?.active?.().label||'2026/27');const finalLink=root.querySelector('.bracket-finalday');if(finalLink)finalLink.textContent='Finaledag · '+shortDate(fixtures.finalDay);
    tabs.querySelectorAll('[data-bracket-cup]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bracketCup===cupKey)));
    const matches=games(),rounds=order.filter(round=>matches.some(game=>game.roundKey===round));if(!rounds.includes(activeRound))activeRound=rounds.includes('quarter')?'quarter':rounds[0];
    const sig=cupKey+rounds.join('|');if(sig!==roundSignature){roundSignature=sig;roundSelect.replaceChildren(...rounds.map(round=>new Option(names[round],round)));}roundSelect.value=activeRound||'';roundSelect.disabled=!rounds.length;
    if(!matches.some(game=>game.id===selectedId))selectedId=matches.filter(game=>game.roundKey===activeRound).sort(sort)[0]?.id||matches[0]?.id;
    tree.replaceChildren();
    if(!matches.length){const empty=node('p','Er is nog geen bekerindeling gepubliceerd.','bracket-empty');tree.append(empty);selection();return;}
    const start=Math.max(0,Math.min(rounds.indexOf(activeRound),rounds.length-3)),visible=rounds.slice(start,start+3),maxCount=Math.max(1,...visible.map(round=>matches.filter(game=>game.roundKey===round).length));
    tree.style.setProperty('--br-visible-columns',visible.length);tree.style.setProperty('--br-total-slots',maxCount);
    for(const [columnIndex,round]of visible.entries()){
      const rows=matches.filter(game=>game.roundKey===round).sort(sort),column=node('section',undefined,'bracket-round'+(round===activeRound?' is-current':'')+(columnIndex<visible.length-1?' bracket-flow':''));column.dataset.schemaColumn=round;
      const header=node('header'),heading=node('h3',names[round]);heading.id='bracket-'+round+'-title';column.setAttribute('aria-labelledby',heading.id);
      const byes=rows.filter(row=>row.status==='bye').length,duels=rows.length-byes;header.append(heading,node('span',duels+' '+(duels===1?'duel':'duels')+(byes?' · '+byes+' vrij':' ')));column.append(header);
      const body=node('div',undefined,'bracket-column-body');body.style.setProperty('--br-round-slots',Math.max(1,rows.length));
      for(let index=0;index<rows.length;index+=2){const pair=node('div',undefined,'bracket-pair');pair.style.setProperty('--br-pair-span',rows.length===1?maxCount:2*maxCount/rows.length);if(rows.length===1)pair.classList.add('is-single');pair.append(matchCard(rows[index],round,index));if(rows[index+1])pair.append(matchCard(rows[index+1],round,index+1));body.append(pair);}column.append(body);tree.append(column);
    }
    selection();if(animate&&!reducedMotion.matches)tree.animate([{opacity:.45,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
  }
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-bracket-cup]');if(!button)return;cupKey=button.dataset.bracketCup;selectedId=null;render(true);});
  roundSelect.addEventListener('change',()=>{activeRound=roundSelect.value;selectedId=null;render(true);});
  tree.addEventListener('click',event=>{const button=event.target.closest('[data-match-id]');if(!button)return;selectedId=button.dataset.matchId;selection();});
  root.querySelector('[data-bracket-draw]')?.addEventListener('click',event=>window.HVDemo?.set('drawSelectedCup',event.currentTarget.dataset.cupId));
  function fromHash(){if(location.hash.startsWith('#schema-')){const key=location.hash.slice(8);if(fixtures.cups.some(cup=>cup.key===key)){cupKey=key;selectedId=null;render();}}}
  window.addEventListener('hashchange',fromHash);window.HVRender.watch(page,['hv:fixtures','hv:competition','hv:draw','hv:edition'],()=>render());root.classList.add('is-interactive');render();fromHash();
})();
