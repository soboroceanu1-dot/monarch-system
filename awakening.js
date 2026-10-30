(()=>{'use strict';
if(window.MONARCH_PROGRESS_SHIELD?.ready!==true)return;
const KEY='monarch-awakening-v2';let data={step:0,answers:{},paths:[],assessment:{},finished:false};try{data={...data,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{};
const save=()=>localStorage.setItem(KEY,JSON.stringify(data));
const multi={0:3,8:5,13:5,14:4,15:5};const array=v=>Array.isArray(v)?v:(v?[v]:[]);const dateKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};data.questDone??={};data.skillXP??={};
const questions=[
['Ce ai vrea să îmbunătățești cel mai mult? (alege maximum 3)','Finanțe','Carieră și afaceri','Învățare','Organizare','Bunăstare','Relații','Timp liber','Mișcare și sport','Alimentație și obiceiuri sănătoase'],
['Care este obiectivul tău pentru următoarele 12 luni?','__text'],
['Cât de clar este drumul spre obiectiv?','Am un plan clar','Știu direcția','Am doar o idee','Nu știu de unde să încep'],
['Ce te motivează cel mai mult?','Rezultatele concrete','Descoperirea','Provocările','Independența','O viață echilibrată'],
['Cum merg proiectele începute?','Le finalizez','Întârzii uneori','Pierd ritmul','Încep multe, termin puține','Îmi e greu să încep'],
['Ce te împiedică cel mai des?','Amânarea','Lipsa unui plan','Prea multe responsabilități','Lipsa cunoștințelor','Pierderea interesului','Altceva'],
['Cum îți organizezi activitățile?','Calendar și liste','Planific doar ce e important','Impro-vizez','Rareori planific'],
['Ce faci după câteva zile de pauză?','Revin ușor','Încerc să recuperez tot','Amân revenirea','Renunț și schimb proiectul','Depinde'],
['În ce domenii ai deja experiență? (poți alege mai multe)','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Organizare'],
['Ce competență vrei să înveți prima?','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Organizare'],
['Cum preferi să înveți?','Teorie apoi practică','Practică cu explicații','Proiecte reale','Combinație'],
['Cum reacționezi la o problemă dificilă?','Caut soluții','Cer îndrumare','Uneori mă blochez','Amân'],
['Cum este echilibrul dintre responsabilități, mișcare, mese și odihnă?','Foarte bun','Bun','Variabil','Aș vrea să îl îmbunătățesc','Prefer să nu răspund'],
['Ce activități îți plac? (poți alege mai multe)','Mișcare','Hobby-uri creative','Explorare','Timp cu apropiații','Jocuri','Lectură','Sport de echipă','Antrenamente acasă'],
['Ce ai vrea să incluzi mai des? (poți alege mai multe)','Recreere','Mișcare','Relații','Învățare','Odihnă','Experiențe noi','Sport și antrenamente','Mese regulate și variate'],
['Ce ai vrea să urmărești în jurnal? (poți alege mai multe)','Realizări','Hobby-uri','Obiceiuri','Amintiri','Toate, opțional','Nimic momentan','Antrenamente și mișcare','Mese și hidratare'],
['Cât timp ai pentru dezvoltare într-o zi obișnuită?','5–15 minute','15–30 minute','30–60 minute','Peste 60 minute','Diferă zilnic'],
['Cum vrei să primești misiuni?','Program stabil','Aleg din opțiuni','Recomandări flexibile'],
['Ce te motivează într-un RPG?','Niveluri','Echipamente','Explorare','BOSS-uri','Realizări reale','Combinație'],
['Ce schimbare ai vrea în următoarele 30 de zile?','__text']
];
const paths=['Disciplină','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Învățare','Bunăstare','Viață practică','Mișcare și sport','Alimentație și energie'];
const tests={
'Disciplină':{q:'Ai un proiect mare și doar 15 minute azi. Ce faci?',opts:['Aștept o zi liberă','Aleg un pas clar de 15 minute și îl fac','Încep alte trei proiecte'],correct:1,why:'Un pas concret reduce dificultatea începerii.'},
'AI și tehnologie':{q:'Care cerere oferă AI-ului cele mai bune instrucțiuni?',opts:['Ajută-mă','Scrie ceva despre vânzări','Explică în 5 pași cum pregătesc o ofertă, pentru un începător, cu un exemplu'],correct:2,why:'Contextul, publicul, sarcina și formatul clarifică rezultatul.'},
'Finanțe':{q:'Ai venit 1000 lei, cheltuieli fixe 600 și variabile 250. Cât rămâne?',opts:['150 lei','350 lei','400 lei'],correct:0,why:'1000 − 600 − 250 = 150 lei.'},
'Leadership':{q:'Un coleg repetă o greșeală. Care este primul pas util?',opts:['Îl critici public','Clarifici faptele și discuți individual','Preiei permanent toate sarcinile'],correct:1,why:'Clarificarea și feedbackul concret susțin îmbunătățirea.'},
'Comunicare':{q:'Un client este supărat. Ce răspuns ajută mai mult?',opts:['Nu e problema mea','Ascult, clarific problema și explic pașii următori','Îi spun să revină mâine'],correct:1,why:'Ascultarea și un plan clar reduc confuzia.'},
'Marketing':{q:'Ce trebuie definit înainte de a redacta o reclamă?',opts:['Publicul și obiectivul','Doar culoarea bannerului','Numărul de emoji'],correct:0,why:'Publicul și obiectivul determină mesajul și formatul.'},
'Creativitate':{q:'Cum testezi o idee nouă cu risc mic?',opts:['Construiești tot fără feedback','Faci un prototip și ceri feedback','Aștepți ideea perfectă'],correct:1,why:'Prototiparea permite învățare rapidă.'},
'Învățare':{q:'Ce metodă verifică mai bine înțelegerea?',opts:['Recitești pasiv','Explici ideea cu propriile cuvinte și o aplici','Doar subliniezi'],correct:1,why:'Recuperarea activă și aplicarea verifică înțelegerea.'},
'Bunăstare':{q:'Cum construiești o rutină sustenabilă?',opts:['Ignori pauzele','Alegi activități potrivite și lași loc pentru odihnă','Te forțezi zilnic indiferent de situație'],correct:1,why:'Flexibilitatea și recuperarea susțin consecvența.'},
'Mișcare și sport':{q:'Cum alegi o activitate fizică potrivită?',opts:['Încep cu o activitate plăcută și adaptez ritmul','Ignor oboseala și pauzele','Trebuie să fac exact ce fac alții'],correct:0,why:'Mișcarea potrivită și odihna ajută la o rutină sustenabilă.'},
'Alimentație și energie':{q:'Ce obicei susține o alimentație echilibrată?',opts:['Sar peste mese pentru a câștiga timp','Mănânc regulat și aleg alimente variate','Elimin categorii întregi fără motiv'],correct:1,why:'Regularitatea și varietatea susțin energia și bunăstarea.'},
'Viață practică':{q:'O responsabilitate se repetă lunar. Ce te ajută?',opts:['Să o ții doar minte','Un checklist și un memento flexibil','Să o amâni'],correct:1,why:'O procedură simplă reduce erorile.'}
};
const el=document.createElement('div');el.id='awakening-root';document.body.append(el);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){if(data.finished){renderDashboard();return}
let html='<div class="aw-back"><section class="aw-card"><div class="aw-top">⚔️ MONARCH SYSTEM <small>THE AWAKENING · ALPHA</small></div>';
if(data.step<20){const q=questions[data.step];html+=`<div class="aw-progress"><i style="width:${data.step*5}%"></i></div><p class="aw-muted">CAPITOL ${Math.floor(data.step/4)+1} / 5 · ÎNTREBAREA ${data.step+1}/20</p><h2>${e(q[0])}</h2>`;if(q[1]==='__text'){html+=`<textarea id="aw-free" maxlength="300" placeholder="Scrie în câteva cuvinte (poți lăsa gol)">${e(data.answers[data.step]||'')}</textarea><button class="aw-primary" id="aw-next">Continuă →</button>`}else{html+='<div class="aw-choices">'+q.slice(1).map((v,i)=>`<button data-choice="${i}" class="${(multi[data.step]?array(data.answers[data.step]).includes(v):data.answers[data.step]===v)?'selected':''}">${e(v)}</button>`).join('')+'</div>';if(multi[data.step])html+=`<p class="aw-muted">Selectate: ${array(data.answers[data.step]).length}/${multi[data.step]} · Alege ce ți se potrivește</p><button class="aw-primary" id="aw-next" ${!array(data.answers[data.step]).length?'disabled':''}>Continuă →</button>`}if(data.step>0)html+='<button class="aw-secondary" id="aw-back">← Înapoi</button>'}
else if(data.step===20){const suggestions=guess();html+=`<p class="aw-muted">PATH SELECTION</p><h2>Alege trei direcții pentru prima aventură</h2><p>${data.progressShieldRetake?'Direcțiile existente sunt păstrate pentru a proteja lecțiile și recompensele.':'Recomandările sunt orientative. Tu ai ultimul cuvânt.'}</p><div class="aw-choices">`+paths.map(p=>`<button data-path="${e(p)}" ${data.progressShieldRetake?'disabled':''} class="${data.paths.includes(p)?'selected':''}">${data.paths.includes(p)?'✓ ':''}${e(p)}${suggestions.includes(p)?' · recomandat':''}</button>`).join('')+`</div><p class="aw-muted">${data.paths.length}/3 selectate</p><button class="aw-primary" id="aw-next" ${data.paths.length!==3?'disabled':''}>Evaluare practică →</button>`}
else if(data.step>=21&&data.step<=23){const path=data.paths[data.step-21],t=tests[path];html+=`<p class="aw-muted">SKILL ASSESSMENT · ${data.step-20}/3</p><h2>${e(path)}</h2><p>${e(t.q)}</p><div class="aw-choices">`+t.opts.map((o,i)=>`<button data-test="${i}" class="${data.assessment[path]===i?'selected':''}">${e(o)}</button>`).join('')+'</div>';if(data.assessment[path]!==undefined){html+=`<p class="aw-feedback">${data.assessment[path]===t.correct?'✓ Răspuns corect.':'↻ Merită aprofundat.'} ${e(t.why)}</p><button class="aw-primary" id="aw-next">${data.step===23?'Vezi campania →':'Următoarea evaluare →'}</button>`}}
else{const goal=data.answers[19]||data.answers[1]||'Dezvoltare personală';html+=`<p class="aw-muted">AWAKENING COMPLETE</p><h2>👑 Prima ta campanie</h2><p><b>Obiectiv:</b> ${e(goal)}</p><p><b>Direcții:</b> ${data.paths.map(e).join(' · ')}</p><div class="aw-plan">${plan().map((p,i)=>`<div><b>CAPITOL ${i+1} · Săptămâna ${i+1}</b><p>${e(p)}</p></div>`).join('')}</div><p class="aw-muted">Evaluările sunt introductive, nu certificări. Planul poate fi ajustat oricând.</p><button class="aw-primary" id="aw-finish">Intră în joc →</button><button class="aw-secondary" id="aw-export">Exportă profilul JSON</button>`}
html+='</section></div>';el.innerHTML=html;
el.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const v=questions[data.step][1+Number(b.dataset.choice)];if(multi[data.step]){let a=array(data.answers[data.step]);data.answers[data.step]=a.includes(v)?a.filter(x=>x!==v):a.length<multi[data.step]?[...a,v]:a;}else{data.answers[data.step]=v;data.step++}save();render()});
el.querySelectorAll('[data-path]').forEach(b=>b.onclick=()=>{if(data.progressShieldRetake)return;const p=b.dataset.path;if(data.paths.includes(p))data.paths=data.paths.filter(x=>x!==p);else if(data.paths.length<3)data.paths.push(p);save();render()});
el.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>{data.assessment[data.paths[data.step-21]]=Number(b.dataset.test);save();render()});
const next=document.getElementById('aw-next');if(next)next.onclick=()=>{if(data.step<20&&questions[data.step][1]==='__text')data.answers[data.step]=document.getElementById('aw-free').value.trim();data.step++;save();render()};
const back=document.getElementById('aw-back');if(back)back.onclick=()=>{data.step--;save();render()};
const finish=document.getElementById('aw-finish');if(finish)finish.onclick=()=>{data.finished=true;data.review=false;data.dashboard=true;if(data.progressShieldRetake)delete data.progressShieldRetake;save();render()};
const exp=document.getElementById('aw-export');if(exp)exp.onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monarch-awakening-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
}
function ascensionPanel(paths){
 const earned=Object.values(data.skillXP||{}).reduce((a,b)=>a+(Number(b)||0),0);
 const done=Object.keys(data.questDone||{}).filter(k=>k.startsWith('lesson:')).length;
 const rank=done>=9?'C':done>=6?'D':'E';
 const unlocked=done>=6?3:done>=3?2:1;
 const titles=['Novice al Ascensiunii','Explorator al celor Trei Tărâmuri','Gardian al Progresului'];
 const title=titles[unlocked-1];
 const avatar=data.avatarStyle||'cyan';
 const zones=paths.map((p,i)=>{const xp=Number(data.skillXP?.[p]||0);const level=1+Math.floor(xp/60);const icons={'Finanțe':'💰','Sport':'💪','Organizare':'📅'};return `<div class="asc-zone"><div class="asc-zone-icon">${icons[p]||'✦'}</div><div><b>${e(p)}</b><small>Teritoriu ${i+1} · Nivel ${level} · ${xp} Skill XP</small><div class="asc-bar"><i style="width:${Math.min(100,xp%60/60*100)}%"></i></div></div></div>`}).join('');
 return `<section class="asc-card"><div class="asc-kicker">👑 RPG ASCENSION 2.2 · HUNTER PROFILE</div><div class="asc-hero"><div class="asc-avatar ${avatar}" aria-label="Avatar Hunter stilizat"><span class="asc-halo"></span><span class="asc-head"></span><span class="asc-body"></span><span class="asc-sigil">✦</span></div><div><b class="asc-rank">RANG ${rank}</b><h3>${e(title)}</h3><p>${done} lecții finalizate · ${earned} Skill XP</p><label class="asc-label" for="asc-color">Aura Hunter</label><select id="asc-color"><option value="cyan" ${avatar==='cyan'?'selected':''}>Cyan</option><option value="violet" ${avatar==='violet'?'selected':''}>Violet</option><option value="gold" ${avatar==='gold'?'selected':''}>Auriu</option></select></div></div><h3>🗺️ Harta ascensiunii</h3><p class="aw-muted">Teritoriile reflectă competențele selectate și evoluează după lecții.</p>${zones}<div class="asc-unlocks"><b>🎁 Recompense cosmetice</b><p>${done>=3?'✓':'🔒'} Mantia Exploratorului — 3 lecții</p><p>${done>=6?'✓':'🔒'} Aura Gardianului — 6 lecții</p><p>${done>=9?'✓':'🔒'} Emblema Ascensiunii — 9 lecții</p></div><div class="asc-boss"><b>🐉 Provocarea celor trei tărâmuri</b><p>${done>=9?'Deblocată: ai finalizat toate cele 9 lecții introductive. Notează cum ai aplicat în viața reală câte un lucru din fiecare domeniu.':'Deblocare după 9 lecții. Progres: '+done+'/9. Nu există termen-limită sau penalizări.'}</p></div></section>`;
}
function renderDashboard(){
const goal=data.answers[19]||data.answers[1]||'Dezvoltare personală';const today=dateKey();const pathsChosen=data.paths.length?data.paths:['Disciplină'];
const missions=pathsChosen.map((p,i)=>{const count=Object.keys(data.questDone).filter(k=>k.includes(':path-'+i+'-')).length;const tier=Math.min(2,count);const q=questLesson(p,tier);return {id:'path-'+i+'-'+tier,title:['⚔️','🧠','🌱'][i]+' '+p+' · Lecția '+(tier+1),detail:q.intro,xp:q.xp};});
missions.push({id:'reflect',title:'📜 Jurnalul aventurii',detail:'Notează un lucru nou învățat sau un pas concret făcut astăzi.',xp:10});
const completed=missions.filter(m=>data.questDone[m.id==='reflect'?today+':reflect':'lesson:'+m.id]).length;
let html=``;
if(data.dashboard){html+=`<div class="aw-back"><section class="aw-card"><div class="aw-top">👑 LIFE CAMPAIGN <small>HUNTER · ${e(today)}</small></div><h2>🗺️ Prima ascensiune</h2><p class="aw-muted">Obiectiv: ${e(goal)}</p><div class="aw-progress"><i style="width:${completed/missions.length*100}%"></i></div><p>${completed}/${missions.length} misiuni înregistrate azi</p>${data.activeQuest?activeQuestHtml(activeQuestData(data.activeQuest,today)):''}${ascensionPanel(pathsChosen)}<h3>⚔️ QUEST EVOLUTION 2.2 · LECȚII PROGRESIVE</h3><p class="aw-muted">Hunter XP + Skill XP. Lecțiile următoare se deblochează după finalizarea celor precedente.</p><div class="aw-mission"><b>🌳 Arborele competențelor</b>${pathsChosen.map(p=>`<p>${e(p)}: ${Number(data.skillXP[p]||0)} Skill XP · nivel ${1+Math.floor(Number(data.skillXP[p]||0)/60)}</p>`).join('')}</div>${missions.map(m=>`<div class="aw-mission"><strong>${e(m.title)}</strong><p>${e(m.detail)}</p><button data-quest="${m.id}" ${data.questDone[m.id==='reflect'?today+':reflect':'lesson:'+m.id]?'disabled':''}>${data.questDone[m.id==='reflect'?today+':reflect':'lesson:'+m.id]?'✓ Realizat':'⚔️ Începe misiunea'}</button></div>`).join('')}<h3>🐉 BOSS: ${e(goal)}</h3><p>În această campanie, BOSS-ul este obiectivul tău real. Avansează cu pași mici, nu prin apăsări repetate.</p><h3>📅 PLANUL DE 30 DE ZILE</h3><div class="aw-plan">${plan().map((p,i)=>`<div><b>Săptămâna ${i+1}</b><p>${e(p)}</p></div>`).join('')}</div><p class="aw-muted">Misiuni ghidate · XP se adaugă la nivelul principal după finalizare. Fără penalizări pentru odihnă.</p><button class="aw-secondary" id="aw-close">← Înapoi în joc</button><button class="aw-secondary" id="aw-restart">↻ Refă evaluarea inițială</button></section></div>`}
el.innerHTML=html;
const color=document.getElementById('asc-color');if(color)color.onchange=()=>{data.avatarStyle=color.value;save();render()};

const close=document.getElementById('aw-close');if(close)close.onclick=()=>{data.dashboard=false;save();render()};const restart=document.getElementById('aw-restart');if(restart)restart.onclick=()=>{window.MONARCH_PROGRESS_SHIELD?.restartAwakening(data,next=>{data=next;render()})};
el.querySelectorAll('[data-quest]').forEach(b=>b.onclick=()=>{data.activeQuest=b.dataset.quest;data.activeStep=0;save();render();document.querySelector('.aw-back')?.scrollTo(0,0);window.scrollTo(0,0)});
const nextQuest=document.getElementById('active-next');if(nextQuest)nextQuest.onclick=()=>{
const q=activeQuestData(data.activeQuest,today);if(!q)return;
if(data.activeStep===0&&q.type==='finance'){
const v=Number(document.getElementById('budget-answer')?.value);
if(!document.getElementById('budget-answer')?.value.trim()||v!==q.answer){document.getElementById('active-feedback').textContent=q.hint||'Reverifică operația.';return}
}
if(data.activeStep===0&&q.type==='organize'){
const task=document.getElementById('task-name')?.value.trim(),step=document.getElementById('task-step')?.value.trim();
if(!task||step.length<12){document.getElementById('active-feedback').textContent='Scrie activitatea și un prim pas concret (cel puțin 12 caractere).';return}
}
if(data.activeStep===0&&q.type==='journal'){
const v=document.getElementById('journal-answer')?.value.trim();if(!v||v.length<12){document.getElementById('active-feedback').textContent='Descrie un lucru concret, în cel puțin 12 caractere.';return}
}
if(data.activeStep===0&&q.type==='movement'&&!document.getElementById('movement-choice')?.value){document.getElementById('active-feedback').textContent='Alege mai întâi o activitate.';return}
if(data.activeStep<1){data.activeStep=1;save();render();return}
const k=data.activeQuest==='reflect'?today+':reflect':'lesson:'+data.activeQuest;
if(data.questDone[k])return;
data.questDone[k]=true;if(q.skill){data.skillXP[q.skill]=(Number(data.skillXP[q.skill])||0)+q.xp;}data.questRewards??={};data.questRewards[k]=q.xp;
try{const mainKey='monarch-life-v1',main=JSON.parse(localStorage.getItem(mainKey)||'null');if(main&&Array.isArray(main.history)){
main.xp=(Number(main.xp)||0)+q.xp;
main.history.push({name:'⚔️ Campania: '+q.title,xp:q.xp,category:q.category,date:new Date().toISOString()});localStorage.setItem(mainKey,JSON.stringify(main));
}}catch(err){console.warn('Nu am putut actualiza XP-ul principal',err)}
data.activeQuest=null;data.activeStep=0;save();location.reload();
};
const backQuest=document.getElementById('active-back');if(backQuest)backQuest.onclick=()=>{data.activeQuest=null;data.activeStep=0;save();render()};

}
document.addEventListener('click',ev=>{if(ev.target.closest('#aw-open')){data.dashboard=true;save();render();}});
function questLesson(p,tier){
const lessons={
'Finanțe':[
{title:'Trezoreria I · Bugetul',intro:'Exemplu fictiv: ai 2.000 lei; cheltuieli de 800, 350 și 150 lei. Cât rămâne?',answer:700,hint:'Scade suma celor trei cheltuieli din 2.000.'},
{title:'Trezoreria II · Rezerva',intro:'Exemplu fictiv: economisești 150 lei lunar, timp de 6 luni. Ce sumă acumulezi fără dobândă?',answer:900,hint:'Înmulțește suma lunară cu numărul lunilor.'},
{title:'Trezoreria III · Planul',intro:'Exemplu fictiv: un obiectiv costă 1.200 lei și ai deja 300 lei. Cât mai trebuie economisit?',answer:900,hint:'Scade banii disponibili din costul obiectivului.'}],
'Organizare':[
{title:'First Order I · Primul pas',intro:'Alege o activitate importantă și descompune-o într-un prim pas concret.'},
{title:'First Order II · Prioritatea',intro:'Alege activitatea cu impactul cel mai mare și formulează primul pas care poate fi realizat astăzi.'},
{title:'First Order III · Finalizarea',intro:'Alege o activitate începută, definește ce înseamnă terminată și fă următorul pas.'}],
'Mișcare și sport':[
{title:'Vitality I · Mișcare plăcută',intro:'Alege o activitate fizică plăcută, adaptată posibilităților tale. Odihna este o alegere validă.'},
{title:'Vitality II · Varietate',intro:'Explorează o activitate diferită sau continuă una care îți place. Nu există obiective de greutate sau intensitate impuse.'},
{title:'Vitality III · Recuperare',intro:'Observă cum te simți după activitate și alege între mișcare lejeră și recuperare.'}]};
const arr=lessons[p]||lessons['Organizare'];const item=arr[tier]||arr[2];const type=p==='Finanțe'?'finance':p==='Mișcare și sport'?'movement':'organize';return {...item,type,xp:20+10*tier,category:type==='finance'?'wealth':type==='movement'?'vitality':'discipline',skill:p};
}
function activeQuestData(id,today){
if(id==='reflect')return {title:'Jurnalul aventurii',type:'journal',xp:10,category:'mindset',intro:'Notează o realizare sau o lecție concretă din ziua de azi.'};
const match=/^path-(\d+)-(\d+)$/.exec(id||'');if(!match)return null;
const p=data.paths[Number(match[1])]||'Organizare';return questLesson(p,Number(match[2]));
}
function activeQuestHtml(q){if(!q)return '';const stage=data.activeStep||0;
let body='';
if(stage===0){body='<p>'+e(q.intro)+'</p>';
if(q.type==='finance')body+='<p><b>Mini-lecție:</b> Folosește operațiile de adunare, scădere sau înmulțire pentru a planifica un obiectiv financiar. Datele sunt fictive.</p><label>Răspuns (lei fictivi)<input id="budget-answer" type="number" inputmode="numeric" placeholder="Calculează suma"></label>';
if(q.type==='organize')body+='<p><b>Mini-lecție:</b> O activitate bună are un rezultat clar și un prim pas suficient de mic încât să poți începe.</p><label>Activitatea importantă<input id="task-name" maxlength="90" placeholder="Ex: pregătesc o prezentare"></label><label>Primul pas concret<textarea id="task-step" maxlength="300" placeholder="Ex: scriu trei idei pentru introducere"></textarea></label>';
if(q.type==='journal')body+='<p><b>Mini-lecție:</b> O reflecție utilă descrie o acțiune și un rezultat, nu doar o impresie generală.</p><label>Ce ai aplicat sau învățat?<textarea id="journal-answer" maxlength="350" placeholder="Am încercat... și am observat..."></textarea></label>';
if(q.type==='movement')body+='<label>Activitate aleasă<select id="movement-choice"><option value="">Selectează...</option><option>Plimbare relaxată</option><option>Mișcare de mobilitate ușoară</option><option>Joc sau sport recreativ</option><option>Altă activitate potrivită</option><option>Odihnă / recuperare</option></select></label>';
}else{body=q.type==='finance'?'<p>✓ Calcul corect! Răspuns: <b>'+q.answer+' lei.</b> Ai aplicat corect principiul lecției.</p>':q.type==='movement'?'<p>Realizează activitatea aleasă în ritmul tău, în afara aplicației. Revino când ai terminat; confirmarea este voluntară. Dacă ai ales odihnă, poți încheia sesiunea fără să forțezi mișcarea.</p>':'<p>Acum pune în practică pasul descris, apoi revino și confirmă că l-ai efectuat. Aplicația nu poate verifica automat activitățile din lumea reală.</p>'}
return `<div class="aw-mission" style="border:1px solid #54d4ff;padding:14px;margin:12px 0"><h3>⚔️ ${e(q.title)}</h3><p class="aw-muted">ETAPA ${stage+1}/2 · RECOMPENSĂ +${q.xp} Hunter XP${q.skill?' + '+q.xp+' Skill XP':''}</p>${body}<p id="active-feedback" style="color:#ffcf75"></p><button class="aw-primary" id="active-next">${stage===0?'Continuă misiunea →':'🏆 Finalizează și primește XP'}</button><button class="aw-secondary" id="active-back">← Înapoi la misiuni</button></div>`;
}
function mission(p){const m={'Disciplină':'Alege un pas de 10–15 minute pentru un proiect început și realizează-l.','AI și tehnologie':'Învață o tehnică și folosește-o într-un exemplu propriu.','Finanțe':'Exersează planificarea unui buget fictiv sau revizuiește un obiectiv financiar fără date sensibile.','Leadership':'Rezolvă un scenariu de coordonare sau pregătește un feedback constructiv.','Comunicare':'Exersează o conversație dificilă printr-un scenariu.','Marketing':'Scrie o variantă de mesaj publicitar și explică publicul vizat.','Creativitate':'Creează o idee sau un prototip simplu.','Învățare':'Explică o idee nouă cu propriile cuvinte și aplic-o.','Bunăstare':'Alege o activitate de relaxare care îți face bine.','Viață practică':'Organizează o responsabilitate cu o listă de pași.','Mișcare și sport':'Alege o activitate fizică plăcută și potrivită energiei tale; odihna este la fel de validă.','Alimentație și energie':'Învață un principiu despre mese regulate și variate; fără restricții sau ținte de greutate.'};return m[p]||'Fă un pas concret într-un domeniu ales.'}
function guess(){let a=[];const first=array(data.answers[0]);const map={'Finanțe':'Finanțe','Carieră și afaceri':'Leadership','Învățare':'Învățare','Organizare':'Disciplină','Bunăstare':'Bunăstare','Relații':'Comunicare','Timp liber':'Creativitate','Mișcare și sport':'Mișcare și sport','Alimentație și obiceiuri sănătoase':'Alimentație și energie'};for(const f of first){if(map[f])a.push(map[f])}const obstacle=data.answers[5]||'';if(/Amân|plan|interes|responsabilit/.test(obstacle)||/pierd|termin puține|încep/.test(data.answers[4]||''))a.push('Disciplină');const skill=data.answers[9];for(const v of array(skill)){if(paths.includes(v))a.push(v)}return [...new Set([...a,'AI și tehnologie','Finanțe'])].slice(0,3)}
function plan(){const minutes=data.answers[16]||'15–30 minute';return [`Alege un obiectiv concret și programează sesiuni realiste (${minutes}).`,`Exersează ${data.paths[0]} și aplică o idee într-o activitate reală.`,`Construiește un mini-proiect folosind ${data.paths[1]}; notează ce ai învățat.`,`Finalizează un BOSS practic ce combină ${data.paths[0]} și ${data.paths[2]}; revizuiește planul.`]}
render();
})();
