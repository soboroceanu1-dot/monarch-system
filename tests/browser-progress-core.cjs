/* Fictional profiles only. Chromium integration; no real Android host certification. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const Shield=require('../progress-shield.js'),Core=require('../progress-core.js');
const root=path.join(__dirname,'..');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25',EQ='monarch-hunter-equipment-v24';
function profile(){
 const result={
  [MAIN]:JSON.stringify({version:4,player:'FICTIV V9.2',xp:425,tasks:[],history:[],bosses:[],academy:{ai2:{done:true}},adaptive:{},logs:[],finance:[],inventory:['original'],unknown:{keep:'main'}},null,2),
  [AW]:JSON.stringify({step:24,finished:true,dashboard:false,answers:{1:'Obiectiv fictiv'},assessment:{'Disciplină':1},paths:['Disciplină','Finanțe','Mișcare și sport'],questDone:{'lesson:path-0-0':true,'lesson:unknown-historical':true},questRewards:{'lesson:path-0-0':20},skillXP:{'Disciplină':20},avatarStyle:'gold',unknown:'awakening'},null,2),
  [PLAN]:JSON.stringify({goals:{year:'Obiectiv fictiv'},done:{'Disciplină:0':'2026-10-01'},notes:{'Finanțe:5:1':'Notă istorică'},skills:{'Disciplină':{level:0,completed:1,streak:0,manual:null}},reports:{},active:null,unknown:'planner'},null,2),
  [EQ]:JSON.stringify({slots:{weapon:'blade'},unknown:'equipment'}),
  'monarch-future-setting':'opaque original text',unrelated:'private fixture'
 };
 result[Shield.JOURNAL]=JSON.stringify({version:1,status:'complete',createdAt:'2026-10-01T00:00:00.000Z',before:{[MAIN]:result[MAIN]},touched:[MAIN]});
 return result;
}
const parsed=(seed,key)=>JSON.parse(seed[key]);
const profileData=seed=>Object.fromEntries(Object.entries(seed).filter(([k])=>Shield.profileKey(k)));
const all=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k!=='fixture-v92-initialized').map(k=>[k,localStorage.getItem(k)])));
const read=(p,key)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
function withAwActive(seed,id='path-0-1'){
 return {...seed,[AW]:JSON.stringify({...parsed(seed,AW),dashboard:true,activeQuest:id,activeStep:1})};
}
function withPlannerActive(seed,id='Disciplină:1'){
 return {...seed,[PLAN]:JSON.stringify({...parsed(seed,PLAN),active:{p:'Disciplină',id,step:0,smartStage:4,errors:0,helps:0,checks:2,challengePassed:false,review:false}})};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let passed=0;
 async function open(seed=profile(),width=360){
  const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage(),errors=[],outbound=[];
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='telegram.org')return route.fulfill({contentType:'text/javascript',body:'window.Telegram={WebApp:{platform:"android",initData:"fixture",ready(){},expand(){},sendData(){throw Error("no messages")}}};'});
   if(u.hostname!=='monarch.test'){outbound.push(u.href);return route.abort();}
   const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));
   try{return route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.addInitScript(seed=>{
   if(!localStorage.getItem('fixture-v92-initialized')){for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v);localStorage.setItem('fixture-v92-initialized','yes');}
  },seed);
  await page.goto('https://monarch.test/');
  assert.equal(await page.evaluate(()=>MONARCH_PROGRESS_CORE.ready),true);
  assert.equal(await page.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),true);
  return {page,context,errors,outbound,seed};
 }
 async function finish(test,expectedFailures=0){
  assert.equal(test.errors.length,expectedFailures,'unexpected browser errors: '+test.errors.join('; '));
  if(expectedFailures)assert.ok(test.errors.every(e=>/Salvare oprită.*fixture storage failure|Salvare oprită.*s-au schimbat/.test(e)),test.errors.join('; '));
  assert.deepEqual(test.outbound,[]);
  await test.context.close();passed++;
 }
 async function failWrites(page,key,persistent=false){
  await page.evaluate(({key,persistent})=>{
   const original=Storage.prototype.setItem;
   let remaining=persistent?Infinity:1;
   Storage.prototype.setItem=function(k,v){if(k===key&&remaining-->0)throw Error('fixture storage failure');return original.call(this,k,v);};
  },{key,persistent});
 }
 async function completeAw(page){
  // The inherited stylesheet hides the campaign overlay; invoke its real handler.
  await Promise.all([page.waitForEvent('load'),page.evaluate(()=>{const button=document.getElementById('active-next');button.click();button.click();})]);
 }
 async function resumePlanner(page){await page.locator('nav [data-tab="plan"]').click();await page.locator('#life25-open').click();await page.locator('#life25-resume').click();}
 try{
  const baseline=await open();
  assert.deepEqual(await all(baseline.page),baseline.seed,'boot must preserve every raw value');
  assert.match(await baseline.page.locator('.card.hero').innerText(),/425/);
  assert.match(await baseline.page.locator('.hunter24-home').innerText(),/LVL 5/);
  await baseline.page.locator('#hunter24-open').click();
  assert.equal(await baseline.page.locator('[data-hunter24-item="blade"]').isEnabled(),true);
  assert.equal(await baseline.page.locator('[data-hunter24-item="cloak"]').isDisabled(),true);
  await baseline.page.locator('#hunter24-close').click();
  await baseline.page.locator('nav [data-tab="evolution"]').click();await baseline.page.locator('#shield-export').click();
  const backup=Shield.parse(await baseline.page.locator('#shield-export-json').inputValue());
  assert.deepEqual(backup.data,profileData(baseline.seed));assert.equal(backup.data[Core.JOURNAL],undefined);
  await baseline.page.locator('#shield-close').click();
  assert.deepEqual(await all(baseline.page),baseline.seed,'export is read-only');
  await finish(baseline);

  const activeSeed=profile(),active=parsed(activeSeed,PLAN);
  active.active={p:'Finanțe',id:'Finanțe:5',step:1,smartStage:3,category:'Carte',amount:150,errors:0,helps:0,checks:1,challengePassed:false,review:false};
  activeSeed[PLAN]=JSON.stringify(active);
  const historic=await open(activeSeed,412);await resumePlanner(historic.page);
  assert.match(await historic.page.locator('#life25-modal h2').innerText(),/Compară două opțiuni/);
  assert.equal((await read(historic.page,PLAN)).active.id,'Finanțe:5');
  assert.equal((await read(historic.page,PLAN)).active.smartStage,3);
  assert.deepEqual(await all(historic.page),activeSeed,'resuming a historical lesson must not rewrite data');
  await finish(historic);

  const awSeed=withAwActive(profile()),aw=await open(awSeed);
  await completeAw(aw.page);
  const awAfter=await read(aw.page,AW),mainAfter=await read(aw.page,MAIN);
  assert.equal(mainAfter.xp,455);assert.equal(mainAfter.history.length,1);
  assert.equal(awAfter.skillXP['Disciplină'],50);
  assert.equal(awAfter.questDone['lesson:awakening.discipline.priority'],true);
  assert.equal(awAfter.questDone['lesson:path-0-0'],true);
  assert.equal(awAfter.unknown,'awakening');assert.deepEqual(mainAfter.inventory,['original']);
  assert.equal((await all(aw.page))[Shield.JOURNAL],awSeed[Shield.JOURNAL]);
  assert.equal((await all(aw.page))[Core.JOURNAL],undefined);
  await finish(aw);

  const plannerSeed=withPlannerActive(profile()),planner=await open(plannerSeed);
  await resumePlanner(planner.page);
  await Promise.all([planner.page.waitForEvent('load'),planner.page.locator('#life25-exp-finish').click()]);
  const planAfter=await read(planner.page,PLAN);
  assert.equal((await read(planner.page,MAIN)).xp,445);
  assert.ok(planAfter.done['planner.discipline.anti-procrastination']);assert.ok(planAfter.done['Disciplină:0']);
  assert.equal(planAfter.skills['Disciplină'].completed,2);assert.equal(planAfter.unknown,'planner');
  assert.equal((await all(planner.page))[Shield.JOURNAL],plannerSeed[Shield.JOURNAL]);
  await finish(planner);

  // A retained legacy receipt is authoritative, even when an old version lost XP.
  const duplicateSeed=withPlannerActive(profile(),'Disciplină:0'),duplicate=await open(duplicateSeed);
  await resumePlanner(duplicate.page);await duplicate.page.locator('#life25-exp-finish').click();
  assert.equal((await read(duplicate.page,MAIN)).xp,425);
  assert.deepEqual((await read(duplicate.page,PLAN)).done,parsed(duplicateSeed,PLAN).done);
  assert.deepEqual((await read(duplicate.page,PLAN)).skills,parsed(duplicateSeed,PLAN).skills);
  await finish(duplicate);

  for(const [key,kind]of [[AW,'aw'],[MAIN,'aw'],[PLAN,'planner']]){
   const seed=kind==='aw'?withAwActive(profile()):withPlannerActive(profile());
   const failed=await open(seed),p=failed.page;
   if(kind==='planner')await resumePlanner(p);
   await failWrites(p,key);
   if(kind==='aw')await p.evaluate(()=>document.getElementById('active-next').click());
   else await p.locator('#life25-exp-finish').click();
   assert.equal(await p.evaluate(()=>MONARCH_PROGRESS_CORE.ready),false);
   assert.match(await p.locator('#shield-dialog').innerText(),/Salvare oprită/);
   assert.deepEqual(await all(p),seed,'failed '+key+' write must restore every raw value');
   await finish(failed,1);
  }

  const pendingSeed=withAwActive(profile()),pending=await open(pendingSeed),p=pending.page;
  await failWrites(p,MAIN,true);await p.evaluate(()=>document.getElementById('active-next').click());
  assert.equal(await p.evaluate(()=>MONARCH_PROGRESS_CORE.ready),false);
  assert.equal(JSON.parse((await all(p))[Core.JOURNAL]).status,'pending');
  assert.equal((await all(p))[Shield.JOURNAL],pendingSeed[Shield.JOURNAL]);
  await p.locator('#shield-block-export').click();
  assert.deepEqual(Shield.parse(await p.locator('#shield-export-json').inputValue()).data,profileData(await all(p)));
  await p.reload();
  assert.equal(await p.evaluate(()=>MONARCH_PROGRESS_CORE.ready),true);
  assert.deepEqual(await all(p),pendingSeed,'startup recovery must restore exact raw preimages and remove only Core journal');
  await finish(pending,1);

  const stale=await open(),s=stale.page;
  await s.evaluate(()=>{const foreign=MONARCH_PROGRESS_CORE.scope('fixture foreign');const g=foreign.read('monarch-life-v1');g.xp+=7;foreign.write('monarch-life-v1',g);});
  const foreignValue=(await all(s))[MAIN];
  await s.locator('nav [data-tab="adventure"]').click();await s.locator('[data-adventure="academy"]').click();
  await s.locator('[data-action="openlesson"][data-id="ai1"]').click();await s.locator('[data-action="answer"][data-choice="1"]').click();
  assert.equal(await s.evaluate(()=>MONARCH_PROGRESS_CORE.ready),false);
  assert.equal((await all(s))[MAIN],foreignValue,'stale app model must not overwrite another writer');
  assert.equal((await read(s,MAIN)).academy.ai1,undefined);
  await finish(stale,1);

  console.log('PASS '+passed+' Progress Core Chromium integration scenarios: byte-identical startup/export, historical in-flight lesson resume, atomic educational rewards, duplicate protection, transient/persistent storage failure, startup recovery preserving Shield undo, and stale-model rejection. Fictional profiles only; real Telegram Android untested.');
 }finally{await browser.close();}
})().catch(error=>{console.error(String(error.message).split('Call log:')[0],String(error.stack).match(/at .*\.cjs:\d+:\d+/g)?.slice(-2));process.exitCode=1;});
