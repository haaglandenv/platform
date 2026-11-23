(() => {
  function init() {
    const pane = document.querySelector('[data-mev-root]');
    const store = window.HVDemo;
    const eligibility = window.HVEligibility;
    const identity = window.HVIdentity;
    if (!pane || !store || !eligibility || !identity) return;

    const teams = { home: 'Duindorp SV', away: 'SVV Scheveningen' };
    const { id: matchId, home, away } = identity.fixture;
    const participants = { home, away };
    const labels = {
      goal: 'Doelpunt', 'penalty-goal': 'Benutte strafschop', 'own-goal': 'Eigen doelpunt',
      yellow: 'Gele kaart', 'second-yellow': 'Tweede gele kaart', red: 'Rode kaart', incident: 'Bijzonderheid',
    };
    const goalTypes = ['goal', 'penalty-goal', 'own-goal'];
    const kickoffReason = 'Bevestig eerst de aftrap in Wedstrijdregie.';
    const sources = ['arbitration', 'eligibilityRules', 'lineups', 'matchEvents', 'matchKickoff', 'officialSession', 'planning', 'result', 'tournamentRosters'];
    const by = (name) => pane.querySelector('[data-mev-' + name + ']');
    const form = by('form');
    const field = (name) => form.elements.namedItem(name);
    const records = () => store.get('matchEvents', []).map(withIdentity);

    function withIdentity(record) {
      const fields = {
        matchId,
        playerHvId: record.playerId ? identity.playerId(record.playerId) : null,
        teamId: participants[record.side]?.teamId ?? null,
        clubId: participants[record.side]?.clubId ?? null,
        scoreTeamId: participants[record.scoreSide]?.teamId ?? null,
      };
      const missing = Object.entries(fields).filter(([key]) => !Object.hasOwn(record, key));
      return missing.length ? { ...record, ...Object.fromEntries(missing) } : record;
    }

    function blockedReason() {
      const plan = store.get('planning', store.initialPlan);
      if (plan.status === 'cancelled') return 'Deze wedstrijd is afgelast.';
      if (store.get('result', null)) return 'Het wedstrijdformulier is afgerond of opgeslagen voor verzending.';
      if (!eligibility.canReferee()) return 'Bevestig eerst je aanstelling als scheidsrechter.';
      if (!eligibility.isReady()) return 'Beide spelersopgaven moeten zijn goedgekeurd.';
      if (!eligibility.hasKickedOff()) return kickoffReason;
      return '';
    }

    function availablePlayers(side) {
      if (!Object.hasOwn(teams, side)) return [];
      const sheet = store.get('lineups', window.HVRosters || {})[side];
      if (sheet?.status !== 'submitted') return [];
      const checks = store.get('officialSession', {}).checks?.[side] || {};
      return sheet.players.filter((player) => player.position !== 'absent'
        && eligibility.player(side, player.id)
        && store.playerCheckStatus(player, sheet, checks[player.id]) === 'seen');
    }

    function tell(message, warning = false) {
      by('notice').textContent = message;
      by('notice').dataset.tone = warning ? 'warning' : 'success';
      by('notice').hidden = !message;
    }

    function renderForm(blocked) {
      const incident = field('type').value === 'incident';
      const needsPlayer = field('type').value !== '' && !incident;
      const side = field('side').value;
      const list = field('player');
      const selected = list.value;
      by('fields').disabled = !!blocked;
      by('gate').hidden = !blocked;
      by('gate-text').textContent = blocked;
      by('kickoff-link').hidden = blocked !== kickoffReason;
      field('side').required = needsPlayer;
      field('description').required = incident;
      by('note-label').textContent = incident ? 'Toelichting' : 'Toelichting (optioneel)';
      list.required = needsPlayer;
      list.disabled = !!blocked || !side;
      const choices = blocked ? [] : availablePlayers(side);
      list.replaceChildren(new Option(side ? 'Kies een speler' : 'Kies eerst een team', ''),
        ...choices.map((player) => new Option(player.number + ' · ' + player.name, player.id)));
      if (choices.some((player) => player.id === selected)) list.value = selected;
    }

    function element(tag, text, className) {
      const node = document.createElement(tag);
      node.className = className;
      node.textContent = text;
      return node;
    }

    function renderHistory(blocked) {
      const canRead = eligibility.canReferee();
      const history = canRead ? records().slice().sort((first, second) => first.minute - second.minute) : [];
      by('empty').hidden = history.length > 0;
      by('empty').textContent = canRead ? 'Er zijn nog geen gebeurtenissen vastgelegd.' : 'Bevestig je aanstelling om het wedstrijdverslag te bekijken.';
      by('history').replaceChildren(...history.map((event) => {
        const item = element('li', '', 'mev-history-item');
        const body = element('div', '', 'mev-body');
        const scoreSide = event.type === 'own-goal' ? ' · voor ' + teams[event.scoreSide] : '';
        const title = labels[event.type] + scoreSide;
        const person = [event.playerName, teams[event.side]].filter(Boolean).join(' · ');
        body.append(element('strong', title, 'mev-title'));
        if (person) body.append(element('span', person, 'mev-person'));
        if (event.playerHvId) body.append(element('span', event.playerHvId, 'mev-player-id'));
        if (event.description) body.append(element('p', event.description, 'mev-detail'));
        item.append(element('span', event.minute + '′', 'mev-minute'), body);
        if (event.voidedAt) {
          item.dataset.voided = '';
          item.append(element('span', 'Ingetrokken', 'mev-voided'));
        } else if (!blocked) {
          const cancel = element('button', 'Intrekken', 'hv-button hv-button-outline');
          cancel.type = 'button';
          cancel.dataset.mevVoid = event.id;
          cancel.setAttribute('aria-label', title + ' in minuut ' + event.minute + ' intrekken');
          item.append(cancel);
        }
        return item;
      }));
    }

    function render() {
      const blocked = blockedReason();
      renderForm(blocked);
      renderHistory(blocked);
    }

    function save(next, minute) {
      const live = store.get('live', { home: 0, away: 0, minute: 0 });
      const score = { home: 0, away: 0, minute: Math.max(live.minute, minute) };
      for (const event of next) {
        if (event.scoreSide && !event.voidedAt) score[event.scoreSide]++;
      }
      if (score.home > 99 || score.away > 99) return false;
      const updates = { matchEvents: next };
      if (score.home !== live.home || score.away !== live.away || score.minute !== live.minute) updates.live = score;
      store.setMany(updates);
      return true;
    }

    form.addEventListener('change', (event) => {
      if (['type', 'side'].includes(event.target.name)) renderForm(blockedReason());
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const blocked = blockedReason();
      if (blocked) { tell(blocked, true); return; }
      const type = field('type').value;
      const minute = field('minute').valueAsNumber;
      const side = field('side').value;
      const playerId = field('player').value;
      const player = availablePlayers(side).find(({ id }) => id === playerId);
      const description = field('description').value.trim();
      if (!Object.hasOwn(labels, type) || !Number.isSafeInteger(minute) || minute < 0) {
        tell('Kies een gebeurtenis en vul een geldige wedstrijdminuut in.', true);
        return;
      }
      if ((type !== 'incident' || playerId) && !player) {
        tell('Selecteer een speler uit de goedgekeurde spelersopgaaf.', true);
        return;
      }
      if (type === 'incident' && !description) {
        tell('Beschrijf de wedstrijdbijzonderheid.', true);
        return;
      }
      const scoreSide = goalTypes.includes(type) ? (type === 'own-goal' ? (side === 'home' ? 'away' : 'home') : side) : undefined;
      const entry = withIdentity({
        id: crypto.randomUUID(), type, minute, side,
        playerId: player?.id || '', playerName: player?.name || '', description,
        createdAt: new Date().toISOString(), ...(scoreSide && { scoreSide }),
      });
      if (!save([...records(), entry], minute)) {
        tell('De maximumscore voor het wedstrijdformulier is bereikt.', true);
        return;
      }
      form.reset();
      renderForm('');
      field('minute').value = String(store.get('live', { minute }).minute);
      field('type').focus();
      tell(labels[type] + ' vastgelegd.');
    });

    by('history').addEventListener('click', (event) => {
      const id = event.target.closest('[data-mev-void]')?.dataset.mevVoid;
      if (!id || blockedReason()) return;
      const current = records();
      const found = current.find((item) => item.id === id && !item.voidedAt);
      if (!found) return;
      const voidedAt = new Date().toISOString();
      save(current.map((item) => item.id === id ? { ...item, voidedAt } : item), found.minute);
      tell(labels[found.type] + ' ingetrokken.');
      field('type').focus();
    });

    const previous = store.get('matchEvents', []);
    const migrated = previous.map(withIdentity);
    if (migrated.some((entry, index) => entry !== previous[index])) store.set('matchEvents', migrated);

    document.addEventListener('hv:state', ({ detail }) => {
      if (sources.includes(detail.key)) render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
