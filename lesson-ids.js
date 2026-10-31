/* Permanent educational identities. Legacy aliases are read-only; never rewrite a save on lookup. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MONARCH_LESSON_IDS=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const paths=Object.freeze({
    'Disciplină':'discipline','AI și tehnologie':'ai','Finanțe':'finance',
    'Leadership':'leadership','Comunicare':'communication','Marketing':'marketing',
    'Creativitate':'creativity','Învățare':'learning','Bunăstare':'wellbeing',
    'Viață practică':'practical-life','Mișcare și sport':'movement',
    'Alimentație și energie':'nutrition','Sport':'sport','Organizare':'organization'
  });
  const slug=p=>own(paths,p)?paths[p]:'custom-'+encodeURIComponent(p);
  // These arrays describe historical slot meanings, NEVER display order or catalog size.
  const plannerLegacy=Object.freeze({
    'Finanțe':Object.freeze(['budget','reserve','compare-options']),
    'Disciplină':Object.freeze(['small-step','anti-procrastination','return']),
    'Organizare':Object.freeze(['daily-priority','realistic-planning','finish-project']),
    'Sport':Object.freeze(['suitable-movement','variety-recovery','flexible-plan'])
  });
  const plannerRoles=p=>own(plannerLegacy,p)?plannerLegacy[p]:['first-step'];
  const plannerId=(p,slot=0)=>'planner.'+slug(p)+'.'+plannerRoles(p)[slot];
  const genericPlannerId=p=>plannerId(p,0);
  function resolvePlanner(p,id){
    if(typeof id!=='string')return null;
    if(id.startsWith('planner.'+slug(p)+'.'))return id;
    if(!id.startsWith(p+':'))return null;
    const raw=id.slice(p.length+1);
    if(!/^\d+$/.test(raw))return null;
    const n=Number(raw),roles=plannerRoles(p);
    return Number.isSafeInteger(n)?plannerId(p,n%roles.length):null;
  }
  function plannerClaimed(state,p,id){
    const stable=resolvePlanner(p,id);
    if(!stable)return false;
    // The legacy writer persisted done and reports in the same completion save.
    // Either retained receipt prevents granting its old reward again.
    return ['done','reports'].some(name=>Object.keys(state[name]||{}).some(k=>resolvePlanner(p,k)===stable));
  }
  const plannerLesson=(catalog,p,id)=>catalog.find(l=>l.id===resolvePlanner(p,id))||null;
  const nextPlanner=(state,p,catalog)=>catalog.find(l=>!plannerClaimed(state,p,l.id))||catalog[0]||null;
  const awRoles=p=>p==='Finanțe'?['budget','reserve','goal']:
    p==='Mișcare și sport'?['pleasant-movement','variety','recovery']:['first-step','priority','finish'];
  const awakeningId=(p,slot)=>'awakening.'+slug(p)+'.'+awRoles(p)[slot];
  // Shared fallback content keeps its permanent semantic suffix but not another path's receipt.
  const awakeningForPath=(descriptorId,p)=>'awakening.'+slug(p)+'.'+descriptorId.slice(descriptorId.lastIndexOf('.')+1);
  function resolveAwakening(id,data){
    if(typeof id!=='string')return null;
    if(id.startsWith('lesson:'))id=id.slice(7);
    if(id.startsWith('awakening.'))return id;
    const match=/^path-(\d+)-([012])$/.exec(id);
    if(!match)return null;
    const p=(data.paths||[])[Number(match[1])];
    // An orphan path index has no recoverable identity. Keep its receipt opaque
    // rather than silently attributing several old lessons to another path.
    if(typeof p!=='string')return null;
    return awakeningId(p,Number(match[2]));
  }
  function awakeningClaimed(data,id){
    const stable=resolveAwakening(id,data);
    if(!stable)return false;
    return Object.entries(data.questDone||{}).some(([k,v])=>v&&k.startsWith('lesson:')&&resolveAwakening(k,data)===stable)||
      Object.keys(data.questRewards||{}).some(k=>k.startsWith('lesson:')&&resolveAwakening(k,data)===stable);
  }
  const awakeningLesson=(catalog,id,data)=>catalog.find(l=>l.id===resolveAwakening(id,data))||null;
  const nextAwakening=(data,catalog)=>catalog.find(l=>!awakeningClaimed(data,l.id))||catalog[catalog.length-1]||null;
  function countAwakening(data,truthyOnly=false){
    const legacy=new Set(),stable=new Set();let historicalCount=0;
    for(const [key,value]of Object.entries(data.questDone||{})){
      if(!key.startsWith('lesson:')||(truthyOnly&&!value))continue;
      const identity=resolveAwakening(key,data);
      if(key.startsWith('lesson:awakening.'))stable.add(identity||key);
      else {
        // Preserve every pre-V9.2 receipt's inventory weight, even if a legacy
        // profile repeats path labels. A stable alias must not add another one.
        historicalCount++;if(identity)legacy.add(identity);
      }
    }
    return historicalCount+[...stable].filter(id=>!legacy.has(id)).length;
  }
  return Object.freeze({paths,plannerLegacy,plannerId,genericPlannerId,resolvePlanner,plannerClaimed,plannerLesson,nextPlanner,
    awakeningId,awakeningForPath,resolveAwakening,awakeningClaimed,awakeningLesson,nextAwakening,countAwakening});
});
