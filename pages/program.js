(() => {
  const root = document.getElementById('programma');
  const source = window.HVFixtures;
  if (!root || !source) return;
  const $ = selector => root.querySelector(selector);
  const canvas = $('[data-cal-canvas]');
  const detail = $('[data-cal-detail]');
  const state = { date: source.today, view: 'month', cup: '', club: '', query: '', selected: 'HV-2701' };
  const weekdays = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const dateOf = value => new Date(value + 'T12:00:00Z');
  const iso = date => date.toISOString().slice(0, 10);
  const addDays = (value, count) => { const d = dateOf(value); d.setUTCDate(d.getUTCDate() + count); return iso(d); };
  const monday = value => { const d = dateOf(value); return addDays(value, -(d.getUTCDay() + 6) % 7); };
  const format = (value, options) => dateOf(value).toLocaleDateString('nl-NL', { timeZone: 'UTC', ...options });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const statusLabel = game => ({scheduled:'Gepland',live:'Live' + (game.minute != null ? ' ' + game.minute + '′' : ''),finished:'Gespeeld',cancelled:'Afgelast',suspended:'Gestaakt',review:'In beoordeling',walkover:'Reglementair beslist',bye:'Vrijloting'}[game.status] || 'Gepland');
  const statusClass = game => 'is-' + (game.status || 'scheduled');
  const hasScore = game => game.homeScore !== null && game.homeScore !== undefined && game.awayScore !== null && game.awayScore !== undefined;
  const score = game => hasScore(game) ? game.homeScore + '–' + game.awayScore : '–';
  const fixtures = () => source.all().filter(game => game.status !== 'bye' && (!state.cup || game.cupKey === state.cup || game.tournamentId === state.cup) && (!state.club || game.home === state.club || game.away === state.club || game.homeClubId === state.club || game.awayClubId === state.club) && (!state.query || [game.home, game.away, game.venue, game.id, game.cupName].join(' ').toLocaleLowerCase('nl-NL').includes(state.query)) ).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  const forDay = (all, day) => all.filter(game => game.date === day);
  const name = game => game.home + ' – ' + game.away;
  const eventAttrs = game => `data-cal-match="${esc(game.id)}" aria-pressed="${state.selected === game.id}" aria-label="${esc(game.time + ' ' + name(game) + ', ' + game.cupName + ', ' + statusLabel(game))}"`;
  function monthView(all) {
    const d = dateOf(state.date);
    d.setUTCDate(1);
    const start = monday(iso(d));
    const month = state.date.slice(0,7);
    let markup = '<div class="cal-month"><div class="cal-weekdays">' + weekdays.map(day => '<span>' + day + '</span>').join('') + '</div><div class="cal-month-grid">';
    for (let i = 0; i < 42; i++) {
      const day = addDays(start, i);
      const games = forDay(all, day);
      markup += `<div class="cal-month-day${day.slice(0,7) !== month ? ' is-outside' : ''}${day === source.today ? ' is-today' : ''}"><button type="button" class="cal-day-number" data-cal-day="${day}" aria-label="${esc(format(day,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}">${Number(day.slice(-2))}</button>`;
      markup += games.slice(0,2).map(game => `<button type="button" class="cal-month-event ${statusClass(game)}" ${eventAttrs(game)}><time>${esc(game.time)}</time><b>${esc(name(game))}</b></button>`).join('');
      if (games.length > 2) markup += `<button type="button" class="cal-more" data-cal-day="${day}">+${games.length - 2} wedstrijden</button>`;
      markup += '</div>';
    }
    return markup + '</div></div>';
  }
  function weekView(all) {
    const start = monday(state.date);
    return '<div class="cal-week">' + Array.from({length:7}, (_,index) => {
      const day = addDays(start,index), games = forDay(all,day);
      return `<section class="cal-week-day${day === source.today ? ' is-today' : ''}"><button type="button" class="cal-week-head" data-cal-day="${day}" aria-label="Open ${esc(format(day,{weekday:'long',day:'numeric',month:'long'}))}"><span>${format(day,{weekday:'short'})}</span><b>${Number(day.slice(-2))}</b></button><div class="cal-week-events">${games.length ? games.map(game => `<button type="button" class="cal-week-event ${statusClass(game)}" ${eventAttrs(game)}><time>${esc(game.time)} <span>${hasScore(game) ? ' · ' + esc(score(game)) : ''}</span></time><b>${esc(game.home)}<br>${esc(game.away)}</b><small>${esc(game.cupName)}<br>${esc(game.round)}<br>${esc(statusLabel(game))}</small></button>`).join('') : '<p class="cal-week-empty">Geen wedstrijden</p>'}</div></section>`;
    }).join('') + '</div>';
  }
  function dayView(all) {
    const games = forDay(all,state.date), times = [...new Set(games.map(game => game.time))];
    let markup = `<div class="cal-agenda"><header class="cal-agenda-day"><h3>${format(state.date,{weekday:'long',day:'numeric',month:'long'})}</h3><span>${games.length} duels</span></header>`;
    if (!games.length) return markup + '<div class="cal-empty"><strong>Even rust langs de lijn.</strong><p>Er staan voor deze selectie geen wedstrijden gepland. Kies een andere dag of pas de filters aan.</p></div></div>';
    markup += times.map(time => `<div class="cal-agenda-time"><time>${esc(time)}</time><div class="cal-agenda-games">${games.filter(game=>game.time === time).map(game=>`<button type="button" class="cal-agenda-event ${statusClass(game)}" ${eventAttrs(game)}><span><b>${esc(name(game))}</b><small>${esc(game.cupName)} · ${esc(game.round)}<br>${esc(game.venue)} · ${esc(game.field)}</small></span><span class="cal-agenda-score">${hasScore(game)?'<strong>'+esc(score(game))+'</strong>':''}<span>${esc(statusLabel(game))}</span></span></button>`).join('')}</div></div>`).join('');
    return markup + '</div>';
  }
  function renderDetail() {
    const game = source.get(state.selected);
    if (!game || game.status === 'bye') {
      detail.innerHTML = '<div><p class="hv-eyebrow">Wedstrijddetails</p><h2 id="cal-detail-title">Selecteer een wedstrijd</h2><p>Klik op een duel in de kalender voor alle aftrapgegevens.</p></div>';
      return;
    }
    detail.innerHTML = `<div><p class="hv-eyebrow">${esc(game.cupName)} · ${esc(game.round)}</p><h2 id="cal-detail-title">${esc(name(game))}</h2><div class="cal-detail-meta"><span>${esc(format(game.date,{weekday:'long',day:'numeric',month:'long'}))} · ${esc(game.time)}</span><span>${esc(game.venue)} · ${esc(game.field)}</span><span>${esc(statusLabel(game))}</span></div></div><div class="cal-detail-side">${hasScore(game)?'<p class="cal-detail-score">'+esc(score(game))+'</p>':''}<a class="hv-button hv-button-outline" href="${'#wedstrijd-' + esc(game.id)}">Open wedstrijdcentrum</a></div>`;
  }
  function periodGames(all) {
    if (state.view === 'day') return forDay(all, state.date);
    if (state.view === 'week') { const start=monday(state.date),end=addDays(start,6); return all.filter(g=>g.date>=start && g.date<=end); }
    return all.filter(g=>g.date.slice(0,7)===state.date.slice(0,7));
  }
  function animateCanvas() {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && canvas.animate) canvas.animate([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function render(animate = false) {
    const all=fixtures(),visible=periodGames(all);
    let heading=format(state.date,{month:'long',year:'numeric'});
    if(state.view==='week'){const start=monday(state.date),end=addDays(start,6);heading=format(start,{day:'numeric',month:'short'})+' – '+format(end,{day:'numeric',month:'short',year:'numeric'});}
    if(state.view==='day') heading=format(state.date,{day:'numeric',month:'long',year:'numeric'});
    $('[data-cal-title]').textContent=heading;
    root.querySelectorAll('[data-cal-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.calView===state.view)));
    $('[data-cal-summary]').textContent=visible.length+' '+(visible.length===1?'wedstrijd':'wedstrijden')+' in deze '+({day:'dag',week:'week',month:'maand'}[state.view]);
    canvas.dataset.view=state.view;
    canvas.innerHTML=({day:dayView,week:weekView,month:monthView}[state.view])(all);
    renderDetail();
    if(animate)animateCanvas();
  }
  function populate() {
    $('[data-cal-cup]').innerHTML='<option value="">Alle toernooien</option>'+source.cups.map(cup=>`<option value="${esc(cup.key)}">${esc(cup.name)}</option>`).join('');
    const clubs = new Map();
    for (const game of source.all().filter(game => game.status !== 'bye')) {
      for (const [id, label] of [[game.homeClubId,game.home],[game.awayClubId,game.away]]) {
        const club = id && window.HVIdentity?.club?.(id);
        if (club) clubs.set(club.id,club.name);
        else if (label && !/^Winnaar|^Nog|^Te bepalen/i.test(label)) clubs.set(label,label);
      }
    }
    $('[data-cal-club]').innerHTML='<option value="">Alle verenigingen</option>'+[...clubs].sort((a,b)=>a[1].localeCompare(b[1],'nl')).map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
    if(!source.cups.some(cup=>cup.key===state.cup))state.cup='';
    $('[data-cal-cup]').value=state.cup;$('[data-cal-club]').value=state.club;
  }
  root.addEventListener('click',event=>{
    const viewButton=event.target.closest('[data-cal-view]');
    const stepButton=event.target.closest('[data-cal-step]');
    const dayButton=event.target.closest('[data-cal-day]');
    const matchButton=event.target.closest('[data-cal-match]');
    if(viewButton){state.view=viewButton.dataset.calView;render(true);}
    else if(stepButton){const delta=Number(stepButton.dataset.calStep);if(state.view==='month'){const d=dateOf(state.date);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);state.date=iso(d);}else state.date=addDays(state.date,delta*(state.view==='week'?7:1));render(true);}
    else if(event.target.closest('[data-cal-today]')){state.date=source.today;render(true);}
    else if(dayButton){state.date=dayButton.dataset.calDay;state.view='day';render(true);}
    else if(matchButton){state.selected=matchButton.dataset.calMatch;root.querySelectorAll('[data-cal-match]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.calMatch===state.selected)));renderDetail();}
  });
  $('[data-cal-cup]').addEventListener('change',event=>{state.cup=event.target.value;render();});
  $('[data-cal-club]').addEventListener('change',event=>{state.club=event.target.value;render();});
  $('[data-cal-search]').addEventListener('input',event=>{state.query=event.target.value.trim().toLocaleLowerCase('nl-NL');render();});
  let renderQueued=false,needsPopulate=false;
  function scheduleRender(){if(root.hidden||renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(root.hidden)return;if(needsPopulate){populate();needsPopulate=false;}render();});}
  document.addEventListener('hv:fixtures',scheduleRender);
  document.addEventListener('hv:competition',()=>{needsPopulate=true;scheduleRender();});
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===root.id){needsPopulate=true;scheduleRender();}});
  populate();
  render();
})();
