const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),page=fs.readFileSync(path.join(root,'pages/cases.js'),'utf8');
const forbidden=new Set(['matches','submit','requestSubmit','reset','checkValidity','reportValidity','querySelector','querySelectorAll','addEventListener','removeEventListener','closest','contains','setAttribute','getAttribute','removeAttribute','append','prepend','remove','focus','click','dispatchEvent','insertAdjacentHTML','scrollIntoView']);
const collisions=[];
for(const filename of fs.readdirSync(path.join(root,'pages')).filter(name=>/\.(html|js)$/.test(name))){
  const source=fs.readFileSync(path.join(root,'pages',filename),'utf8');
  for(const control of source.matchAll(/<(?:input|select|textarea|button)\b[^>]*?\bname\s*=\s*(["'])([\w-]+)\1/gi))if(forbidden.has(control[2]))collisions.push(filename+': '+control[2]);
}
assert.deepEqual(collisions,[],'A named form control shadows a DOM method: '+collisions.join(', '));
console.log('PASS form control names do not shadow common DOM methods across static and generated page markup');

function handler(type){
  const start=page.indexOf("root.addEventListener('"+type+"',event=>{");assert.ok(start>=0,'Handler is present: '+type);
  const bodyStart=start+("root.addEventListener('"+type+"',event=>{").length,end=page.indexOf('\n  });',bodyStart);
  assert.ok(end>bodyStart,'Handler is complete: '+type);return '(event)=>{'+page.slice(bodyStart,end)+'\n}';
}
const countMarkup=page.match(/<label data-case-sanction-matches hidden>[^<]*<input name="([^"]+)"/);assert.ok(countMarkup,'Sanction count field is rendered');
const countWrap={hidden:true},namedCount={value:'2'};
const form={dataset:{caseDisciplineDecision:'HV-Z-TU-TEST'},matches:selector=>selector==='[data-case-discipline-decision]',querySelector:selector=>{assert.equal(selector,'[data-case-sanction-matches]');return countWrap;}};
// Named controls are exposed on HTMLFormElement; simulate that property behavior.
form[countMarkup[1]]=namedCount;
let decided=null;
const context={state:{role:'leadership'},store:{},objectionForm:{},incidentForm:{},reportForm:{},regulatoryForm:{},core:{decideDiscipline:(id,input)=>{decided={id,input};return {ok:true};}},execute:action=>action(),values:()=>({decision:'suspend-matches',sanctionMatches:'2',reason:'Schorsing na een gemotiveerd besluit van de toernooileiding.'})};
vm.createContext(context);
const change=vm.runInContext(handler('change'),context),target={name:'decision',value:'suspend-matches',matches:()=>false,closest:()=>form};
change({target});assert.equal(countWrap.hidden,false,'Selecting match suspension reveals the count field');
target.value='suspend-indefinite';change({target});assert.equal(countWrap.hidden,true,'Indefinite suspension hides the irrelevant match count');
assert.equal(typeof form.matches,'function');
console.log('PASS discipline decision changes reveal and hide the match count without clobbering form.matches');

const submit=vm.runInContext(handler('submit'),context);let prevented=false;
submit({target:{closest:()=>form},preventDefault(){prevented=true;}});
assert.equal(prevented,true);assert.equal(decided.id,'HV-Z-TU-TEST');assert.equal(decided.input.matches,'2');assert.equal(decided.input.decision,'suspend-matches');
console.log('PASS sanctionMatches is mapped to the domain suspension count on submission');
