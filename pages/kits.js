(() => {
  const page=document.getElementById('tenues'),core=window.HVKits,identity=window.HVIdentity,store=window.HVDemo;
  if(!page||!core||!identity||!store)return;
  const $=selector=>page.querySelector(selector),form=$('[data-kits-form]'),clubs=identity.listClubs(),clubSelect=$('[data-kits-club]'),matchSelect=$('[data-kits-match]');
  let selected=identity.club(store.get('kitClub','HV-V-101'))?.id||clubs[0].id,dirty=false;
  const descriptions={shirt:'Shirtkleur',shorts:'Broekkleur',socks:'Sokkleur'},labels={shirt:'Shirt',shorts:'Broek',socks:'Sokken'};
  function node(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;}
  for(const club of clubs)clubSelect.append(new Option(club.name,club.id));
  for(const variant of ['home','away']){
    const target=$('[data-kits-fields="'+variant+'"]');
    for(const key of core.parts){
      const group=node('div',null,'kits-colour-row'),label=node('label',labels[key],'kits-part-label'),inputs=node('div',null,'kits-colour-inputs');
      label.htmlFor='kits-'+variant+'-'+key+'-color';
      const color=document.createElement('input');color.type='color';color.id=label.htmlFor;color.name=variant+'-'+key+'-color';color.setAttribute('aria-label',descriptions[key]+(variant==='home'?' thuistenue':' uittenue'));color.required=true;
      const text=document.createElement('input');text.type='text';text.name=variant+'-'+key+'-label';text.maxLength=40;text.required=true;text.placeholder='Bijvoorbeeld koningsblauw';text.setAttribute('aria-label','Naam '+descriptions[key].toLowerCase()+(variant==='home'?' thuistenue':' uittenue'));
      inputs.append(color,text);group.append(label,inputs);target.append(group);
    }
  }
  function read(){return Object.fromEntries(['home','away'].map(variant=>[variant,Object.fromEntries(core.parts.map(key=>[key,{color:form.elements.namedItem(variant+'-'+key+'-color').value,label:form.elements.namedItem(variant+'-'+key+'-label').value.trim()}]))]));}
  function renderPreview(){
    const data=read();
    for(const variant of ['home','away']){
      const target=$('[data-kits-preview="'+variant+'"]'),kit=data[variant];
      const preview=node('div',null,'kits-preview-colours');preview.append(node('span','Jouw kleurkeuze'));
      for(const key of core.parts){const swatch=node('span',kit[key].label||labels[key],'kits-preview-pill');swatch.style.setProperty('--kit-colour',kit[key].color);preview.append(swatch);}
      target.replaceChildren(preview);
    }
  }
  function renderMatches(){
    const games=(window.HVFixtures?.all()||[]).filter(game=>game.homeClubId===selected||game.awayClubId===selected),old=matchSelect.value;
    matchSelect.replaceChildren(...games.map(game=>new Option(game.home+' – '+game.away+' · '+game.date,game.id)));
    matchSelect.value=games.some(game=>game.id===old)?old:games.find(game=>game.date>=(window.HVFixtures?.today||'2027-06-05'))?.id||games[0]?.id||'';
    core.renderMatch($('[data-kits-match-preview]'),window.HVFixtures?.get(matchSelect.value));
  }
  function load(){
    const record=core.get(selected);clubSelect.value=selected;
    for(const variant of ['home','away'])for(const key of core.parts){form.elements.namedItem(variant+'-'+key+'-color').value=record[variant][key].color;form.elements.namedItem(variant+'-'+key+'-label').value=record[variant][key].label;}
    $('[data-kits-version]').textContent=record.example?'Voorbeeldtenues · nog niet door deze vereniging ingevuld':'Tenues opgeslagen · versie '+record.version;
    dirty=false;renderPreview();renderMatches();
  }
  clubSelect.addEventListener('change',()=>{selected=clubSelect.value;store.set('kitClub',selected);$('[data-kits-feedback]').textContent='Je beheert nu de tenues van '+identity.club(selected).name+'.';load();});
  form.addEventListener('input',()=>{dirty=true;renderPreview();$('[data-kits-feedback]').dataset.error='false';$('[data-kits-feedback]').textContent='Je kleurkeuze is gewijzigd. Sla de tenues op om ze met andere teams te delen.';});
  form.addEventListener('submit',event=>{event.preventDefault();const response=core.save(selected,read());$('[data-kits-feedback]').textContent=response.ok?'Tenues opgeslagen. Andere teams zien de bijgewerkte kleuren bij de wedstrijd.':response.error;$('[data-kits-feedback]').dataset.error=String(!response.ok);if(response.ok){dirty=false;load();}});
  matchSelect.addEventListener('change',()=>core.renderMatch($('[data-kits-match-preview]'),window.HVFixtures?.get(matchSelect.value)));
  document.addEventListener('hv:kits',()=>{if(!dirty)load();else renderMatches();});
  document.addEventListener('hv:fixtures',renderMatches);
  document.addEventListener('hv:state',({detail})=>{if(detail?.key==='kitClub'&&identity.club(detail.value)){selected=detail.value;load();}});
  load();
})();
