/* Progress Core v1: existing profile shapes, verified writes, recoverable commits. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){
    let core;
    try {
      core=api.create(root.localStorage,{
        recoverOnCreate:false,
        validate:(key,raw)=>{
          if(typeof root.MONARCH_PROGRESS_VALIDATOR!=='function')throw Error('Validatorul progresului nu este disponibil.');
          root.MONARCH_PROGRESS_VALIDATOR(key,raw);
        },
        onError:message=>root.MONARCH_PROGRESS_SHIELD?.block(message)
      });
    } catch(e) { core={ready:false,error:e.message,scope(){throw e;}}; }
    root.MONARCH_PROGRESS_CORE=core;
    root.addEventListener('storage',event=>{
      if(event.key===null||event.key===api.JOURNAL||event.key==='monarch-progress-shield-v1'||api.KEYS.includes(event.key))core.invalidate?.('Progres modificat într-o altă filă. Reîncarcă înainte de a continua.');
    });
  }
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const JOURNAL='__monarch_progress_core_txn_v1__';
  const KEYS=['monarch-life-v1','monarch-awakening-v2','monarch-planner-v25','monarch-hunter-equipment-v23','monarch-hunter-equipment-v24'];
  const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>JSON.parse(JSON.stringify(v));
  function create(storage,{validate=()=>{throw Error('Validator necesar.');},onError=()=>{},recoverOnCreate=true}={}){
    let ready=true,error='',busy=false;
    const raw=key=>storage.getItem(key)??null;
    function invalidate(message){ready=false;error=message;onError(message);}
    function stop(cause){
      const message=cause?.message||String(cause);
      invalidate(message);throw Error(message);
    }
    function requireReady(){if(!ready)throw Error(error||'Scrierile sunt oprite. Reîncarcă și verifică progresul.');}
    function set(key,value){
      if(value===null)storage.removeItem(key);else storage.setItem(key,value);
      if(raw(key)!==value)throw Error('Scrierea nu a putut fi verificată: '+key);
    }
    function readJournal(){
      const text=raw(JOURNAL);if(text===null)return null;
      let j;try{j=JSON.parse(text);}catch{throw Error('Jurnalul Progress Core este deteriorat. Nu șterge datele aplicației.');}
      if(!object(j)||j.version!==1||!['pending','committed'].includes(j.status)||!object(j.before)||!object(j.after))throw Error('Jurnalul Progress Core are structură invalidă.');
      const keys=Object.keys(j.after);
      if(!keys.length||JSON.stringify(keys.sort())!==JSON.stringify(Object.keys(j.before).sort())||keys.some(k=>!KEYS.includes(k)||typeof j.after[k]!=='string'||!(j.before[k]===null||typeof j.before[k]==='string')))throw Error('Jurnalul Progress Core conține chei sau valori nepermise.');
      return j;
    }
    function recover(){
      try{
        const j=readJournal();
        if(j){
          // Refuse a structurally plausible but damaged journal before restoring
          // any root. Browser recovery is invoked once Shield registers shape.
          for(const map of [j.before,j.after])for(const[key,value]of Object.entries(map))if(value!==null)validate(key,value);
          if(j.status==='pending')for(const[k,v]of Object.entries(j.before))set(k,v);
          else for(const[k,v]of Object.entries(j.after))if(raw(k)!==v)throw Error('Tranzacția confirmată diferă de datele salvate. Exportă originalele înainte de recuperare.');
          set(JOURNAL,null);
        }
        ready=true;error='';return true;
      }catch(e){invalidate(e.message);return false;}
    }
    function scope(){
      const expected=new Map();
      function read(key,fallback={}){
        requireReady();
        try{
          const value=raw(key);expected.set(key,value);
          if(value===null)return clone(fallback);
          validate(key,value);
          return JSON.parse(value);
        }catch(e){return stop(e);}
      }
      function commit(changes){
        requireReady();let record=null,committed=false;
        try{
          if(busy)throw Error('O altă salvare este în curs.');
          if(raw(JOURNAL)!==null)throw Error('Există o operație Progress Core nefinalizată. Reîncarcă pentru recuperare.');
          const shield=raw('monarch-progress-shield-v1');
          if(shield!==null){const checkpoint=JSON.parse(shield);if(checkpoint.status==='pending')throw Error('Finalizează recuperarea Progress Shield înainte de salvare.');}
          if(!object(changes)||!Object.keys(changes).length)throw Error('Salvare fără date.');
          const before={},after={};
          for(const[key,value]of Object.entries(changes)){
            if(!KEYS.includes(key))throw Error('Cheie de progres nepermisă: '+key);
            if(!expected.has(key)||raw(key)!==expected.get(key))throw Error('Datele s-au schimbat după citire. Reîncarcă înainte de salvare.');
            const text=JSON.stringify(value);if(typeof text!=='string')throw Error('Valoare de progres invalidă.');
            validate(key,text);before[key]=expected.get(key);after[key]=text;
          }
          if(Object.keys(after).every(k=>before[k]===after[k]))return true;
          busy=true;
          const pending={version:1,status:'pending',id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),before,after};
          // A full durable preimage exists before changing even one profile key.
          const text=JSON.stringify(pending);set(JOURNAL,text);record=pending;
          for(const[key,value]of Object.entries(after)){
            if(raw(JOURNAL)!==text)throw Error('Altă operație a schimbat jurnalul. Închide celelalte file.');
            set(key,value);
          }
          set(JOURNAL,JSON.stringify({...pending,status:'committed'}));committed=true;
          set(JOURNAL,null);
          for(const[key,value]of Object.entries(after))expected.set(key,value);
          return true;
        }catch(e){
          let suffix='';
          let ownsJournal=false;
          try{const current=raw(JOURNAL);ownsJournal=record&&(current===JSON.stringify(record)||current===JSON.stringify({...record,status:'committed'}));}catch{ /* Leave the durable recovery record untouched. */ }
          if(record&&!committed&&ownsJournal){
            try{
              set(JOURNAL,JSON.stringify(record));
              for(const[key,value]of Object.entries(record.before))set(key,value);
              set(JOURNAL,null);suffix=' Datele anterioare au fost recuperate integral.';
            }catch{suffix=' Operația este oprită; jurnalul de recuperare este păstrat. Reîncarcă după rezolvarea erorii de stocare.';}
          }else if(committed)suffix=' Datele au fost scrise, dar finalizarea trebuie reverificată prin reîncărcare.';
          else if(record)suffix=' Jurnalul nu mai poate fi verificat ca aparținând acestei operații. Nu se suprascrie jurnalul altei file; închide celelalte file și reîncarcă.';
          return stop(Error('Salvare oprită: '+e.message+suffix));
        }finally{busy=false;}
      }
      return {read,write:(key,value)=>commit({[key]:value}),commit};
    }
    if(recoverOnCreate)recover();
    return {get ready(){return ready;},get error(){return error;},scope,recover,invalidate};
  }
  return {JOURNAL,KEYS,create};
});
