(()=>{'use strict';
const KEY='monarch-awakening-v2';let data={step:0,answers:{},paths:[],assessment:{},finished:false};try{data={...data,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{};
const save=()=>localStorage.setItem(KEY,JSON.stringify(data));
const questions=[
['Ce ai vrea să îmbunătățești cel mai mult? (alege o prioritate)','Finanțe','Carieră și afaceri','Învățare','Organizare','Bunăstare','Relații','Timp liber'],
['Care este obiectivul tău pentru următoarele 12 luni?','__text'],
['Cât de clar este drumul spre obiectiv?','Am un plan clar','Știu direcția','Am doar o idee','Nu știu de unde să încep'],
['Ce te motivează cel mai mult?','Rezultatele concrete','Descoperirea','Provocările','Independența','O viață echilibrată'],
['Cum merg proiectele începute?','Le finalizez','Întârzii uneori','Pierd ritmul','Încep multe, termin puține','Îmi e greu să încep'],
['Ce te împiedică cel mai des?','Amânarea','Lipsa unui plan','Prea multe responsabilități','Lipsa cunoștințelor','Pierderea interesului','Altceva'],
['Cum îți organizezi activitățile?','Calendar și liste','Planific doar ce e important','Impro-vizez','Rareori planific'],
['Ce faci după câteva zile de pauză?','Revin ușor','Încerc să recuperez tot','Amân revenirea','Renunț și schimb proiectul','Depinde'],
['În ce domeniu ai deja experiență?','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Organizare'],
['Ce competență vrei să înveți prima?','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Organizare'],
['Cum preferi să înveți?','Teorie apoi practică','Practică cu explicații','Proiecte reale','Combinație'],
['Cum reacționezi la o problemă dificilă?','Caut soluții','Cer îndrumare','Uneori mă blochez','Amân'],
['Cum este echilibrul dintre responsabilități și timp personal?','Foarte bun','Bun','Variabil','Aș vrea să îl îmbunătățesc','Prefer să nu răspund'],
['Ce activități îți plac?','Mișcare','Hobby-uri creative','Explorare','Timp cu apropiații','Jocuri','Lectură'],
['Ce ai vrea să incluzi mai des?','Recreere','Mișcare','Relații','Învățare','Odihnă','Experiențe noi'],
['Ce ai vrea să urmărești în jurnal?','Realizări','Hobby-uri','Obiceiuri','Amintiri','Toate, opțional','Nimic momentan'],
['Cât timp ai pentru dezvoltare într-o zi obișnuită?','5–15 minute','15–30 minute','30–60 minute','Peste 60 minute','Diferă zilnic'],
['Cum vrei să primești misiuni?','Program stabil','Aleg din opțiuni','Recomandări flexibile'],
['Ce te motivează într-un RPG?','Niveluri','Echipamente','Explorare','BOSS-uri','Realizări reale','Combinație'],
['Ce schimbare ai vrea în următoarele 30 de zile?','__text']
];
const paths=['Disciplină','AI și tehnologie','Finanțe','Leadership','Comunicare','Marketing','Creativitate','Învățare','Bunăstare','Viață practică'];
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
'Viață practică':{q:'O responsabilitate se repetă lunar. Ce te ajută?',opts:['Să o ții doar minte','Un checklist și un memento flexibil','Să o amâni'],correct:1,why:'O procedură simplă reduce erorile.'}
};
const el=document.createElement('div');el.id='awakening-root';document.body.append(el);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){if(data.finished){el.innerHTML=`<div class="aw-float"><button id="aw-open">🧬 Planul meu</button></div>`;document.getElementById('aw-open').onclick=()=>{data.finished=false;data.review=true;render()};return}
let html='<div class="aw-back"><section class="aw-card"><div class="aw-top">⚔️ MONARCH SYSTEM <small>THE AWAKENING · ALPHA</small></div>';
if(data.step<20){const q=questions[data.step];html+=`<div class="aw-progress"><i style="width:${data.step*5}%"></i></div><p class="aw-muted">CAPITOL ${Math.floor(data.step/4)+1} / 5 · ÎNTREBAREA ${data.step+1}/20</p><h2>${e(q[0])}</h2>`;if(q[1]==='__text'){html+=`<textarea id="aw-free" maxlength="300" placeholder="Scrie în câteva cuvinte (poți lăsa gol)">${e(data.answers[data.step]||'')}</textarea><button class="aw-primary" id="aw-next">Continuă →</button>`}else{html+='<div class="aw-choices">'+q.slice(1).map((v,i)=>`<button data-choice="${i}" class="${data.answers[data.step]===v?'selected':''}">${e(v)}</button>`).join('')+'</div>'}if(data.step>0)html+='<button class="aw-secondary" id="aw-back">← Înapoi</button>'}
else if(data.step===20){const suggestions=guess();html+=`<p class="aw-muted">PATH SELECTION</p><h2>Alege trei direcții pentru prima aventură</h2><p>Recomandările sunt orientative. Tu ai ultimul cuvânt.</p><div class="aw-choices">`+paths.map(p=>`<button data-path="${e(p)}" class="${data.paths.includes(p)?'selected':''}">${data.paths.includes(p)?'✓ ':''}${e(p)}${suggestions.includes(p)?' · recomandat':''}</button>`).join('')+`</div><p class="aw-muted">${data.paths.length}/3 selectate</p><button class="aw-primary" id="aw-next" ${data.paths.length!==3?'disabled':''}>Evaluare practică →</button>`}
else if(data.step>=21&&data.step<=23){const path=data.paths[data.step-21],t=tests[path];html+=`<p class="aw-muted">SKILL ASSESSMENT · ${data.step-20}/3</p><h2>${e(path)}</h2><p>${e(t.q)}</p><div class="aw-choices">`+t.opts.map((o,i)=>`<button data-test="${i}" class="${data.assessment[path]===i?'selected':''}">${e(o)}</button>`).join('')+'</div>';if(data.assessment[path]!==undefined){html+=`<p class="aw-feedback">${data.assessment[path]===t.correct?'✓ Răspuns corect.':'↻ Merită aprofundat.'} ${e(t.why)}</p><button class="aw-primary" id="aw-next">${data.step===23?'Vezi campania →':'Următoarea evaluare →'}</button>`}}
else{const goal=data.answers[19]||data.answers[1]||'Dezvoltare personală';html+=`<p class="aw-muted">AWAKENING COMPLETE</p><h2>👑 Prima ta campanie</h2><p><b>Obiectiv:</b> ${e(goal)}</p><p><b>Direcții:</b> ${data.paths.map(e).join(' · ')}</p><div class="aw-plan">${plan().map((p,i)=>`<div><b>CAPITOL ${i+1} · Săptămâna ${i+1}</b><p>${e(p)}</p></div>`).join('')}</div><p class="aw-muted">Evaluările sunt introductive, nu certificări. Planul poate fi ajustat oricând.</p><button class="aw-primary" id="aw-finish">Intră în joc →</button><button class="aw-secondary" id="aw-export">Exportă profilul JSON</button>`}
html+='</section></div>';el.innerHTML=html;
el.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{data.answers[data.step]=questions[data.step][1+Number(b.dataset.choice)];data.step++;save();render()});
el.querySelectorAll('[data-path]').forEach(b=>b.onclick=()=>{const p=b.dataset.path;if(data.paths.includes(p))data.paths=data.paths.filter(x=>x!==p);else if(data.paths.length<3)data.paths.push(p);save();render()});
el.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>{data.assessment[data.paths[data.step-21]]=Number(b.dataset.test);save();render()});
const next=document.getElementById('aw-next');if(next)next.onclick=()=>{if(data.step<20&&questions[data.step][1]==='__text')data.answers[data.step]=document.getElementById('aw-free').value.trim();data.step++;save();render()};
const back=document.getElementById('aw-back');if(back)back.onclick=()=>{data.step--;save();render()};
const finish=document.getElementById('aw-finish');if(finish)finish.onclick=()=>{data.finished=true;data.review=false;save();render()};
const exp=document.getElementById('aw-export');if(exp)exp.onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monarch-awakening-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
}
function guess(){let a=[];const first=data.answers[0]||'';const map={'Finanțe':'Finanțe','Carieră și afaceri':'Leadership','Învățare':'Învățare','Organizare':'Disciplină','Bunăstare':'Bunăstare','Relații':'Comunicare','Timp liber':'Creativitate'};if(map[first])a.push(map[first]);const obstacle=data.answers[5]||'';if(/Amân|plan|interes|responsabilit/.test(obstacle)||/pierd|termin puține|încep/.test(data.answers[4]||''))a.push('Disciplină');const skill=data.answers[9];if(skill&&paths.includes(skill))a.push(skill);return [...new Set([...a,'AI și tehnologie','Finanțe'])].slice(0,3)}
function plan(){const minutes=data.answers[16]||'15–30 minute';return [`Alege un obiectiv concret și programează sesiuni realiste (${minutes}).`,`Exersează ${data.paths[0]} și aplică o idee într-o activitate reală.`,`Construiește un mini-proiect folosind ${data.paths[1]}; notează ce ai învățat.`,`Finalizează un BOSS practic ce combină ${data.paths[0]} și ${data.paths[2]}; revizuiește planul.`]}
render();
})();
