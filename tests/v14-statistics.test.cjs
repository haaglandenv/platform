const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const modules=['identity','workflow','competition','fixtures','registrations','eligibility','match-center','cases','operations','privacy-media','statistics','kits','news','public-tools'];
function boot(initial={}){
  let state=structuredClone(initial);const listeners=new Map(),windowListeners=new Map();
  const metrics={depth:0,maxDepth:0,dispatches:0,writes:0,byType:{},loads:[]};
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const add=(map,type,fn)=>{const rows=map.get(type)||[];rows.push(fn);map.set(type,rows);};
  const element=tag=>({tagName:tag.toUpperCase(),dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},children:[],setAttribute(){},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]});
  const document={readyState:'complete',body:{dataset:{viewRole:'leadership'}},querySelector:()=>null,querySelectorAll:()=>[],createElement:element,createTextNode:text=>({textContent:String(text)}),addEventListener:(type,fn)=>add(listeners,type,fn),removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(row=>row!==fn));},dispatchEvent(event){metrics.dispatches++;metrics.byType[event.type]=(metrics.byType[event.type]||0)+1;metrics.depth++;metrics.maxDepth=Math.max(metrics.maxDepth,metrics.depth);if(metrics.depth>35)throw Error('EVENT_RECURSION '+event.type);if(metrics.dispatches>40000)throw Error('EVENT_STORM '+event.type);try{for(const fn of listeners.get(event.type)||[])fn(event);}finally{metrics.depth--;}return true;}};
  const initialPlan={date:'2027-06-05',time:'19.30',venue:'Sportpark Houtrust',field:'Veld 1',status:'planned'};
  const playerSignature=({number,position,captain,name})=>JSON.stringify([number,position,!!captain,name]);
  const store={initialPlan,get:(key,fallback)=>state[key]??fallback,set(key,value){store.setMany({[key]:value});return value;},setMany(values){metrics.writes++;if(metrics.writes>12000)throw Error('WRITE_STORM');state={...state,...values};for(const[key,value]of Object.entries(values))document.dispatchEvent(new CustomEvent('hv:state',{detail:{key,value}}));},playerSignature,playerCheckStatus(player,roster,check){if(!check||check.signature!==playerSignature(player))return '';if(check.version<roster.version&&roster.changes?.includes(player.id))return '';return check.status;},matchSnapshot(){const plan=state.planning||initialPlan,result=state.result?.status==='queued'?null:state.result;if(plan.status==='cancelled'||result?.verdict==='cancelled')return {status:'cancelled'};if(result?.verdict==='suspended')return {status:'suspended',home:result.home,away:result.away,minute:result.stoppedMinute};if(result?.status==='official')return {status:'official',home:result.home,away:result.away};if(result?.status==='review')return {status:'review'};if(state.matchKickoff)return {status:'live',...state.live};return {status:'planned'};}};
  const location={hash:'#werkvoorraad',origin:'https://hv-control.example',href:'https://hv-control.example/#werkvoorraad'};
  const context=vm.createContext({document,CustomEvent,console,crypto:crypto.webcrypto,structuredClone,setTimeout,clearTimeout,AbortController,DOMException,Date,URL,Blob,location,HVDemo:store,localStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},matchMedia:()=>({matches:true,addEventListener(){}}),requestAnimationFrame:fn=>fn()});context.window=context;context.addEventListener=(type,fn)=>add(windowListeners,type,fn);
  for(const name of modules){const filename=name+'.js';vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),context,{filename,timeout:15000});metrics.loads.push(name);}
  return {w:context,store,document,metrics,state:()=>state,role(role){const route={leadership:'werkvoorraad',association:'club',team:'team',referee:'official',photographer:'fotograaf',supporter:'supporters',press:'pers'}[role]||role;location.hash='#'+route;document.body.dataset.viewRole=role;},saved:()=>structuredClone(state)};
}

const env=boot(),{w}=env;
w.HVRegistrations.allRosters();
const calls={};
for(const [object,name]of [[w.HVFixtures,'get'],[w.HVMatchCenter,'events'],[w.HVCompetition,'rulesForMatch']]){const original=object[name];object[name]=(...args)=>{calls[name]=(calls[name]||0)+1;return original(...args);};}
env.document.dispatchEvent(new w.CustomEvent('hv:fixtures'));
const result=w.HVStats.snapshot();
assert.equal(result.metrics.teams,65);assert.equal(result.metrics.played,51);assert.equal(result.metrics.goals,165);assert.equal(result.metrics.yellow,102);assert.equal(result.metrics.red,3);assert.equal(result.metrics.substitutions,102);assert.equal(result.players.length,1040);
assert.equal(calls.get||0,0,'Statistics should reuse the projected fixture rather than rebuild the full calendar for each player/event lookup.');
assert.equal(calls.events,result.metrics.played+result.live.matches,'Read each relevant match event list exactly once.');
assert.ok(calls.rulesForMatch<=result.metrics.matches*3,'Resolve match rules once per match, not once per player.');
const before={...calls};assert.equal(w.HVStats.snapshot(),result);assert.deepEqual(calls,before,'Existing invalidated snapshot cache remains effective.');
console.log('PASS actual 75-fixture/80-roster statistics preserve all totals and reuse fixture context without repeated full-calendar lookups');
const teamId='HV-T-103-01',context={teamId},scoped=w.HVStats.snapshot(context);assert.equal(scoped.teams.length,1);assert.equal(scoped.teams[0].id,teamId);assert.equal(scoped.metrics.goals,scoped.teams[0].goals);
console.log('PASS scoped team statistics preserve the same fixture/event semantics');
const game=w.HVFixtures.get('HV-2702');assert.deepEqual(JSON.parse(JSON.stringify(w.HVMatchCenter.events(game.id,game))),JSON.parse(JSON.stringify(w.HVMatchCenter.events(game.id))));assert.deepEqual(JSON.parse(JSON.stringify(w.HVMatchCenter.players(game.id,'home',game))),JSON.parse(JSON.stringify(w.HVMatchCenter.players(game.id,'home'))));assert.deepEqual(JSON.parse(JSON.stringify(w.HVRegistrations.lineupPlayers(game.id,'home',game))),JSON.parse(JSON.stringify(w.HVRegistrations.lineupPlayers(game.id,'home'))));
console.log('PASS optional fixture contexts return identical core event/player projections');
const state=env.saved(),first=state.registrationData.rosters['HV-CUP-STD::'+teamId].players[0];const nextName='Gewijzigd '+first.lastName;for(const roster of Object.values(state.registrationData.rosters))for(const player of roster.players)if(player.id===first.id){player.firstName='Gewijzigd';player.name=nextName;}env.store.set('registrationData',state.registrationData);const changed=w.HVStats.snapshot(context);assert.notEqual(changed,scoped);assert.equal(changed.players.find(p=>p.id===first.id).name,nextName);
console.log('PASS later roster mutations invalidate snapshots; no stale memoized player data');
