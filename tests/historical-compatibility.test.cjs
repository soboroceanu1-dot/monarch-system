'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const Shield=require('../progress-shield.js');
const {MAIN,AW,cases,combined,stringify,mainMinimal}=require('./fixtures/historical-saves.cjs');
function memory(input){const map=new Map(Object.entries(input));return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
for(const item of cases)test('V9.0 compatible shape: '+item.name,()=>{
 const raw=stringify(item.data),store=memory({[item.key]:raw}),api=Shield.create(store);
 assert.deepEqual(api.inspect().issues,[],'must not block historical loader defaults');
 assert.deepEqual([...store.map],[[item.key,raw]],'inspection must not migrate or write');
 const backup=api.parse(JSON.stringify(api.export()));
 const restored=memory({}),target=Shield.create(restored);target.restore(backup);
 assert.equal(restored.getItem(item.key),raw,'restore must retain absent fields and original strings');
});
test('an unused malformed historical archive is preserved without blocking live modules',()=>{
 const store=memory(combined()),api=Shield.create(store),before=Object.fromEntries(store.map);
 assert.deepEqual(api.inspect().issues,[]);
 assert.ok(api.inspect().warnings.some(x=>x.includes('monarch-awakening-previous-backup')));
 const backup=Shield.parse(JSON.stringify(api.export()));assert.equal(backup.data['monarch-awakening-previous-backup'],before['monarch-awakening-previous-backup']);
 assert.deepEqual(Object.fromEntries(store.map),before);
});
test('legacy main file with loader-defaulted fields imports without materializing defaults',()=>{
 const raw=stringify(mainMinimal),backup=Shield.parse(raw);assert.equal(backup.kind,'legacy-main');assert.equal(backup.data[MAIN],raw);
});
test('legacy Awakening export with missing default fields stays byte-identical',()=>{
 const raw='{"paths":[],"answers":{},"finished":false}';const backup=Shield.parse(raw);assert.equal(backup.kind,'legacy-awakening');assert.equal(backup.data[AW],raw);
});
test('unsafe active roots and wrong collection types still fail validation',()=>{
 for(const [key,data]of [[MAIN,{xp:20,tasks:null}],[MAIN,{xp:20,tasks:[],history:{}}],[AW,{answers:null}],['monarch-planner-v25',{goals:[]}],['monarch-hunter-equipment-v24',{slots:23}]]){
  assert.throws(()=>Shield.parse(JSON.stringify(Shield.pack({[key]:stringify(data)}))));
 }
});
test('defaulted historical fields warn without blocking or materializing values',()=>{
 const raw=stringify(mainMinimal),store=memory({[MAIN]:raw}),api=Shield.create(store),report=api.inspect();
 assert.deepEqual(report.issues,[]);assert.ok(report.warnings.some(x=>x.includes('history')&&x.includes('bosses')));
 assert.equal(store.getItem(MAIN),raw);assert.equal(store.getItem(Shield.JOURNAL),null);
});
