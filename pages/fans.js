(() => {
  const page = document.getElementById('finaledag');
  if (!page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const roleData = {
    bezoekers: {
      intro: 'Kom voor je club en beleef de bekerdag. Met deze drie stappen vind je snel je weg op Houtrust.',
      steps: [
        ['Vind jouw wedstrijd', 'Bekijk veld en aftrap in de kalender. Controleer de laatste gegevens ook vlak voor vertrek.'],
        ['Kom op tijd', 'Neem de tijd om je weg te vinden. De ontvangst helpt je bij vragen over het sportpark.'],
        ['Beleef het samen', 'Moedig je club aan en beleef de andere finales. Via Live houd je alle tussenstanden bij.'],
      ], href: '#programma', label: 'Vind jouw wedstrijd',
    },
    teams: {
      intro: 'Van spelerslijst tot aftrap. Als teammanager houd je de ontvangst en wedstrijdvoorbereiding bij elkaar.',
      steps: [
        ['Meld je team aan', 'Volg de meldinstructies. De ontvangst wijst je team de kleedkamer en het juiste veld.'],
        ['Bereid de spelersopgave voor', 'Kies spelers uit de goedgekeurde lijst. Vraag aanvullingen vooraf aan bij de toernooileiding.'],
        ['Laat de opgave controleren', 'De scheidsrechter controleert de opgave. Houd je spelers voor de aftrap beschikbaar.'],
      ], href: '#team', label: 'Open de teamomgeving',
    },
    officials: {
      intro: 'Bereid je finale voor. Je aanstelling, spelerscontrole en wedstrijdformulier vind je bij elkaar.',
      steps: [
        ['Bevestig je aanstelling', 'Controleer veld en aftrap. Meld je volgens de ontvangen instructies bij de organisatie.'],
        ['Controleer beide teams', 'Bekijk naam, geboortedatum en foto. Keur beide spelersopgaven voor de aftrap goed.'],
        ['Rond het duel af', 'Leg uitslag, kaarten en bijzonderheden vast. Vermeld bij staking ook reden, stand en minuut.'],
      ], href: '#official', label: 'Open de scheidsrechteromgeving',
    },
  };
  const buttons = [...page.querySelectorAll('[data-fd-role]')];
  const panel = page.querySelector('#fd-role-panel');
  const intro = page.querySelector('[data-fd-role-intro]');
  const steps = page.querySelector('[data-fd-role-steps]');
  const roleLink = page.querySelector('[data-fd-role-link]');
  function selectRole(key, animate = true) {
    const data = roleData[key];
    buttons.forEach(button => {
      const selected = button.dataset.fdRole === key;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'fd-role-' + key);
    intro.textContent = data.intro;
    steps.replaceChildren(...data.steps.map(([heading, copy]) => {
      const article = document.createElement('article');
      article.className = 'fd-role-step';
      const title = document.createElement('h3');
      title.textContent = heading;
      const text = document.createElement('p');
      text.textContent = copy;
      article.append(title, text);
      return article;
    }));
    roleLink.href = data.href;
    roleLink.textContent = data.label;
    if (animate && !reduced.matches) steps.animate([{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.2,.75,.2,1)' });
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectRole(button.dataset.fdRole));
    button.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length
        : event.key === 'ArrowLeft' ? (index + buttons.length - 1) % buttons.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      selectRole(buttons[next].dataset.fdRole);
      buttons[next].focus();
    });
  });
  selectRole('bezoekers', false);

  function renderFinals() {
    const target = page.querySelector('[data-final-fixtures]');
    const fixtures = window.HVFixtures;
    if (!fixtures) return;
    const finals = fixtures.cups.map(cup => ({ cup, match: fixtures.forCup(cup.id).find(match => match.roundKey === 'final' && match.status !== 'bye') })).sort((a,b)=>(a.match?.time||'99').localeCompare(b.match?.time||'99'));
    target.replaceChildren(...finals.map(({ cup, match }) => {
      const row = document.createElement('a');
      row.className = 'fd-final-row';
      row.href = '#schema-' + cup.key;
      const title = document.createElement('strong');
      title.textContent = cup.name;
      const time = document.createElement('time');
      time.textContent = match?.time?.replace(':', '.') || 'Volgt';
      if (match?.date && match?.time) time.dateTime = match.date + 'T' + match.time + ':00+02:00';
      const teams = document.createElement('p');
      teams.textContent = match ? match.home + ' – ' + match.away : 'Finalisten volgen na de halve finales';
      const meta = document.createElement('small');
      meta.textContent = match ? match.field : 'Sportpark Houtrust';
      teams.append(meta);
      const action = document.createElement('span');
      action.textContent = 'Bekerschema';
      row.append(title, time, teams, action);
      return row;
    }));
  }
  renderFinals();
  document.addEventListener('hv:fixtures', renderFinals);

  page.querySelector('[data-hv-final-calendar]').addEventListener('click', () => {
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HV Control//Finaledag//NL', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:HV-FINALEDAG-2027@hv-control', 'DTSTAMP:20261118T120000Z',
      'DTSTART;VALUE=DATE:20270612', 'DTEND;VALUE=DATE:20270613',
      'SUMMARY:Finaledag Haaglanden Voetbaltoernooi',
      'LOCATION:Sportpark Houtrust\\, Den Haag',
      'DESCRIPTION:Finaledag op Houtrust. Controleer het wedstrijdprogramma voor definitieve aftraptijden en veldindeling.',
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'HV-Control-Finaledag-12-juni-2027.ics';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    page.querySelector('[data-final-calendar-feedback]').textContent = 'Het agendabestand voor 12 juni 2027 is gedownload.';
  });
})();

(() => {const root=document.getElementById('finaledag'),core=window.HVExperiences;if(!root||!core)return;const $=s=>root.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let selected='main';function render(){const wrapper=$('[data-final-map]');if(!wrapper)return;wrapper.hidden=!core.settings().finalMap;const places=core.map(),place=places.find(row=>row.id===selected)||places[0];if(!place)return;$('[data-final-map-canvas]').innerHTML='<svg viewBox="0 0 930 '+(places[0]?.canvasHeight||480)+'" role="group" aria-label="Schematische kaart van Houtrust"><rect x="10" y="10" width="910" height="'+((places[0]?.canvasHeight||480)-20)+'" rx="26" fill="#e1ecd8"/><path d="M95 420H405M210 390V255M405 420L460 340V160" stroke="#fff" stroke-width="28" fill="none"/><text x="35" y="50" fill="#78937a" font-size="16">SPORTPARK HOUTRUST</text>'+places.map(item=>{const pitch=item.kind==='pitch',w=pitch?190:118,h=pitch?126:46,x=item.x-w/2,y=item.y-h/2;return '<g class="xp-map-location" role="button" tabindex="0" aria-label="'+esc(item.name)+'" aria-pressed="'+(item.id===selected)+'" data-map-spot="'+esc(item.id)+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(pitch?8:15)+'" fill="'+(pitch?'#afc99b':'#fff')+'" stroke="#7b9a73"/>'+(pitch?'<path d="M'+item.x+' '+y+'V'+(y+h)+'" stroke="#fff"/><circle cx="'+item.x+'" cy="'+item.y+'" r="23" fill="none" stroke="#fff"/>':'')+'<text x="'+item.x+'" y="'+(item.y+(pitch?48:5))+'" text-anchor="middle">'+esc(item.name)+'</text></g>';}).join('')+'</svg>';$('[data-final-map-detail]').innerHTML='<span class="xp-pill">'+esc(place.kind==='pitch'?'Finaleveld':'Voorziening')+'</span><h3>'+esc(place.name)+'</h3><p>'+esc(place.note)+'</p><div class="xp-map-games">'+place.matches.map(game=>'<a href="#wedstrijd-'+esc(game.id)+'"><strong>'+esc((game.publicTiming?.actualKickoff||game.publicTiming?.expectedKickoff||game.time)+' · '+game.cupName)+'</strong><span>'+esc(game.home+' – '+game.away)+'</span><small>'+esc(game.field)+'</small></a>').join('')+(place.kind==='pitch'&&!place.matches.length?'<p>Voor dit veld is nog geen finale ingepland.</p>':'')+'</div>';$('[data-final-map-legend]').innerHTML=places.map(item=>'<button type="button" data-map-spot="'+esc(item.id)+'" aria-pressed="'+(item.id===selected)+'">'+esc(item.name)+'</button>').join('');const count=$('[data-final-cup-count]');if(count)count.textContent=window.HVFixtures.cups.length+' toernooien';const games=(window.HVOperations?.finals?.()||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));const timeline=root.querySelector('.fd-timeline');if(timeline&&games.length)timeline.innerHTML='<li><time>09.00</time><div><strong>Welkom op Houtrust</strong><span>Ontvangst van teams, officials en bezoekers.</span></div></li>'+games.map(game=>'<li><time>'+esc(game.time.replace(':','.'))+'</time><div><strong>'+esc(game.cupName)+'</strong><span>'+esc(game.home+' – '+game.away+' · '+game.field)+'</span></div></li>').join('');}root.addEventListener('click',event=>{const spot=event.target.closest('[data-map-spot]');if(spot){selected=spot.dataset.mapSpot;render();}});root.addEventListener('keydown',event=>{const spot=event.target.closest('[data-map-spot]');if(spot&&['Enter',' '].includes(event.key)){event.preventDefault();selected=spot.dataset.mapSpot;render();}});window.HVRender?.watch(root,['hv:fixtures','hv:operations','hv:experiences'],render);render();})();
