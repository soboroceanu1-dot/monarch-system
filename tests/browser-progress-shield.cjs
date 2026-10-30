/* Optional integration suite: node tests/browser-progress-shield.cjs (Playwright + Chromium). */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pack, JOURNAL } = require('../progress-shield.js');
const root = path.join(__dirname,'..');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25',EQ='monarch-hunter-equipment-v24';
const profile={
 [MAIN]:JSON.stringify({version:4,player:'TEST FICTIV',xp:425,tasks:[],history:[],bosses:[],academy:{},adaptive:{},logs:[],finance:[]}),
 [AW]:JSON.stringify({step:24,finished:true,dashboard:false,answers:{1:'Test'},assessment:{},paths:['Disciplină','Finanțe','Mișcare și sport'],questDone:{'lesson:path-0-0':true},skillXP:{'Disciplină':20},avatarStyle:'gold'}),
 [PLAN]:JSON.stringify({goals:{year:'Test'},done:{'Disciplină:0':'2026-10-01'},skills:{'Disciplină':{level:1,completed:1,streak:1,manual:3}},reports:{},notes:{},active:null}),
 [EQ]:JSON.stringify({slots:{weapon:'blade'}}),
 'monarch-future-test':'unchanged',
 'unrelated-test':'private'
};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 async function open(seed=profile,width=360){
  const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='telegram.org')return route.fulfill({contentType:'text/javascript',body:'window.telegramCalls=[];window.Telegram={WebApp:{ready(){telegramCalls.push("ready")},expand(){telegramCalls.push("expand")}}};'});
   const file=path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1));
   try{return route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.addInitScript(data=>{if(!localStorage.getItem('fixture-initialized')){for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);localStorage.setItem('fixture-initialized','true');}},seed);
  await page.goto('https://monarch.test/');
  return {page,context};
 }
 const saved=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('monarch-')&&k!=='monarch-progress-shield-v1').map(k=>[k,localStorage.getItem(k)])));
 const evolution=page=>page.locator('nav [data-tab="evolution"]').click();
 const upload=(page,data,id='shield-importfile')=>page.locator('#'+id).setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
 try{
  const {page,context}=await open();
  assert.deepEqual(await page.evaluate(()=>telegramCalls),['ready','expand']);
  const initial=await saved(page);
  await evolution(page);await page.locator('#shield-check').click();assert.match(await page.locator('#shield-dialog').innerText(),/sunt valide/);assert.deepEqual(await saved(page),initial);await page.locator('#shield-close').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#shield-export').click();const download=await downloadPromise;
  const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.deepEqual(exported.data,initial);assert.equal(exported.data['unrelated-test'],undefined);
  await page.locator('#shield-close').click();
  await upload(page,'{"xp":5}');assert.match(await page.locator('#shield-title').innerText(),/Import oprit/);assert.deepEqual(await saved(page),initial);await page.locator('#shield-close').click();
  const target={...initial,[MAIN]:JSON.stringify({...JSON.parse(initial[MAIN]),xp:725,player:'ALT PROFIL FICTIV'})};
  await upload(page,pack(target));await page.locator('#shield-title').filter({hasText:'Verifică backupul'}).waitFor();
  assert.equal(await page.locator('#shield-restore').isDisabled(),true);assert.deepEqual(await saved(page),initial);
  assert.equal(await page.locator('#shield-dialog').evaluate(el=>el.scrollWidth<=innerWidth),true);
  // Export from the actual import preview, before any restoration/checkpoint write.
  const previewDownload=page.waitForEvent('download');await page.locator('#shield-preview-export').click();
  const previewBackup=JSON.parse(await fs.readFile(await (await previewDownload).path(),'utf8'));
  assert.deepEqual(previewBackup.data,initial);assert.equal(await page.evaluate(k=>localStorage.getItem(k),JOURNAL),null);
  assert.equal(await page.locator('#shield-restore').isDisabled(),true);
  await page.locator('#shield-close').click();assert.deepEqual(await saved(page),initial);
  await upload(page,pack(target));await page.locator('#shield-confirm').check();page.once('dialog',d=>d.accept());
  await Promise.all([page.waitForEvent('load'),page.locator('#shield-restore').click()]);
  assert.deepEqual(await saved(page),target);assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-test')),'private');
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).before['monarch-life-v1'],JOURNAL),initial[MAIN]);
  await evolution(page);await page.locator('#shield-recovery').click();page.once('dialog',d=>d.accept());
  await Promise.all([page.waitForEvent('load'),page.locator('#shield-rollback').click()]);assert.deepEqual(await saved(page),initial);
  // The historical import button also uses confirmation and a checkpoint.
  await evolution(page);await upload(page,target[MAIN],'importfile');await page.locator('#shield-title').filter({hasText:'Verifică backupul'}).waitFor();
  assert.match(await page.locator('#shield-dialog').innerText(),/istoric parțial/);await page.locator('#shield-close').click();assert.deepEqual(await saved(page),initial);
  // Invoke the existing campaign retake control (the legacy CSS hides its dashboard).
  await page.locator('nav [data-tab="adventure"]').click();await page.locator('[data-adventure="academy"]').click();await page.locator('#aw-open').click();
  const beforeCancelRetake=await saved(page);
  await page.evaluate(()=>document.getElementById('aw-restart').click());
  assert.deepEqual(await saved(page),beforeCancelRetake);
  await page.locator('#shield-close').click();assert.deepEqual(await saved(page),beforeCancelRetake);
  const beforeRetake=await saved(page);await page.evaluate(()=>document.getElementById('aw-restart').click());page.once('dialog',d=>d.accept());await page.locator('#shield-retake-confirm').click();
  const afterRetake=await saved(page);const oldAw=JSON.parse(beforeRetake[AW]),newAw=JSON.parse(afterRetake[AW]);
  for(const k of ['questDone','skillXP','paths','avatarStyle'])assert.deepEqual(newAw[k],oldAw[k]);
  for(const k of [MAIN,PLAN,EQ])assert.equal(afterRetake[k],beforeRetake[k]);
  for(let i=0;i<20;i++){
   const step=await page.evaluate(()=>JSON.parse(localStorage.getItem('monarch-awakening-v2')).step);
   const free=page.locator('#aw-free');
   if(await free.count()){await free.fill('Răspuns fictiv');await page.locator('#aw-next').click();}
   else {await page.locator('#awakening-root [data-choice]').first().click();if([0,8,13,14,15].includes(step))await page.locator('#aw-next').click();}
  }
  assert.equal(await page.locator('[data-path]:not(:disabled)').count(),0);
  await page.locator('#aw-next').click();
  for(let i=0;i<3;i++){await page.locator('[data-test]').first().click();await page.locator('#aw-next').click();}
  await page.locator('#aw-finish').click();
  const finished=await saved(page);assert.equal(finished[MAIN],beforeRetake[MAIN]);
  const finishedAw=JSON.parse(finished[AW]);assert.equal(finishedAw.finished,true);assert.equal(finishedAw.progressShieldRetake,undefined);assert.deepEqual(finishedAw.questDone,oldAw.questDone);assert.deepEqual(finishedAw.skillXP,oldAw.skillXP);
  // V9.0 regression: a new Life Evolution slot still awards exactly 20 XP once.
  await page.locator('nav [data-tab="adventure"]').click();await page.locator('[data-life25-start="Disciplină"]').click();
  await page.locator('#life25-exp-next').click();await page.locator('[data-exp-choice="1"]').click();
  await page.locator('#life25-exp-note').fill('Încep lectura cu prima pagină');await page.locator('#life25-exp-apply').click();
  await page.locator('[data-exp-check="0"]').click();await page.locator('[data-v8-challenge="0"]').click();
  page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.locator('#life25-exp-finish').click()]);
  const rewarded=await saved(page);assert.equal(JSON.parse(rewarded[MAIN]).xp,445);assert.equal(rewarded[EQ],profile[EQ]);
  assert.equal(JSON.parse(rewarded[PLAN]).skills['Disciplină'].manual,3);assert.ok(JSON.parse(rewarded[PLAN]).done['Disciplină:0']);assert.ok(JSON.parse(rewarded[PLAN]).done['Disciplină:1']);
  await page.locator('nav [data-tab="adventure"]').click();await page.locator('[data-adventure="academy"]').click();
  await page.locator('[data-action="openlesson"][data-id="ai1"]').click();await page.locator('[data-action="answer"][data-choice="1"]').click();
  assert.equal(JSON.parse((await saved(page))[MAIN]).xp,480);
  await page.locator('nav [data-tab="hunterpage"]').click();await page.locator('#hunter24-open').click();
  assert.equal(await page.locator('[data-hunter24-item="blade"]').isEnabled(),true);assert.equal(await page.locator('[data-hunter24-item="cloak"]').isDisabled(),true);
  assert.equal((await saved(page))[EQ],profile[EQ]);
  await context.close();
  console.log('PASS V9.0 regression: +20 Life Evolution, +35 Academy, difficulty, historical completion and inventory rules unchanged.');
  console.log('PASS mobile 360px: verification, export/download, invalid file, preview/cancel/confirmation, full restore, recovery, legacy preview, complete questionnaire retake, Telegram initialization.');

  const pendingBefore=Object.fromEntries(Object.entries(profile).filter(([k])=>k.startsWith('monarch-')));
  const pending={...profile,[MAIN]:JSON.stringify({...JSON.parse(profile[MAIN]),xp:999}),[JOURNAL]:JSON.stringify({version:1,status:'pending',before:pendingBefore,touched:[MAIN,AW]})};
  const interrupted=await open(pending,412);const p=interrupted.page;
  assert.equal(await p.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),false);assert.equal(await p.locator('#app').innerHTML(),'');
  assert.match(await p.locator('#shield-title').innerText(),/Recuperarea/);
  const pendingDownload=p.waitForEvent('download');await p.locator('#shield-save-current').click();
  const pendingBackup=JSON.parse(await fs.readFile(await (await pendingDownload).path(),'utf8'));
  assert.equal(pendingBackup.data[MAIN],pending[MAIN]);assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).status,JOURNAL),'pending');
  p.once('dialog',d=>d.accept());
  await Promise.all([p.waitForEvent('load'),p.locator('#shield-rollback').click()]);assert.deepEqual(await saved(p),pendingBefore);
  await interrupted.context.close();console.log('PASS mobile 412px: interrupted startup blocks legacy writers, explicit recovery restores original profile.');

  const corrupt=await open({...profile,[MAIN]:'broken JSON'});const c=corrupt.page;
  assert.equal(await c.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),false);assert.equal(await c.locator('#app').innerHTML(),'');assert.equal((await saved(c))[MAIN],'broken JSON');
  await upload(c,pack(pendingBefore),'shield-block-file');await c.locator('#shield-confirm').check();c.once('dialog',d=>d.accept());
  await Promise.all([c.waitForEvent('load'),c.locator('#shield-restore').click()]);assert.equal(await c.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),true);assert.deepEqual(await saved(c),pendingBefore);
  await corrupt.context.close();assert.deepEqual(errors,[]);console.log('PASS corrupt profile: no automatic reset, explicit backup restoration; no browser page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
