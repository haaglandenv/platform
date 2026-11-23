const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const rootDir=path.resolve(__dirname,'..');
class Element{
  constructor(dataset={}){this.dataset=dataset;this.innerHTML='';this.textContent='';this.value='';this.children=[];this.handlers={};this.hidden=false;this.attrs={};this.classList={add(){},toggle(){}};}
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  animate(){return {};}
  closest(selector){const match=selector.match(/^\[data-([^\]]+)\]$/);if(!match)return null;const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return this.dataset[key]===undefined?null:this;}
  querySelector(selector){return this.map?.[selector]||null;}
  querySelectorAll(selector){return this.lists?.[selector]||[];}
}
const selectors=['anchors','cup','match','score','calendar','share','follow','bracket','feedback','sort','events','metrics','lineups','media','brief'];
const map=Object.fromEntries(selectors.map(key=>['[data-mc-'+key+']',new Element()]));
const tabs=['events','lineups','media'].map(mcTab=>new Element({mcTab})),panels=['events','lineups','media'].map(mcPanel=>new Element({mcPanel}));
const hero=new Element(),title=new Element(),eyebrow=new Element();hero.map={'h1':title,'.hv-hero__eyebrow':eyebrow};map['.hv-page-hero']=hero;
const view=new Element();view.id='wedstrijd';view.map=map;view.lists={'[data-mc-tab]':tabs,'[data-mc-panel]':panels};
const documentListeners={},windowListeners={};
const document={getElementById:id=>id==='wedstrijd'?view:null,createElement:()=>new Element(),addEventListener:(name,fn)=>documentListeners[name]=fn};
const matches=[
{id:'HV-2701',tournamentId:'HV-CUP-STD',cupKey:'senioren',cupName:'Sir Winston Cup',round:'Kwartfinale',status:'finished',date:'2027-06-05',time:'19:30',home:'Thuisclub 1',away:'Uitclub 1',homeTeamId:'HOME',awayTeamId:'AWAY',homeScore:2,awayScore:1,venue:'Thuispark',field:'Veld 1'},
{id:'HV-2721',tournamentId:'HV-CUP-HMC',cupKey:'halve-maan',cupName:'Halve Maan Cup',round:'Kwartfinale',status:'live',date:'2027-06-05',time:'20:00',home:'Andere thuisclub',away:'Andere uitclub',homeTeamId:'OTHER',awayTeamId:'AWAY',homeScore:1,awayScore:0,minute:38,venue:'Ander park',field:'Veld 2'},
];
const records=[{id:'private-player',name:'Verborgen privénaam',photo:'private.jpg',teamId:'HOME',number:7},{id:'open-player',name:'Toegestane naam',photo:'allowed.jpg',teamId:'AWAY',number:11},{id:'incoming',name:'Nieuwe speler',teamId:'HOME',number:14}];
const eventRecords=[
{id:'g',type:'goal',side:'home',playerId:'private-player',minute:12,status:'confirmed',note:'PRIVATE MEDICAL NOTE'},
{id:'y',type:'yellow',side:'away',playerId:'open-player',minute:23,status:'confirmed'},
{id:'r',type:'red',side:'away',playerId:'open-player',minute:44,status:'confirmed'},
{id:'s',type:'substitution',side:'home',playerId:'private-player',relatedPlayerId:'incoming',minute:50,status:'confirmed'},
{id:'p',type:'goal',side:'home',playerId:'private-player',minute:70,status:'provisional'},
{id:'rejected',type:'incident',side:'away',minute:77,status:'rejected',note:'REJECTED PRIVATE NOTE'},
];
let publicLineups=false,eventReads=0;const frames=[];function flush(){while(frames.length)frames.shift()();}
const window={HVFixtures:{cups:[{id:'HV-CUP-STD',key:'senioren',name:'Sir Winston Cup'},{id:'HV-CUP-HMC',key:'halve-maan',name:'Halve Maan Cup'}],today:'2027-06-05',get:id=>matches.find(match=>match.id===id),all:()=>matches,forCup:id=>matches.filter(match=>match.tournamentId===id)},HVMatchCenter:{playersForTeam:team=>records.filter(player=>player.teamId===team),players:(id,side)=>records.filter(player=>player.teamId===(side==='home'?'HOME':'AWAY')),events:id=>{eventReads++;return id==='HV-2701'?eventRecords:[];}},HVPrivacy:{publicPlayer:player=>({...player,name:player.id==='private-player'?'Speler 7':player.name,displayName:player.id==='private-player'?'Speler 7':player.name,photo:'',allowed:true}),canPublish:()=>publicLineups,canPublishLineup:()=>publicLineups},HVMedia:{publicForMatch:()=>[{src:'assets/action.webp',title:'Beeld <script> blijft tekst',credit:'Fotograaf <test>'}]},HVFollowing:{has:()=>false},HVCompetitionUI:{renderMatchBrief(){}},addEventListener:(name,fn)=>windowListeners[name]=fn};
const location={hash:'#wedstrijd-HV-2701',href:'https://example.test/#wedstrijd-HV-2701'};
const context={window,document,location,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},matchMedia:()=>({matches:true}),navigator:{},URL,Blob,setTimeout,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(rootDir,'pages/match.js'),'utf8'),context);
function test(name,fn){fn();console.log('PASS '+name);}
test('generic match route selects actual fixture and preserves both deep anchors',()=>{assert.equal(map['[data-mc-match]'].value,'HV-2701');assert.match(map['[data-mc-score]'].innerHTML,/Thuisclub 1/);assert.equal(map['[data-mc-anchors]'].children.length,2);assert.equal(map['[data-mc-bracket]'].href,'#schema-senioren');});
test('public timeline shows cards and substitutions and excludes rejected/private notes',()=>{const html=map['[data-mc-events]'].innerHTML;for(const label of ['Doelpunt','Gele kaart','Rode kaart','Wissel','Voorlopig · teamleiding'])assert(html.includes(label),label);assert(!html.includes('Verborgen privénaam'));assert(!html.includes('PRIVATE MEDICAL NOTE'));assert(!html.includes('REJECTED PRIVATE NOTE'));assert.match(html,/Speler 7 maakt plaats voor Nieuwe speler/);});
test('actual event metrics and publication gating remain explicit',()=>{const html=map['[data-mc-metrics]'].innerHTML;assert.match(html,/Doelpunten<\/span><strong>2/);assert.match(html,/Gele kaarten<\/span><strong>1/);assert.match(html,/Rode kaarten<\/span><strong>1/);assert.match(html,/Wissels<\/span><strong>1/);assert.match(map['[data-mc-lineups]'].innerHTML,/nog niet openbaar vrijgegeven/);publicLineups=true;documentListeners['hv:privacy']();flush();assert.match(map['[data-mc-lineups]'].innerHTML,/Speler 7/);assert(!map['[data-mc-lineups]'].innerHTML.includes('Verborgen privénaam'));});
test('media text is escaped and follows only the approved public API',()=>{const html=map['[data-mc-media]'].innerHTML;assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('Fotograaf &lt;test&gt;'));});
test('switching to another cup and fixture updates score, hero, follow target and empty events',()=>{location.hash='#wedstrijd-HV-2721';windowListeners.hashchange();flush();assert.equal(map['[data-mc-match]'].value,'HV-2721');assert.equal(map['[data-mc-cup]'].value,'HV-CUP-HMC');assert.match(title.textContent,/Andere thuisclub/);assert.match(map['[data-mc-score]'].innerHTML,/Live 38/);assert.match(map['[data-mc-events]'].innerHTML,/nog geen openbare/);assert.equal(map['[data-mc-follow]'].dataset.followId,'HV-2721');});
test('hidden match page ignores background events and visible bursts coalesce to one frame',()=>{view.hidden=true;const before=eventReads;for(let i=0;i<25;i++){documentListeners['hv:fixtures']();documentListeners['hv:privacy']();}assert.equal(frames.length,0);assert.equal(eventReads,before);view.hidden=false;documentListeners['hv:route']({detail:{pageId:'wedstrijd'}});for(let i=0;i<25;i++){documentListeners['hv:fixtures']();documentListeners['hv:privacy']();}assert.equal(frames.length,1);flush();assert.equal(eventReads,before+1);});
console.log('SUCCESS 6 public match/privacy/performance checks');
