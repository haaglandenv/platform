(() => {
  const fixtures=window.HVFixtures,page=document.getElementById('home');
  if(!fixtures||!page)return;
  const labels={scheduled:'Gepland',live:'Live',finished:'Afgelopen',cancelled:'Afgelast',suspended:'Gestaakt',review:'In beoordeling',walkover:'Reglementair beslist',bye:'Vrijloting'};
  function renderHome() {
    document.querySelectorAll('[data-home-match]').forEach(row=>{
      const game=fixtures.get(row.dataset.homeMatch);
      if(!game)return;
      row.href='#wedstrijd-'+game.id;
      row.querySelector('time').textContent=game.time.replace(':','.');
      row.querySelector('b').textContent=game.home+' – '+game.away;
      row.querySelector('small').textContent=game.venue+' · '+game.field;
      row.querySelector('.home-result').textContent=Number.isInteger(game.homeScore)&&Number.isInteger(game.awayScore)?game.homeScore+'–'+game.awayScore:labels[game.status];
    });
  }

  let renderQueued=false;
  function scheduleRender(){if(page.hidden||renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(!page.hidden)renderHome();});}
  for(const name of ['hv:fixtures','hv:kits','hv:competition','hv:match-events'])document.addEventListener(name,scheduleRender);
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===page.id)scheduleRender();});
  renderHome();
})();
