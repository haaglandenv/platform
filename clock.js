(() => {
  const store=window.HVDemo;if(!store)return;
  const zone='Europe/Amsterdam';
  function instant(date,time='12:00',timeZone=zone){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time)))return null;
    const local=date+'T'+time+':00',target=Date.parse(local+'Z');if(!Number.isFinite(target)||new Date(target).toISOString().slice(0,10)!==date)return null;
    const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const parts=value=>Object.fromEntries(formatter.formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    let utc=target;for(let i=0;i<4;i++){const p=parts(utc),shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second),delta=target-shown;if(!delta)break;utc+=delta;}
    const p=parts(utc);if(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second!==local)return null;
    return new Date(utc).toISOString();
  }
  function now(){const saved=store.get('clockV15',null),edition=window.HVEditions?.active?.(),id=edition?.id||'HV-ED-2026-27';if(saved?.editions?.[id]?.instant)return saved.editions[id].instant;if(id==='HV-ED-2026-27'&&saved?.instant)return saved.instant;return instant(edition?.demoToday||'2027-06-05',edition?.demoTime||'16:30')||'2027-06-05T14:30:00.000Z';}
  const localParts=(value=now())=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  function today(){const p=localParts();return p.year+'-'+p.month+'-'+p.day;}
  function set(input){if(window.HVAccess&&!window.HVAccess.can('clock.manage'))return{ok:false,error:'Alleen de toernooileiding kan de demoklok instellen.'};const value=instant(input.date,input.time);if(!value)return{ok:false,error:'Kies een bestaande datum en lokale tijd. Deze tijd bestaat mogelijk niet door de zomertijdwisseling.'};const saved=store.get('clockV15',{}),id=window.HVEditions?.active?.()?.id||'HV-ED-2026-27';store.set('clockV15',{zone,editions:{...saved.editions,[id]:{instant:value}}});document.dispatchEvent(new CustomEvent('hv:clock'));return{ok:true,instant:value};}
  window.HVClock={now,today,instant,set,zone,localParts,format(value,options={}){return new Intl.DateTimeFormat('nl-NL',{timeZone:zone,...options}).format(new Date(value));}};
})();
