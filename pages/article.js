(() => {
  const core = window.HVNews;
  const ui = window.HVNewsUI;
  const page = document.getElementById('artikel');
  if (!core || !ui || !page) return;
  let queued=false;function schedule(){if(page.hidden||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!page.hidden){updateAnchors();render();}});}
  const find = (key) => page.querySelector('[data-article-' + key + ']');
  const create = (tag,text,className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const publicPost = (id) => core.published().find(post => post.id === id);
  const tournamentRoutes = () => Object.fromEntries((window.HVFixtures?.cups||[]).map(cup=>[cup.id,cup.key]));
  const getEntity = (items,id) => items.find(item => item.id === id);
  function updateAnchors() {
    const anchorRoot = page.querySelector('[data-news-article-anchors]');
    anchorRoot.replaceChildren(...core.all().map(post => {
      const anchor = create('span');
      anchor.id = 'nieuwsartikel-' + post.id;
      anchor.hidden = true;
      anchor.dataset.newsArticleAnchor = post.id;
      return anchor;
    }));
  }
  function entityLink(entity,type,href) {
    const anchor = create('a','','article-entity');
    anchor.href = href;
    const copy = create('span');
    copy.append(create('small',type),create('strong',entity.name));
    const arrow = create('span','↗');
    arrow.setAttribute('aria-hidden','true');
    anchor.append(copy,arrow);
    return anchor;
  }
  function render() {
    const prefix = '#nieuwsartikel-';
    const id = location.hash.startsWith(prefix) ? location.hash.slice(prefix.length) : '';
    const post = publicPost(id);
    const wrapper = page.querySelector('[data-news-article]');
    wrapper.hidden = !post;
    find('unavailable').hidden = Boolean(post);
    if (!post) {
      find('title').textContent = '';
      find('body').replaceChildren();
      find('image').removeAttribute('src');
      return;
    }
    find('title').textContent = post.title;
    find('excerpt').textContent = post.excerpt;
    find('category').textContent = post.category;
    find('image').src = post.image;
    let credit=page.querySelector('[data-article-image-credit]');if(!credit){credit=create('p','','media-note');credit.dataset.articleImageCredit='';page.querySelector('.article-copy').prepend(credit);}credit.textContent=post.imageCredit?'Beeld: '+post.imageCredit:'';credit.hidden=!post.imageCredit;
    find('date').dateTime = post.publishedAt;
    find('date').textContent = ui.dateLabel(post.publishedAt,true);
    if(core.renderBody)core.renderBody(find('body'),post);else find('body').replaceChildren(...post.body.map(text=>create('p',text)));
    let author=page.querySelector('[data-article-author]');if(!author){author=create('p','','media-note');author.dataset.articleAuthor='';page.querySelector('.article-copy').prepend(author);}author.textContent='Door '+(post.author||'Redactie Haaglanden')+' · versie '+(post.revision||1);
    let share=page.querySelector('[data-article-share]');if(!share){share=create('div','','media-article-share');share.dataset.articleShare='';const button=create('button','Deel dit artikel','hv-button hv-button-outline');button.type='button';button.dataset.articleShareButton='';const status=create('span');status.dataset.articleShareStatus='';status.setAttribute('role','status');share.append(button,status);page.querySelector('.article-copy').append(share);button.addEventListener('click',async()=>{const current=publicPost(location.hash.slice('#nieuwsartikel-'.length));if(!current)return;try{if(navigator.share){await navigator.share({title:current.title,text:current.excerpt,url:location.href});status.textContent='Artikel gedeeld.';}else{await navigator.clipboard.writeText(location.href);status.textContent='Link naar dit artikel gekopieerd.';}}catch(error){if(error.name==='AbortError'){status.textContent='';return;}let input=share.querySelector('input');if(!input){input=document.createElement('input');input.readOnly=true;input.setAttribute('aria-label','Link naar dit artikel');share.append(input);}input.value=location.href;input.select();status.textContent='Kopieer de geselecteerde artikellink.';}});}

    const entities = [];
    for (const id of post.tournamentIds || []) {
      const entity = getEntity(core.tournaments,id);
      const route=tournamentRoutes()[id];if (entity && route) entities.push(entityLink(entity,'Toernooi','#toernooien-' + route));
    }
    for (const id of post.clubIds || []) {
      const entity = getEntity(core.clubs,id);
      if (entity) entities.push(entityLink(entity,'Vereniging','#vereniging-' + id));
    }
    for (const id of post.teamIds || []) {
      const entity = getEntity(core.teams,id);
      if (entity) entities.push(entityLink(entity,'Team','#elftal-' + id));
    }
    find('entities').replaceChildren(...entities);
    if (!entities.length) find('entities').append(create('p','Nieuws uit de hele regio.'));
    const relatedIds = new Set([...post.tournamentIds,...post.clubIds,...post.teamIds]);
    const candidates = core.published().filter(item=>item.id!==post.id);
    const related = candidates.filter(item=>[...item.tournamentIds,...item.clubIds,...item.teamIds].some(id=>relatedIds.has(id)));
    const more = [...related,...candidates.filter(item=>!related.some(other=>other.id===item.id))].slice(0,3);
    find('more').replaceChildren(...more.map(item=>{
      const anchor = create('a');
      anchor.href = ui.link(item);
      const date = create('time',ui.dateLabel(item.publishedAt));
      date.dateTime = item.publishedAt;
      anchor.append(date,create('strong',item.title));
      return anchor;
    }));
    if (!page.hidden) document.title = post.title + ' · HV Control';
  }
  window.addEventListener('hashchange',schedule);
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===page.id)schedule();});
  document.addEventListener('hv:media',schedule);
  document.addEventListener('hv:privacy',schedule);
  document.addEventListener('hv:state',({detail})=>{
    if (detail.key !== 'newsPosts') return;
    schedule();
  });
  updateAnchors();
  render();
  if (location.hash.startsWith('#nieuwsartikel-')) window.dispatchEvent(new Event('hashchange'));
})();
