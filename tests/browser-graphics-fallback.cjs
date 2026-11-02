/* Fictional profiles only. Manifest/helper/asset failures must not write progress. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.join(__dirname,'..');
const seed={
 'monarch-life-v1':JSON.stringify({version:4,player:'FICTIV GRAPHICS',xp:425,history:[],tasks:[],bosses:[],inventory:['unchanged'],customTasks:[]}),
 'monarch-awakening-v2':JSON.stringify({finished:true,paths:['Disciplină','Finanțe','Sport'],answers:{},questDone:{}}),
 'monarch-planner-v25':JSON.stringify({goals:{},done:{}}),
 'monarch-hunter-equipment-v24':JSON.stringify({slots:{weapon:'blade'}})
};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const scenario of ['manifest-404','malformed-manifest','helper-404','all-final-images-404','all-images-404']){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',async r=>{
    const u=new URL(r.request().url()),name=u.pathname;
    if(u.hostname==='telegram.org')return r.fulfill({contentType:'text/javascript',body:'window.Telegram={WebApp:{ready(){},expand(){},onEvent(){}}};'});
    if((scenario==='manifest-404'&&name.endsWith('/manifest.js'))||(scenario==='helper-404'&&name.endsWith('/final-assets.js'))||((scenario==='all-final-images-404'||scenario==='all-images-404')&&/\.(png|webp)$/.test(name)&&name.includes('/v9.3/'))||(scenario==='all-images-404'&&/\.(svg|webp)$/.test(name)))return r.fulfill({status:404,body:''});
    if(scenario==='malformed-manifest'&&name.endsWith('/manifest.js'))return r.fulfill({contentType:'text/javascript',body:'window.MonarchFinalManifest={integration_enabled:true,assets:{}};'});
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
    try{return r.fulfill({contentType:types[path.extname(name)]||'text/html',body:await fs.readFile(path.join(root,name==='/'?'index.html':name.slice(1)))});}catch{return r.fulfill({status:404,body:''});}
   });
   await p.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v)},seed);
   for(let visit=0;visit<2;visit++){
    await p.goto('https://monarch.test/');
    await p.waitForFunction(()=>Array.from(document.querySelectorAll('img[data-art-id]')).every(el=>!el.getAttribute('src')||el.complete));
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),seed,scenario+': reload preserves all bytes');
    assert.equal(await p.locator('.monarch-actions>button').count(),4);
    assert.equal(await p.locator('nav button').count(),5);
    assert.equal(await p.locator('.dashboard-attributes .stat').count(),6);
    assert.deepEqual(await p.locator('img[data-art-id]').evaluateAll(els=>els.filter(e=>!e.hidden&&(!e.complete||!e.naturalWidth)).map(e=>e.dataset.artId)),[],scenario+': no visible broken images');
    assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('dashboard-overflow')),false,scenario+': no false overflow notice');
   }
   assert.deepEqual(errors,[],scenario+': no JS errors');
   await context.close();console.log('PASS '+scenario+' / two loads, byte-identical profile, layout and text preserved');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
