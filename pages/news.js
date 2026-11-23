(() => {
  const core = window.HVNews;
  if (!core) return;
  const dateFormat = new Intl.DateTimeFormat('nl-NL', { day:'numeric', month:'short', timeZone:'Europe/Amsterdam' });
  const fullDateFormat = new Intl.DateTimeFormat('nl-NL', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Amsterdam' });
  const create = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (post) => '#nieuwsartikel-' + post.id;
  function dateLabel(value, full = false) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? '' : (full ? fullDateFormat : dateFormat).format(date);
  }
  function card(post) {
    const anchor = create('a', '', 'news-card');
    anchor.href = link(post);
    anchor.dataset.newsId = post.id;
    const photo = create('div', '', 'news-card-photo');
    const image = create('img');
    image.src = post.image;
    image.alt = '';
    image.loading = 'lazy';
    image.width = 900;
    image.height = 600;
    photo.append(image, create('span', post.category || 'Toernooienieuws', 'news-card-category'));
    const copy = create('div', '', 'news-card-copy');
    const date = create('time', dateLabel(post.publishedAt, true));
    date.dateTime = post.publishedAt;
    copy.append(date, create('h3', post.title), create('p', post.excerpt));
    const footer = create('span', '', 'news-card-footer');
    const arrow = create('b', '↗');
    arrow.setAttribute('aria-hidden','true');
    footer.append(create('span', 'Lees het verhaal'), arrow);
    copy.append(footer);
    anchor.append(photo, copy);
    return anchor;
  }
  function feed(container, { context, limit = 3, compact = false } = {}) {
    if (!container) return;
    container.classList.add('news-feed');
    container.classList.toggle('news-feed-compact', compact);
    const posts = core.published(context).slice(0, limit);
    container.replaceChildren(...posts.map(card));
    if (!posts.length) container.append(create('p', 'Er zijn nog geen nieuwsberichten voor deze selectie.', 'news-empty'));
  }
  window.HVNewsUI = { card, feed, link, dateLabel };

  const featured = document.querySelector('[data-news-featured]');
  const latest = document.querySelector('[data-news-latest]');
  const index = document.querySelector('[data-news-index]');
  const search = document.querySelector('[data-news-search]');
  const tournament = document.querySelector('[data-news-tournament]');
  const count = document.querySelector('[data-news-count]');
  if (tournament) {
    for (const entry of core.tournaments) {
      const option = create('option', entry.name);
      option.value = entry.id;
      tournament.append(option);
    }
  }

  function renderHome() {
    const posts = core.published();
    if (featured) featured.replaceChildren(...posts.filter(post => post.featured).slice(0,3).map(card));
    if (latest) latest.replaceChildren(...posts.slice(0,10).map(post => {
      const li = create('li');
      const anchor = create('a');
      anchor.href = link(post);
      anchor.dataset.newsId = post.id;
      const date = create('time', dateLabel(post.publishedAt));
      date.dateTime = post.publishedAt;
      const arrow = create('span', '↗');
      arrow.setAttribute('aria-hidden','true');
      anchor.append(date, create('strong', post.title), arrow);
      li.append(anchor);
      return li;
    }));
  }
  function renderIndex() {
    if (!index) return;
    const query = (search?.value || '').trim().toLocaleLowerCase('nl-NL');
    const posts = core.published(tournament?.value ? {tournamentId:tournament.value} : undefined).filter(post =>
      !query || [post.title, post.excerpt, post.category, ...post.body].join(' ').toLocaleLowerCase('nl-NL').includes(query));
    index.replaceChildren(...posts.map(card));
    if (count) count.textContent = posts.length + (posts.length === 1 ? ' bericht' : ' berichten');
    const empty = document.querySelector('[data-news-empty]');
    if (empty) empty.hidden = posts.length > 0;
  }
  search?.addEventListener('input',renderIndex);
  tournament?.addEventListener('change',renderIndex);
  document.addEventListener('hv:state', ({detail}) => {
    if (detail.key !== 'newsPosts') return;
    renderHome();
    renderIndex();
  });
  renderHome();
  renderIndex();
})();
