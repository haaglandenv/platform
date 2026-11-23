(() => {
  const identity=window.HVIdentity,store=window.HVDemo;
  if(!identity||!store)return;
  const parts=['shirt','shorts','socks'];
  const labels={shirt:'Shirt',shorts:'Broek',socks:'Sokken'};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const part=(color,label)=>({color,label});
  const palette=[['#1352B7','Koningsblauw'],['#18513A','Groen'],['#151B19','Zwart'],['#E8EDE4','Wit'],['#AD2539','Rood'],['#F0CE3B','Geel']];
  const records=()=>{const value=store.get('clubKits',{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{};};
  function resolve(id){return identity.club(id)||identity.club(identity.team(id)?.clubId);}
  function seed(club){
    const n=Number(club.id.slice(-3)),primary=palette[(n-101)%palette.length];
    const home={shirt:part(...primary),shorts:part('#F6F8F1','Wit'),socks:part(...primary)};
    const away={shirt:part('#F6F8F1','Wit'),shorts:part(...primary),socks:part('#F6F8F1','Wit')};
    if(n===102){home.shirt=part('#236C4D','Groen');home.shorts=part('#17211C','Zwart');home.socks=part('#236C4D','Groen');away.shirt=part('#E3D642','Geel');away.shorts=part('#17211C','Zwart');away.socks=part('#E3D642','Geel');}
    return {clubId:club.id,clubName:club.name,home,away,version:1,updatedAt:null,example:true};
  }
  function normalise(payload){
    const output={};
    for(const variant of ['home','away']){
      const input=payload?.[variant];if(!input||typeof input!=='object')return {ok:false,error:'Vul zowel het thuis- als het uittenue in.'};
      output[variant]={};
      for(const key of parts){
        const value=input[key],color=typeof value?.color==='string'?value.color.trim().toUpperCase():'',label=typeof value?.label==='string'?value.label.trim():'';
        if(!/^#[A-F0-9]{6}$/.test(color))return {ok:false,error:'Kies een geldige kleur voor '+labels[key].toLocaleLowerCase('nl')+'.'};
        if(!label||label.length>40)return {ok:false,error:'Geef iedere kleur een naam van maximaal 40 tekens.'};
        output[variant][key]={color,label};
      }
    }
    return {ok:true,value:output};
  }
  function get(id){
    const club=resolve(id);if(!club)return null;
    const fallback=seed(club),record=records()[club.id];
    if(!record)return clone(fallback);
    const checked=normalise(record);
    return checked.ok?{...fallback,...clone(record),...checked.value,version:Number.isInteger(record.version)&&record.version>0?record.version:1,clubId:club.id,clubName:club.name}:clone(fallback);
  }
  function save(id,payload){
    const club=resolve(id);if(!club)return {ok:false,error:'Kies een bestaande vereniging.'};
    const checked=normalise(payload);if(!checked.ok)return checked;
    const before=get(club.id),record={clubId:club.id,clubName:club.name,...checked.value,version:before.version+1,updatedAt:new Date().toISOString(),example:false};
    store.set('clubKits',{...records(),[club.id]:record});
    return {ok:true,kit:clone(record)};
  }
  const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  function similar(a,b){const x=rgb(a),y=rgb(b);return Math.sqrt(x.reduce((sum,c,i)=>sum+(c-y[i])**2,0))<115;}
  function match(game){
    if(!game)return null;
    const home=get(game.homeClubId||game.homeTeamId),away=get(game.awayClubId||game.awayTeamId);
    const clashes=home&&away?parts.filter(key=>similar(home.home[key].color,away.away[key].color)):[];
    return {home,away,clashes,warning:clashes.length>0,matchId:game.id};
  }
  function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
  function diagram(kit,label){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 240 208');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);svg.classList.add('hvk-diagram');
    const title=document.createElementNS(ns,'title');title.textContent=label;svg.append(title);
    const draw=(tag,attrs)=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);svg.append(el);};
    draw('ellipse',{cx:120,cy:194,rx:73,ry:8,fill:'#123b2810'});
    draw('path',{d:'M83 21 61 36 39 64 61 82 78 66 78 116 162 116 162 66 179 82 201 64 179 36 157 21 143 16Q120 36 97 16Z',fill:kit.shirt.color,stroke:'#1c392d', 'stroke-width':2,'stroke-linejoin':'round'});
    draw('path',{d:'M97 16Q120 47 143 16L137 13Q120 31 103 13Z',fill:'#ffffff70'});
    draw('path',{d:'M81 121H159L166 157 129 163 120 139 111 163 74 157Z',fill:kit.shorts.color,stroke:'#1c392d','stroke-width':2,'stroke-linejoin':'round'});
    draw('path',{d:'M79 169H103L101 192H75L74 186 79 181ZM137 169H161L161 181 166 186 165 192H139Z',fill:kit.socks.color,stroke:'#1c392d','stroke-width':2,'stroke-linejoin':'round'});
    draw('path',{d:'M80 174H103M138 174H161',fill:'none',stroke:'#ffffff80','stroke-width':3});
    return svg;
  }
  function render(target,id,{variant='home',compact=false,title}={}){
    if(!target)return;
    const record=get(id),card=node('article',null,'hvk-card'+(compact?' hvk-compact':''));
    if(!record){card.append(node('p','Het tenue verschijnt zodra de vereniging bekend is.','hvk-empty'));target.replaceChildren(card);return;}
    variant=variant==='away'?'away':'home';const kit=record[variant],description=parts.map(key=>labels[key]+': '+kit[key].label).join(', ');
    const head=node('header',null,'hvk-card-head');head.append(node('div',null));head.firstChild.append(node('p',variant==='home'?'Thuistenue':'Uittenue','hvk-eyebrow'),node('h3',title||record.clubName));
    head.append(node('span',record.example?'Voorbeeld':'Ingevuld','hvk-source'));
    const info=node('div',null,'hvk-card-body'),list=node('dl',null,'hvk-colours');
    for(const key of parts){const row=node('div'),dt=node('dt',labels[key]),dd=node('dd'),swatch=node('i');swatch.style.backgroundColor=kit[key].color;swatch.setAttribute('aria-hidden','true');dd.append(swatch,node('span',kit[key].label));row.append(dt,dd);list.append(row);}
    info.append(diagram(kit,(variant==='home'?'Thuistenue':'Uittenue')+' '+record.clubName+'. '+description),list);card.append(head,info);target.replaceChildren(card);
  }
  function renderMatch(target,game){
    if(!target)return;target.replaceChildren();const value=match(game);
    if(!value){target.append(node('p','Selecteer een wedstrijd om de tenueafspraak te bekijken.','hvk-empty'));return;}
    const shell=node('section',null,'hvk-match'),heading=node('header',null,'hvk-match-head');heading.append(node('div',null));heading.firstChild.append(node('p','Voor de wedstrijd','hvk-eyebrow'),node('h3','Dit nemen de teams mee'));
    const grid=node('div',null,'hvk-match-grid'),home=node('div'),away=node('div');render(home,value.home?.clubId,{variant:'home',compact:true,title:game.home});render(away,value.away?.clubId,{variant:'away',compact:true,title:game.away});grid.append(home,away);
    shell.append(heading,grid);
    const note=node('p',null,'hvk-match-note'+(value.warning?' is-check':''));
    note.append(node('strong',value.warning?'Controleer de tenueafspraak. ':'Tenue-informatie voor beide teams. '));
    note.append(document.createTextNode(value.warning?'De kleuren van '+value.clashes.map(key=>labels[key].toLowerCase()).join(', ')+' liggen dicht bij elkaar. Stem bij twijfel een alternatief af met de thuisclub en scheidsrechter.':'Het uitteam ziet hier het thuistenue en het eigen uittenue. Stem een afwijkende afspraak met beide teams af.'));
    shell.append(note,node('small','Voorbeeldkleuren zolang de vereniging haar tenues nog niet heeft ingevuld. De kleurcontrole is een visuele indicatie.','hvk-disclaimer'));
    target.append(shell);
  }
  window.HVKits={get,save,match,render,renderMatch,parts:[...parts],labels:{...labels},similar};
  document.addEventListener('hv:state',({detail})=>{if(detail?.key==='clubKits')document.dispatchEvent(new CustomEvent('hv:kits'));});
})();
