(() => {
  const page=document.getElementById('reglement');if(!page)return;
  const $=key=>page.querySelector('[data-reg-'+key+']'),select=$('cup');
  let cups=window.HVFixtures?.cups||[],selected=cups[0]?.key||'senioren';
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
  const roundLabels={first:'eerste ronde',last16:'achtste finales',quarter:'kwartfinales',semi:'halve finales',final:'finale'};
  const dateLabel=value=>{const date=new Date(value+'T12:00:00Z');return Number.isNaN(date.getTime())?'nog te bepalen':date.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'});};
  function prose(target,text,empty){const paragraphs=String(text||'').trim().split(/\n\s*\n/).filter(Boolean);target.replaceChildren(...(paragraphs.length?paragraphs:[empty]).map(value=>node('p',value)));}
  function refreshCups(){
    cups=window.HVFixtures?.cups||[];
    const signature=cups.map(cup=>cup.key+':'+cup.name).join('|');
    if(select.dataset.options!==signature){select.replaceChildren(...cups.map(cup=>new Option(cup.name,cup.key)));select.dataset.options=signature;}
    const anchors=page.querySelector('.reg-route-anchors');
    if(anchors)anchors.replaceChildren(...cups.map(cup=>{const anchor=node('span');anchor.id='reglement-'+cup.key;return anchor;}));
    if(!cups.some(cup=>cup.key===selected))selected=cups[0]?.key;
  }
  function render(){
    refreshCups();const cup=cups.find(cup=>cup.key===selected)||cups[0];if(!cup)return;
    const settings=window.HVCompetition?.get(cup.id),rules=settings?.rules||{};select.value=cup.key;
    $('title').textContent='Reglement '+cup.name;
    const summaries=[['Speelduur','2 × '+(rules.halfMinutes||45)+' min','Rust: '+(rules.halfTimeMinutes??15)+' minuten'],['Verlenging',rules.extraTime?'2 × '+(rules.extraHalfMinutes||15)+' min':'Nee',rules.extraTime?'Alleen in de aangewezen speelrondes':'De wedstrijd krijgt geen extra speeltijd'],['Strafschoppen',rules.penalties?'Ja':'Nee',rules.penalties?'Bij een gelijke stand na de geldende speeltijd':'De toernooileiding bepaalt het vervolg'],['Reglement','Versie '+(settings?.version||1),'Afspraken voor '+cup.name]];
    $('summary').replaceChildren(...summaries.map(([label,value,note])=>{const el=node('div',null,'reg-kpi');el.append(node('span',label),node('strong',value),node('small',note));return el;}));
    const ages=rules.minAge!=null&&rules.maxAge!=null?rules.minAge+' tot en met '+rules.maxAge+' jaar':rules.minAge!=null?'vanaf '+rules.minAge+' jaar':rules.maxAge!=null?'tot en met '+rules.maxAge+' jaar':'geen leeftijdsgrens';
    const eligibility='Leeftijd: '+ages+'. Peildatum: '+(rules.ageReference==='season'?dateLabel(rules.referenceDate||'2027-01-01'):'de wedstrijddag')+'. Maximaal '+(rules.maxDispensations??0)+' goedgekeurde dispensaties per wedstrijdselectie.';
    const selection='Wedstrijdselectie: '+(rules.starterCount??11)+' basisspelers en maximaal '+(rules.maxSquadSize??18)+' spelers in totaal. Minimaal '+(rules.minimumPlayers??7)+' aanwezige veldspelers. '+(rules.requiredGoalkeeper!==false?'Er moet een keeper worden aangewezen.':'Een afzonderlijke keeperaanwijzing is niet verplicht.');
    const substitutions=rules.substitutionMode==='continuous'?'Er mag doorlopend worden gewisseld.':'Er zijn maximaal '+(rules.maxSubstitutions??5)+' wissels toegestaan.';
    const discipline='Schorsingscontrole bij '+(rules.yellowThreshold??3)+' gele kaarten. De toernooileiding legt sancties en eventuele uitzonderingen vast in het tuchtdossier.';
    const officials='Arbitrage: '+(rules.refereeType==='club'?'een verenigingsscheidsrechter is toegestaan':'een onafhankelijke scheidsrechter')+' en '+(rules.assistantsRequired??2)+' assistent'+((rules.assistantsRequired??2)===1?'':'en')+'.';
    const extraRounds=(Array.isArray(rules.extraTimeRounds)?rules.extraTimeRounds:['first','last16','quarter','semi','final']).map(key=>roundLabels[key]).filter(Boolean);
    const extra=rules.extraTime?'Verlenging van 2 × '+(rules.extraHalfMinutes||15)+' minuten in: '+(extraRounds.join(', ')||'nog geen ronde aangewezen')+'.':'Geen verlenging.';
    prose($('tournament'),[eligibility,rules.tournamentText].filter(Boolean).join('\n\n'),'Er zijn nog geen aanvullende toernooiafspraken gepubliceerd.');
    prose($('match'),[selection,substitutions+' '+discipline,officials,extra,rules.matchText].filter(Boolean).join('\n\n'),'Er zijn nog geen aanvullende wedstrijdafspraken gepubliceerd.');
    $('version').textContent='Reglementversie '+(settings?.version||1)+(rules.effectiveFrom?' · geldig vanaf '+dateLabel(rules.effectiveFrom):'');
    const date=settings?.updatedAt?new Date(settings.updatedAt):null;
    $('version-note').textContent=date&&!Number.isNaN(date.getTime())?'Bijgewerkt '+date.toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}):'De toernooileiding beheert deze afspraken per beker.';
    $('bracket').href='#schema-'+cup.key;
  }
  function route(){refreshCups();const key=location.hash.replace('#reglement-',''),cup=cups.find(cup=>cup.key===key||cup.id===key);if(cup)selected=cup.key;render();}
  select.addEventListener('change',()=>{selected=select.value;location.hash='reglement-'+select.value;render();});
  window.addEventListener('hashchange',()=>{if(location.hash==='#reglement'||location.hash.startsWith('#reglement-'))route();});
  window.HVRender.watch(document.getElementById('reglement'),['hv:competition','hv:fixtures'],render);
  route();
})();
