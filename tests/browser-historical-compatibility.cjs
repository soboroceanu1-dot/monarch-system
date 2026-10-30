/* Fictional profiles only. Differential V9.0/current boot + Android API fallbacks. */
'use strict';
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const path=require('node:path');const {execFileSync}=require('node:child_process');
const {cases,combined,MAIN}=require('./fixtures/historical-saves.cjs');
const {JOURNAL,pack}=require('../progress-shield.js');
const root=path.join(__dirname,'..'),BASE='28a901ea8d951e02692b1ae2fe144b3a71150168';
const old=new Map(['index.html','app.js','awakening.js','hunter24.js','life25.js','style.css'].map(name=>[name,execFileSync('git',['show',BASE+':'+name],{cwd:root})]));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 async function open(seed,baseline=false,mode='normal'){
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,acceptDownloads:true,locale:'ro-RO',userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());if(u.hostname==='telegram.org')return r.fulfill({body:'window.Telegram={WebApp:{ready(){},expand(){}}};',contentType:'text/javascript'});
   const name=u.pathname==='/'?'index.html':u.pathname.slice(1);
   try{return r.fulfill({body:baseline?old.get(name):await fs.readFile(path.join(root,name)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});}catch{return r.fulfill({status:404,body:''});}
  });
  await page.addInitScript(({seed,mode})=>{
   for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v);
   window.sharedBackup=null;
   if(mode==='no-download'){
    URL.createObjectURL=()=>{throw new Error('unsupported blob download');};
    Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('clipboard denied');}},configurable:true});
   }
   if(mode==='share'){
    Object.defineProperty(navigator,'canShare',{value:({files})=>files?.length===1,configurable:true});
    Object.defineProperty(navigator,'share',{value:async({files})=>{window.sharedBackup={name:files[0].name,text:await files[0].text()};},configurable:true});
   }
  },{seed,mode});
  await page.goto('https://monarch.test/');return {page,context,errors};
 }
 const snapshot=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 const exported=async(p,button)=>{
  const pending=p.waitForEvent('download');await p.locator(button).click();const d=await pending;
  return JSON.parse(await fs.readFile(await d.path(),'utf8'));
 };
 try{
  for(const item of cases){
   const seed={...combined(),[item.key]:JSON.stringify(item.data,null,2)};
   for(const baseline of [true,false]){
    const {page,context,errors}=await open(seed,baseline);
    assert.ok((await page.locator('#app').innerHTML()).length>0,item.name+' app renders');
    if(!baseline)assert.equal(await page.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),true,item.name+' Shield permits legacy loader');
    // Exercise V9.0 readers, including fallback equipment. Some fixtures correctly show onboarding.
    for(const tab of ['plan','evolution','hunterpage'])await page.evaluate(t=>document.querySelector('nav [data-tab="'+t+'"]').click(),tab);
    await page.evaluate(()=>document.getElementById('hunter24-open').click());
    assert.deepEqual(await snapshot(page),seed,item.name+' startup/navigation must not migrate saves');
    assert.deepEqual(errors,[],item.name+' has no errors in '+(baseline?'V9.0':'Shield'));
    if(!baseline){
     const backup=await exported(page,'#shield-quick-export');
     assert.deepEqual(backup.data,Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-'))));
     assert.equal(backup.data['unrelated-app'],undefined);assert.equal(await page.evaluate(k=>localStorage.getItem(k),JOURNAL),null);
     await page.locator('#shield-show-json').click();
     assert.deepEqual(JSON.parse(await page.locator('#shield-export-json').inputValue()),backup);
     assert.equal(await page.locator('#shield-dialog').evaluate(el=>el.scrollWidth<=innerWidth),true);
     assert.deepEqual(await snapshot(page),seed,'export before any restore must be read-only');
    }
    await context.close();
   }
   console.log('PASS V9.0/current Android viewport + pre-restore export: '+item.name);
  }
  const seed=combined();
  const fallback=await open(seed,false,'no-download');
  await fallback.page.locator('#shield-quick-export').click();
  assert.equal(await fallback.page.locator('#shield-share-file').isDisabled(),true);
  await fallback.page.locator('#shield-show-json').click();
  const copied=JSON.parse(await fallback.page.locator('#shield-export-json').inputValue());
  assert.deepEqual(copied.data,Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-'))));
  assert.match(await fallback.page.locator('#shield-export-status').innerText(),/manual/);assert.deepEqual(await snapshot(fallback.page),seed);
  await fallback.context.close();console.log('PASS Android WebView simulation: failed blob download + unavailable sharing/clipboard still exposes complete JSON without writes.');
  const sharing=await open(seed,false,'share');
  await sharing.page.locator('#shield-quick-export').click();await sharing.page.locator('#shield-share-file').click();
  await sharing.page.waitForFunction(()=>sharedBackup!==null);
  const shared=await sharing.page.evaluate(()=>sharedBackup);assert.match(shared.name,/\.json$/);assert.deepEqual(JSON.parse(shared.text).data,copied.data);assert.deepEqual(await snapshot(sharing.page),seed);
  await sharing.context.close();console.log('PASS Android file-share API simulation: exact complete backup file, no restore or storage writes.');
  const corruptSeed={...seed,[MAIN]:'corrupt raw text'},blocked=await open(corruptSeed);
  assert.equal(await blocked.page.evaluate(()=>MONARCH_PROGRESS_SHIELD.ready),false);
  const rescued=await exported(blocked.page,'#shield-block-export');assert.equal(rescued.data[MAIN],'corrupt raw text');assert.deepEqual(await snapshot(blocked.page),corruptSeed);
  await blocked.context.close();console.log('PASS blocked-startup pre-restore export preserves even corrupt raw originals.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
