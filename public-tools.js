(() => {
  const store=window.HVDemo,identity=window.HVIdentity;if(!store||!identity)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const teamIds=()=>[...new Set((store.get('app-favorites',['HV-T-101-01'])||[]).map(id=>identity.team(id)?.id).filter(Boolean))];
  function all(){return [...teamIds().map(id=>({kind:'team',id})),...clone(store.get('followingEntities',[])).filter(row=>['club','cup','match'].includes(row.kind))];}
  function toggle(kind,id){if(kind==='team'){const set=new Set(teamIds());set.has(id)?set.delete(id):set.add(id);store.set('app-favorites',[...set]);}else{const rows=all().filter(row=>row.kind!=='team'),exists=rows.some(row=>row.kind===kind&&row.id===id);store.set('followingEntities',exists?rows.filter(row=>!(row.kind===kind&&row.id===id)):[...rows,{kind,id}]);}document.dispatchEvent(new CustomEvent('hv:following'));return all().some(row=>row.kind===kind&&row.id===id);}
  function entities(){return [
    ...identity.listClubs().map(row=>({kind:'club',id:row.id,title:row.name,description:'Vereniging · Haaglanden',href:'#vereniging-'+row.id})),
    ...identity.listTeams().map(row=>({kind:'team',id:row.id,title:row.name,description:row.clubName,href:'#elftal-'+row.id})),
    ...(window.HVFixtures?.cups||[]).map(row=>({kind:'cup',id:row.id,title:row.name,description:row.category+' · Knock-out',href:'#toernooien-'+row.key})),
    ...(window.HVFixtures?.all()||[]).filter(row=>row.status!=='bye').map(row=>({kind:'match',id:row.id,title:row.home+' – '+row.away,description:row.cupName+' · '+row.date+' · '+row.time,href:'#wedstrijd-'+row.id})),
  ];}
  function search(query,kind='all'){const text=String(query||'').trim().toLocaleLowerCase('nl'),rows=entities();const news=window.HVNews?.published()||[];rows.push(...news.map(row=>({kind:'news',id:row.id,title:row.title,description:row.category+' · '+row.excerpt,href:'#nieuwsartikel-'+row.id,image:row.image})));return rows.filter(row=>(kind==='all'||row.kind===kind)&&(!text||(row.title+' '+row.description).toLocaleLowerCase('nl').includes(text)));}
  window.HVFollowing={all,toggle,entities,has:(kind,id)=>all().some(row=>row.kind===kind&&row.id===id)};window.HVSearch={search};
  document.addEventListener('click',event=>{const button=event.target.closest('[data-follow-kind][data-follow-id]');if(!button)return;const following=toggle(button.dataset.followKind,button.dataset.followId);button.setAttribute('aria-pressed',String(following));button.textContent=following?'Gevolgd':'Volgen';});
  document.addEventListener('hv:state',({detail})=>{if(['app-favorites','followingEntities'].includes(detail?.key))document.dispatchEvent(new CustomEvent('hv:following'));});
})();
