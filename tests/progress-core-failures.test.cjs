'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Core=require('../progress-core.js'),Shield=require('../progress-shield.js');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2';
function fixture(){
 const values=new Map([[MAIN,'{ "xp": 125, "tasks": [], "history": [] }'],[AW,'{ "paths": ["Finanțe"], "questDone": {} }']]);
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){storage.beforeSet?.(k,v);values.set(k,v);storage.afterSet?.(k,v);},removeItem(k){storage.beforeRemove?.(k);values.delete(k);},get length(){return values.size;},key:i=>[...values.keys()][i]??null};
 return {values,storage,snapshot:()=>Object.fromEntries(values)};
}
test('failure to persist commit marker rolls all touched roots back',()=>{
 const f=fixture(),before=f.snapshot(),core=Core.create(f.storage,{validate:Shield.shape}),scope=core.scope();
 const main=scope.read(MAIN),aw=scope.read(AW);main.xp+=20;aw.questDone['lesson:awakening.finance.budget']=true;
 let failed=false;f.storage.beforeSet=(key,raw)=>{if(key===Core.JOURNAL&&JSON.parse(raw).status==='committed'&&!failed){failed=true;throw Error('marker denied');}};
 assert.throws(()=>scope.commit({[MAIN]:main,[AW]:aw}),/marker denied/);
 assert.deepEqual(f.snapshot(),before);assert.equal(core.ready,false);
});
test('cleanup failure never reports success; restart retains one committed reward',()=>{
 const f=fixture(),core=Core.create(f.storage,{validate:Shield.shape}),scope=core.scope(),main=scope.read(MAIN);main.xp+=20;
 let failed=false;f.storage.beforeRemove=key=>{if(key===Core.JOURNAL&&!failed){failed=true;throw Error('cleanup denied');}};
 assert.throws(()=>scope.write(MAIN,main),/cleanup denied/);assert.equal(core.ready,false);
 assert.equal(JSON.parse(f.values.get(Core.JOURNAL)).status,'committed');
 const restarted=Core.create(f.storage,{validate:Shield.shape});
 assert.equal(restarted.ready,true);assert.equal(JSON.parse(f.values.get(MAIN)).xp,145);assert.equal(f.values.has(Core.JOURNAL),false);
});
test('schema-invalid recovery images do not overwrite healthy profile data',()=>{
 const f=fixture(),before=f.values.get(MAIN);
 f.values.set(Core.JOURNAL,JSON.stringify({version:1,status:'pending',before:{[MAIN]:'{"xp":"invalid","tasks":[]}'},after:{[MAIN]:before}}));
 const snapshot=f.snapshot(),core=Core.create(f.storage,{validate:Shield.shape});
 assert.equal(core.ready,false);assert.deepEqual(f.snapshot(),snapshot);
});
test('a foreign transaction journal is never replaced by this operation rollback',()=>{
 const f=fixture(),core=Core.create(f.storage,{validate:Shield.shape}),scope=core.scope(),main=scope.read(MAIN),aw=scope.read(AW);
 main.xp+=20;aw.questDone['lesson:test']=true;
 const foreign=JSON.stringify({version:1,status:'pending',id:'foreign-writer',before:{[MAIN]:f.values.get(MAIN)},after:{[MAIN]:JSON.stringify(main)}});
 f.storage.afterSet=key=>{if(key===MAIN){f.storage.afterSet=null;f.values.set(Core.JOURNAL,foreign);}};
 assert.throws(()=>scope.commit({[MAIN]:main,[AW]:aw}),/jurnal/i);
 assert.equal(core.ready,false);assert.equal(f.values.get(Core.JOURNAL),foreign);assert.deepEqual(JSON.parse(f.values.get(AW)).questDone,{});
});
test('Shield refuses restore/rollback while Core recovery is unresolved, export stays available',()=>{
 const f=fixture(),before=f.snapshot();
 f.values.set(Core.JOURNAL,JSON.stringify({version:1,status:'pending',before:{[MAIN]:before[MAIN]},after:{[MAIN]:before[MAIN]}}));
 f.values.set(Shield.JOURNAL,JSON.stringify({version:1,status:'complete',before:{[MAIN]:before[MAIN]},touched:[MAIN]}));
 const snapshot=f.snapshot(),shield=Shield.create(f.storage),backup=Shield.parse(Shield.serialize(shield.export()).text);
 assert.deepEqual(backup.data,before);assert.equal(backup.data[Core.JOURNAL],undefined);
 assert.throws(()=>shield.restore(backup),/Progress Core/);assert.throws(()=>shield.rollback(),/Progress Core/);
 assert.deepEqual(f.snapshot(),snapshot);
});
