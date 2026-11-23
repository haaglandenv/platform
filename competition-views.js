(() => {
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
  function matchSettings(match){const config=window.HVCompetition?.get(match?.tournamentId||match?.cupKey);const frozen=window.HVCompetition?.rulesForMatch(match);return frozen?.rules?frozen:config?.rules?config:null;}
  function values(settings){const rules=settings?.rules||{};return[
    ['Speelduur','2 × '+(rules.halfMinutes||45)+' minuten'],
    ['Verlenging',rules.extraTime?'2 × '+(rules.extraHalfMinutes||15)+' minuten':'Geen verlenging'],
    ['Bij gelijke stand',rules.penalties?'Strafschoppen':'Besluit toernooileiding'],
  ];}
  window.HVCompetitionUI={
    matchSettings,
    renderMatchBrief(target,match){
      if(!target)return null;target.classList.add('hv-match-brief');
      if(!match){target.replaceChildren(node('p','Selecteer een wedstrijd om de afspraken en tenuekleuren te bekijken.','hv-match-brief-empty'));return null;}
      const settings=matchSettings(match),cup=window.HVFixtures?.cups.find(cup=>cup.id===match.tournamentId||cup.key===match.cupKey);
      const head=node('header',null,'hv-match-brief-head'),copy=node('div');copy.append(node('h3','Wedstrijdafspraken'),node('p',(cup?.name||match.cupName||'Toernooi')+' · Reglementversie '+(settings?.version||1)));
      const link=node('a','Lees het reglement');link.href='#reglement-'+(cup?.key||match.cupKey||'senioren');head.append(copy,link);
      const facts=node('div',null,'hv-match-rule-chips');for(const [label,value]of values(settings)){const fact=node('div');fact.append(node('span',label),node('strong',value));facts.append(fact);}
      const kits=node('div',null,'hv-match-kits');target.replaceChildren(head,facts,kits);window.HVKits?.renderMatch(kits,match);
      return settings;
    },
  };
})();
