(() => {
  const root = document.querySelector('#vereniging');
  if (!root) return;
  const identities = window.HVIdentity;
  let clubs = identities.listClubs();
  let teams = identities.listTeams();
  const find = key => root.querySelector('[data-public-club' + key + ']');
  const anchors = root.querySelector('[data-club-profile-anchors]');
  for (const club of clubs) {
    const anchor = document.createElement('span');
    anchor.id = 'vereniging-' + club.id;
    anchor.className = 'public-profile-anchor';
    anchor.setAttribute('aria-hidden', 'true');
    anchors.append(anchor);
    const option = document.createElement('option');
    option.value = club.id;
    option.textContent = club.name;
    find('').append(option);
  }
  let selected = clubs[0]?.id;
  let queued=false;function schedule(){if(root.hidden||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!root.hidden){selected=linkedClub()?.id||selected;render();}});}
  function linkedClub() {
    const prefix = '#vereniging-';
    return location.hash.startsWith(prefix) ? identities.club(location.hash.slice(prefix.length)) : null;
  }
  function render() {
    clubs=identities.listClubs();teams=identities.listTeams();find('').replaceChildren(...clubs.map(row=>new Option(row.name,row.id)));
    const club = identities.club(selected);
    if (!club) return;
    root.dataset.clubId = club.id;
    find('').value = club.id;
    find('-name').textContent = club.name;
    let contact=root.querySelector('[data-club-public-contact]');if(!contact){contact=document.createElement('div');contact.dataset.clubPublicContact='';contact.className='media-contact-public';root.querySelector('.public-profile-intro').append(contact);}const publicContact=window.HVPrivacy?.publicContact(club.id);contact.replaceChildren();contact.hidden=!publicContact;if(publicContact){const title=document.createElement('strong');title.textContent='Contact met de vereniging';const copy=document.createElement('p');copy.textContent=[publicContact.name,publicContact.email,publicContact.phone].filter(Boolean).join(' · ');contact.append(title,copy);}
    find('-news-title').textContent = 'Nieuws van ' + club.name;
    const participating = new Set((window.HVFixtures?.all() || []).flatMap(game=>[game.homeTeamId,game.awayTeamId]).filter(Boolean));
    const links = teams.filter(team => team.clubId === club.id && participating.has(team.id)).map(team => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#elftal-' + team.id;
      link.dataset.teamId = team.id;
      const label = document.createElement('span');
      const title = document.createElement('strong');
      const id = document.createElement('small');
      const arrow = document.createElement('span');
      title.textContent = team.name;
      id.textContent = 'Bekijk het teamprofiel';
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      label.append(title, id);
      link.append(label, arrow);
      item.append(link);
      return item;
    });
    find('-teams').replaceChildren(...links);
    find('-team-count').textContent = links.length + (links.length === 1 ? ' team' : ' teams');
    const stats = window.HVStats?.club(club.id) || {};
    window.HVStatsUI?.kpis(find('-kpis'),stats,'club');
    window.HVStatsUI?.form(find('-form'),stats.form || []);
    window.HVStatsUI?.performers(find('-performers'),{clubId:club.id});
    window.HVNewsUI?.feed(find('-news'), { context: { clubId: club.id }, limit: 6 });
  }
  find('').addEventListener('change', () => { location.hash = 'vereniging-' + find('').value; });
  window.addEventListener('hashchange',schedule);
  document.addEventListener('hv:identity',schedule);document.addEventListener('hv:fixtures',schedule);
  document.addEventListener('hv:match-events',schedule);
  document.addEventListener('hv:privacy',schedule);
  document.addEventListener('hv:state', ({detail}) => { if (['newsPosts','operationsClubProfiles'].includes(detail.key)) schedule(); });
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===root.id)schedule();});
  document.addEventListener('DOMContentLoaded', () => {
    selected = linkedClub()?.id || selected;
    render();
    if (linkedClub()) window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, { once: true });
})();
