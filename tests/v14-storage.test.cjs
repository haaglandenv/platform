const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const text=fs.readFileSync(path.resolve(__dirname,'../site.js'),'utf8'),end=text.indexOf('  const pages =');
assert(end>0,'Cannot find the end of the actual HVDemo store segment.');
const source=text.slice(0,end)+'\n})();';
const key='hv-control-prototype-2027-v2',plain=value=>JSON.parse(JSON.stringify(value));
function boot(initial={},options={}){
 const callbacks={},documentCallbacks={},events=[],writes=[];
 let persisted=JSON.stringify(initial);
 const document={addEventListener(type,fn){(documentCallbacks[type]||=[]).push(fn);},dispatchEvent(event){events.push(event);for(const fn of documentCallbacks[event.type]||[])fn(event);return true;}};
 const window={addEventListener(type,fn){(callbacks[type]||=[]).push(fn);}};
 const localStorage={getItem(storageKey){return options.storage?options.storage.getItem(storageKey):persisted;},setItem(storageKey,value){writes.push({key:storageKey,value});if(options.storage)options.storage.setItem(storageKey,value);else persisted=value;}};
 class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
 vm.runInNewContext(source,{window,document,localStorage,CustomEvent,structuredClone},{filename:'site.js:HVDemo'});
 return{store:window.HVDemo,events,writes,document,remote(value,storageKey=key){for(const fn of callbacks.storage||[])fn({key:storageKey,newValue:value});},changes:()=>events.filter(event=>event.type==='hv:state').map(event=>event.detail),reset(){events.length=0;writes.length=0;}};
}
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('same remote snapshot produces no state events or storage echo',()=>{
 const app=boot({calendar:{time:'19:30'},preferences:{result:true}});app.remote(JSON.stringify(app.store.snapshot()));assert.equal(app.changes().length,0);assert.equal(app.writes.length,0);
});
test('remote mutation dispatches exactly the changed key and adopts all state before notification',()=>{
 const app=boot({calendar:{time:'19:30'},preferences:{result:true},unchanged:[1,2]});const seen=[];
 app.document.addEventListener('hv:state',event=>seen.push({key:event.detail.key,snapshot:plain(app.store.snapshot())}));
 app.remote(JSON.stringify({calendar:{time:'20:00'},preferences:{result:false},unchanged:[1,2]}));
 assert.deepEqual(app.changes().map(item=>item.key).sort(),['calendar','preferences']);assert.equal(app.writes.length,0);
 for(const observation of seen){assert.equal(observation.snapshot.calendar.time,'20:00');assert.equal(observation.snapshot.preferences.result,false);}
 assert.deepEqual(plain(app.store.get('unchanged')), [1,2]);
});
test('removed remote keys dispatch undefined once, and a remote reset removes the remaining keys',()=>{
 const app=boot({keep:{id:1},removed:{id:2}});app.remote(JSON.stringify({keep:{id:1}}));assert.deepEqual(app.changes().map(item=>item.key),['removed']);assert.equal(app.changes()[0].value,undefined);assert.equal(app.store.get('removed','fallback'),'fallback');assert.equal(Object.hasOwn(app.store.snapshot(),'removed'),false);
 app.reset();app.remote(JSON.stringify({keep:{id:1}}));assert.equal(app.changes().length,0);
 app.remote(null);assert.deepEqual(app.changes().map(item=>item.key),['keep']);assert.deepEqual(plain(app.store.snapshot()),{});assert.equal(app.writes.length,0);
});
test('unrelated storage keys and malformed remote payloads do not alter the store',()=>{
 const app=boot({safe:{version:2}});app.remote(JSON.stringify({safe:{version:99}}),'another-project');app.remote('{ invalid json');assert.equal(app.store.get('safe').version,2);assert.equal(app.changes().length,0);assert.equal(app.writes.length,0);
});
test('local notifications retain the existing mutable-reference behavior',()=>{
 const app=boot({profile:{name:'Old name'}});const profile=app.store.get('profile');profile.name='New name';app.store.set('profile',profile);assert.equal(app.store.get('profile').name,'New name');assert.deepEqual(app.changes().map(item=>item.key),['profile']);assert.equal(app.writes.length,1);
});
test('three tabs with derived writes settle without a calendar-notification feedback storm',()=>{
 let persisted=JSON.stringify({calendar:{time:'19:30'}}),commits=0;const queue=[],tabs=[];
 function storageFor(index){return{getItem(){return persisted;},setItem(storageKey,value){if(value===persisted)return;persisted=value;commits++;for(let other=0;other<tabs.length;other++)if(other!==index)queue.push({index:other,key:storageKey,value});}};}
 for(let index=0;index<3;index++)tabs.push(boot({}, {storage:storageFor(index)}));
 const observations=[0,0,0];tabs.forEach((tab,index)=>tab.document.addEventListener('hv:state',event=>{if(event.detail.key!=='calendar')return;observations[index]++;tab.store.set('derived',{calendarTime:tab.store.get('calendar').time,tab:index,sequence:observations[index]});}));
 tabs[0].store.set('calendar',{time:'20:00'});let delivered=0;
 while(queue.length){assert(delivered<60,'Storage feedback did not settle after sixty remote events.');const event=queue.shift();tabs[event.index].remote(event.value,event.key);delivered++;}
 assert.deepEqual(observations,[1,1,1]);assert.equal(commits,4);assert.equal(delivered,8);for(const tab of tabs)assert.equal(tab.store.get('calendar').time,'20:00');
});
let failed=0;for(const[name,fn]of tests)try{fn();console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}console.log((tests.length-failed)+'/'+tests.length+' passed');if(failed)process.exitCode=1;
