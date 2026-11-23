(() => {
  const identity = window.HVIdentity;
  const cache = new Map();
  const invalidate = () => cache.clear();
  document.addEventListener('hv:fixtures',invalidate);
  document.addEventListener('hv:match-events',invalidate);
  document.addEventListener('hv:state',invalidate);
  document.addEventListener('hv:competition',invalidate);
  const goalTypes = new Set(['goal','penalty-goal','own-goal']);
  const eligible = game => game.status === 'finished' && Number.isInteger(game.homeScore) && Number.isInteger(game.awayScore);
  function contextMatches(game, context = {}) {
    return (!context.editionId || !game.editionId || game.editionId === context.editionId) && (!context.tournamentId || game.tournamentId === context.tournamentId) && (!context.cupKey || game.cupKey === context.cupKey)
      && (!context.clubId || game.homeClubId === context.clubId || game.awayClubId === context.clubId)
      && (!context.teamId || game.homeTeamId === context.teamId || game.awayTeamId === context.teamId);
  }
  function publicPlayer(player, teamId) {
    const team = identity.team(player.teamId || teamId);
    return {id:identity.canonicalPersonId?.(player.id||player.playerHvId)||player.id||player.playerHvId,name:player.name || [player.firstName,player.lastName].filter(Boolean).join(' '),number:player.number || '',photo:player.photo || 'assets/demo-player-1.webp',teamId:team?.id || player.teamId,teamName:team?.name || '',clubId:team?.clubId || player.clubId,clubName:team?.clubName || '',position:player.position || '',teamIds:[team?.id||player.teamId].filter(Boolean),games:0,starts:0,subAppearances:0,goals:0,minutes:0,yellow:0,red:0,substitutions:0,cleanSheets:0,liveGoals:0,liveYellow:0,liveRed:0,form:[],appearances:[],cupIds:[],matchIntervals:[]};
  }
  function snapshot(context = {}) {
    const cacheKey = JSON.stringify([context.editionId||'',context.tournamentId||'',context.cupKey||'',context.clubId||'',context.teamId||'']);
    if(cache.has(cacheKey))return cache.get(cacheKey);
    if(context.editionId==='all'){const current=snapshot({...context,editionId:''}),past=archivedSnapshot({...context,editionId:'all'}),combined=combineSnapshots(context,current,past);cache.set(cacheKey,combined);return combined;}
    const activeEdition=window.HVEditions?.active?.();
    if(context.editionId&&activeEdition&&context.editionId!==activeEdition.id){const archived=archivedSnapshot(context);cache.set(cacheKey,archived);return archived;}
    const allFixtures=window.HVFixtures?.all()||[];
    const participants = allFixtures.filter(game => contextMatches(game,context));
    const fixtures = participants.filter(game => game.status !== 'bye');
    const finished = fixtures.filter(eligible), liveFixtures = fixtures.filter(game => ['live','suspended'].includes(game.status));
    const liveIds=new Set(liveFixtures.map(game=>game.id));
    const teamMap = new Map(), clubMap = new Map(), playerMap = new Map();
    const acceptsTeam = id => !!id && (!context.teamId || id === context.teamId) && (!context.clubId || identity.team(id)?.clubId === context.clubId);
    const scopedGoals = game => (acceptsTeam(game.homeTeamId) ? Number(game.homeScore)||0 : 0) + (acceptsTeam(game.awayTeamId) ? Number(game.awayScore)||0 : 0);
    const participantTeams = new Set(participants.flatMap(game => [game.homeTeamId,game.awayTeamId]).filter(acceptsTeam));
    const entries=(window.HVFixtures?.cups||[]).filter(cup=>(!context.tournamentId||cup.id===context.tournamentId)&&(!context.cupKey||cup.key===context.cupKey)).flatMap(cup=>(window.HVCompetition?.entrants?.(cup.id,allFixtures)||[]).filter(entry=>['approved','accepted'].includes(entry.status)).map(entry=>({...entry,cupId:cup.id}))).filter(entry=>acceptsTeam(entry.teamId||entry.id));
    const enteredIds=new Set(entries.map(entry=>entry.teamId||entry.id)),teams=new Set([...participantTeams,...enteredIds]);
    const core = window.HVMatchCenter;
    function ensureTeam(id) {
      if (!acceptsTeam(id)) return null;
      if (!teamMap.has(id)) {
        const team = identity.team(id);
        if (!team) return null;
        teamMap.set(id,{id,name:team.name,clubId:team.clubId,clubName:team.clubName,games:0,goals:0,against:0,wins:0,draws:0,losses:0,cleanSheets:0,yellow:0,red:0,substitutions:0,form:[],liveGoals:0,liveYellow:0,liveRed:0,liveSubstitutions:0});
      }
      return teamMap.get(id);
    }
    function ensurePlayer(value, teamId) {
      if (!value) return null;
      const safe = publicPlayer(value,teamId);
      if (!safe.id || !safe.name) return null;
      if (!playerMap.has(safe.id)) playerMap.set(safe.id,safe);
      else{const known=playerMap.get(safe.id);known.teamIds=[...new Set([...(known.teamIds||[]),safe.teamId].filter(Boolean))];}
      return playerMap.get(safe.id);
    }
    teams.forEach(id => {
      ensureTeam(id);
      for (const player of core?.playersForTeam(id) || []) ensurePlayer(player,id);
    });
    let yellow = 0, red = 0, substitutions = 0, liveYellow = 0, liveRed = 0, liveSubstitutions = 0;
    const eventIds = new Set();
    const trendMap = new Map(),completeness=[];
    for (const game of fixtures) {
      const official = eligible(game), provisional = liveIds.has(game.id);
      if(!official&&!provisional)continue;
      // Reuse the current fixture projection: core lookups otherwise rebuild the entire calendar.
      const rules=game.ruleSnapshot?.rules||window.HVCompetition?.rulesForMatch(game)?.rules||{};
      const events=core?.events(game.id,game,rules)||[];
      const ownEventsByPlayer=new Map();
      for(const event of events){if(event.status!=='confirmed')continue;if(event.playerId){if(!ownEventsByPlayer.has(event.playerId))ownEventsByPlayer.set(event.playerId,[]);ownEventsByPlayer.get(event.playerId).push(event);}}
      const recorded=Number(core?.result?.(game.id)?.playingMinutes??(game.actualPlayingMinutes?game.playingMinutes:null)),regular=(Number(rules?.halfMinutes)||45)*2;
      const duration=Number.isFinite(recorded)&&recorded>0?recorded:regular+(game.extraTimePlayed&&rules?.extraTime?(Number(rules.extraHalfMinutes)||15)*2:0);
      if (official) {
        const meaningfulEvents=events.filter(event=>!String(event.id).includes('-score-confirmed-')),recordedGoals=meaningfulEvents.filter(event=>event.status==='confirmed'&&goalTypes.has(event.type)&&event.playerId).length,expectedGoals=Number(game.homeScore)+Number(game.awayScore);
        const explicitComplete=game.dataCompleteness==='complete'||game.eventsComplete===true||core?.result?.(game.id)?.eventsComplete===true;
        const reconciled=recordedGoals===expectedGoals&&events.every(event=>event.status!=='provisional');
        completeness.push({matchId:game.id,date:game.date,home:game.home,away:game.away,status:explicitComplete&&reconciled?'complete':meaningfulEvents.length?'partial':'score-only',recordedGoals,expectedGoals,missingGoals:Math.max(0,expectedGoals-recordedGoals)});
        trendMap.set(game.date,(trendMap.get(game.date)||0)+scopedGoals(game));
        for (const side of ['home','away']) {
          const team = ensureTeam(game[side+'TeamId']);
          if (!team) continue;
          const own = side === 'home' ? game.homeScore : game.awayScore, against = side === 'home' ? game.awayScore : game.homeScore;
          const verdict = own > against ? 'W' : own < against ? 'V' : 'G';
          team.games++; team.goals += own; team.against += against; team[verdict==='W'?'wins':verdict==='V'?'losses':'draws']++;
          if(against===0)team.cleanSheets++;
          team.form.push({date:game.date,result:verdict,score:own+'–'+against});
          const matchPlayers = core?.players(game.id,side,game) || core?.playersForTeam(team.id) || [];
          const intervals=typeof core?.playerIntervals==='function'?core.playerIntervals(game.id,side,{confirmedOnly:true,duration:Number.isFinite(recorded)&&recorded>0?recorded:undefined,fixtureContext:game,events,rules}):fallbackIntervals(matchPlayers,events,side,duration);
          const intervalMap=new Map(intervals.map(item=>[item.playerId||item.id,item]));
          for (const member of matchPlayers) {
            const player = ensurePlayer(member,team.id);
            if (!player) continue;
            const interval=intervalMap.get(member.id)||intervalMap.get(player.id);
            if(!interval?.appeared||interval.available===false)continue;
            player.games++;player.appearances.push(game.id);
            if(interval.started)player.starts++;else player.subAppearances++;
            player.minutes += Math.max(0,Number(interval.minutes)||0);
            player.cupIds=[...new Set([...player.cupIds,game.tournamentId])];
            player.matchIntervals.push({matchId:game.id,teamId:team.id,started:interval.started,intervals:interval.intervals,minutes:interval.minutes});
            if(against===0&&interval.minutes>0)player.cleanSheets++;
            player.form.push({date:game.date,result:verdict,score:own+'–'+against});
          }
        }
      } else if (provisional) {
        for(const side of ['home','away']) {const team = ensureTeam(game[side+'TeamId']); if(team)team.liveGoals += Number(game[side+'Score']) || 0;}
      }
      if (!official && !provisional) continue;
      for (const event of events) {
        if (event.status === 'rejected' || (official && event.status !== 'confirmed')) continue;
        const eventKey = game.id + ':' + event.id;
        if (eventIds.has(eventKey)) continue;
        eventIds.add(eventKey);
        const side = event.side === 'away' ? 'away' : 'home';
        const eventTeamId = event.teamId || game[side+'TeamId'];
        if(!acceptsTeam(eventTeamId))continue;
        const team = ensureTeam(eventTeamId);
        let player = playerMap.get(identity.canonicalPersonId?.(event.playerId)||event.playerId);
        if (!player && event.playerId && event.playerName) player = ensurePlayer({id:event.playerId,name:event.playerName,teamId:team?.id},team?.id);
        const isYellow = ['yellow','second-yellow'].includes(event.type), isRed = ['red','second-yellow'].includes(event.type), isSub = event.type === 'substitution';
        if (official) {
          if(isYellow){yellow++;if(team)team.yellow++;if(player)player.yellow++;}
          if(isRed){red++;if(team)team.red++;if(player)player.red++;}
          if(isSub){substitutions++;if(team)team.substitutions++;if(player)player.substitutions++;}
          if(goalTypes.has(event.type)&&event.type!=='own-goal'&&player)player.goals++;
        } else {
          if(isYellow){liveYellow++;if(team)team.liveYellow++;if(player)player.liveYellow++;}
          if(isRed){liveRed++;if(team)team.liveRed++;if(player)player.liveRed++;}
          if(isSub){liveSubstitutions++;if(team)team.liveSubstitutions++;}
          if(goalTypes.has(event.type)&&event.type!=='own-goal'&&player)player.liveGoals++;
        }
      }
    }
    const teamRows = [...teamMap.values()].map(team=>({...team,form:team.form.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)}));
    for(const team of teamRows) {
      if(!clubMap.has(team.clubId)) clubMap.set(team.clubId,{id:team.clubId,name:team.clubName,teams:0,games:0,goals:0,against:0,wins:0,losses:0,cleanSheets:0,yellow:0,red:0,substitutions:0,liveGoals:0,form:[]});
      const club = clubMap.get(team.clubId); club.teams++;
      for(const key of ['games','goals','against','wins','losses','cleanSheets','yellow','red','substitutions','liveGoals'])club[key]+=team[key];
      club.form.push(...team.form);
    }
    // A club's match against another of its own teams counts as one fixture.
    for(const club of clubMap.values()) {
      club.games=finished.filter(game=>game.homeClubId===club.id||game.awayClubId===club.id).length;
      club.form.sort((a,b)=>b.date.localeCompare(a.date));club.form=club.form.slice(0,5);
    }
    const minimumMinutes=180;
    const playerRows = [...playerMap.values()].map(player=>({...player,goalsPer90:player.minutes>=minimumMinutes?Number((player.goals*90/player.minutes).toFixed(2)):null,rateMinimumMinutes:minimumMinutes,form:player.form.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)}));
    const goals = finished.reduce((sum,game)=>sum+scopedGoals(game),0);
    const allIds=teams;
    const activeIds=new Set(fixtures.filter(game=>['scheduled','live','suspended','review'].includes(game.status)).flatMap(game=>[game.homeTeamId,game.awayTeamId]).filter(acceptsTeam));
    const value = {context,fixtures,completeness,metrics:{teams:allIds.size,uniqueTeams:allIds.size,entries:entries.length||teams.size,assignedTeams:participantTeams.size,notAssignedTeams:[...enteredIds].filter(id=>!participantTeams.has(id)).length,activeTeams:activeIds.size,clubs:clubMap.size,matches:fixtures.length,played:finished.length,scheduled:fixtures.filter(game=>game.status==='scheduled').length,goals,yellow,red,cards:yellow+red,substitutions,cleanSheets:teamRows.reduce((sum,row)=>sum+row.cleanSheets,0),average:finished.length?goals/finished.length:0,completeMatches:completeness.filter(row=>row.status==='complete').length,partialMatches:completeness.filter(row=>row.status==='partial').length,scoreOnlyMatches:completeness.filter(row=>row.status==='score-only').length,unassignedGoals:completeness.reduce((sum,row)=>sum+row.missingGoals,0)},live:{matches:liveFixtures.length,goals:liveFixtures.reduce((sum,game)=>sum+scopedGoals(game),0),yellow:liveYellow,red:liveRed,substitutions:liveSubstitutions},teams:teamRows.sort((a,b)=>b.goals-a.goals||b.wins-a.wins||a.name.localeCompare(b.name,'nl')),clubs:[...clubMap.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name,'nl')),players:playerRows.sort((a,b)=>b.goals-a.goals||b.games-a.games||a.name.localeCompare(b.name,'nl')),trend:[...trendMap].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,goals])=>({date,goals}))};
    cache.set(cacheKey,value);return value;
  }
  function archivedSnapshot(context){
    const activeId=window.HVEditions?.active?.()?.id,official=(window.HVWorkflow?.archives?.()||[]),sources=new Map(official.map(row=>[row.editionId+'|'+row.cupId,row]));
    const working=(window.HVEditions?.list?.()||[]).filter(row=>row.id!==activeId&&(context.editionId==='all'||row.id===context.editionId));
    for(const edition of working){const state=window.HVEditions?.snapshot?.(edition.id);if(!state)continue;for(const cup of state.__cups||state.competitionDefinitions||[]){const key=edition.id+'|'+cup.id;if(sources.has(key))continue;sources.set(key,{editionId:edition.id,cupId:cup.id,working:true,snapshot:{entries:state.__entries?.[cup.id]||[],fixtures:(state.__fixtures||[]).filter(game=>game.tournamentId===cup.id),events:(state.matchCenterEvents||[]).map(event=>({...event,...state.matchCenterDecisions?.[event.id]})).filter(event=>(state.__fixtures||[]).some(game=>game.id===event.matchId&&game.tournamentId===cup.id)),statistics:state.__statisticsByCup?.[cup.id]||null}});}}
    const archiveCupKey=row=>row.snapshot?.cup?.key||(window.HVFixtures?.cups||[]).find(cup=>cup.id===row.cupId||cup.name===row.cupName)?.key;
    const archives=[...sources.values()].filter(row=>(context.editionId==='all'?row.editionId!==activeId:row.editionId===context.editionId)&&(!context.tournamentId||row.cupId===context.tournamentId)&&(!context.cupKey||archiveCupKey(row)===context.cupKey));
    const allFixtures=[...new Map(archives.flatMap(row=>(row.snapshot?.fixtures||[]).map(game=>({...game,cupKey:game.cupKey||archiveCupKey(row)}))).map(game=>[game.id,game])).values()],fixtures=allFixtures.filter(game=>contextMatches(game,{...context,editionId:context.editionId==='all'?'':context.editionId})&&game.status!=='bye'),finished=fixtures.filter(eligible),teamMap=new Map(),clubMap=new Map(),playerMap=new Map(),events=archives.flatMap(row=>row.snapshot?.events||[]).filter(event=>event.status==='confirmed'&&fixtures.some(game=>game.id===event.matchId));
    const workingFixtureIds=new Set(archives.filter(row=>row.working).flatMap(row=>(row.snapshot?.fixtures||[]).map(game=>game.id))),liveFixtures=fixtures.filter(game=>workingFixtureIds.has(game.id)&&['live','suspended'].includes(game.status));
    const historicalTeams=new Map(archives.flatMap(archive=>archive.snapshot?.statistics?.teams||[]).map(team=>[team.id,team]));
    const accept=id=>!!id&&(!context.teamId||id===context.teamId)&&(!context.clubId||(historicalTeams.get(id)?.clubId||identity.team(id)?.clubId)===context.clubId),entries=new Set();
    for(const archive of archives)for(const entry of archive.snapshot?.entries||[])if(['approved','accepted'].includes(entry.status)&&accept(entry.teamId||entry.id))entries.add(archive.cupId+'|'+(entry.teamId||entry.id));
    for(const team of historicalTeams.values())if(accept(team.id))teamMap.set(team.id,{...team,games:0,goals:0,against:0,wins:0,draws:0,losses:0,cleanSheets:0,yellow:0,red:0,substitutions:0,liveGoals:0,liveYellow:0,liveRed:0,liveSubstitutions:0,form:[]});
    for(const game of fixtures)for(const side of ['home','away']){const id=game[side+'TeamId'];if(!accept(id))continue;const identityRow=historicalTeams.get(id)||identity.team(id);if(!teamMap.has(id))teamMap.set(id,{id,name:identityRow?.name||game[side],clubId:identityRow?.clubId||game[side+'ClubId'],clubName:identityRow?.clubName||'',games:0,goals:0,against:0,wins:0,draws:0,losses:0,cleanSheets:0,yellow:0,red:0,substitutions:0,liveGoals:0,form:[]});entries.add(game.tournamentId+'|'+id);if(liveFixtures.some(row=>row.id===game.id))teamMap.get(id).liveGoals+=(Number(game[side+'Score'])||0);if(!eligible(game))continue;const row=teamMap.get(id),own=game[side+'Score'],against=game[side==='home'?'awayScore':'homeScore'],verdict=own>against?'W':own<against?'V':'G';row.games++;row.goals+=own;row.against+=against;row[verdict==='W'?'wins':verdict==='V'?'losses':'draws']++;if(against===0)row.cleanSheets++;row.form.push({date:game.date,result:verdict,score:own+'–'+against});}
    for(const archive of archives)for(const member of archive.snapshot?.statistics?.players||[]){if(!accept(member.teamId))continue;const current=playerMap.get(member.id);if(!current){playerMap.set(member.id,{...member,appearances:[...(member.appearances||[])],form:[...(member.form||[])]});continue;}for(const key of ['games','goals','minutes','starts','subAppearances','yellow','red','substitutions','cleanSheets'])current[key]=(Number(current[key])||0)+(Number(member[key])||0);current.appearances=[...new Set([...current.appearances,...(member.appearances||[])])];current.form.push(...(member.form||[]));}
    let yellow=0,red=0,substitutions=0;for(const team of teamMap.values()){const rows=archives.flatMap(archive=>archive.snapshot?.statistics?.teams||[]).filter(row=>row.id===team.id);if(rows.length){team.yellow=rows.reduce((n,row)=>n+(Number(row.yellow)||0),0);team.red=rows.reduce((n,row)=>n+(Number(row.red)||0),0);team.substitutions=rows.reduce((n,row)=>n+(Number(row.substitutions)||0),0);}else{const own=events.filter(event=>{const game=fixtures.find(row=>row.id===event.matchId);return(event.teamId||game?.[event.side==='away'?'awayTeamId':'homeTeamId'])===team.id;});team.yellow=own.filter(row=>['yellow','second-yellow'].includes(row.type)).length;team.red=own.filter(row=>['red','second-yellow'].includes(row.type)).length;team.substitutions=own.filter(row=>row.type==='substitution').length;}yellow+=team.yellow;red+=team.red;substitutions+=team.substitutions;}
    const live={matches:liveFixtures.length,goals:liveFixtures.reduce((sum,game)=>sum+(accept(game.homeTeamId)?Number(game.homeScore)||0:0)+(accept(game.awayTeamId)?Number(game.awayScore)||0:0),0),yellow:0,red:0,substitutions:0};
    for(const archive of archives.filter(row=>row.working)){const saved=archive.snapshot?.statistics;if(!context.clubId&&!context.teamId&&saved?.live){for(const key of ['yellow','red','substitutions'])live[key]+=Number(saved.live[key])||0;}else{const rows=(saved?.teams||[]).filter(row=>accept(row.id)),hasTeamLive=rows.some(row=>Object.hasOwn(row,'liveYellow')||Object.hasOwn(row,'liveRed')||Object.hasOwn(row,'liveSubstitutions'));if(hasTeamLive){live.yellow+=rows.reduce((sum,row)=>sum+(Number(row.liveYellow)||0),0);live.red+=rows.reduce((sum,row)=>sum+(Number(row.liveRed)||0),0);live.substitutions+=rows.reduce((sum,row)=>sum+(Number(row.liveSubstitutions)||0),0);}else{const own=(archive.snapshot?.events||[]).filter(event=>event.status!=='rejected'&&liveFixtures.some(game=>game.id===event.matchId&&accept(event.teamId||game[event.side==='away'?'awayTeamId':'homeTeamId'])));live.yellow+=own.filter(event=>['yellow','second-yellow'].includes(event.type)).length;live.red+=own.filter(event=>['red','second-yellow'].includes(event.type)).length;live.substitutions+=own.filter(event=>event.type==='substitution').length;}}}
    for(const team of teamMap.values()){const rows=archives.filter(row=>row.working).flatMap(row=>row.snapshot?.statistics?.teams||[]).filter(row=>row.id===team.id);for(const key of ['liveYellow','liveRed','liveSubstitutions'])team[key]=rows.reduce((sum,row)=>sum+(Number(row[key])||0),0);}
    for(const team of teamMap.values()){team.form.sort((a,b)=>b.date.localeCompare(a.date));team.form=team.form.slice(0,5);if(!clubMap.has(team.clubId))clubMap.set(team.clubId,{id:team.clubId,name:team.clubName,teams:0,games:0,goals:0,against:0,wins:0,losses:0,cleanSheets:0,yellow:0,red:0,substitutions:0,form:[]});const club=clubMap.get(team.clubId);club.teams++;for(const key of ['games','goals','against','wins','losses','cleanSheets','yellow','red','substitutions'])club[key]+=team[key];club.form.push(...team.form);}
    for(const club of clubMap.values()){club.games=finished.filter(game=>game.homeClubId===club.id||game.awayClubId===club.id).length;club.form.sort((a,b)=>b.date.localeCompare(a.date));club.form=club.form.slice(0,5);}
    const scopedGoals=game=>(accept(game.homeTeamId)?Number(game.homeScore)||0:0)+(accept(game.awayTeamId)?Number(game.awayScore)||0:0),goals=finished.reduce((sum,game)=>sum+scopedGoals(game),0),trend=new Map(),coverage=new Map(archives.flatMap(row=>row.snapshot?.statistics?.completeness||[]).map(row=>[row.matchId,row])),completeness=finished.map(game=>{const recordedGoals=events.filter(event=>event.matchId===game.id&&goalTypes.has(event.type)&&event.playerId).length,expectedGoals=game.homeScore+game.awayScore;return coverage.get(game.id)||{matchId:game.id,home:game.home,away:game.away,date:game.date,status:recordedGoals?'partial':'score-only',recordedGoals,expectedGoals,missingGoals:Math.max(0,expectedGoals-recordedGoals)};});for(const game of finished)trend.set(game.date,(trend.get(game.date)||0)+scopedGoals(game));
    const players=[...playerMap.values()].map(row=>({...row,goalsPer90:row.minutes>=180?Number((row.goals*90/row.minutes).toFixed(2)):null,rateMinimumMinutes:180,form:row.form.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)}));
    const assignedIds=new Set(fixtures.flatMap(game=>[game.homeTeamId,game.awayTeamId]).filter(accept)),activeIds=new Set(fixtures.filter(game=>workingFixtureIds.has(game.id)&&['scheduled','live','suspended','review'].includes(game.status)).flatMap(game=>[game.homeTeamId,game.awayTeamId]).filter(accept));
    return{context,archived:!archives.some(row=>row.working),readOnly:true,fixtures,completeness,metrics:{teams:teamMap.size,uniqueTeams:teamMap.size,entries:entries.size,assignedTeams:assignedIds.size,notAssignedTeams:teamMap.size-assignedIds.size,activeTeams:activeIds.size,clubs:clubMap.size,matches:fixtures.length,played:finished.length,scheduled:fixtures.filter(game=>workingFixtureIds.has(game.id)&&game.status==='scheduled').length,goals,yellow,red,substitutions,cards:yellow+red,average:finished.length?goals/finished.length:0,completeMatches:completeness.filter(row=>row.status==='complete').length,partialMatches:completeness.filter(row=>row.status==='partial').length,scoreOnlyMatches:completeness.filter(row=>row.status==='score-only').length,unassignedGoals:completeness.reduce((sum,row)=>sum+row.missingGoals,0)},live,teams:[...teamMap.values()],clubs:[...clubMap.values()],players,trend:[...trend].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,goals])=>({date,goals}))};
  }
  function combineSnapshots(context,current,past){const merge=(a,b,kind)=>{const map=new Map(a.map(row=>[row.id,{...row,form:[...(row.form||[])],appearances:[...(row.appearances||[])],matchIntervals:[...(row.matchIntervals||[])]}]));for(const row of b){const before=map.get(row.id);if(!before){map.set(row.id,{...row});continue;}for(const key of ['games','goals','against','wins','draws','losses','cleanSheets','yellow','red','substitutions','minutes','starts','subAppearances'])before[key]=(Number(before[key])||0)+(Number(row[key])||0);before.form=[...(before.form||[]),...(row.form||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);before.appearances=[...new Set([...before.appearances,...(row.appearances||[])])];before.matchIntervals.push(...(row.matchIntervals||[]));before.cupIds=[...new Set([...(before.cupIds||[]),...(row.cupIds||[])])];if(kind==='players')before.goalsPer90=before.minutes>=180?Number((before.goals*90/before.minutes).toFixed(2)):null;}return [...map.values()].sort((a,b)=>b.goals-a.goals||b.games-a.games||a.name.localeCompare(b.name,'nl'));},teams=merge(current.teams,past.teams,'teams'),clubs=merge(current.clubs,past.clubs,'clubs'),players=merge(current.players,past.players,'players'),metrics={...current.metrics};for(const key of ['entries','matches','played','scheduled','goals','yellow','red','cards','substitutions','cleanSheets','completeMatches','partialMatches','scoreOnlyMatches','unassignedGoals'])metrics[key]=(Number(current.metrics[key])||0)+(Number(past.metrics[key])||0);metrics.teams=teams.length;metrics.uniqueTeams=teams.length;const assigned=new Set([...current.fixtures,...past.fixtures].flatMap(game=>[game.homeTeamId,game.awayTeamId]));metrics.assignedTeams=teams.filter(team=>assigned.has(team.id)).length;metrics.notAssignedTeams=teams.length-metrics.assignedTeams;metrics.clubs=clubs.length;for(const club of clubs)club.teams=teams.filter(team=>team.clubId===club.id).length;metrics.activeTeams=new Set([...current.fixtures,...past.fixtures].filter(game=>['scheduled','live','suspended','review'].includes(game.status)).flatMap(game=>[game.homeTeamId,game.awayTeamId]).filter(id=>teams.some(team=>team.id===id))).size;metrics.average=metrics.played?metrics.goals/metrics.played:0;const trend=new Map();for(const row of [...current.trend,...past.trend])trend.set(row.date,(trend.get(row.date)||0)+row.goals);return{context,fixtures:[...current.fixtures,...past.fixtures],completeness:[...current.completeness,...past.completeness],metrics,live:Object.fromEntries(['matches','goals','yellow','red','substitutions'].map(key=>[key,(Number(current.live[key])||0)+(Number(past.live[key])||0)])),teams,clubs,players,trend:[...trend].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,goals])=>({date,goals}))};}
  function fallbackIntervals(people,events,side,duration){return people.map(person=>{const started=person.position==='starter'&&person.available!==false,intervals=[];let from=started?0:null,sentOff=false;for(const event of events.filter(row=>row.side===side&&row.status==='confirmed').sort((a,b)=>a.minute-b.minute)){const minute=Math.max(0,Math.min(duration,Number(event.minute)||0));if(event.playerId===person.id&&(['red','second-yellow'].includes(event.type)||event.type==='substitution')){if(from!==null)intervals.push({from,to:minute});from=null;if(['red','second-yellow'].includes(event.type))sentOff=true;}if(event.type==='substitution'&&event.relatedPlayerId===person.id&&!sentOff)from=minute;}if(from!==null)intervals.push({from,to:duration});return {playerId:person.id,started,appeared:started||intervals.length>0,available:person.available!==false,minutes:intervals.reduce((sum,row)=>sum+Math.max(0,row.to-row.from),0),intervals,sentOff};});}
  function headToHead(homeTeamId,awayTeamId,context={}){if(!homeTeamId||!awayTeamId||homeTeamId===awayTeamId)return{games:0,wins:0,draws:0,losses:0,goals:0,against:0,fixtures:[]};const fixtures=snapshot(context).fixtures.filter(game=>eligible(game)&&[game.homeTeamId,game.awayTeamId].includes(homeTeamId)&&[game.homeTeamId,game.awayTeamId].includes(awayTeamId));const summary={games:fixtures.length,wins:0,draws:0,losses:0,goals:0,against:0};for(const game of fixtures){const own=game.homeTeamId===homeTeamId?game.homeScore:game.awayScore,against=game.homeTeamId===homeTeamId?game.awayScore:game.homeScore;summary.goals+=own;summary.against+=against;summary[own>against?'wins':own<against?'losses':'draws']++;}return{...summary,fixtures};}
  window.HVStats={snapshot,headToHead,player:(id,context={})=>snapshot(context).players.find(row=>row.id===id)||null,team:(id,context={})=>snapshot(context).teams.find(row=>row.id===id)||null,club:(id,context={})=>snapshot(context).clubs.find(row=>row.id===id)||null};
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
  const publicPlayers=(rows,context={})=>rows.flatMap(player=>{const safe=window.HVPrivacy?.publicPlayer(player,context);return window.HVPrivacy?(safe&&safe.allowed!==false?[{...player,...safe}]:[]):[player];});
  window.HVStatsUI={
    publicPlayers,
    kpis(target,row={},kind='team'){
      const values=kind==='player'?[['Duels',row.games,'Werkelijk deelgenomen'],['Doelpunten',row.goals,'Exclusief eigen goals'],['Speelminuten',row.minutes,'Werkelijke veldintervallen'],['Basisplaatsen',row.starts,'Uit de goedgekeurde opgave'],['Invalbeurten',row.subAppearances,'Werkelijk ingevallen'],['Doelpunten / 90',row.goalsPer90??'—',row.goalsPer90==null?'Vanaf 180 speelminuten':'Minimaal 180 minuten'],['Geel',row.yellow,'Inclusief tweede geel'],['Rood',row.red,'Inclusief tweede geel'],['Wissels',row.substitutions,'Als uitgaande speler'],['Zonder tegengoal',row.cleanSheets,'Teamclean sheet met deelname']]:kind==='club'?[['Teams',row.teams,'Deelnemers deze editie'],['Duels',row.games,'Bevestigd gespeeld'],['Doelpunten',row.goals,'Bevestigde eindstanden'],['Clean sheets',row.cleanSheets,'Teamwedstrijden zonder tegengoal'],['Geel',row.yellow,'Inclusief tweede geel'],['Rood',row.red,'Inclusief tweede geel']]:[['Duels',row.games,'Bevestigd gespeeld'],['Doelpunten',row.goals,'Bevestigde eindstanden'],['Tegengoals',row.against,'Bevestigde eindstanden'],['Clean sheets',row.cleanSheets,'Geen tegendoelpunten'],['Geel',row.yellow,'Inclusief tweede geel'],['Rood',row.red,'Inclusief tweede geel']];
      target?.replaceChildren(...values.map(([label,value,note])=>{const el=node('div',null,'stats-kpi');el.append(node('span',label),node('strong',typeof value==='string'?value:new Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(value||0)),node('small',note));return el;}));
    },
    form(target,rows=[]){target?.replaceChildren(...rows.map(row=>{const el=node('span',row.result);el.dataset.result=row.result;el.title=row.date+' · '+row.score;return el;}));if(target&&!rows.length)target.append(node('small','Nog geen bevestigde wedstrijden','stats-form-empty'));},
    performers(target,context={}){
      const players=publicPlayers(snapshot(context).players,context).filter(row=>row.games>0).slice(0,3);
      target?.replaceChildren(...players.map(player=>{const li=node('li'),a=node('a'),img=node('img'),copy=node('span');a.href='#speler-'+player.id;img.src=player.photo||'assets/hv-logo.svg';img.alt='';img.loading='lazy';copy.append(node('strong',player.name),node('small',player.goals+' goals · '+player.games+' duels'));a.append(img,copy);li.append(a);return li;}));
      if(target&&!players.length)target.append(node('p','Spelerscijfers volgen na bevestigde wedstrijden.','stats-source-note'));
    },
  };
})();
