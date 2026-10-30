/* Chromium mobile layouts + mocked host APIs. This is NOT a real Telegram Android test. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {pack,JOURNAL}=require('../progress-shield.js');
const root=path.join(__dirname,'..'),MAIN='monarch-life-v1',AW='monarch-awakening-v2';
const seed={
 [MAIN]:JSON.stringify({xp:425,tasks:[],history:[],player:'Profil fictiv șț 😀',academy:{a:{done:true}},adaptive:{a:{stage:2}}},null,2),
 [AW]:JSON.stringify({step:24,finished:true,dashboard:false,paths:['Disciplină','Finanțe','Mișcare și sport'],answers:{1:'Fictiv'},assessment:{},questDone:{a:true},skillXP:{'Disciplină':80}}),
 'monarch-hunter-equipment-v24':'{"slots":{"weapon":"blade"}}',
 'monarch-future-setting':'opaque\ntext',unrelated:'private'
};
const snapshot=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let scenarios=0;
 try {
  for(const mode of ['missing','denied','canShare-throws','share','share-cancel','share-fails','picker','picker-cancel','no-blob']){
   const context=await browser.newContext({viewport:{width:mode==='missing'?320:mode==='share'?412:360,height:740},isMobile:true,hasTouch:true});
   const p=await context.newPage(),errors=[],outbound=[];p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',async r=>{
    const u=new URL(r.request().url());
    if(u.hostname==='telegram.org')return r.fulfill({contentType:'text/javascript',body:'window.Telegram={WebApp:{platform:"'+(mode.startsWith('picker')?'unknown':'android')+'",version:"6.0",initData:"'+(mode.startsWith('picker')?'':'test')+'",ready(){},expand(){},downloadFile(){throw Error("must not use remote download")},shareMessage(){throw Error("must not send private backup")}}};'});
    if(u.hostname!=='monarch.test'){outbound.push(u.href);return r.abort();}
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));
    try{return r.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{return r.fulfill({status:404,body:''});}
   });
   await p.addInitScript(({seed,mode})=>{
    if(!localStorage.getItem('fixture')){for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v);localStorage.setItem('fixture','yes');}
    window.savedText=null;window.sharedText=null;
    Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='share'?{writeText:async text=>{window.copiedText=text;}}:{writeText:async()=>{throw Error('denied');}}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:mode==='missing'?undefined:()=>{if(mode==='canShare-throws')throw Error('unsupported');return mode.startsWith('share');}});
    Object.defineProperty(navigator,'share',{configurable:true,value:mode==='missing'?undefined:async({files})=>{
     if(mode==='share-cancel')throw new DOMException('cancel','AbortError');
     if(mode==='share-fails')throw Error('denied');window.sharedText=await files[0].text();
    }});
    if(mode==='picker'||mode==='picker-cancel')window.showSaveFilePicker=async()=>{
     if(mode==='picker-cancel')throw new DOMException('cancel','AbortError');
     return {createWritable:async()=>({write:async text=>{window.savedText=text;},close:async()=>{}}),getFile:async()=>new File([window.savedText],'backup.json')};
    };
    URL.createObjectURL=()=>{throw Error('download unavailable');};
    if(mode==='no-blob'){window.Blob=undefined;window.File=undefined;}
   },{seed,mode});
   await p.goto('https://monarch.test/');const before=await snapshot(p);
   assert.equal(await p.locator('#shield-quick-export').count(),0);
   for(const tab of ['home','adventure','plan','hunterpage']){
    await p.locator('nav [data-tab="'+tab+'"]').click();assert.equal(await p.locator('#shield-export').count(),0);
   }
   await p.locator('nav [data-tab="evolution"]').click();await p.locator('#shield-export').click();
   assert.match(await p.locator('#shield-export-status').innerText(),mode.startsWith('picker')?/nu este disponibilă/:/În Telegram/);
   assert.equal(await p.locator('#shield-share-file').isVisible(),mode.startsWith('share'));
   await p.locator('#shield-download-again').click();assert.match(await p.locator('#shield-export-status').innerText(),/nu este disponibilă/);
   if(mode.startsWith('share')){
    await p.locator('#shield-share-file').click();
    await p.waitForFunction(()=>/predat|anulată|nu a reușit/.test(document.getElementById('shield-export-status').textContent));
    if(mode==='share')assert.deepEqual(JSON.parse(await p.evaluate(()=>sharedText)).data,Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-'))));
   }
   if(mode.startsWith('picker')){
    await p.locator('#shield-save-file').click();
    await p.waitForFunction(()=>/Copia verificată|anulată/.test(document.getElementById('shield-save-status').textContent));
    if(mode==='picker')assert.deepEqual(JSON.parse(await p.evaluate(()=>savedText)).data,Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-'))));
   }
   await p.locator('#shield-show-json').click();const text=await p.locator('#shield-export-json').inputValue();
   assert.deepEqual(JSON.parse(text).data,Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-'))));
   if(mode==='share')assert.equal(await p.evaluate(()=>copiedText),text);
   await p.locator('#shield-copy-check').fill(text.slice(0,-4));await p.locator('#shield-verify-copy').click();assert.match(await p.locator('#shield-export-status').innerText(),/incompletă/);
   await p.locator('#shield-copy-check').fill(text);await p.locator('#shield-verify-copy').click();assert.match(await p.locator('#shield-export-status').innerText(),/Copia verificată/);
   await p.locator('#shield-verify-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
   await p.waitForFunction(()=>document.getElementById('shield-verify-file').value==='');
   assert.match(await p.locator('#shield-export-status').innerText(),/Copia verificată/);
   assert.equal(await p.locator('#shield-dialog').evaluate(el=>el.scrollWidth<=innerWidth),true);
   assert.equal(await p.locator('#shield-export-json').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
   assert.deepEqual(await snapshot(p),before);assert.deepEqual(outbound,[]);
   await p.locator('#shield-close').click();await p.locator('#shield-import-text').click();
   await p.locator('#shield-import-json').fill('Notes\n'+text);await p.locator('#shield-preview-text').click();assert.match(await p.locator('#shield-status').innerText(),/JSON valid/);assert.deepEqual(await snapshot(p),before);
   // Preview the copied snapshot and cancel: no journal or profile changes.
   await p.locator('#shield-import-json').fill(text);await p.locator('#shield-preview-text').click();assert.equal(await p.locator('#shield-restore').isDisabled(),true);assert.deepEqual(await snapshot(p),before);
   await p.locator('#shield-close').click();
   if(mode==='missing'){
    const replacement={...JSON.parse(text).data,[MAIN]:JSON.stringify({xp:99,tasks:[],player:'Alt profil fictiv'})};
    await p.locator('#shield-import-text').click();await p.locator('#shield-import-json').fill(JSON.stringify(pack(replacement)));await p.locator('#shield-preview-text').click();
    await p.locator('#shield-confirm').check();p.once('dialog',d=>d.accept());await Promise.all([p.waitForEvent('load'),p.locator('#shield-restore').click()]);
    for(const[k,v]of Object.entries(replacement))assert.equal((await snapshot(p))[k],v);
    assert.equal((await snapshot(p)).unrelated,'private');assert.ok((await snapshot(p))[JOURNAL]);
    await p.locator('nav [data-tab="evolution"]').click();await p.locator('#shield-recovery').click();p.once('dialog',d=>d.accept());await Promise.all([p.waitForEvent('load'),p.locator('#shield-rollback').click()]);
    const recovered=await snapshot(p);delete recovered[JOURNAL];assert.deepEqual(recovered,before);
   }
   assert.deepEqual(errors,[]);await context.close();scenarios++;
  }
  console.log('PASS '+scenarios+' simulated host scenarios: mobile 320/360/412px, local JSON verification, unavailable APIs, share/cancel/failure, picker/readback, text import/restore/rollback, no outbound backup requests. Real Telegram Android remains unverified.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
