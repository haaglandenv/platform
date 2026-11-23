(() => {
  const root = document.querySelector('#elftal');
  if (!root) return;
  const identities = window.HVIdentity;
  let teams = identities.listTeams();
  const find = key => root.querySelector('[data-public-team' + key + ']');
  const anchors = root.querySelector('[data-team-profile-anchors]');
  for (const team of teams) {
    const anchor = document.createElement('span');
    anchor.id = 'elftal-' + team.id;
    anchor.className = 'public-profile-anchor';
    anchor.setAttribute('aria-hidden', 'true');
    anchors.append(anchor);
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;
    find('').append(option);
  }
  let selected = teams[0]?.id;
  let queued=false;function schedule(){if(root.hidden||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!root.hidden){selected=linkedTeam()?.id||selected;render();}});}
  function linkedTeam() {
    const prefix = '#elftal-';
    return location.hash.startsWith(prefix) ? identities.team(location.hash.slice(prefix.length)) : null;
  }
  function render() {
    teams=identities.listTeams();find('').replaceChildren(...teams.map(row=>new Option(row.name,row.id)));
    const team = identities.team(selected);
    if (!team) return;
    root.dataset.teamId = team.id;
    root.dataset.clubId = team.clubId;
    find('').value = team.id;
    find('-name').textContent = team.name;
    find('-club').textContent = team.clubName;
    find('-club-link').href = '#vereniging-' + team.clubId;
    find('-news-title').textContent = 'Nieuws van ' + team.name;
    let journey=root.querySelector('[data-team-journey]');if(!journey){journey=document.createElement('div');journey.dataset.teamJourney='';journey.className='fd-actions';const road=document.createElement('a');road.className='hv-button hv-button-dark';road.dataset.teamRoad='';road.textContent='Road to Houtrust';const trophies=document.createElement('a');trophies.className='hv-button hv-button-outline';trophies.dataset.teamTrophies='';trophies.textContent='Digitale bekerkast';journey.append(road,trophies);root.querySelector('.public-profile-intro').append(journey);}journey.querySelector('[data-team-road]').href='#road-'+team.id;journey.querySelector('[data-team-trophies]').href='#bekerkast-'+team.id;
    const stats = window.HVStats?.team(team.id) || {};
    window.HVStatsUI?.kpis(find('-kpis'),stats,'team');
    window.HVStatsUI?.form(find('-form'),stats.form || []);
    window.HVStatsUI?.performers(find('-performers'),{teamId:team.id});
    window.HVNewsUI?.feed(find('-news'), { context: { teamId: team.id }, limit: 6 });
  }
  find('').addEventListener('change', () => { location.hash = 'elftal-' + find('').value; });
  window.addEventListener('hashchange',schedule);
  document.addEventListener('hv:identity',schedule);document.addEventListener('hv:fixtures',schedule);
  document.addEventListener('hv:match-events',schedule);
  document.addEventListener('hv:privacy',schedule);
  document.addEventListener('hv:registrations',schedule);
  document.addEventListener('hv:state', ({detail}) => { if (detail.key === 'newsPosts') schedule(); });
  document.addEventListener('hv:route',({detail})=>{if(detail?.pageId===root.id)schedule();});
  document.addEventListener('DOMContentLoaded', () => {
    selected = linkedTeam()?.id || selected;
    render();
    if (linkedTeam()) window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, { once: true });
})();
