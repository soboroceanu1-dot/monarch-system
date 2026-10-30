'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Shield=require('../progress-shield.js');
const {combined}=require('./fixtures/historical-saves.cjs');
const data=()=>Object.fromEntries(Object.entries(combined()).filter(([k])=>Shield.profileKey(k)));
test('save picker presence cannot enable the known unreliable Telegram Android/WebView path',()=>{
  const browser={isSecureContext:true,navigator:{userAgent:'Chrome'},showSaveFilePicker(){}};
  browser.self=browser;browser.top=browser;
  assert.equal(Shield.directSaveSupport(browser).available,true);
  const host=overrides=>Object.assign(Object.create(browser),{self:browser,top:browser},overrides);
  for(const unsafe of [
    host({Telegram:{WebApp:{platform:'android'}}}),
    host({navigator:{userAgent:'Android; wv) Chrome/140.0.0.0'}}),
    host({navigator:{userAgent:'Android Version/4.0 Chrome/140'}}),
    host({navigator:{userAgent:'Android Chrome/140'},Telegram:{WebApp:{initData:'fixture'}}}),
    host({isSecureContext:false}),host({top:{}}),host({showSaveFilePicker:undefined})
  ])assert.equal(Shield.directSaveSupport(unsafe).available,false);
  assert.equal(Shield.directSaveSupport(host({navigator:{userAgent:'Android Chrome/140'}})).available,true,'ordinary Chrome Android remains feature-detected');
  const frame=host({});Object.defineProperty(frame,'top',{get(){throw Error('restricted');}});
  assert.equal(Shield.directSaveSupport(frame).available,false);
});
test('validated serialization retains every raw value, unicode, whitespace and unknown keys',()=>{
  const original={...data(),'monarch-future':'\u0000\nșț 😀 "quote" <script> &'};
  const backup=Shield.pack(original),result=Shield.serialize(backup);
  assert.equal(result.warning,'');assert.deepEqual(Shield.parse(result.text).data,original);
  assert.deepEqual(Shield.parse('\uFEFF'+result.text).data,original);
});
test('serialization refuses invalid envelopes and preserves damaged roots for rescue',()=>{
  assert.throws(()=>Shield.serialize({...Shield.pack(data()),keys:[]}));
  assert.throws(()=>Shield.serialize(Shield.pack({'other-app':'private'})));
  const original={...data(),'monarch-life-v1':'damaged raw value'};
  const result=Shield.serialize(Shield.pack(original));
  assert.match(result.warning,/recuperare/);assert.deepEqual(JSON.parse(result.text).data,original);
  assert.throws(()=>Shield.parse(result.text));
});
test('truncated or note-formatted copies fail without guessing repairs',()=>{
  const {text}=Shield.serialize(Shield.pack(data()));
  for(const invalid of [text.slice(0,-5),'Samsung Notes\n'+text,text.replaceAll('"','“')])assert.throws(()=>Shield.parse(invalid),/JSON valid/);
});
test('serialized fictitious profile restores byte for byte and rollback retains target data',()=>{
  const memory=input=>{const map=new Map(Object.entries(input));return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
  const original=data(),store=memory({'monarch-new-setting':'keep','unrelated':'private'}),api=Shield.create(store);
  api.restore(Shield.parse(Shield.serialize(Shield.pack(original)).text));
  for(const [k,v]of Object.entries(original))assert.equal(store.getItem(k),v);
  assert.equal(store.getItem('monarch-new-setting'),'keep');assert.equal(store.getItem('unrelated'),'private');
  api.rollback();assert.equal(store.getItem('monarch-life-v1'),null);assert.equal(store.getItem('monarch-new-setting'),'keep');
});
