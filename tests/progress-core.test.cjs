'use strict';
// All values in this suite are fictional. No browser/user profile is read.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../progress-core.js');
const Shield=require('../progress-shield.js');
const {cases}=require('./fixtures/historical-saves.cjs');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25';
const V23='monarch-hunter-equipment-v23',V24='monarch-hunter-equipment-v24';
const main=xp=>({xp,tasks:[],history:[],player:'Profil fictiv',unknown:{keep:'șț 😀'}});
const raw=v=>JSON.stringify(v,null,2);
function memory(initial={}){
  const map=new Map(Object.entries(initial)),operations=[];
  const storage={map,operations,get length(){return map.size;},key:i=>[...map.keys()][i]??null,
    getItem(key){if(storage.readFailure?.(key))throw Error('simulated read failure');return map.get(key)??null;},
    setItem(key,value){value=String(value);operations.push(['set',key,value]);if(storage.failure?.(key,value))throw Error('simulated storage failure');if(!storage.ignore?.(key,value))map.set(key,value);},
    removeItem(key){operations.push(['remove',key]);if(storage.failure?.(key,null))throw Error('simulated removal failure');map.delete(key);}
  };
  return storage;
}
const snapshot=store=>Object.fromEntries(store.map);
const create=store=>Core.create(store,{validate:Shield.shape});
function shieldCheckpoint(){return raw({version:1,status:'complete',createdAt:'2026-10-01T00:00:00.000Z',before:{[MAIN]:raw(main(50))},touched:[MAIN]});}

test('core uses an internal non-profile journal and normal startup is read-only',()=>{
  assert.equal(Core.JOURNAL,'__monarch_progress_core_txn_v1__');
  assert.equal(Shield.profileKey(Core.JOURNAL),false);
  const initial={[MAIN]:raw(main(425)),[V23]:'{"equipped":"cloak"}',[V24]:'{"slots":null}',[Shield.JOURNAL]:shieldCheckpoint(),'monarch-future-test':'opaque value','other-app':'private'};
  const store=memory(initial),core=create(store),scope=core.scope('read-only');
  assert.equal(core.ready,true);assert.deepEqual(snapshot(store),initial);assert.deepEqual(store.operations,[]);
  const first=scope.read(MAIN);assert.deepEqual(first,main(425));first.unknown.keep='mutated copy';
  assert.equal(scope.read(MAIN).unknown.keep,'șț 😀','reads return detached parsed objects');
  assert.deepEqual(scope.read(V24),{slots:null});assert.deepEqual(scope.read(AW,{answers:{}}),{answers:{}});
  assert.deepEqual(snapshot(store),initial);assert.deepEqual(store.operations,[]);
});

for(const fixture of cases)test('historical core read does not normalize: '+fixture.name,()=>{
  const text=raw(fixture.data),store=memory({[fixture.key]:text}),core=create(store);
  assert.equal(core.ready,true);assert.deepEqual(core.scope('historical').read(fixture.key),fixture.data);
  assert.equal(store.getItem(fixture.key),text);assert.deepEqual(store.operations,[]);
});

test('invalid data and unowned write keys are rejected before touching profile data',()=>{
  for(const updates of [{[MAIN]:{xp:-1,tasks:[]}},{[AW]:{answers:null}},{[PLAN]:{done:[]}},{'other-app':{}},{'monarch-unknown':{}},{[Core.JOURNAL]:{}},{[Shield.JOURNAL]:{}}]){
    const store=memory({[MAIN]:raw(main(425))}),before=snapshot(store),scope=create(store).scope('validation');
    scope.read(MAIN);assert.throws(()=>scope.commit(updates));assert.deepEqual(snapshot(store),before);
  }
});

test('multi-key commit stores reward receipt and XP together without touching Shield undo',()=>{
  const before={[MAIN]:raw(main(425)),[AW]:raw({paths:[],answers:{},finished:true,questDone:{}}),[Shield.JOURNAL]:shieldCheckpoint(),'unrelated':'keep'};
  const store=memory(before),core=create(store),scope=core.scope('education');
  const game=scope.read(MAIN),aw=scope.read(AW);game.xp+=20;aw.questDone['lesson:fictional-permanent-id']=true;
  assert.equal(scope.commit({[MAIN]:game,[AW]:aw}),true);
  assert.deepEqual(JSON.parse(store.getItem(MAIN)),game);assert.deepEqual(JSON.parse(store.getItem(AW)),aw);
  assert.equal(store.getItem(Shield.JOURNAL),before[Shield.JOURNAL]);assert.equal(store.getItem('unrelated'),'keep');assert.equal(store.getItem(Core.JOURNAL),null);
  assert.equal(core.ready,true);
  const journalIndex=store.operations.findIndex(([kind,key])=>kind==='set'&&key===Core.JOURNAL);
  const profileIndex=store.operations.findIndex(([kind,key])=>kind==='set'&&key===MAIN);
  assert.ok(journalIndex>=0&&journalIndex<profileIndex,'durable journal must precede profile writes');
});

test('a stale module snapshot cannot overwrite a newer committed profile',()=>{
  const store=memory({[MAIN]:raw(main(425))}),core=create(store),a=core.scope('old module'),b=core.scope('new module');
  const old=a.read(MAIN),current=b.read(MAIN);current.xp=445;b.write(MAIN,current);old.player='stale rename';
  const after=snapshot(store);assert.throws(()=>a.write(MAIN,old));assert.deepEqual(snapshot(store),after);
});

test('one failed second profile write rolls the full transaction back byte for byte',()=>{
  const before={[MAIN]:raw(main(425)),[AW]:raw({questDone:{},skillXP:{}}),[Shield.JOURNAL]:shieldCheckpoint(),'unrelated':'keep'};
  const store=memory(before),core=create(store),scope=core.scope('transient failure');scope.read(MAIN);scope.read(AW);
  let failed=false;store.failure=(key)=>key===AW&&!failed&&(failed=true);
  assert.throws(()=>scope.commit({[MAIN]:main(445),[AW]:{questDone:{test:true},skillXP:{test:20}}}));
  assert.deepEqual(snapshot(store),before);assert.equal(core.ready,false,'a failed write blocks further legacy writes');
});

test('rollback removes only a key newly introduced by the failed operation',()=>{
  const before={[AW]:raw({answers:{}}),'other-app':'private'};
  const store=memory(before),core=create(store),scope=core.scope('new key');scope.read(MAIN,main(0));scope.read(AW);
  let failed=false;store.failure=key=>key===AW&&!failed&&(failed=true);
  assert.throws(()=>scope.commit({[MAIN]:main(20),[AW]:{answers:{1:'fictiv'}}}));
  assert.equal(store.getItem(MAIN),null);assert.deepEqual(snapshot(store),before);
});

test('persistent rollback failure retains recoverable journal; a later instance recovers originals',()=>{
  const before={[MAIN]:raw(main(425)),[AW]:raw({questDone:{}}),[Shield.JOURNAL]:shieldCheckpoint()};
  const store=memory(before),core=create(store),scope=core.scope('persistent failure');scope.read(MAIN);scope.read(AW);
  let interrupted=false;store.failure=key=>{if(key===AW)interrupted=true;return interrupted&&(key===MAIN||key===AW);};
  assert.throws(()=>scope.commit({[MAIN]:main(445),[AW]:{questDone:{test:true}}}));
  assert.equal(core.ready,false);assert.ok(store.getItem(Core.JOURNAL));
  const blocked=create(store);assert.equal(blocked.ready,false);assert.ok(blocked.error);assert.ok(store.getItem(Core.JOURNAL));
  store.failure=null;const recovered=create(store);assert.equal(recovered.ready,true);assert.deepEqual(snapshot(store),before);
});

test('quota failure while creating the journal changes no profile key',()=>{
  const before={[MAIN]:raw(main(425))},store=memory(before),core=create(store),scope=core.scope('quota');scope.read(MAIN);
  store.failure=key=>key===Core.JOURNAL;
  assert.throws(()=>scope.write(MAIN,main(445)));assert.deepEqual(snapshot(store),before);assert.equal(core.ready,false);
  assert.equal(store.operations.some(([kind,key])=>kind==='set'&&key===MAIN),false);
});

test('silently ignored profile writes are detected and rolled back',()=>{
  const before={[MAIN]:raw(main(425)),[AW]:raw({questDone:{}})},store=memory(before),core=create(store),scope=core.scope('readback');scope.read(MAIN);scope.read(AW);
  store.ignore=(key,value)=>key===AW&&JSON.parse(value).questDone?.test;
  assert.throws(()=>scope.commit({[MAIN]:main(445),[AW]:{questDone:{test:true}}}));
  assert.deepEqual(snapshot(store),before);assert.equal(core.ready,false);
});

test('interrupted pending operation restores exact before values and original key absence',()=>{
  const before={[MAIN]:raw(main(425)),[V23]:raw({equipped:'cloak'}),[Shield.JOURNAL]:shieldCheckpoint(),'unrelated':'keep'};
  const journal={version:1,status:'pending',before:{[MAIN]:before[MAIN],[V24]:null},after:{[MAIN]:raw(main(445)),[V24]:raw({slots:{weapon:'blade'}})}};
  const store=memory({...before,[MAIN]:journal.after[MAIN],[V24]:journal.after[V24],[Core.JOURNAL]:raw(journal)}),core=create(store);
  assert.equal(core.ready,true);assert.deepEqual(snapshot(store),before);assert.equal(store.getItem(Core.JOURNAL),null);
  core.recover();assert.deepEqual(snapshot(store),before,'recovery is idempotent');
});

test('interrupted committed operation verifies completed values and cleans its private journal',()=>{
  const before=raw(main(425)),after=raw(main(445)),journal={version:1,status:'committed',before:{[MAIN]:before},after:{[MAIN]:after}};
  const store=memory({[MAIN]:after,[Core.JOURNAL]:raw(journal),[Shield.JOURNAL]:shieldCheckpoint()}),core=create(store);
  assert.equal(core.ready,true);assert.equal(store.getItem(MAIN),after);assert.equal(store.getItem(Core.JOURNAL),null);
  const unchanged=snapshot(store);core.recover();assert.deepEqual(snapshot(store),unchanged);
});

test('malformed journals fail closed without resetting any stored value',()=>{
  const valid={version:1,status:'pending',before:{[MAIN]:raw(main(425))},after:{[MAIN]:raw(main(445))}};
  const invalid=['broken JSON',raw({...valid,version:2}),raw({...valid,status:'unknown'}),raw({...valid,before:{}}),raw({...valid,after:{'other-app':'private'}}),raw({...valid,before:{[MAIN]:23}})];
  for(const text of invalid){const initial={[MAIN]:raw(main(445)),[Core.JOURNAL]:text,'other-app':'private'},store=memory(initial),core=create(store);
    assert.equal(core.ready,false);assert.ok(core.error);assert.deepEqual(snapshot(store),initial);assert.deepEqual(store.operations,[]);
  }
});

test('backup v1 excludes core internals and preserves every profile value after a core commit',()=>{
  const original={[MAIN]:raw(main(425)),[AW]:raw({answers:{},paths:[],finished:true,questDone:{}}),'monarch-future-test':'opaque original'},store=memory(original),scope=create(store).scope('backup');
  const game=scope.read(MAIN);game.xp=445;scope.write(MAIN,game);
  const shield=Shield.create(store),backup=Shield.parse(Shield.serialize(shield.export()).text);
  assert.equal(backup.formatVersion,1);assert.equal(backup.data[Core.JOURNAL],undefined);
  const target=memory({}),restore=Shield.create(target);restore.restore(backup);
  for(const[k,v]of Object.entries(shield.snapshot()))assert.equal(target.getItem(k),v);
});
