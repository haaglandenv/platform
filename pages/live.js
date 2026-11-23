(() => {
  const page = document.getElementById('live');
  const fixtures = window.HVFixtures;
  if (!page || !fixtures) return;
  const dateInput = page.querySelector('[data-live-date]');
  const cupSelect = page.querySelector('[data-live-cup]');
  const grid = page.querySelector('[data-live-grid]');
  const empty = page.querySelector('[data-live-empty]');
  const details = page.querySelector('[data-live-detail]');
  const detailContent = page.querySelector('[data-live-detail-content]');
  const feedback = page.querySelector('[data-live-feedback]');
  const refreshButton = page.querySelector('[data-live-refresh]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {live:'Live',finished:'Afgelopen',scheduled:'Gepland',cancelled:'Afgelast',suspended:'Gestaakt',review:'In beoordeling',walkover:'Reglementair beslist',bye:'Vrijloting',paused:'Rust'};
  const dateFormat = new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'});
  let filter = 'live';
  let selectedId = '';
  let timer = null;
  let request = null;
  let lastError = '';
  const scores = new Map();
  dateInput.value = fixtures.today;
  dateInput.defaultValue = fixtures.today;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function populateCups(){
    const previous=cupSelect.value||'all';cupSelect.replaceChildren(new Option('Alle toernooien','all'),...fixtures.cups.map(cup=>new Option(cup.name,cup.id)));
    cupSelect.value=fixtures.cups.some(cup=>cup.id===previous)?previous:'all';
  }
  populateCups();
  const busy = () => !page.hidden && document.visibilityState !== 'hidden';
  const isLive = game => ['live','paused'].includes(game.status);
  const score = (game, side) => game[side + 'Score'] === null || game[side + 'Score'] === undefined ? '–' : String(game[side + 'Score']);
  const minute = game => game.status === 'paused' ? 'Rust' : game.status === 'live' && game.minute !== null && game.minute !== undefined ? game.minute + '′' : labels[game.status] || 'Gepland';
  function initial(name) { return String(name || '?').split(/\s+/).map(word=>word[0]).join('').slice(0,3).toUpperCase(); }
  function dayGames() {
    return fixtures.all().filter(game => game.status !== 'bye' && game.date === dateInput.value && (cupSelect.value === 'all' || game.tournamentId === cupSelect.value));
  }
  function readFeed() {
    const info = fixtures.feedInfo?.() || {};
    page.querySelector('[data-live-feed-mode]').textContent = info.mode === 'api' ? 'Live verbonden' : 'Live demo';
    page.querySelector('[data-live-feed-note]').textContent = info.mode === 'api'
      ? 'De standen worden automatisch om de 15 seconden bijgewerkt vanuit de gekoppelde wedstrijdfeed.'
      : 'De standen in dit prototype bewegen mee met een demofeed. Automatisch bijgewerkt om de 15 seconden.';
    const updated = Date.parse(info.updatedAt);
    page.querySelector('[data-live-updated]').textContent = Number.isFinite(updated)
      ? 'Bijgewerkt ' + new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Amsterdam'}).format(new Date(updated))
      : 'Nog niet bijgewerkt';
    feedback.textContent = lastError || (info.lastError ? 'De verbinding is onderbroken. De laatst ontvangen standen blijven zichtbaar.' : '');
  }
  function drawDetails() {
    const game = fixtures.get(selectedId);
    const intro = details.querySelector('.live-detail-intro');
    const heading = intro.querySelector('h2');
    const description = intro.querySelector('p:last-child');
    detailContent.replaceChildren();
    if (!game || game.status === 'bye') {
      intro.querySelector('.hv-eyebrow').textContent = 'Dicht op de wedstrijd';
      heading.textContent = 'Kies een wedstrijd';
      description.textContent = 'Selecteer een duel voor de score, het veld en de wedstrijdgegevens.';
      return;
    }
    intro.querySelector('.hv-eyebrow').textContent = game.cupName + ' · ' + game.round;
    heading.textContent = game.home + ' – ' + game.away;
    description.textContent = minute(game) + (['live','finished','suspended','paused'].includes(game.status) ? ' · Stand ' + score(game,'home') + '–' + score(game,'away') : '');
    const facts = el('dl','live-detail-facts');
    for (const [term,value] of [['Speeldag',dateFormat.format(new Date(game.date+'T12:00:00+02:00'))],['Aftrap',String(game.time).replace(':','.')],['Sportpark',game.venue],['Veld',game.field]]) {
      const item = el('div');
      item.append(el('dt','',term),el('dd','',value));
      facts.append(item);
    }
    detailContent.append(facts);
    const link = el('a','hv-button hv-button-dark','Open wedstrijdcentrum');
    link.href = '#wedstrijd-' + game.id;
    detailContent.append(link);
  }

  function card(game) {
    const node = el('article','live-card');
    node.dataset.liveMatch = game.id;
    node.dataset.selected = String(selectedId === game.id);
    const head = el('header','live-card-head');
    const state = el('span','live-card-status',minute(game));
    state.dataset.status = isLive(game) ? 'live' : game.status;
    head.append(el('span','live-card-cup',game.cupName),state);
    const board = el('div','live-card-score');
    for (const side of ['home','away']) {
      const row = el('div','live-card-team');
      const mark = el('span','live-team-mark',initial(game[side]));
      mark.setAttribute('aria-hidden','true');
      const number = el('strong','',score(game,side));
      number.dataset.liveScore = side;
      number.setAttribute('aria-label',side === 'home' ? 'Doelpunten thuis: ' + number.textContent : 'Doelpunten uit: ' + number.textContent);
      row.append(mark,el('h3','',game[side]),number);
      board.append(row);
    }
    const location = el('p','live-card-location');
    location.append(el('span','',game.venue + ' · ' + game.field),el('span','',String(game.time).replace(':','.')));
    const foot = el('footer','live-card-foot');
    const action = el('button','','Wedstrijddetails');
    action.type = 'button';
    action.dataset.liveOpen = game.id;
    action.setAttribute('aria-controls','live-detail-title');
    action.setAttribute('aria-pressed',String(selectedId === game.id));
    action.setAttribute('aria-label','Wedstrijddetails ' + game.home + ' tegen ' + game.away);
    foot.append(el('small','',game.round),action);
    node.append(head,board,location,foot);
    const signature = score(game,'home') + ':' + score(game,'away');
    if (scores.has(game.id) && scores.get(game.id) !== signature && !motion.matches) {
      requestAnimationFrame(() => node.querySelectorAll('[data-live-score]').forEach(value => value.animate([{background:'#eaff27',transform:'scale(1.12)'},{background:'transparent',transform:'scale(1)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'})));
    }
    scores.set(game.id,signature);
    return node;
  }
  function render() {
    const games = dayGames();
    const counts = {live:games.filter(isLive).length,finished:games.filter(game=>game.status==='finished').length,scheduled:games.filter(game=>game.status==='scheduled').length};
    for (const [key,value] of Object.entries(counts)) page.querySelector('[data-live-count="'+key+'"]').textContent = value;
    page.querySelector('[data-live-context]').textContent = (dateInput.value === fixtures.today ? 'Demodag · ' : 'Speeldag · ') + dateFormat.format(new Date(dateInput.value+'T12:00:00+02:00'));
    const visible = games.filter(game => filter === 'all' || (filter === 'live' ? isLive(game) : ['finished','walkover'].includes(game.status))).sort((a,b)=>Number(isLive(b))-Number(isLive(a)) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
    grid.replaceChildren(...visible.map(card));
    empty.hidden = visible.length > 0;
    page.querySelector('[data-live-empty-title]').textContent = filter === 'live' ? 'De bal rolt hier nog niet' : filter === 'finished' ? 'Nog geen eindstanden' : 'Een vrije dag langs de lijn';
    page.querySelector('[data-live-empty-text]').textContent = filter === 'live' ? 'Er zijn op deze speeldag geen wedstrijden bezig binnen je selectie.' : filter === 'finished' ? 'Binnen deze selectie zijn nog geen wedstrijden afgelopen.' : 'Voor deze speeldag en dit toernooi staan geen wedstrijden in de kalender.';
    page.querySelector('[data-live-show-all]').hidden = filter === 'all';
    page.querySelector('[data-live-result-count]').textContent = visible.length + (visible.length === 1 ? ' wedstrijd' : ' wedstrijden');
    page.querySelectorAll('[data-live-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.liveFilter===filter)));
    if (selectedId && !games.some(game=>game.id===selectedId)) selectedId = '';
    drawDetails();
    readFeed();
  }
  async function refresh() {
    if (!busy() || request) return;
    const controller = new AbortController();
    const requestedDate = dateInput.value;
    request = controller;
    refreshButton.setAttribute('aria-busy','true');
    refreshButton.disabled = true;
    page.querySelector('[data-live-refresh-label]').textContent = 'Bijwerken…';
    try {
      await fixtures.refreshLive(requestedDate,{signal:controller.signal});
      if (!controller.signal.aborted) lastError = '';
    } catch (error) {
      if (!controller.signal.aborted && error?.name !== 'AbortError') lastError = 'De standen konden niet worden bijgewerkt. De laatste standen blijven zichtbaar.';
    } finally {
      if (request === controller) {
        request = null;
        refreshButton.removeAttribute('aria-busy');
        refreshButton.disabled = false;
        page.querySelector('[data-live-refresh-label]').textContent = 'Ververs standen';
      }
      scheduleRender();
      if (controller.signal.aborted && busy() && !request) queueMicrotask(refresh);
    }
  }
  function watchPage() {
    if (busy()) {
      scheduleRender();
      if (timer === null) {
        refresh();
        timer = setInterval(refresh,15000);
      }
    } else {
      if (timer !== null) clearInterval(timer);
      timer = null;
      request?.abort();
    }
  }
  page.addEventListener('click',event=>{
    const statusButton = event.target.closest('[data-live-filter]');
    if (statusButton) { filter = statusButton.dataset.liveFilter; render(); }
    const open = event.target.closest('[data-live-open]');
    if (open) {
      selectedId = open.dataset.liveOpen;
      grid.querySelectorAll('[data-live-match]').forEach(node=>{
        const selected = node.dataset.liveMatch===selectedId;
        node.dataset.selected=String(selected);
        node.querySelector('button').setAttribute('aria-pressed',String(selected));
      });
      drawDetails();
      if (!motion.matches) detailContent.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
    }
    if (event.target.closest('[data-live-show-all]')) {filter='all';render();}
    if (event.target.closest('[data-live-refresh]')) refresh();
    if (event.target.closest('[data-live-today]')) {
      dateInput.value=fixtures.today;
      selectedId='';
      render();
      refresh();
    }
  });
  dateInput.addEventListener('change',()=>{
    if (!dateInput.value || !dateInput.validity.valid) {dateInput.value=fixtures.today;}
    selectedId='';
    request?.abort();
    render();
    refresh();
  });
  cupSelect.addEventListener('change',()=>{selectedId='';render();});
  let renderQueued=false,needsPopulate=false;
  function scheduleRender(){if(page.hidden||renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(page.hidden)return;if(needsPopulate){populateCups();needsPopulate=false;}render();});}
  document.addEventListener('hv:fixtures',scheduleRender);
  document.addEventListener('hv:competition',()=>{needsPopulate=true;scheduleRender();});
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===page.id){needsPopulate=true;scheduleRender();}});
  document.addEventListener('visibilitychange',watchPage);
  new MutationObserver(watchPage).observe(page,{attributes:true,attributeFilter:['hidden']});
  render();
  watchPage();
})();
