(() => {
  const storageKey = 'hv-control-prototype-2027-v2';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* The demo can run in memory. */ }
  let persistence = {saved:true,at:null,error:null};
  const initialPlan = {
    date: '2027-06-05', time: '19.30', venue: 'Sportpark Houtrust', field: 'Veld 1', status: 'planned',
  };
  const playerSignature = ({ number, position, captain, name }) => JSON.stringify([number, position, !!captain, name]);
  function setMany(values) {
    state = { ...state, ...values };
    try { localStorage.setItem(storageKey, JSON.stringify(state)); persistence={saved:true,at:new Date().toISOString(),error:null}; }
    catch { persistence={saved:false,at:persistence.at,error:'De opslag op dit apparaat is vol of niet beschikbaar. Bewaar een noodkopie voordat je dit venster sluit.'}; }
    for (const [key, value] of Object.entries(values)) {
      document.dispatchEvent(new CustomEvent('hv:state', { detail: { key, value } }));
    }
  }
  function matchSnapshot() {
    const plan = state.planning || initialPlan;
    const result = state.result?.status === 'queued' ? null : state.result;
    if (plan.status === 'cancelled' || result?.verdict === 'cancelled') return { status: 'cancelled' };
    if (result?.verdict === 'suspended') return { status: 'suspended', home: result.home, away: result.away, minute: result.stoppedMinute };
    if (result?.status === 'official') return { status: 'official', home: result.home, away: result.away };
    if (result?.status === 'review') return { status: 'review' };
    if (state.matchKickoff) return { status: 'live', ...state.live };
    return { status: 'planned' };
  }
  window.HVDemo = {
    get(key, fallback) { return state[key] ?? fallback; },
    set(key, value) {
      setMany({ [key]: value });
      return value;
    },
    setMany,
    snapshot() { return structuredClone(state); },
    persistence() { return {...persistence}; },
    restore(snapshot) {
      const previous=state;
      state=structuredClone(snapshot);
      try { localStorage.setItem(storageKey,JSON.stringify(state)); persistence={saved:true,at:new Date().toISOString(),error:null}; }
      catch { state=previous; persistence={saved:false,at:persistence.at,error:'De herstelkopie kon niet blijvend worden opgeslagen.'}; return false; }
      for(const key of new Set([...Object.keys(previous),...Object.keys(state)])) document.dispatchEvent(new CustomEvent('hv:state',{detail:{key,value:state[key]}}));
      return true;
    },
    transaction: setMany,
    matchSnapshot,
    initialPlan,
    playerSignature,
    playerCheckStatus(player, roster, check) {
      if (!check || check.signature !== playerSignature(player)) return '';
      if (check.version < roster.version && roster.changes?.includes(player.id)) return '';
      return check.status;
    },
  };
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    try {
      const nextState = JSON.parse(event.newValue || '{}');
      const changed = [...new Set([...Object.keys(state), ...Object.keys(nextState)])]
        .filter(key => JSON.stringify(state[key]) !== JSON.stringify(nextState[key]));
      state = nextState;
      for (const key of changed) {
        document.dispatchEvent(new CustomEvent('hv:state', { detail: { key, value: nextState[key] } }));
      }
    } catch { /* Ignore malformed state from another tab. */ }
  });

  const pages = Array.from(document.querySelectorAll('[data-page]'));
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const workNav = document.querySelector('.hv-work-nav');
  const workspaceSelect = document.querySelector('[data-workspace-select]');
  workspaceSelect?.addEventListener('change', () => { location.hash = workspaceSelect.value; });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let activePage;

  function showRoute(initial = false) {
    let hash = location.hash.slice(1);
    const legacy = {bezoekers:'finaledag', 'bezoekers-praktisch':'finaledag', app:'start', 'app-teams':'account', 'app-toernooien':'toernooien', 'app-locaties':'locaties', 'app-installeren':'account', prijzenkast:'bekerkast'};
    if (legacy[hash]) { hash = legacy[hash]; history.replaceState(null,'','#'+hash); }
    const anchor = document.getElementById(hash);
    const prefixRoute = ({wedstrijd:'wedstrijd',toernooibeheer:'toernooibeheer',reglement:'reglement',schema:'schema',toernooien:'toernooien',dossiers:'dossiers',elftal:'elftal',vereniging:'vereniging',speler:'speler',nieuwsartikel:'artikel',gereed:'gereed',briefing:'briefing',road:'road',bekerkast:'bekerkast',moment:'moment',loting:'loting'})[hash.split('-')[0]];
    const page = anchor?.closest('[data-page]') || (prefixRoute && document.getElementById(prefixRoute)) || pages[0];
    const changed = page !== activePage;
    activePage = page;
    for (const item of pages) item.hidden = item !== page;
    const isWorkspace = page.hasAttribute('data-workspace');
    workNav.hidden = !isWorkspace;
    if (isWorkspace) { page.querySelector('.hv-page-content').prepend(workNav); if (workspaceSelect) workspaceSelect.value = page.id; }
    document.body.dataset.viewRole = isWorkspace ? page.id : 'public';
    for (const link of navLinks) {
      if (link.dataset.nav === page.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.title = page.id === 'home'
      ? 'HV Control · Haaglanden Voetbaltoernooi'
      : page.dataset.title + ' · HV Control';
    const entityRoute = /^(elftal-|vereniging-|speler-|nieuwsartikel-)/.test(hash);
    if (anchor && anchor !== page && page.contains(anchor) && !anchor.classList.contains('hv-page-hero') && !entityRoute) {
      requestAnimationFrame(() => { if (activePage === page && location.hash.slice(1) === hash) anchor.scrollIntoView({ behavior: 'instant' }); });
    } else if (changed && (!initial || anchor?.classList.contains('hv-page-hero'))) {
      window.scrollTo({top:0, behavior:'instant'});
      page.querySelector('h1, h2')?.focus({preventScroll:true});
    }
    document.dispatchEvent(new CustomEvent('hv:route',{detail:{pageId:page.id,hash}}));
  }

  for (const page of pages) page.querySelector('h1, h2')?.setAttribute('tabindex','-1');
  window.addEventListener('hashchange', () => showRoute());
  showRoute(true);
  document.addEventListener('DOMContentLoaded',()=>showRoute(true),{once:true});

  function formatDate(date) {
    return new Intl.DateTimeFormat('nl-NL', { day:'numeric', month:'long', timeZone:'Europe/Amsterdam' })
      .format(new Date(date + 'T12:00:00+02:00'));
  }

  function renderPublic() {
    const match = matchSnapshot();
    const result = HVDemo.get('result', null);
    const plan = HVDemo.get('planning', initialPlan);
    const published = match.status === 'official';
    const review = match.status === 'review';
    const suspended = match.status === 'suspended';
    const cancelled = match.status === 'cancelled';
    const changed = ['date','time','venue','field'].some(key => plan[key] && initialPlan[key] !== plan[key]);
    const penalty = published && Number.isInteger(result.penHome) && Number.isInteger(result.penAway);
    const labels = {
      home: match.home ?? '–',
      away: match.away ?? '–',
      minute: match.minute ?? '',
      tick: Number.isInteger(match.minute) ? '′' : '',
      status: ({ cancelled:'Afgelast', suspended:'Gestaakt', review:'Uitslag in beoordeling', official:'Afgelopen', live:'Live' })[match.status]
        || (changed ? 'Verplaatst' : 'Gepland'),
      venue: plan.venue || initialPlan.venue,
      field: plan.field || initialPlan.field,
      date: formatDate(plan.date || initialPlan.date),
      time: plan.time || initialPlan.time,
      winner: published && result.winner ? result.winner : 'Winnaar Duindorp SV / SVV Scheveningen',
    };
    for (const [key, value] of Object.entries(labels)) {
      document.querySelectorAll('[data-hv-' + key + ']').forEach((label) => {
        if (label.textContent === String(value)) return;
        label.textContent = String(value);
        if ((key === 'home' || key === 'away') && label.offsetWidth && !reducedMotion.matches) {
          label.animate([{opacity:.35, transform:'scale(.9)'},{opacity:1,transform:'scale(1)'}],
            {duration:360,easing:'cubic-bezier(.2,.75,.2,1)'});
        }
      });
    }
    document.querySelectorAll('[data-hv-live-dot]').forEach(el => el.hidden = labels.status !== 'Live');
    const goals = HVDemo.get('matchEvents', []).filter(event => event.scoreSide && !event.voidedAt && event.active !== false);
    const goalRows = (cancelled ? [] : goals).slice().sort((a, b) => b.minute - a.minute).map(event => {
      const row = document.createElement('article');
      row.className = 'match-event';
      const minute = document.createElement('strong');
      const goal = document.createElement('b');
      minute.textContent = event.minute + '′';
      goal.textContent = 'Doelpunt · ' + (event.scoreSide === 'home' ? 'Duindorp SV' : 'SVV Scheveningen');
      row.append(minute, goal);
      return row;
    });
    const eventsList = document.querySelector('#match-events-list');
    eventsList.replaceChildren(...goalRows);
    document.querySelector('#match-events-empty').hidden = goalRows.length > 0;
    const outcome = document.querySelector('#match-outcome');
    outcome.hidden = !(published || review || cancelled || changed || suspended);
    const note = cancelled ? 'Deze wedstrijd is afgelast.'
      : suspended ? 'Wedstrijd gestaakt' + (Number.isInteger(match.minute) ? ' in minuut ' + match.minute : '') + '. De commissie behandelt het vervolg.'
      : review ? 'De commissie behandelt de wedstrijdstatus.'
      : published ? 'Officiële uitslag' + (penalty ? ' · Strafschoppen ' + result.penHome + '–' + result.penAway : '') +
        (result.publishedAt ? ' · gepubliceerd om ' + new Date(result.publishedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}) : '')
      : 'Nieuwe aftrap op ' + labels.date + ' om ' + labels.time + ' · ' + labels.venue + ' · ' + labels.field;
    outcome.textContent = note;
    document.querySelectorAll('[data-hv-planning-notice]').forEach(el => {
      el.hidden = !(changed || cancelled);
      el.textContent = cancelled ? 'De kwartfinale Duindorp SV – SVV Scheveningen is afgelast.'
        : 'HV-2701 is verplaatst naar ' + labels.date + ' om ' + labels.time + ' · ' + labels.venue + ' · ' + labels.field;
    });
    const finalUpdate = HVDemo.get('finalday', null);
    document.querySelectorAll('[data-hv-final-update]').forEach(el => {
      el.hidden = !finalUpdate?.update;
      el.textContent = finalUpdate?.update || '';
    });
  }
  document.addEventListener('hv:state', ({ detail }) => {
    if (['live','result','planning','finalday','matchKickoff','matchEvents'].includes(detail.key)) renderPublic();
  });
  renderPublic();

  document.querySelector('[data-hv-calendar]')?.addEventListener('click', () => {
    const plan = HVDemo.get('planning', initialPlan);
    const date = plan.date.replaceAll('-', '');
    const time = plan.time.replace(/[^0-9]/g, '');
    const location = (plan.venue + ' · ' + plan.field).replace(/[;,]/g, ' ');
    const file = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HV Control//Prototype//NL',
      'BEGIN:VEVENT','UID:HV-2701@hv-control.demo','DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z',
      'DTSTART;TZID=Europe/Amsterdam:' + date + 'T' + time + '00','SUMMARY:Duindorp SV – SVV Scheveningen',
      'LOCATION:' + location,'DESCRIPTION:Haaglanden Voetbal · Demowedstrijd',
      matchSnapshot().status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
      'END:VEVENT','END:VCALENDAR','',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([file], { type:'text/calendar;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href:url, download:'Duindorp-SV-SVV-Scheveningen.ics' });
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
  });

  const reset = document.querySelector('#hv-reset-dialog');
  document.querySelector('[data-hv-reset]').addEventListener('click', () => reset.showModal());
  reset.addEventListener('close', () => {
    if (reset.returnValue !== 'reset') return;
    try { localStorage.removeItem(storageKey); } catch { /* The demo will start in memory. */ }
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  });

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      const item = entry.target;
      observer.unobserve(item);
      if (!reducedMotion.matches) item.animate(
        [{opacity:.65,transform:'translateY(11px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:510,easing:'cubic-bezier(.22,.75,.2,1)'}
      );
    }
  }, {threshold:.12});
  document.querySelectorAll('[data-hv-reveal]').forEach(el => observer.observe(el));

  const hero = document.querySelector('.home-hero');
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    hero.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches) return;
      const box = hero.getBoundingClientRect();
      hero.style.setProperty('--image-drift-x', (((event.clientX - box.left) / box.width - .5) * 10) + 'px');
      hero.style.setProperty('--image-drift-y', (((event.clientY - box.top) / box.height - .5) * 8) + 'px');
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--image-drift-x', '0px');
      hero.style.setProperty('--image-drift-y', '0px');
    });
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
