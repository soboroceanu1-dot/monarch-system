/* Fictional profiles only. Chromium mobile/API simulation is not a real Telegram Android test. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.join(__dirname,'..');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25';
const targets=[{width:360,height:800},{width:390,height:844},{width:430,height:932}];
const ranks=[['E',425],['D',1000],['C',2000],['B',3000],['A',4000],['S',5000]];
const zones=['.monarch-brand','.monarch-hero','.monarch-panel','.company-banner','.dashboard-mission','.dashboard-progress','.dashboard-character-attributes','nav'];
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const snapshot=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));

function profile(rank,xp){
 const history=Array.from({length:rank==='E'?3:rank==='B'?6:0},(_,i)=>({name:'Pas fictiv '+i,date:'2026-10-31',xp:20,category:'discipline'}));
 const main={player:'ALEX · PROFIL FICTIV',xp,tasks:[{id:'focus',name:'Continuă proiectul personal',detail:'Un pas concret, în ritmul meu.',xp:20,category:'discipline'}],history,bosses:[{id:'project',name:'Construiesc primul meu portofoliu',progress:2,target:8,reward:150,claimed:false}]};
 const goals={today:'Un pas înainte, în fiecare zi',week:'Finalizez structura portofoliului'};
 if(rank==='D'){main.tasks=[];main.bosses=[];delete goals.today;delete goals.week;}
 return {[MAIN]:JSON.stringify(main),[AW]:JSON.stringify({finished:true,paths:['Disciplină','Finanțe','Sport'],answers:{},questDone:{'lesson:path-0-0':true}}),[PLAN]:JSON.stringify({goals,done:{}})};
}

async function assertExactLayout(p,viewport,label){
 await settle(p);
 assert.equal(await p.locator('nav').count(),1,label+': one navigation menu');
 assert.equal(await p.locator('nav button').count(),5,label+': five bottom buttons');
 assert.deepEqual(await p.locator('nav button').allTextContents(),['⌂Acasă','⚔Aventuri','▦Plan','♙Hunter','◇Evoluție']);
 const dimensions=await p.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight,limited:document.documentElement.classList.contains('dashboard-overflow')}));
 assert.ok(dimensions.width<=viewport.width+1,label+': no horizontal scrolling '+JSON.stringify(dimensions));
 assert.ok(dimensions.height<=dimensions.innerHeight+1,label+': no vertical scrolling '+JSON.stringify(dimensions));
 assert.equal(dimensions.limited,false,label+': target must not use unsupported-size fallback');
 const bounds=[];
 for(const selector of zones){const box=await p.locator(selector).boundingBox();assert.ok(box&&box.width>0&&box.height>0,label+': visible '+selector);assert.ok(box.x>=-1&&box.x+box.width<=viewport.width+1,label+': horizontal bounds '+selector);assert.ok(box.y>=-1&&box.y+box.height<=viewport.height+1,label+': vertical bounds '+selector+' '+JSON.stringify(box));bounds.push(box);}
 for(let i=1;i<bounds.length;i++)assert.ok(bounds[i-1].y+bounds[i-1].height<=bounds[i].y+1,label+': disjoint ordered zones '+zones[i-1]+' / '+zones[i]);
 const actions=p.locator('.monarch-actions>button');assert.equal(await actions.count(),4,label+': exactly four MONARCH cards');
 const actionBounds=await Promise.all(Array.from({length:4},(_,i)=>actions.nth(i).boundingBox()));
 for(let i=0;i<4;i++){const b=actionBounds[i];assert.ok(Math.abs(b.y-actionBounds[0].y)<=1,label+': MONARCH cards share one row');assert.ok(Math.abs(b.width-actionBounds[0].width)<=1,label+': equal MONARCH widths');assert.ok(Math.abs(b.height-actionBounds[0].height)<=1,label+': equal MONARCH heights');if(i)assert.ok(actionBounds[i-1].x+actionBounds[i-1].width<=b.x+1,label+': nonoverlapping MONARCH cards');}
 const weekly=await p.locator('.dashboard-weekly').boundingBox(),right=await p.locator('.dashboard-progress-right').boundingBox(),project=await p.locator('.dashboard-project').boundingBox(),quote=await p.locator('.dashboard-progress-right .monarch-quote').boundingBox();
 assert.ok(weekly.x+weekly.width<=right.x+1,label+': weekly goals left, project/quote right');assert.ok(Math.abs(weekly.y-right.y)<=1&&Math.abs(weekly.height-right.height)<=1,label+': progress columns have equal height');
 assert.ok(project.y+project.height<=quote.y+1,label+': quote is below project');assert.ok(Math.abs(project.x-quote.x)<=1&&Math.abs(project.width-quote.width)<=1,label+': quote is in right column');
 const character=await p.locator('.dashboard-character').boundingBox(),attributes=await p.locator('.dashboard-attributes').boundingBox();assert.ok(character.x+character.width<=attributes.x+1,label+': character and attributes are side by side');assert.ok(Math.abs(character.y-attributes.y)<=1&&Math.abs(character.height-attributes.height)<=1,label+': character and attributes align');
 assert.equal(await p.locator('.dashboard-attributes .stat').count(),6,label+': six compact attribute rows');
 for(const selector of ['.monarch-actions>button','.dashboard-mission','.dashboard-weekly','.dashboard-project','.dashboard-character button','.attributes-open','nav button','.brand-profile']){
  for(const button of await p.locator(selector).all()){const b=await button.boundingBox();assert.ok(b&&b.width>=44&&b.height>=44,label+': 44px accessible target '+selector+' '+JSON.stringify(b));}
 }
 const clipped=await p.locator('.monarch-actions b,.monarch-actions strong,.dashboard-mission strong,.dashboard-weekly strong,.dashboard-project strong,.dashboard-attributes .stat span,.dashboard-attributes .stat b,nav button>span:last-child').evaluateAll(elements=>elements.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>({text:e.textContent,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight})));
 assert.deepEqual(clipped,[],label+': ordinary fixture labels must remain readable, without clipping');
}

(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0,reducedChecks=0;const limits=[];
try{
 for(const viewport of targets)for(const[rank,xp]of ranks){
  const label=viewport.width+'×'+viewport.height+' / '+rank,seed=profile(rank,xp),context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await context.newPage(),errors=[],requestedScenes=new Set();let failArt=false,failScene=false,failIcons=false;
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{const name=new URL(r.url()).pathname;if(/\/graphics\/concept\/hero-[edcbas]\.webp$/.test(name))requestedScenes.add(name)});
  await p.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='telegram.org')return route.fulfill({body:'window.telegramEvents={};window.Telegram={WebApp:{ready(){},expand(){},onEvent(name,fn){window.telegramEvents[name]=fn}}}',contentType:'text/javascript'});
   const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));if(failScene&&/\/graphics\/concept\/hero-[edcbas]\.webp$/.test(file)||failIcons&&/\/graphics\/concept\/(?:icon-|attribute-).*\.webp$/.test(file))return route.fulfill({status:404,body:''});if(failArt&&/aether-[edcbas]\.webp$/.test(file))return route.fulfill({status:404,body:''});
   try{const extension=path.extname(file),types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};return route.fulfill({body:await fs.readFile(file),contentType:types[extension]||'text/html'});}catch{return route.fulfill({status:404,body:''});}
  });
  await p.addInitScript(seed=>{for(const[k,v]of Object.entries(seed))localStorage.setItem(k,v);},seed);await p.goto('https://monarch.test/');await settle(p);
  assert.equal(await p.locator('.monarch-hero').getAttribute('data-rank'),rank);
  const scene=p.locator('.hero-cinematic');await scene.evaluate(el=>el.decode());assert.ok((await scene.getAttribute('src')).endsWith('/hero-'+rank.toLowerCase()+'.webp'));assert.deepEqual([...requestedScenes],['/assets/graphics/concept/hero-'+rank.toLowerCase()+'.webp'],label+': only current-rank background requested');
  const crop=await scene.evaluate(el=>{const style=getComputedStyle(el),box=el.getBoundingClientRect(),window=el.parentElement.getBoundingClientRect(),scale=Math.max(box.width/el.naturalWidth,box.height/el.naturalHeight);return {fit:style.objectFit,right:style.objectPosition,sourceLeft:el.naturalWidth-window.width/scale}});assert.equal(crop.fit,'cover');assert.match(crop.right,/100%/);assert.ok(crop.sourceLeft>=599,label+': baked shield and second character remain outside the scenery window');assert.equal(await p.locator('.rank-seal').count(),1,label+': one dynamic rank emblem');
  assert.equal(await p.locator('.graphic-icon').count(),7);for(const icon of await p.locator('.graphic-icon').all()){await icon.evaluate(el=>el.decode());assert.equal(await icon.getAttribute('alt'),'');}
  assert.match(await p.locator('.monarch-hero').innerText(),new RegExp(xp+' XP total'));assert.equal(await p.locator('.monarch-hero [role=progressbar]').getAttribute('aria-valuenow'),String(xp%100));
  for(const image of await p.locator('.aether-character,.aether-portrait').all()){await image.evaluate(el=>el.decode());assert.ok((await image.getAttribute('src')).includes('aether-'+rank.toLowerCase()+'.webp'));}
  assert.equal(await p.locator('.dashboard-attributes [data-attribute=discipline] progress').getAttribute('value'),String(rank==='E'?3:rank==='B'?1:0));
  assert.equal(await p.locator('[data-summary=missions] strong').innerText(),rank==='D'?'0 active':'1 active');assert.equal(await p.locator('[data-summary=projects] strong').innerText(),rank==='D'?'0 active':'1 active');assert.equal(await p.locator('[data-summary=academy] strong').innerText(),'6 lecții');assert.equal(await p.locator('[data-summary=goal] strong').innerText(),rank==='D'?'Nestabilit':'Stabilit');
  await assertExactLayout(p,viewport,label);assert.deepEqual(await snapshot(p),seed,label+': opening the dashboard does not write profile data');
  if(rank!=='E'){await p.evaluate(()=>{window.Telegram.WebApp.viewportHeight=740;window.Telegram.WebApp.safeAreaInset={top:8,bottom:16};window.telegramEvents.viewportChanged()});await assertExactLayout(p,{width:viewport.width,height:740},label+' / Telegram reduced740');reducedChecks++;await p.evaluate(()=>{delete window.Telegram.WebApp.viewportHeight;window.Telegram.WebApp.safeAreaInset={top:0,bottom:0};window.telegramEvents.viewportChanged()});await settle(p);}
  if(rank==='E'){
   await p.screenshot({path:path.join(root,'docs/screenshots/dashboard-'+viewport.width+'.jpg'),type:'jpeg',quality:82});
   await p.locator('[data-summary=missions]').click();assert.ok(await p.locator('[data-action=complete]').count());await p.locator('nav [data-tab=home]').click();
   await p.locator('[data-summary=academy]').click();assert.ok(await p.locator('[data-action=openlesson]').count());await p.locator('nav [data-tab=home]').click();
   await p.locator('[data-summary=projects]').click();assert.equal(await p.locator('#bossform').count(),1);await p.locator('nav [data-tab=home]').click();
   await p.locator('[data-summary=goal]').click();assert.equal(await p.locator('#life25-open').count(),1);await p.locator('nav [data-tab=home]').click();
   await p.locator('.dashboard-mission').click();assert.ok(await p.locator('[data-action=complete]').count());await p.locator('nav [data-tab=home]').click();
   await p.locator('.dashboard-weekly').click();assert.equal(await p.locator('#life25-open').count(),1);await p.locator('nav [data-tab=home]').click();
   await p.locator('.dashboard-project').click();assert.equal(await p.locator('#bossform').count(),1);await p.locator('nav [data-tab=home]').click();
   await p.locator('.dashboard-character button').click();await p.locator('#hunter24-open').click();assert.equal(await p.locator('[data-hunter24-item=blade]').isEnabled(),true);await p.locator('#hunter24-close').click();
   for(const tab of ['plan','evolution','home'])await p.locator('nav [data-tab='+tab+']').click();await p.locator('.attributes-open').click();assert.match(await p.locator('#app').innerText(),/Atributele personajului/);assert.equal(await p.locator('.stat small').count(),6);await p.locator('nav [data-tab=home]').click();await assertExactLayout(p,viewport,label+' after navigation');
   await p.evaluate(()=>{window.Telegram.WebApp.viewportHeight=740;window.Telegram.WebApp.safeAreaInset={top:8,bottom:16};window.telegramEvents.viewportChanged();});await settle(p);
   assert.equal(Math.round((await p.locator('#app').boundingBox()).height),740);assert.ok(await p.locator('#app').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom)>=16));await assertExactLayout(p,{width:viewport.width,height:740},label+' / Telegram reduced 740');reducedChecks++;
   await p.evaluate(()=>{window.Telegram.WebApp.viewportHeight=700;window.telegramEvents.viewportChanged();});await settle(p);assert.equal(await p.locator('#dashboard-fit-notice').isVisible(),true);limits.push(viewport.width+'×700 / safe area24: 676px usable, explicit size limit');
   // The exceptionally small/enlarged case must be honest: either all geometry passes,
   // or a visible notice explicitly describes the inability to guarantee one screen.
   await p.setViewportSize({width:viewport.width,height:420});await p.evaluate(()=>{document.documentElement.style.fontSize='32px';window.Telegram.WebApp.viewportHeight=420;dispatchEvent(new Event('resize'));});await settle(p);
   const limited=await p.locator('html').evaluate(el=>el.classList.contains('dashboard-overflow'));
   if(limited){assert.equal(await p.locator('#dashboard-fit-notice').isVisible(),true);assert.equal(await p.locator('.monarch-actions>button').count(),4);assert.equal(await p.locator('.dashboard-attributes .stat').count(),6);limits.push(viewport.width+'×420 / 200% text: explicit accessibility fallback');}
   else await assertExactLayout(p,{width:viewport.width,height:420},label+' / exceptionally small enlarged text');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(await snapshot(p),seed,label+': navigation and size changes preserve all raw data');
  }
  if(viewport.width===360){failArt=true;failScene=true;failIcons=true;await p.setViewportSize(viewport);await p.goto('https://monarch.test/');for(const image of await p.locator('.aether-character,.aether-portrait').all()){await image.evaluate(el=>el.decode());assert.ok((await image.getAttribute('src')).endsWith('aether-placeholder.svg'),rank+': missing artwork uses existing placeholder');}await p.locator('.hero-cinematic').evaluate(el=>el.decode());assert.ok((await p.locator('.hero-cinematic').getAttribute('src')).endsWith('/monarch-castle-panorama.webp'));assert.equal(await p.locator('.hero-cinematic').getAttribute('data-fallback'),'true');await p.waitForFunction(()=>Array.from(document.querySelectorAll('.graphic-icon')).every(el=>el.hidden&&el.parentElement.classList.contains('art-missing')));assert.equal(await p.locator('.icon-fallback:visible').count(),7);await assertExactLayout(p,viewport,label+' with unavailable graphics');assert.deepEqual(await snapshot(p),seed,label+': failed graphics do not write profile data');}
  assert.deepEqual(errors,[],label+': no JavaScript errors');await context.close();checks++;
 }
 console.log('PASS '+checks+' exact-layout/rank combinations; '+reducedChecks+' Telegram reduced-viewport simulations; real data, 44px action targets, navigation, inventory, E–S scenes/current-rank-only loading, scene/character/icon fallback, unchanged localStorage and no JS errors.');
 console.log('Screenshots: dashboard-360.jpg (360×800), dashboard-390.jpg (390×844), dashboard-430.jpg (430×932).');
 for(const limit of limits)console.log('LIMIT '+limit);
 console.log('Real Telegram Android/Samsung testing remains a separate user check.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
