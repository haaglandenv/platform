(() => {
  function initNewsroom() {
    const page = document.querySelector('#nieuwsbeheer');
    const news = window.HVNews;
    if (!page || !news) return;

    const find = name => page.querySelector('[data-newsroom-' + name + ']');
    const form = find('form');
    const field = name => form.elements.namedItem(name);
    const list = find('list');
    const search = find('search');
    const dateFormat = new Intl.DateTimeFormat('nl-NL', {day:'numeric', month:'short', year:'numeric', timeZone:'Europe/Amsterdam'});
    const groups = {tournamentIds:news.tournaments, clubIds:news.clubs, teamIds:news.teams};
    let selectedId = null;
    let selectedPost = null;
    let statusFilter = 'all',queued=false,relationsDirty=false;
    function schedule(){if(page.hidden||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(page.hidden)return;mediaChoices();renderList();if(relationsDirty){relationsDirty=false;const chosen=Object.fromEntries(Object.keys(groups).map(key=>[key,[...form.querySelectorAll('[name="'+key+'"]:checked')].map(el=>el.value)]));renderRelationChoices(chosen);}});}
    document.addEventListener('hv:competition',()=>{relationsDirty=true;schedule();});
    document.addEventListener('hv:media',schedule);
    document.addEventListener('hv:privacy',schedule);
    document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===page.id){relationsDirty=true;schedule();}});


    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    }

    function dateText(value) {
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? 'Datum volgt' : dateFormat.format(date);
    }

    function showFeedback(text, failure = false) {
      const note = find('feedback');
      note.textContent = text;
      note.dataset.tone = failure ? 'error' : 'success';
      note.hidden = !text;
    }

    function updateRelationCounts() {
      for (const group of Object.keys(groups)) {
        const chosen = form.querySelectorAll('[name="' + group + '"]:checked').length;
        page.querySelector('[data-newsroom-relation-count="' + group + '"]').textContent = chosen + ' gekozen';
      }
    }

    function renderRelationChoices(post) {
      groups.tournamentIds=window.HVFixtures?.cups||news.tournaments;
      for (const [group, records] of Object.entries(groups)) {
        const container = page.querySelector('[data-newsroom-choices="' + group + '"]');
        const chosen = new Set(post?.[group] || []);
        const entries = Array.isArray(records) ? records : [];
        container.replaceChildren(...entries.map(record => {
          const label = element('label', undefined, 'newsroom-choice');
          label.dataset.newsroomOption = (record.name + ' ' + record.id).toLocaleLowerCase('nl');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.name = group;
          input.value = record.id;
          input.checked = chosen.has(record.id);
          const copy = element('span', record.name);
          copy.append(element('small', record.id));
          label.append(input, copy);
          return label;
        }));
        const groupSearch = page.querySelector('[data-newsroom-relation-search="' + group + '"]');
        if (groupSearch) groupSearch.value = '';
      }
      updateRelationCounts();
    }

    function renderList() {
      const posts = news.all();
      const needle = search.value.trim().toLocaleLowerCase('nl');
      const records = posts.filter(post => (statusFilter === 'all' || post.status === statusFilter)
        && (!needle || (post.title + ' ' + post.category).toLocaleLowerCase('nl').includes(needle)))
        .slice().sort((first, second) => String(second.publishedAt).localeCompare(String(first.publishedAt)));
      const publicIds = new Set(news.published().map(post => post.id));
      const featuredCount = posts.filter(post => publicIds.has(post.id) && post.featured).length;
      find('count').textContent = posts.length + ' artikelen · ' + featuredCount + ' uitgelicht';
      if (!records.length) {
        list.replaceChildren(element('li', 'Geen artikelen voor deze selectie.', 'newsroom-empty'));
        return;
      }
      list.replaceChildren(...records.map(post => {
        const row = document.createElement('li');
        const button = element('button', undefined, 'newsroom-item');
        button.type = 'button';
        button.dataset.newsroomEdit = post.id;
        if (post.id === selectedId) button.setAttribute('aria-current', 'true');
        const title = element('strong', post.title || 'Artikel zonder titel');
        const meta = element('span', undefined, 'newsroom-item-meta');
        meta.append(element('span', post.status === 'review'?'Ter controle':post.status === 'draft' ? 'Concept' : publicIds.has(post.id) ? 'Gepubliceerd' : 'Ingepland'), element('time', dateText(post.publishedAt)));
        if (post.featured) meta.append(element('em', 'Uitgelicht'));
        button.append(title, meta);
        row.append(button);
        return row;
      }));
    }

    function mediaChoices(){const current=field('image').value,currentMedia=field('image').selectedOptions?.[0]?.dataset.mediaOption;for(const option of [...field('image').options])if(option.dataset.mediaOption)option.remove();const records=window.HVMedia?.published('articles')||[];for(const record of records){const option=new Option('Vrijgegeven · '+record.title,record.src);option.dataset.mediaOption=record.id;field('image').append(option);}if([...field('image').options].some(option=>option.value===current))field('image').value=current;const found=[...field('image').options].findIndex(option=>option.dataset.mediaOption===currentMedia);if(currentMedia&&found>=0)field('image').selectedIndex=found;}

    function loadEditor(id, focus = false) {
      mediaChoices();
      const post = id ? news.get(id) : null;
      selectedId = post?.id || null;
      selectedPost = post || null;
      form.reset();
      field('title').value = post?.title || '';
      field('excerpt').value = post?.excerpt || '';
      field('body').value = Array.isArray(post?.body) ? post.body.join('\n\n') : '';
      field('category').value = post?.category || 'Toernooienieuws';
      field('author').value = post?.author || 'Redactie Haaglanden';
      field('publishedAt').value = post?.publishedAt?.slice(0, 10) || '2027-06-05';
      field('status').value = post?.status || 'draft';
      field('featured').checked = post?.featured === true;
      const image = post?.image || 'assets/action.webp';
      if (![...field('image').options].some(option => option.value === image)) {
        const custom = new Option('Huidig artikelbeeld', image);
        field('image').append(custom);
      }
      field('image').value = image;
      if(post?.mediaId){const index=[...field('image').options].findIndex(option=>option.dataset.mediaOption===post.mediaId);if(index>=0)field('image').selectedIndex=index;}
      find('image').src = image;
      find('id').textContent = post ? 'Artikel · ' + post.id : 'Nieuw artikel';
      page.querySelector('#newsroom-editor-title').textContent = post ? 'Artikel bewerken' : 'Artikel schrijven';
      const preview = find('preview');
      preview.hidden = !post;
      const revisions=find('revisions');if(revisions)revisions.replaceChildren(...(post?news.revisions(post.id):[]).slice().reverse().map(version=>{const button=element('button','Versie '+version.revision+' · '+dateText(version.at)+' · '+version.reason);button.type='button';button.dataset.newsroomRestore=version.revision;return button;}));
      find('approve').disabled=post?.status!=='review';find('return').disabled=post?.status!=='review';find('request-review').disabled=!post;
      find('sources').textContent=post?.sourceFacts?'Feitenbron: officiële wedstrijd '+post.sourceMatchId+' · '+post.sourceFacts.confirmedEventIds.length+' bevestigde gebeurtenissen. Controleer het verslag vóór publicatie.':'';
      renderRelationChoices(post);
      showFeedback('');
      renderList();
      if (focus) field('title').focus();
    }

    page.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const {newsroomEdit, newsroomFilter} = button.dataset;
      if (newsroomEdit) loadEditor(newsroomEdit);
      if (newsroomFilter) {
        statusFilter = newsroomFilter;
        for (const tab of page.querySelectorAll('[data-newsroom-filter]')) {
          tab.setAttribute('aria-pressed', String(tab.dataset.newsroomFilter === statusFilter));
        }
        renderList();
      }
    });

    find('new').addEventListener('click', () => loadEditor(null, true));
    find('discard').addEventListener('click', () => {
      loadEditor(selectedId);
      showFeedback(selectedId ? 'De opgeslagen versie staat weer in het formulier.' : 'Je kunt beginnen met een nieuw artikel.');
    });
    search.addEventListener('input', renderList);
    field('image').addEventListener('change', () => { find('image').src = field('image').value; });
    form.addEventListener('change', event => {
      if (Object.hasOwn(groups, event.target.name)) updateRelationCounts();
    });
    for (const control of page.querySelectorAll('[data-newsroom-relation-search]')) {
      control.addEventListener('input', () => {
        const group = control.dataset.newsroomRelationSearch;
        const needle = control.value.trim().toLocaleLowerCase('nl');
        const container = page.querySelector('[data-newsroom-choices="' + group + '"]');
        for (const label of container.querySelectorAll('[data-newsroom-option]')) {
          label.hidden = !label.dataset.newsroomOption.includes(needle);
        }
      });
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form);
      const date = String(values.get('publishedAt'));
      const publishedAt = selectedPost?.publishedAt?.slice(0, 10) === date
        ? selectedPost.publishedAt : date + 'T12:00:00+02:00';
      const record = {
        ...(selectedPost || {}),
        title: String(values.get('title')).trim(),
        excerpt: String(values.get('excerpt')).trim(),
        body: String(values.get('body')).split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean),
        image: values.get('image'),
        mediaId:field('image').selectedOptions?.[0]?.dataset.mediaOption||null,
        imageCredit:window.HVMedia?.published('articles').find(item=>item.id===field('image').selectedOptions?.[0]?.dataset.mediaOption)?.credit||'',
        category: String(values.get('category')).trim(),
        author:String(values.get('author')).trim(),
        status: values.get('status'),
        publishedAt,
        featured: values.has('featured'),
        ...Object.fromEntries(Object.keys(groups).map(group => [group, values.getAll(group)])),
      };
      const result = news.save(record);
      if (!result.ok) {
        showFeedback(result.error || 'Het artikel kon niet worden opgeslagen.', true);
        return;
      }
      loadEditor(result.post.id);
      const isPublic = news.published().some(post => post.id === result.post.id);
      showFeedback(result.post.status === 'review'?'Artikel staat ter redactionele controle.':result.post.status === 'draft' ? 'Concept opgeslagen.'
        : isPublic ? 'Artikel opgeslagen en gepubliceerd in deze demo.' : 'Publicatie ingepland op de gekozen datum.');
    });
    document.addEventListener('hv:state', ({detail}) => {
      if (detail?.key === 'newsPosts') schedule();
    });
    find('preview').addEventListener('click',()=>{const post=selectedId?news.get(selectedId):null;if(!post)return;find('preview-panel').hidden=false;find('preview-title').textContent=field('title').value;news.renderBody(find('preview-body'),{...post,body:field('body').value.split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean)});});
    find('close-preview').addEventListener('click',()=>find('preview-panel').hidden=true);
    const reviewAction=(approved)=>{const result=news.review(selectedId,approved,find('review-reason').value);showFeedback(result.ok?'Redactioneel besluit opgeslagen.':result.error,!result.ok);if(result.ok)loadEditor(selectedId);};
    find('approve').addEventListener('click',()=>reviewAction(true));find('return').addEventListener('click',()=>reviewAction(false));find('request-review').addEventListener('click',()=>{const result=news.requestReview(selectedId,find('review-reason').value);if(result.ok)loadEditor(selectedId);showFeedback(result.ok?'Artikel aangeboden voor controle.':result.error,!result.ok);});
    page.addEventListener('click',event=>{const restore=event.target.closest('[data-newsroom-restore]');if(!restore)return;const result=news.restore(selectedId,restore.dataset.newsroomRestore,find('review-reason').value);if(result.ok)loadEditor(selectedId);showFeedback(result.ok?'Versie hersteld als nieuw concept.':result.error,!result.ok);});
    function reportChoices(){const picker=find('report-match'),old=picker.value;picker.replaceChildren(...(window.HVFixtures?.all()||[]).filter(game=>game.status==='finished').map(game=>new Option(game.home+' – '+game.away+' · '+game.homeScore+'–'+game.awayScore,game.id)));if([...picker.options].some(option=>option.value===old))picker.value=old;find('auto-report').checked=window.HVExperiences?.settings().autoReports===true;}
    find('auto-report').addEventListener('change',()=>{const core=window.HVExperiences;if(!core)return;const result=core.saveSettings({...core.settings(),autoReports:find('auto-report').checked});showFeedback(result.ok?'Instelling voor verslagconcepten opgeslagen.':result.error,!result.ok);});
    find('generate-report').addEventListener('click',()=>{const result=window.HVExperiences?.generateReport(find('report-match').value);if(!result)return;if(result.ok)loadEditor(result.post.id);showFeedback(result.ok?(result.existing?'Het bestaande concept voor deze feiten is geopend.':'Verslagconcept gemaakt. Controleer de feiten en tekst.'):result.error,!result.ok);});
    document.addEventListener('hv:fixtures',()=>{if(!page.hidden)reportChoices();});reportChoices();
    loadEditor(news.all()[0]?.id || null);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNewsroom, {once:true});
  else initNewsroom();
})();
