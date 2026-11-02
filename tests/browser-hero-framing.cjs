/* Before/after rendering and real XP boundary checks. Fictional profiles only. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process'),os=require('node:os');
const {assertHeadFraming}=require('./helpers/character-framing.cjs');
const root=path.join(__dirname,'..'),BASE='c65f2d174b8e71c3aaa1d4919096787008a53451';
const output=path.join(root,'docs/screenshots/v93-framing');
const targets=[{width:360,height:800},{width:390,height:844},{width:430,height:932},...[360,390,430].map(width=>({width,height:740}))];
const ranks=[['E',425],['D',1000],['C',2000],['B',3000],['A',4000],['S',5000]];
const selectors=['.monarch-brand','.monarch-hero','.monarch-panel','.company-banner','.dashboard-mission','.dashboard-progress','.dashboard-character-attributes','.dashboard-character','.portrait-stage','.dashboard-attributes','nav','.hero-progress','.dashboard-character button'];
const snapshot=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
const settle=async p=>{await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>Promise.all([...document.querySelectorAll('img[src]')].map(el=>el.decode())));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
function fixture(xp){return {
 'monarch-life-v1':JSON.stringify({version:4,player:'ALEX · PROFIL FICTIV',xp,tasks:[{id:'focus',name:'Continuă proiectul personal',detail:'Un pas concret, în ritmul meu.',xp:20,category:'discipline'}],history:[],bosses:[{id:'project',name:'Construiesc primul meu portofoliu',progress:2,target:8,reward:150,claimed:false}],unknown:{preserve:'original'}}),
 'monarch-awakening-v2':JSON.stringify({finished:true,paths:['Disciplină','Finanțe','Sport'],answers:{},questDone:{}}),
 'monarch-planner-v25':JSON.stringify({goals:{today:'Un pas înainte',week:'Finalizez structura portofoliului'},done:{}}),
 'monarch-hunter-equipment-v24':JSON.stringify({slots:{weapon:'blade'},unknown:'unchanged'})
};}
async function geometry(p){return p.evaluate(selectors=>Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return [s,{x:b.x,y:b.y,width:b.width,height:b.height,font:getComputedStyle(e).fontSize,text:e.innerText}]})),selectors);}
async function unaffectedStyles(p){return p.evaluate(()=>{const props=['position','display','width','height','top','left','right','bottom','margin','padding','font','color','background','border','boxShadow','borderRadius','gridTemplateRows','gridTemplateColumns','gap','alignItems','justifyContent','transform','overflow'];return [...document.querySelectorAll('.monarch-brand,.monarch-brand *,.monarch-panel,.monarch-panel *,.company-banner,.company-banner *,.dashboard-mission,.dashboard-mission *,.dashboard-progress,.dashboard-progress *,.dashboard-attributes,.dashboard-attributes *,nav,nav *,.dashboard-character button,.hero-progress,.hero-progress *')].map(e=>{const c=getComputedStyle(e);return props.map(p=>c[p]);});});}
async function pixelDifference(before,after){
 if(before.equals(after))return {changed:0,max_delta:0,ratio:0};
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'monarch-pixels-'));
 try{
  await fs.writeFile(path.join(dir,'before.png'),before);await fs.writeFile(path.join(dir,'after.png'),after);
  const code='from PIL import Image,ImageChops;import json,sys;from pathlib import Path;d=ImageChops.difference(Image.open(Path(sys.argv[1])/"before.png").convert("RGB"),Image.open(Path(sys.argv[1])/"after.png").convert("RGB"));data=d.tobytes();changed=sum(any(data[i:i+3]) for i in range(0,len(data),3));print(json.dumps({"changed":changed,"max_delta":max(data),"ratio":changed/(d.width*d.height)}))';
  return JSON.parse(execFileSync('python3',['-c',code,dir]).toString());
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function imageScale(p){return p.locator('.aether-character,.aether-portrait').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();const logical=el.getAttribute('src').endsWith('aether-placeholder.svg')?[600,700]:[el.naturalWidth,el.naturalHeight];return Math.min(b.width/logical[0],b.height/logical[1])}));}
async function observed(p){return p.locator('.monarch-hero').evaluate(e=>({rank:e.dataset.rank,seal:e.querySelector('.rank-seal').firstChild.textContent.trim(),level:Number(e.querySelector('.hero-progress strong').textContent.match(/\d+/)[0]),xp:Number(e.querySelector('.hero-progress .row span').textContent.match(/\d+/)[0]),progress:Number(e.querySelector('[role=progressbar]').getAttribute('aria-valuenow'))}));}
(async()=>{
 const oldCSS=execFileSync('git',['show',BASE+':style.css'],{cwd:root}).toString(),currentCSS=await fs.readFile(path.join(root,'style.css'),'utf8');
 for(const name of ['app.js','progress-core.js','progress-shield.js','lesson-ids.js','awakening.js','hunter24.js','life25.js'])assert.deepEqual(await fs.readFile(path.join(root,name)),execFileSync('git',['show',BASE+':'+name],{cwd:root}),name+': runtime/progress code unchanged');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const measurements=[],boundaries=[];
 await fs.mkdir(output,{recursive:true});
 async function open(viewport,xp){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await context.newPage(),errors=[],seed=fixture(xp);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname==='telegram.org')return r.fulfill({contentType:'text/javascript',body:'window.Telegram={WebApp:{ready(){},expand(){},onEvent(){}}};'});if(u.pathname==='/style.css')return r.fulfill({contentType:'text/css',body:oldCSS});const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};try{return r.fulfill({contentType:types[path.extname(u.pathname)]||'text/html',body:await fs.readFile(path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1)))});}catch{return r.fulfill({status:404,body:''});}});
  await p.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v)},seed);await p.goto('https://monarch.test/');await settle(p);return {context,p,seed,errors};
 }
 async function replaceCSS(p){await p.locator('link[rel=stylesheet]').evaluate((link,css)=>{const style=document.createElement('style');style.textContent=css;link.replaceWith(style)},currentCSS);await settle(p);}
 async function compareCapture(rank,viewport,zone,before,after){
  const card=await browser.newPage({viewport:{width:Math.ceil((zone==='hero'?viewport.width-20:(viewport.width-26)/2)*2+36),height:300},deviceScaleFactor:1});
  await card.setContent('<html><style>*{box-sizing:border-box}body{margin:0;padding:10px;background:#080d18;color:#edf0ff;font:13px system-ui}h1{font-size:15px;margin:0 0 8px}.row{display:flex;gap:12px}p{margin:0 0 5px;color:#c1c9dd}img{display:block;max-width:100%}</style><h1>'+zone+' · '+rank+' · '+viewport.width+'×'+viewport.height+'</h1><div class="row"><div><p>Înainte · c65f2d1</p><img src="data:image/png;base64,'+before.toString('base64')+'"></div><div><p>După · portret mărit</p><img src="data:image/png;base64,'+after.toString('base64')+'"></div></div></html>');
  await card.locator('img').evaluateAll(els=>Promise.all(els.map(e=>e.decode())));const height=await card.locator('.row').evaluate(el=>Math.ceil(el.getBoundingClientRect().bottom+10));await card.setViewportSize({width:card.viewportSize().width,height});await card.screenshot({path:path.join(output,zone+'-'+rank+'-'+viewport.width+'x'+viewport.height+'.jpg'),type:'jpeg',quality:93});await card.close();
 }
 try{
  for(const viewport of targets)for(const [rank,xp]of ranks){
   const {context,p,seed,errors}=await open(viewport,xp),label=rank+' '+viewport.width+'×'+viewport.height;
   const before=await geometry(p),stylesBefore=await unaffectedStyles(p),scaleBefore=await imageScale(p),mask=[p.locator('.monarch-hero'),p.locator('.dashboard-character')];
   const unchangedBefore=await p.screenshot({mask,maskColor:'#ff00ff'});
   const sample=['E','S'].includes(rank)&&viewport.width===390;
   const heroBefore=sample?await p.locator('.monarch-hero').screenshot():null,portraitBefore=sample?await p.locator('.dashboard-character').screenshot():null;
   await replaceCSS(p);
   const after=await geometry(p);assert.deepEqual(after,before,label+': all outer geometry, text and font sizes unchanged');
   assert.deepEqual(await unaffectedStyles(p),stylesBefore,label+': computed styles of every other component unchanged');
   const pixels=await pixelDifference(unchangedBefore,await p.screenshot({mask,maskColor:'#ff00ff'}));
   // Replacing a stylesheet can repaint a few antialiased border pixels. Exact geometry
   // and computed styles above are mandatory; this additional visual check allows only
   // <=0.05% low-intensity repaint differences outside the two edited cards.
   assert.ok(pixels.ratio<=.0005&&pixels.max_delta<=16,label+': only bounded border repaint noise '+JSON.stringify(pixels));
   const heads=await assertHeadFraming(p,label),scaleAfter=await imageScale(p),magnification=scaleAfter.map((s,i)=>s/scaleBefore[i]);
   assert.ok(Math.abs(magnification[0]-2.6)<.02&&Math.abs(magnification[1]-3)<.02,label+': subject scales 2.6x / 3x');
   const ui=await observed(p);assert.deepEqual(ui,{rank,seal:rank,level:Math.floor(xp/100)+1,xp,progress:xp%100},label+': real rank/level/XP');
   assert.deepEqual(await snapshot(p),seed,label+': framing does not write user profile');
   assert.equal(await p.locator('.dashboard-character button').isEnabled(),true);const button=await p.locator('.dashboard-character button').boundingBox();assert.ok(button.height>=44&&button.width>=44,label+': Personalizează accessible');
   if(sample){await compareCapture(rank,viewport,'hero',heroBefore,await p.locator('.monarch-hero').screenshot());await compareCapture(rank,viewport,'personaj',portraitBefore,await p.locator('.dashboard-character').screenshot());}
   await p.locator('.dashboard-character button').click();assert.equal(await p.locator('#hunter24-open').count(),1,label+': Personalizează opens existing Hunter');
   assert.equal(await p.locator('.aether-character').evaluate(el=>getComputedStyle(el).transform),'none',label+': Hunter framing unchanged');
   await p.locator('nav [data-tab=home]').click();await settle(p);assert.deepEqual(await snapshot(p),seed,label+': navigation preserves profile');
   assert.deepEqual(errors,[],label+': no JS errors');measurements.push({viewport,fixture:{rank,xp},observed:ui,before,after,pixels,magnification,heads});await context.close();
  }
  const cases=[[0,1,'E'],[99,1,'E'],[100,2,'E'],[425,5,'E'],[999,10,'E'],[1000,11,'D'],[1999,20,'D'],[2000,21,'C'],[2999,30,'C'],[3000,31,'B'],[3999,40,'B'],[4000,41,'A'],[4999,50,'A'],[5000,51,'S'],[5999,60,'S'],[10000,101,'S']];
  for(const [xp,level,rank]of cases){const {context,p,seed,errors}=await open({width:390,height:844},xp);await replaceCSS(p);const actual=await observed(p);assert.deepEqual(actual,{xp,level,rank,seal:rank,progress:xp%100});assert.deepEqual(await snapshot(p),seed);assert.deepEqual(errors,[]);boundaries.push(actual);await context.close();}
  await fs.writeFile(path.join(output,'framing-measurements.json'),JSON.stringify({baseline_commit:BASE,measurements,boundaries},null,2)+'\n');
  console.log('PASS '+measurements.length+' before/after cases: unchanged outer geometry/computed styles and bounded border repaint noise outside Hero/Personaj; 2.6x Hero and 3x Personaj; protected head/crown; unchanged profile.');
  console.log('PASS '+boundaries.length+' hard-coded XP/level/rank boundary cases, including E=425/5 and S=5000/51.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
