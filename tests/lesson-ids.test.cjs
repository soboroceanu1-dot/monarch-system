'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const IDs=require('../lesson-ids.js'),root=path.join(__dirname,'..');
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25';
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(module,seed={},options={}){
 const values=new Map(Object.entries(seed).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));
 const writes=[],commits=[],listeners={},fields={'active-next':{}},view={innerHTML:'',querySelectorAll:()=>[]};
 let failCommit=false;
 const scope={
  read:(key,fallback={})=>values.has(key)?JSON.parse(values.get(key)):clone(fallback),
  write(key,value){writes.push(key);values.set(key,JSON.stringify(value));},
  commit(data){if(failCommit)throw Error('simulated atomic storage failure');commits.push(Object.keys(data));for(const[k,v]of Object.entries(data))values.set(k,JSON.stringify(v));}
 };
 let source=fs.readFileSync(path.join(root,module),'utf8');
 if(module==='life25.js')source=source.replace('\n})();','\nwindow.TEST={catalog,quest,activeLesson,challenge,savedNote,award,state,stepPanel,panel};\n})();');
 else {
  source=source.replace('\nrender();','\nwindow.TEST={questLessons,activeQuestData,data:()=>data};\nrender();');
  if(options.reverse)source=source.replace('return arr.map(item=>','return arr.slice().reverse().map(item=>');
 }
 const win={MONARCH_LESSON_IDS:IDs,MONARCH_PROGRESS_CORE:{ready:true,scope:()=>scope},MONARCH_PROGRESS_SHIELD:{ready:true},MONARCH_BUILD:'V9.2 test'};
 vm.runInNewContext(source,{window:win,document:{createElement:()=>view,body:{append(){},insertAdjacentHTML:(_,html)=>{view.innerHTML=html;}},getElementById:id=>fields[id]||null,addEventListener:(name,fn)=>{listeners[name]=fn;}},location:{reload(){}},alert(){},console});
 return {api:win.TEST,values,writes,commits,fields,listeners,view,fail:()=>{failCommit=true;},get:k=>JSON.parse(values.get(k)),snapshot:()=>Object.fromEntries(values)};
}
const main=()=>({xp:275,tasks:[],history:[],inventory:['kept'],academy:{ai1:{done:true}},adaptive:{promptcraft:{stage:3}}});
const planner=extra=>({goals:{today:'keep'},done:{},notes:{},skills:{},reports:{},active:null,...extra});

test('planner historical modulo is frozen while actual catalog is reordered and extended',()=>{
 const f=fixture('life25.js',{[PLAN]:planner({done:{'Finanțe:4':'old'},active:{p:'Finanțe',id:'Finanțe:5',step:1},notes:{'Finanțe:5:0':'original note'}})});
 const catalog=f.api.catalog('Finanțe'),active=f.api.state().active;
 assert.equal(f.api.activeLesson(active).id,'planner.finance.compare-options');
 assert.equal(f.api.challenge(active).id,'planner.finance.budget');
 assert.equal(f.api.savedNote(f.api.state(),active,0),'original note');
 catalog.reverse();catalog.push({...catalog[0],id:'planner.finance.future-lesson',title:'Future fictitious lesson'});
 assert.equal(f.api.activeLesson(active).id,'planner.finance.compare-options');
 assert.equal(f.api.challenge(active).id,'planner.finance.budget');
 assert.equal(IDs.resolvePlanner('Finanțe','Finanțe:4'),'planner.finance.reserve');
 assert.equal(IDs.plannerClaimed(f.api.state(),'Finanțe','planner.finance.reserve'),true);
 assert.equal(IDs.plannerClaimed(f.api.state(),'Finanțe','planner.finance.future-lesson'),false);
 assert.equal(f.writes.length,0);assert.equal(f.commits.length,0);
});

test('descriptor identities are unique and Sport stays distinct from modern movement',()=>{
 const p=fixture('life25.js'),a=fixture('awakening.js');
 const plannerIds=[],awakeningIds=[];
 for(const label of Object.keys(IDs.paths)){
  for(const lesson of p.api.catalog(label))plannerIds.push(lesson.id);
  for(const lesson of a.api.questLessons(label))awakeningIds.push(lesson.id);
 }
 assert.equal(new Set(plannerIds).size,plannerIds.length);assert.equal(new Set(awakeningIds).size,awakeningIds.length);
 assert.notEqual(IDs.plannerId('Sport',0),IDs.plannerId('Mișcare și sport',0));
 assert.notEqual(IDs.awakeningId('Sport',0),IDs.awakeningId('Mișcare și sport',0));
 assert.notEqual(IDs.awakeningId('Finanțe',0),IDs.plannerId('Finanțe',0));
 assert.equal(IDs.resolvePlanner('Custom path','Custom path:99'),IDs.genericPlannerId('Custom path'));
 assert.equal(IDs.resolvePlanner('Finanțe','other:1'),null);
});

test('Awakening in-flight aliases retain content and reward when lessons reorder',()=>{
 const saved={paths:['Finanțe','Disciplină','Sport'],finished:true,dashboard:false,activeQuest:'path-0-0',activeStep:1,questDone:{'lesson:path-0-1':true},skillXP:{'Finanțe':30}};
 const a=fixture('awakening.js',{[AW]:saved}),b=fixture('awakening.js',{[AW]:saved},{reverse:true});
 for(const f of [a,b]){
  const q=f.api.activeQuestData('path-0-0','2026-10-31');
  assert.equal(q.id,'awakening.finance.budget');assert.equal(q.answer,700);assert.equal(q.xp,20);
  assert.equal(IDs.awakeningClaimed(f.api.data(),'awakening.finance.reserve'),true);
  assert.equal(IDs.awakeningClaimed(f.api.data(),'awakening.finance.budget'),false);
  assert.equal(f.writes.length,0);assert.equal(f.commits.length,0);
 }
});

test('Awakening counters deduplicate stable + old aliases, retaining unknown and false historical markers',()=>{
 const data={paths:['Finanțe'],questDone:{'lesson:path-0-0':true,'lesson:awakening.finance.budget':true,'lesson:path-0-1':false,'lesson:unknown-future':true,'2026-10-31:reflect':true}};
 assert.equal(IDs.countAwakening(data),3);assert.equal(IDs.countAwakening(data,true),2);
 assert.equal(IDs.awakeningClaimed(data,'awakening.finance.budget'),true);
 assert.equal(IDs.awakeningClaimed({...data,questRewards:{'lesson:path-0-1':30}},'awakening.finance.reserve'),true);
 assert.equal(IDs.resolveAwakening('path-0-9',data),null);
 assert.equal(IDs.resolveAwakening('path-99-0',data),null);
 assert.equal(IDs.countAwakening({paths:[],questDone:{'lesson:path-98-0':true,'lesson:path-99-0':true}}),2);
 const duplicatePaths={paths:['Finanțe','Finanțe'],questDone:{'lesson:path-0-0':true,'lesson:path-1-0':true,'lesson:awakening.finance.budget':true}};
 assert.equal(IDs.countAwakening(duplicatePaths,true),2,'duplicate old labels retain previous inventory thresholds without an extra stable-alias unlock');
});

test('planner historical reward cannot repeat, preserving all old receipt/note/report values',()=>{
 const saved=planner({done:{'Disciplină:4':'old'},notes:{'Disciplină:4:0':'note'},reports:{'Disciplină:4':{score:88}},active:{p:'Disciplină',id:'planner.discipline.anti-procrastination',step:0,smartStage:4}});
 const f=fixture('life25.js',{[PLAN]:saved,[MAIN]:main()});f.api.award();
 assert.equal(f.commits.length,0);assert.deepEqual(f.get(MAIN),main());
 for(const key of ['done','notes','reports'])assert.deepEqual(f.get(PLAN)[key],saved[key]);
 assert.equal(f.get(PLAN).active,null);
});

test('new planner award uses one stable receipt and one two-root commit; failure leaves both roots unchanged',()=>{
 const initial=planner({active:{p:'Disciplină',id:'planner.discipline.small-step',step:0,smartStage:4}});
 const f=fixture('life25.js',{[PLAN]:initial,[MAIN]:main()});f.api.award();
 assert.equal(f.commits.length,1);assert.deepEqual(new Set(f.commits[0]),new Set([PLAN,MAIN]));
 assert.equal(f.get(MAIN).xp,295);assert.equal(f.get(MAIN).history.length,1);
 assert.deepEqual(Object.keys(f.get(PLAN).done),['planner.discipline.small-step']);
 assert.deepEqual(f.get(MAIN).inventory,['kept']);
 const failed=fixture('life25.js',{[PLAN]:initial,[MAIN]:main()}),before=failed.snapshot();failed.fail();
 assert.throws(()=>failed.api.award(),/storage failure/);assert.deepEqual(failed.snapshot(),before);
});

test('Awakening awards MAIN + Skill XP + stable completion together and recognizes historic rewards',()=>{
 const initial={paths:['Finanțe'],finished:true,dashboard:true,activeQuest:'path-0-0',activeStep:1,answers:{},questDone:{},skillXP:{},assessment:{}};
 const f=fixture('awakening.js',{[AW]:initial,[MAIN]:main()});f.fields['active-next'].onclick();
 assert.equal(f.commits.length,1);assert.equal(f.get(MAIN).xp,295);assert.equal(f.get(AW).skillXP['Finanțe'],20);
 assert.deepEqual(Object.keys(f.get(AW).questDone),['lesson:awakening.finance.budget']);
 const repeated=fixture('awakening.js',{[AW]:{...initial,questDone:{'lesson:path-0-0':true}},[MAIN]:main()});repeated.fields['active-next'].onclick();
 assert.equal(repeated.commits.length,0);assert.deepEqual(repeated.get(MAIN),main());
 const failed=fixture('awakening.js',{[AW]:initial,[MAIN]:main()}),before=failed.snapshot();failed.fail();
 assert.throws(()=>failed.fields['active-next'].onclick(),/storage failure/);assert.deepEqual(failed.snapshot(),before);
 assert.equal(failed.api.data().activeQuest,'path-0-0');
});

test('explicit planner resume keeps historic stage and reports without any write',()=>{
 const initial=planner({active:{p:'Finanțe',id:'Finanțe:5',step:1,smartStage:4},reports:{old:{score:88}}});
 const f=fixture('life25.js',{[PLAN]:initial}),before=f.snapshot();
 assert.match(f.api.panel(),/id="life25-resume"/);
 f.listeners.click({target:{closest:()=>({id:'life25-resume',dataset:{}})}});
 assert.match(f.view.innerHTML,/Compară două opțiuni/);assert.match(f.view.innerHTML,/Raportul lecției/);
 assert.deepEqual(f.snapshot(),before);assert.equal(f.writes.length,0);assert.equal(f.commits.length,0);
});
