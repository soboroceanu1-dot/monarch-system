'use strict';
/* Fictional values, shapes traced to these repository revisions:
 * 14bfef3: app seed version 1; 8f39a18: version 2 and ?? defaults;
 * 5dabf56: version 3/academy; 4ef840e: version 4/adaptive;
 * 0c9ed35: Awakening defaults merged with saved fields;
 * e60a226: planner goals/done/notes/active; 61a7ef8: skills/reports;
 * ac4e748: equipment v23; 7a6729d: v24 slots or fallback to v23.
 * Missing/null variants exercise explicit loader fallbacks; they are not claimed
 * to have been emitted verbatim by every historical writer.
 */
const MAIN='monarch-life-v1',AW='monarch-awakening-v2',PLAN='monarch-planner-v25',V23='monarch-hunter-equipment-v23',V24='monarch-hunter-equipment-v24';
const stringify=v=>JSON.stringify(v,null,2);
const mainV1={version:1,player:'FICTIV V1',xp:375,history:[{name:'Pas fictiv',date:'2026-10-01',xp:20,category:'discipline'}],tasks:[{id:'focus',name:'Finalizează un pas amânat',detail:'Pas fictiv',xp:20,category:'discipline',daily:true}],completed:{},bosses:[{id:'boss-ai',name:'AI MASTERY',target:8,progress:2,reward:300,claimed:false}],logs:[],finance:[],customTasks:[]};
const mainVersions=[1,2,3,4].map(version=>{
 const data={...mainV1,version,player:'FICTIV V'+version};
 if(version>=2)Object.assign(data,{debts:{},deferred:{},recovery:{}});
 if(version>=3)data.academy={ai1:{done:true,completedAt:'2026-10-01'}};
 if(version>=4)data.adaptive={promptcraft:{stage:3,tries:1,notes:'Text fictiv',result:'',done:false}};
 return {name:'main-version-'+version,key:MAIN,data};
});
const defaults=['history','bosses','customTasks','logs','finance','completed','debts','deferred','recovery','academy','adaptive'];
const mainMinimal={xp:375,tasks:[]};
const mainNull={...mainMinimal,...Object.fromEntries(defaults.map(k=>[k,null]))};
const awV2={step:0,answers:{},paths:[],assessment:{},finished:false};
const awFinished={step:24,answers:{1:'Obiectiv fictiv'},paths:['Finanțe','Sport','Organizare'],assessment:{},finished:true};
const plannerV25={goals:{year:'Obiectiv fictiv'},done:{'Finanțe:4':'2026-10-01'},notes:{'Finanțe:4:0':'Notă fictivă'},active:{p:'Finanțe',id:'Finanțe:5',step:1}};
const cases=[...mainVersions,
 {name:'main-no-version-or-optional-fields',key:MAIN,data:mainMinimal},
 {name:'main-nullish-display-name',key:MAIN,data:{...mainMinimal,player:null}},
 {name:'main-nullish-defaults',key:MAIN,data:mainNull},
 {name:'awakening-v2-initial',key:AW,data:awV2},
 {name:'awakening-v2-before-skill-xp',key:AW,data:awFinished},
 {name:'awakening-merged-defaults',key:AW,data:{finished:true,paths:['Disciplină','Finanțe','Mișcare și sport']}},
 {name:'awakening-nullish-flags',key:AW,data:{...awV2,finished:null,dashboard:null,review:null}},
 {name:'awakening-empty-defaults',key:AW,data:{}},
 {name:'awakening-nullish-progress',key:AW,data:{...awFinished,questDone:null,skillXP:null,questRewards:null}},
 {name:'planner-v25-before-skills',key:PLAN,data:plannerV25},
 {name:'planner-goals-only',key:PLAN,data:{goals:{today:'Obiectiv fictiv'}}},
 {name:'planner-nullish-goal-and-skill',key:PLAN,data:{goals:{today:null},skills:{'Finanțe':null}}},
 {name:'planner-empty-defaults',key:PLAN,data:{}},
 {name:'planner-nullish-defaults',key:PLAN,data:{goals:null,done:null,notes:null,active:null,skills:null,reports:null}},
 {name:'equipment-v23-empty',key:V23,data:{}},
 {name:'equipment-v23-nullish',key:V23,data:{equipped:null}},
 {name:'equipment-v23-equipped',key:V23,data:{equipped:'cloak'}},
 {name:'equipment-v24-empty-fallback',key:V24,data:{}},
 {name:'equipment-v24-null-fallback',key:V24,data:{slots:null}},
 {name:'equipment-v24-equipped',key:V24,data:{slots:{weapon:'blade',cloak:'cloak'}}},
 {name:'planner-number-coercion',key:PLAN,data:{...plannerV25,skills:{'Finanțe':{level:'1',completed:'2',streak:'1',manual:'2'}}}},
 {name:'awakening-number-coercion',key:AW,data:{...awFinished,skillXP:{'Finanțe':'20'}}}
];
const combined=()=>({[MAIN]:stringify(mainVersions[0].data),[AW]:stringify(awFinished),[PLAN]:stringify(plannerV25),[V23]:stringify({equipped:'cloak'}),[V24]:'{}','monarch-awakening-previous-backup':'obsolete archive, original text','unrelated-app':'DO NOT EXPORT'});
module.exports={MAIN,AW,PLAN,V23,V24,mainVersions,mainMinimal,awFinished,cases,combined,stringify};
