(() => {
  const root = document.querySelector('#app');
  if (!root) return;

  const store = window.HVDemo;
  const identity = window.HVIdentity;
  const categories = ['Senior Sir Winston Cup', 'Vrouwen', 'O23', 'Jeugd'];
  const teams = [
    ['duindorp', 'Duindorp SV', categories[0]],
    ['scheveningen', 'SVV Scheveningen', categories[0]],
    ['hbs', 'HBS', categories[0]],
    ['quick', 'Quick', categories[0]],
    ['duno-vr', 'DUNO VR1', categories[1]],
    ['rkavv-vr', 'RKAVV VR1', categories[1]],
    ['westlandia-o23', 'Westlandia O23', categories[2]],
    ['velo-o23', 'VELO O23', categories[2]],
    ['hvv-jo15', 'HVV JO15-1', categories[3]],
    ['quick-jo15', 'Quick JO15-1', categories[3]],
  ].map(([alias, name, category]) => ({...identity.team(alias), name, category}));
  const teamById = new Map(teams.map(team => [team.id, team]));
  const teamIds = (...aliases) => aliases.map(alias => identity.team(alias).id);
  const featuredTeams = teamIds('duindorp', 'scheveningen');
  const featuredId = 'HV-2701';
  const demoDate = '2027-06-05';
  const baseFeatured = {date:demoDate, time:'19.30', venue:'Sportpark Houtrust', field:'Veld 1', status:'planned'};
  const games = [
    {id:'HV-2702', teams:teamIds('hbs','quick'), date:demoDate, time:'15.00', venue:'Sportpark Craeyenhout', field:'Hoofdveld', state:'Afgelopen', score:'1–0'},
    {id:'HV-2703', teams:teamIds('duno-vr','rkavv-vr'), date:demoDate, time:'16.15', venue:'Sportpark Houtrust', field:'Veld 2', state:'Afgelopen', score:'2–0'},
    {id:'HV-2704', teams:teamIds('westlandia-o23','velo-o23'), date:demoDate, time:'17.30', venue:'Sportpark De Hoge Bomen', field:'Veld 3', state:'Afgelopen', score:'1–3'},
    {id:'HV-2705', teams:teamIds('hvv-jo15','quick-jo15'), date:demoDate, time:'18.00', venue:'Sportpark De Diepput', field:'Veld 1', state:'Afgelopen', score:'0–2'},
  ];
  const find = selector => root.querySelector(selector);
  const findAll = selector => [...root.querySelectorAll(selector)];
  const filterForms = new Map(findAll('[data-app-filter]').map(select => [select.dataset.appFilter, select]));
  const dateText = new Intl.DateTimeFormat('nl-NL', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function favoriteIds(saved = store.get('app-favorites', [])) {
    return new Set(Array.isArray(saved)
      ? saved.map(id => identity.team(id)?.id).filter(id => teamById.has(id))
      : []);
  }

  function migrateFavorites() {
    const saved = store.get('app-favorites', []);
    if (!Array.isArray(saved)) return false;
    const ids = [...favoriteIds(saved)];
    if (ids.length === saved.length && ids.every((id, index) => id === saved[index])) return false;
    store.set('app-favorites', ids);
    return true;
  }

  function featuredGame() {
    const plan = store.get('planning', baseFeatured);
    const match = store.matchSnapshot();
    const fields = {...baseFeatured, ...plan, id:featuredId, teams:featuredTeams};
    const labels = {cancelled:'Afgelast', official:'Officiële uitslag', suspended:'Gestaakt', review:'Uitslag volgt', live:'Live'};
    if (labels[match.status]) return {
      ...fields, state:labels[match.status], ...(Number.isInteger(match.home) && {score:`${match.home}–${match.away}`}),
    };
    const moved = ['date','time','venue','field'].some(key => fields[key] !== baseFeatured[key]);
    return {...fields, state:moved ? 'Verplaatst' : 'Gepland'};
  }

  function allGames() {
    return [featuredGame(), ...games];
  }

  function addOptions(select, values) {
    const previous = select.value;
    for (const option of [...select.options].slice(1)) option.remove();
    for (const [value, label] of values) {
      const option = node('option', label);
      option.value = value;
      select.append(option);
    }
    if (values.some(([value]) => value === previous)) select.value = previous;
  }

  function renderFilters() {
    const clubs = [...new Map(teams.map(team => [team.clubId, team.clubName]))]
      .sort(([, a], [, b]) => a.localeCompare(b, 'nl'));
    const fields = [...new Set(allGames().map(game => game.field))].sort((a,b) => a.localeCompare(b,'nl'));
    addOptions(filterForms.get('club'), clubs);
    addOptions(filterForms.get('category'), categories.map(value => [value, value]));
    addOptions(filterForms.get('field'), fields.map(value => [value, value]));
  }

  function matchRow(game) {
    const article = node('article', null, 'audience-fixture');
    const participating = game.teams.map(id => teamById.get(id));
    article.dataset.matchId = game.id;
    article.dataset.homeTeamId = participating[0].id;
    article.dataset.awayTeamId = participating[1].id;
    article.dataset.homeClubId = participating[0].clubId;
    article.dataset.awayClubId = participating[1].clubId;
    const isFeatured = game.id === featuredId;
    const detail = node('div', null, 'audience-fixture-cue');
    const matchDate = new Date(game.date + 'T12:00:00Z');
    detail.append(node('span', game.time), node('small', Number.isNaN(matchDate.getTime()) ? String(game.date) : dateText.format(matchDate)));
    const body = node('div');
    const title = node(isFeatured ? 'a' : 'strong', participating.map(team => team.name).join(' – '));
    if (isFeatured) title.href = '#wedstrijd';
    body.append(title, node('small', `${participating[0].category} · ${game.venue} · ${game.field}`));
    const state = node('div', null, 'audience-fixture-state');
    state.dataset.matchState = game.state;
    if (game.score) state.append(node('strong', game.score));
    state.append(node('small', game.state));
    article.append(detail, body, state);
    if (isFeatured) {
      article.classList.add('audience-featured');
      const actions = node('div', null, 'audience-fixture-actions');
      const share = node('button', 'Deel wedstrijd ↗', 'hv-button hv-button-outline');
      share.type = 'button';
      share.dataset.appShare = '';
      actions.append(node('span', featuredId), share);
      article.append(actions);
    }
    return article;
  }

  function renderMatches(container, matches, emptyText) {
    container.replaceChildren(...(matches.length ? matches.map(matchRow) : [node('p', emptyText,'audience-empty')]));
  }

  function renderLists() {
    const club = filterForms.get('club').value;
    const category = filterForms.get('category').value;
    const field = filterForms.get('field').value;
    const favorites = favoriteIds();
    const matches = allGames();
    const filtered = matches.filter(game => {
      const entries = game.teams.map(id => teamById.get(id));
      return (!club || entries.some(team => team.clubId === club))
        && (!category || entries[0].category === category)
        && (!field || game.field === field);
    });
    renderMatches(find('[data-app-match-list]'), filtered, 'Geen wedstrijden met deze filters.');
    renderMatches(find('[data-app-favorite-list]'), matches.filter(game => game.teams.some(id => favorites.has(id))), 'Kies eerst een team.');
    find('[data-app-fav-count]').textContent = favorites.size || '';
    for (const button of findAll('[data-app-follow]')) {
      const followed = favorites.has(button.dataset.appFollow);
      button.setAttribute('aria-pressed', String(followed));
      button.querySelector('.audience-follow-mark').textContent = followed ? '✓' : '+';
    }
  }

  function renderFollowAndCatalogue() {
    const follow = find('[data-app-follow-list]');
    for (const team of teams) {
      const button = node('button');
      button.type = 'button';
      button.dataset.appFollow = team.id;
      button.dataset.clubId = team.clubId;
      const mark = node('span', '+', 'audience-follow-mark');
      mark.setAttribute('aria-hidden', 'true');
      const label = node('span', null, 'audience-follow-label');
      const name = node('strong', team.name);
      const hvId = node('small', team.id);
      name.id = 'app-team-name-' + team.id;
      hvId.id = 'app-team-id-' + team.id;
      button.setAttribute('aria-labelledby', name.id);
      button.setAttribute('aria-describedby', hvId.id);
      label.append(name, hvId);
      button.append(mark, label);
      follow.append(button);
    }
    const catalogue = find('[data-app-catalogue]');
    for (const category of categories) {
      const button = node('button');
      button.type = 'button';
      button.dataset.appCategory = category;
      button.append(node('strong', category), node('span', 'Bekijk duels ↗'));
      catalogue.append(button);
    }
  }

  function renderVenues() {
    const venues = new Map();
    for (const game of allGames()) {
      if (!venues.has(game.venue)) venues.set(game.venue, new Set());
      venues.get(game.venue).add(game.field);
    }
    find('[data-app-venues]').replaceChildren(...[...venues].map(([name, fields]) => {
      const entry = node('div');
      entry.append(node('dt', name), node('dd', [...fields].join(' · ')));
      return entry;
    }));
  }

  function showPane(key, moveFocus = false) {
    for (const pane of findAll('[data-app-panel]')) {
      pane.hidden = pane.dataset.appPanel !== key;
      if (moveFocus && !pane.hidden) {
        const heading = pane.querySelector('h2');
        heading.tabIndex = -1;
        heading.focus();
      }
    }
    for (const tab of findAll('[data-app-tab]')) {
      tab.setAttribute('aria-pressed', String(tab.dataset.appTab === key));
    }
  }

  async function shareGame() {
    const url = new URL('#wedstrijd', location.href).href;
    const web = ['https:', 'http:'].includes(location.protocol);
    if (web && navigator.share && navigator.canShare?.({url})) {
      try {
        await navigator.share({title:'HV Control · Wedstrijd HV-2701', text:'Duindorp SV – SVV Scheveningen', url});
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    const dialog = find('[data-app-share-dialog]');
    const input = find('[data-app-share-link]');
    const message = find('[data-app-share-message]');
    input.value = url;
    dialog.showModal();
    input.select();
    message.textContent = web ? 'Kopieer deze link om de wedstrijd te delen.' : 'Dit is een lokaal voorbeeldadres. Gebruik de link vanaf een online versie om te delen.';
    if (web && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        message.textContent = 'Wedstrijdlink gekopieerd.';
      } catch {}
    }
  }

  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-app-tab]');
    const follow = event.target.closest('[data-app-follow]');
    const cup = event.target.closest('[data-app-category]');
    if (tab) showPane(tab.dataset.appTab);
    if (follow) {
      const ids = favoriteIds();
      const id = follow.dataset.appFollow;
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      store.set('app-favorites', [...ids]);
    }
    if (cup) {
      for (const select of filterForms.values()) select.value = '';
      filterForms.get('category').value = cup.dataset.appCategory;
      showPane('today', true);
      renderLists();
    }
    if (event.target.closest('[data-app-share]')) shareGame();
  });
  root.addEventListener('change', event => {
    if (event.target.matches('[data-app-filter]')) renderLists();
  });
  find('.audience-filters').addEventListener('submit', event => event.preventDefault());
  migrateFavorites();
  document.addEventListener('hv:state', event => {
    if (event.detail.key === 'app-favorites' && migrateFavorites()) return;
    if (event.detail.key === 'planning') {
      renderFilters();
      renderVenues();
    }
    if (['planning','result','matchKickoff','live','app-favorites'].includes(event.detail.key)) renderLists();
  });
  renderFilters();
  renderFollowAndCatalogue();
  renderVenues();
  renderLists();
})();
