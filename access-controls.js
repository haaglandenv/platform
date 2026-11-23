(() => {
  const access=window.HVAccess;if(!access)return;
  function wrap(service,name,action,scope){const original=service?.[name];if(typeof original!=='function')return;service[name]=function(...args){const target=scope?.(...args)||{};if(!access.can(action,target))return{ok:false,error:'Deze actie valt buiten de bevoegdheden van je actieve rol.'};return original.apply(this,args);};}
  const R=window.HVRegistrations,F=window.HVFixtures,scope=(cupId,teamId)=>({cupId,teamId}),match=(id,side)=>{const g=F?.get(id);return{matchId:id,cupId:g?.tournamentId,...(side?{teamId:g?.[side+'TeamId']}:{} )};};
  for(const name of ['savePlayer','removePlayer','submitRoster','requestPlayer'])wrap(R,name,'rosters.manage',scope);
  for(const name of ['reviewRoster','decideRequest','setDispensation'])wrap(R,name,'registrations.manage',scope);
  wrap(R,'submitLineup','lineup.submit',match);
  for(const name of ['checkPlayer','checkAllPlayers','reviewLineup','approveShortHanded','replaceAbsentStarter','admitLatePlayer'])wrap(R,name,'official.control',match);
  const C=window.HVMatchCenter;for(const name of ['startMatch','finalize','confirmEvent','rejectEvent','confirmAll','setPhase','startPhase','pauseClock','resumeClock','correctClock','addPenaltyShot','undoPenaltyShot'])wrap(C,name,'match.manage',id=>({matchId:typeof id==='object'?id.matchId:id}));
  const N=window.HVNews;for(const name of ['save','remove','restoreRevision','submitReview','approveReview'])wrap(N,name,'news.manage');
})();
