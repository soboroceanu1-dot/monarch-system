/* V9.1.2: Chromium with mocked host APIs, NOT a physical Telegram Android test. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.join(__dirname,'..');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2';
const seed={
 [MAIN]:JSON.stringify({xp:425,tasks:[],history:[],player:'Profil fictiv șț 😀',academy:{a:{done:true}},adaptive:{a:{stage:2}}},null,2),
 [AW]:JSON.stringify({step:24,finished:true,dashboard:false,paths:['Disciplină','Finanțe','Mișcare și sport'],answers:{1:'Fictiv'},assessment:{},questDone:{a:true},skillXP:{'Disciplină':80}}),
 'monarch-hunter-equipment-v24':'{"slots":{"weapon":"blade"}}',
 'monarch-future-setting':('șț 😀 "quoted" <tag>\n').repeat(7000),
 unrelated:'private fixture'
};
const profile=Object.fromEntries(Object.entries(seed).filter(([k])=>k.startsWith('monarch-')));
const snapshot=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let passed=0;
 async function open(mode,desktop=false,width=360){
  const context=await browser.newContext({viewport:{width,height:800},isMobile:!desktop,hasTouch:!desktop});
  const page=await context.newPage(),errors=[],outbound=[],writes=[];
  page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(r.request().method()!=='GET')writes.push({url:u.href,method:r.request().method()});
   if(u.hostname==='telegram.org')return r.fulfill({contentType:'text/javascript',body:'window.Telegram={WebApp:{platform:'+JSON.stringify(desktop?'unknown':'android')+',initData:'+JSON.stringify(desktop?'':'fixture')+',ready(){},expand(){},sendData(){throw Error("no backup messages")},shareMessage(){throw Error("no backup messages")},downloadFile(){throw Error("no hosted backups")}}};'});
   if(u.hostname!=='monarch.test'){outbound.push(u.href);return r.abort();}
   const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));
   try{return r.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{return r.fulfill({status:404,body:''});}
  });
  await page.addInitScript(({seed,mode})=>{
   for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v);
   window.fixturePickerCalls=0;window.fixtureFileWrites=0;window.fixtureCopied=null;window.fixtureLegacyCalls=0;
   Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});
   Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});
   const execCommand=document.execCommand.bind(document);
   document.execCommand=(command,...args)=>{
    if(command!=='copy')return execCommand(command,...args);
    window.fixtureLegacyCalls++;return mode==='legacy';
   };
   if(mode==='clipboard')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.fixtureCopied=text;}}});
   if(mode==='denied')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});
   if(mode==='clipboard-pending')Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(()=>{})}});
   if(mode==='missing'){window.Blob=undefined;window.File=undefined;URL.createObjectURL=undefined;}
   if(mode.startsWith('picker'))window.showSaveFilePicker=()=>{
    window.fixturePickerCalls++;
    if(mode==='picker-cancel')return Promise.reject(new DOMException('cancelled','AbortError'));
    if(mode==='picker-security')return Promise.reject(new DOMException('denied','SecurityError'));
    if(mode==='picker-error')return Promise.reject(Error('host error'));
    const handle={createWritable:async()=>({write:async text=>{window.fixtureFileWrites++;window.fixtureSaved=text;},close:async()=>{}}),getFile:async()=>new File([mode==='picker-corrupt'?'corrupt readback':window.fixtureSaved],'backup.json')};
    if(mode==='picker-pending')return new Promise(resolve=>{window.fixtureResolvePicker=()=>resolve(handle);});
    return Promise.resolve(handle);
   };
  },{seed,mode});
  await page.goto('https://monarch.test/');
  await page.locator('nav [data-tab="evolution"]').click();
  const before=await snapshot(page);
  await page.locator('#shield-export').click();
  const text=await page.locator('#shield-export-json').inputValue();
  assert.ok(text.length>100000,'complete large fictitious profile is exposed');
  assert.equal(await page.locator('#shield-export-json').isVisible(),true,'JSON available without a transport API');
  assert.deepEqual(JSON.parse(text).data,profile);
  return {page,context,before,text,errors,outbound,writes};
 }
 async function finish(test){
  assert.deepEqual(await snapshot(test.page),test.before,'export/verification never writes progress or journal');
  assert.deepEqual(test.errors,[]);assert.deepEqual(test.outbound,[]);assert.deepEqual(test.writes,[]);
  await test.context.close();passed++;
 }
 try {
  // Telegram Android must hide the exposed-but-unusable native save API.
  const android=await open('picker-pending');
  assert.equal(await android.page.locator('#shield-save-file').isVisible(),false);
  assert.match(await android.page.locator('#shield-save-support').innerText(),/Telegram|WebView/);
  assert.equal(await android.page.evaluate(()=>fixturePickerCalls),0);
  await finish(android);

  for(const mode of ['missing','denied','clipboard-pending','legacy','clipboard']){
   console.log('Testing V9.1.2 copy scenario: '+mode);
   const test=await open(mode,false,mode==='missing'?320:mode==='clipboard'?412:360),p=test.page;
   assert.equal(await p.locator('#shield-save-file').isVisible(),false);
   await p.locator('#shield-select-json').click();
   assert.deepEqual(await p.locator('#shield-export-json').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,test.text.length]);
   await p.locator('#shield-show-json').click();
   if(mode==='clipboard-pending')await p.clock.fastForward(3000);
   if(mode==='clipboard'){
    await p.waitForFunction(()=>fixtureCopied!==null);assert.equal(await p.evaluate(()=>fixtureCopied),test.text);
   }else{
    await p.waitForFunction(()=>fixtureLegacyCalls>0);
    await p.locator('#shield-select-json').click();
    assert.deepEqual(await p.locator('#shield-export-json').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,test.text.length]);
   }
   for(const corrupt of [test.text.slice(0,-8),test.text.replace('Profil fictiv','Alt profil'),JSON.stringify({...JSON.parse(test.text),data:{[MAIN]:profile[MAIN]}})]){
    try { await p.locator('#shield-copy-check').fill(corrupt); }
    catch(error){ console.log('Fill diagnostics',test.errors,await p.locator('#shield-copy-check').evaluate(el=>({disabled:el.disabled,readonly:el.readOnly,hidden:el.hidden,visible:getComputedStyle(el).visibility,height:el.clientHeight,length:el.value.length,rect:el.getBoundingClientRect().toJSON()})));throw error; }
    await p.locator('#shield-verify-copy').click();
    assert.match(await p.locator('#shield-export-status').innerText(),/incompletă|modificată/);
   }
   await p.locator('#shield-copy-check').fill(test.text);await p.locator('#shield-verify-copy').click();
   assert.match(await p.locator('#shield-export-status').innerText(),/Copia verificată/);
   await p.locator('#shield-copy-check').fill(test.text.slice(0,-1));
   assert.doesNotMatch(await p.locator('#shield-export-status').innerText(),/Copia verificată/,'editing invalidates previous verification');
   assert.equal(await p.locator('#shield-dialog').evaluate(el=>el.scrollWidth<=innerWidth),true);
   assert.equal(await p.locator('#shield-export-json').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
   if(mode==='missing'){
    await p.locator('#shield-close').click();await p.locator('#shield-import-text').click();
    await p.locator('#shield-import-json').fill(test.text);await p.locator('#shield-preview-text').click();
    assert.equal(await p.locator('#shield-restore').isDisabled(),true,'text import still needs explicit confirmation');
    assert.equal(await p.locator('#shield-confirm').isChecked(),false);
    await p.locator('#shield-close').click();
   }
   await finish(test);
  }

  for(const mode of ['picker','picker-cancel','picker-security','picker-error','picker-corrupt']){
   const test=await open(mode,true),p=test.page;
   assert.equal(await p.locator('#shield-save-file').isVisible(),true,'supported ordinary browser may offer direct save');
   await p.locator('#shield-save-file').click();
   await p.waitForFunction(()=>!document.getElementById('shield-save-file').disabled);
   const status=await p.locator('#shield-save-status').innerText();
   if(mode==='picker'){
    assert.equal(await p.evaluate(()=>fixtureSaved),test.text);assert.match(status,/verificat|verificată/);
   }else if(mode==='picker-cancel')assert.match(status,/anulat/);
   else if(mode==='picker-security')assert.match(status,/permi|acces|refuz|restric/);
   else if(mode==='picker-corrupt')assert.match(status,/conținutul diferă/);
   else assert.match(status,/nu a putut fi deschis/);
   if(mode!=='picker')assert.doesNotMatch(status,/salvat și verificat|salvată și verificată/i);
   await finish(test);
  }

  const stale=await open('clipboard-pending'),s=stale.page;
  await s.locator('#shield-show-json').click();
  await s.locator('#shield-copy-check').fill(stale.text);
  await s.locator('#shield-verify-copy').click();
  assert.match(await s.locator('#shield-export-status').innerText(),/Copia verificată/);
  const focused=await s.evaluate(()=>document.activeElement.id);
  await s.clock.fastForward(3000);
  assert.match(await s.locator('#shield-export-status').innerText(),/Copia verificată/,'late clipboard timeout cannot replace verification');
  assert.equal(await s.evaluate(()=>document.activeElement.id),focused,'late timeout cannot steal focus');
  assert.equal(await s.evaluate(()=>fixtureLegacyCalls),0,'stale clipboard fallback must not run');
  await finish(stale);

  const waiting=await open('picker-pending',true),p=waiting.page;
  await p.locator('#shield-save-file').click();
  assert.equal(await p.locator('#shield-save-file').isDisabled(),true);
  assert.match(await p.locator('#shield-save-status').innerText(),/deschide|așteaptă|așteptare/i,'immediate visible feedback');
  await p.clock.fastForward(16000);
  assert.match(await p.locator('#shield-save-status').innerText(),/răspuns|reacție|aștept/);
  assert.equal(await p.locator('#shield-save-file').isDisabled(),true,'watchdog does not launch overlapping pickers');
  await p.locator('#shield-cancel-save').click();await p.evaluate(()=>fixtureResolvePicker());
  await p.evaluate(()=>Promise.resolve());
  assert.equal(await p.evaluate(()=>fixtureFileWrites),0,'late host result after abandon never writes a file');
  assert.equal(await p.evaluate(()=>fixturePickerCalls),1);
  await finish(waiting);

  console.log('PASS '+passed+' V9.1.2 Chromium simulations: complete large JSON + manual copy, clipboard denial/no response, copy integrity and stale verification, protected text import, Telegram Android save gating, direct-save success/cancel/errors/readback, pending host timeout/abandon and no storage/network writes. Real Samsung/Telegram Android must be tested by the user.');
 } finally {await browser.close();}
})().catch(error=>{console.error(String(error.message).split('Call log:')[0],String(error.stack).match(/at .*\.cjs:\d+:\d+/g)?.slice(-2));process.exitCode=1;});
