'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const shield = require('../progress-shield.js');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25',EQ='monarch-hunter-equipment-v24';
function fixture(xp=425) {
  return {
    [MAIN]: JSON.stringify({version:4,player:'Profil fictiv',xp,tasks:[{id:'test',name:'Test',xp:20,category:'discipline'}],history:[{name:'Test',date:'2026-10-01',xp:25,category:'discipline'}],bosses:[],academy:{ai1:{done:true},bossClaimed:false},adaptive:{promptcraft:{stage:3,notes:'Text fictiv'}},completed:{test:true},unknownHistoricalField:{keep:true}},null,2),
    [AW]: JSON.stringify({step:24,finished:true,answers:{1:'Obiectiv fictiv'},paths:['Disciplină','Finanțe','Mișcare și sport'],assessment:{'Disciplină':1},questDone:{'lesson:path-0-0':true},skillXP:{'Disciplină':20},avatarStyle:'gold',questRewards:{'lesson:path-0-0':20},activeQuest:null}),
    [PLAN]: JSON.stringify({goals:{year:'Plan fictiv'},done:{'Disciplină:0':'2026-10-01'},notes:{keep:'Text fictiv'},active:null,skills:{'Disciplină':{level:1,completed:1,streak:1,manual:3}},reports:{'Disciplină:0':{score:88}}}),
    [EQ]: JSON.stringify({slots:{weapon:'blade',cloak:'cloak'}}),
    'monarch-hunter-equipment-v23': JSON.stringify({equipped:'blade'}),
    'monarch-awakening-previous-backup': JSON.stringify({step:0,answers:{},paths:[],assessment:{},finished:false,questDone:{}}),
    'monarch-future-setting': 'original non-JSON value',
    'other-app-token':'NEVER EXPORT'
  };
}
function memory(data={}) {
  const map=new Map(Object.entries(data));
  const store={get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem(k,v){if(store.fail?.(k,v))throw Error('simulated write failure');map.set(k,String(v));},removeItem(k){if(store.fail?.(k,null))throw Error('simulated removal failure');map.delete(k);},map};
  return store;
}
const original = storage => Object.fromEntries(storage.map);

test('export includes every MONARCH profile key and exact original values, excludes other apps and journal',()=>{
 const input=fixture(),storage=memory(input),api=shield.create(storage);storage.setItem(shield.JOURNAL,'internal');
 const backup=api.export();
 assert.equal(backup.formatVersion,1);assert.ok(Date.parse(backup.exportedAt));
 assert.deepEqual(backup.keys,Object.keys(input).filter(k=>k.startsWith('monarch-')).sort());
 for(const key of backup.keys)assert.equal(backup.data[key],input[key]);
 assert.equal(backup.data['other-app-token'],undefined);assert.equal(backup.data[shield.JOURNAL],undefined);
 assert.equal(shield.parse(JSON.stringify(backup)).kind,'complete');
});

test('restore keeps XP, inventory, lessons, difficulty and unknown fields byte for byte; preserves absent keys',()=>{
 const storage=memory({...fixture(900),'monarch-local-only':'keep'}),api=shield.create(storage),before=api.snapshot();
 const target=fixture(425);delete target['other-app-token'];delete target['monarch-hunter-equipment-v23'];
 const backup=shield.parse(JSON.stringify(shield.pack(target)));
 api.restore(backup,before);
 for(const [k,v]of Object.entries(target))assert.equal(storage.getItem(k),v);
 assert.equal(storage.getItem('monarch-local-only'),'keep');assert.equal(storage.getItem('other-app-token'),'NEVER EXPORT');
 assert.equal(JSON.parse(storage.getItem(MAIN)).xp,425);assert.equal(JSON.parse(storage.getItem(PLAN)).skills['Disciplină'].manual,3);
 assert.equal(api.journal().before[MAIN],before[MAIN]);assert.equal(api.journal().status,'complete');
});

test('historical main and Awakening exports import only their own key with no automatic migration',()=>{
 for(const key of [MAIN,AW]) {
  const input=fixture(),storage=memory(fixture(800)),api=shield.create(storage),before=original(storage);
  const raw=input[key];const backup=shield.parse(raw);api.restore(backup);
  assert.equal(storage.getItem(key),raw);
  for(const k of Object.keys(before))if(k!==key)assert.equal(storage.getItem(k),before[k]);
 }
 const minimal={xp:0,tasks:[],history:[],bosses:[]};
 assert.equal(shield.parse(JSON.stringify(minimal)).data[MAIN],JSON.stringify(minimal));
});

test('invalid, incomplete, foreign and unsupported files do not write anything',()=>{
 const data=fixture();delete data['other-app-token'];const good=shield.pack(data);
 const bad=[null,[],{}, {xp:5,tasks:null}, {...good,formatVersion:99},{...good,exportedAt:'bad'},{...good,keys:[]},{...good,data:{}},{...good,data:{...data,[MAIN]:'null'}},{...good,data:{...data,[AW]:'{"paths":null}'}},{...good,data:{...data,[PLAN]:'{"goals":[]}'}},{...good,data:{...data,[EQ]:'{"slots":5}'}},{...good,data:{...data,'another-app':'private'}},{...good,data:{...data,[shield.JOURNAL]:'{}'}}];
 const storage=memory(fixture()),api=shield.create(storage),before=original(storage);
 for(const value of bad){assert.throws(()=>api.restore(shield.parse(JSON.stringify(value))));assert.deepEqual(original(storage),before);}
 assert.throws(()=>shield.parse('{'));assert.deepEqual(original(storage),before);
});

test('storage-full checkpoint failure changes no profile keys',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=original(storage);
 storage.fail=k=>k===shield.JOURNAL;
 assert.throws(()=>api.restore(shield.parse(fixture(999)[MAIN])));
 assert.deepEqual(original(storage),before);
});

test('one write failure rolls the entire touched profile back; no extra XP',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=api.snapshot();let failed=false;
 const target=fixture(999);delete target['other-app-token'];
 storage.fail=k=>{if(k===AW&&!failed){failed=true;return true;}return false;};
 assert.throws(()=>api.restore(shield.pack(target)),/recuperate integral/);
 assert.deepEqual(api.snapshot(),before);assert.equal(api.journal().status,'rolled-back');
});

test('persistent failure and interrupted restore survive a new session and can be recovered',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=api.snapshot();
 const target=fixture(999);delete target['other-app-token'];storage.fail=k=>k===AW;
 assert.throws(()=>api.restore(shield.pack(target)),/incompletă/);
 assert.equal(api.journal().status,'pending');
 storage.fail=null;const next=shield.create(storage);next.rollback();
 assert.deepEqual(next.snapshot(),before);assert.equal(next.journal().status,'rolled-back');
 // Simulate page close immediately after the first profile write.
 storage.setItem(shield.JOURNAL,JSON.stringify({version:1,status:'pending',before,touched:[MAIN,AW]}));
 storage.setItem(MAIN,fixture(999)[MAIN]);
 const resumed=shield.create(storage);assert.equal(resumed.journal().status,'pending');resumed.rollback();
 assert.deepEqual(resumed.snapshot(),before);
});

test('rollback removes only keys introduced by its operation, preserves unrelated keys',()=>{
 const storage=memory(fixture()),api=shield.create(storage);
 api.restore(shield.pack({'monarch-new-test':'new'}));storage.setItem('monarch-unrelated','keep');api.rollback();
 assert.equal(storage.getItem('monarch-new-test'),null);assert.equal(storage.getItem('monarch-unrelated'),'keep');assert.equal(storage.getItem('other-app-token'),'NEVER EXPORT');
});

test('changed data after preview rejects restore before writing the checkpoint',()=>{
 const storage=memory(fixture()),api=shield.create(storage),expected=api.snapshot();storage.setItem('monarch-other','new');const before=original(storage);
 assert.throws(()=>api.restore(shield.parse(fixture(99)[MAIN]),expected),/schimbat/);assert.deepEqual(original(storage),before);
});

test('retaking questionnaire preserves every progress field and provides a recoverable full checkpoint',()=>{
 const input=fixture(),storage=memory(input),api=shield.create(storage),current=JSON.parse(input[AW]);
 const next=api.retake(current,api.snapshot());
 assert.equal(next.step,0);assert.equal(next.finished,false);assert.equal(next.progressShieldRetake,true);
 for(const key of ['questDone','skillXP','questRewards','paths','avatarStyle','activeQuest'])assert.deepEqual(next[key],current[key]);
 assert.deepEqual(next.answers,{});assert.deepEqual(next.assessment,{});
 for(const key of [MAIN,PLAN,EQ])assert.equal(storage.getItem(key),input[key]);
 api.rollback();assert.equal(storage.getItem(AW),input[AW]);
});

test('corrupt saves are reported and exported unchanged, not reset',()=>{
 const input=fixture();input[MAIN]='broken JSON';input[PLAN]='null';const storage=memory(input),api=shield.create(storage),before=original(storage);
 assert.equal(api.inspect().issues.length,2);assert.equal(api.export().data[MAIN],'broken JSON');assert.deepEqual(original(storage),before);
});

test('a pending or malformed recovery record cannot be overwritten by a new import',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=api.snapshot();
 for(const raw of ['broken',JSON.stringify({version:1,status:'pending',before,touched:[MAIN]})]){
  storage.setItem(shield.JOURNAL,raw);const state=original(storage);
  assert.throws(()=>api.restore(shield.parse(fixture(999)[MAIN])));assert.deepEqual(original(storage),state);
 }
});

test('questionnaire cannot restart without a durable checkpoint',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=original(storage);
 storage.fail=k=>k===shield.JOURNAL;
 assert.throws(()=>api.retake(JSON.parse(before[AW]),api.snapshot()));
 assert.deepEqual(original(storage),before);
});

test('read-back verification detects a silently ignored profile write',()=>{
 const storage=memory(fixture()),api=shield.create(storage),before=api.snapshot();
 const nativeSet=storage.setItem.bind(storage);let ignored=false;
 storage.setItem=(key,value)=>{if(key===MAIN&&!ignored){ignored=true;return;}nativeSet(key,value);};
 assert.throws(()=>api.restore(shield.parse(fixture(999)[MAIN])),/recuperate integral/);
 assert.deepEqual(api.snapshot(),before);assert.equal(api.journal().status,'rolled-back');
});

test('missing Shield fails closed before legacy modules can read or overwrite a save',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const app={textContent:''};
 for(const name of ['app.js','awakening.js','hunter24.js','life25.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),{
   window:{},document:{getElementById:()=>app},
   localStorage:{getItem(){throw Error('legacy storage read must not run');},setItem(){throw Error('legacy write must not run');}}
  });
 }
 assert.match(app.textContent,/Protecția progresului nu s-a încărcat/);
});
