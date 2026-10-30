/* MONARCH Progress Shield: raw-value backups; no migration or reward calculation. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const FORMAT = 'monarch-system-backup', VERSION = 1;
  const JOURNAL = 'monarch-progress-shield-v1';
  const MAIN = 'monarch-life-v1', AW = 'monarch-awakening-v2';
  const PLANNER = 'monarch-planner-v25';
  const known = [MAIN, AW, PLANNER, 'monarch-hunter-equipment-v23', 'monarch-hunter-equipment-v24', 'monarch-awakening-previous-backup'];
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const profileKey = k => typeof k === 'string' && k.startsWith('monarch-') && k !== JOURNAL;
  const fail = message => { throw new Error(message); };
  const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  function shape(key, raw) {
    if (!known.includes(key)) return; // Future MONARCH keys are opaque and preserved byte for byte.
    let value;
    try { value = JSON.parse(raw); } catch { fail(key + ': JSON invalid.'); }
    if (!object(value)) fail(key + ': este necesar un obiect JSON.');
    const fields = (names, check) => names.forEach(k => {
      if (own(value, k) && !check(value[k])) fail(key + ': câmp invalid „' + k + '”.');
    });
    if (key === MAIN) {
      if (!finite(value.xp) || !Array.isArray(value.tasks) || !Array.isArray(value.history) || !Array.isArray(value.bosses)) fail(key + ': lipsesc XP, tasks, history sau bosses valide.');
      fields(['customTasks', 'logs', 'finance'], Array.isArray);
      fields(['completed', 'debts', 'deferred', 'recovery', 'academy', 'adaptive'], object);
      fields(['player'], v => typeof v === 'string');
      for (const name of ['tasks', 'customTasks', 'bosses']) for (const item of value[name] || []) {
        if (!object(item) || typeof item.id !== 'string' || typeof item.name !== 'string') fail(key + ': element invalid în ' + name + '.');
        if (name !== 'bosses' && (!finite(item.xp) || typeof item.category !== 'string')) fail(key + ': misiune invalidă.');
        if (name === 'bosses' && (!finite(item.progress) || !finite(item.reward) || !finite(item.target) || item.target < 1)) fail(key + ': proiect invalid.');
      }
      for (const h of value.history) if (!object(h) || !finite(h.xp) || typeof h.date !== 'string' || typeof h.name !== 'string') fail(key + ': istoric invalid.');
      for (const h of value.logs || []) if (!object(h) || ['activity','food','sleep','weight'].some(k => own(h,k) && typeof h[k] !== 'string' && typeof h[k] !== 'number')) fail(key + ': jurnal invalid.');
      for (const f of value.finance || []) if (!object(f)) fail(key + ': notă financiară invalidă.');
      for (const name of ['academy','adaptive']) for (const [id,v] of Object.entries(value[name] || {})) if (!(name === 'academy' && id === 'bossClaimed' && typeof v === 'boolean') && !object(v)) fail(key + ': progres de curs invalid.');
    } else if (key === AW || key === 'monarch-awakening-previous-backup') {
      if (!object(value.answers) || !Array.isArray(value.paths) || typeof value.finished !== 'boolean' || !Number.isInteger(value.step)) fail(key + ': profil Awakening incomplet.');
      fields(['answers','assessment','questDone','skillXP','questRewards'], object);
      fields(['paths'], v => Array.isArray(v) && v.length <= 3 && v.every(p => typeof p === 'string'));
      fields(['step'], v => Number.isInteger(v) && v >= 0 && v <= 24);
      fields(['finished','dashboard','review','progressShieldRetake'], v => typeof v === 'boolean');
      for (const v of Object.values(value.skillXP || {})) if (!finite(v)) fail(key + ': Skill XP invalid.');
    } else if (key === PLANNER) {
      if (!object(value.goals) || !object(value.done)) fail(key + ': profil Life Evolution incomplet.');
      fields(['goals','done','notes','skills','reports'], object);
      fields(['active'], v => v === null || (object(v) && typeof v.id === 'string' && typeof v.p === 'string'));
      for (const v of Object.values(value.goals || {})) if (typeof v !== 'string') fail(key + ': obiectiv invalid.');
      for (const v of Object.values(value.skills || {})) {
        if (!object(v)) fail(key + ': dificultate invalidă.');
        for (const f of ['level','completed','streak']) if (own(v,f) && !finite(v[f])) fail(key + ': competență invalidă.');
        if (own(v,'manual') && v.manual !== null && (!Number.isInteger(v.manual) || v.manual < 0 || v.manual > 3)) fail(key + ': dificultate manuală invalidă.');
      }
    } else if (key.endsWith('v24')) {
      if (!object(value.slots)) fail(key + ': sloturi de echipament absente.');
      fields(['slots'], v => object(v) && Object.values(v).every(x => typeof x === 'string'));
    } else {
      if (typeof value.equipped !== 'string') fail(key + ': echipament istoric absent.');
    }
  }
  function validateData(data, validateValues = true) {
    if (!object(data)) fail('Datele backupului trebuie să fie un obiect.');
    const keys = Object.keys(data);
    if (!keys.length) fail('Backupul nu conține date MONARCH.');
    for (const k of keys) {
      if (!profileKey(k) || typeof data[k] !== 'string') fail('Cheie sau valoare nepermisă: ' + k);
      if (validateValues) shape(k, data[k]);
    }
    return data;
  }
  function pack(data, now = new Date().toISOString()) {
    return { format: FORMAT, formatVersion: VERSION, exportedAt: now, keys: Object.keys(data).sort(), data };
  }
  function parse(text) {
    let value;
    try { value = JSON.parse(text); } catch { fail('Fișierul nu este JSON valid.'); }
    if (!object(value)) fail('Structură de backup invalidă.');
    if (own(value, 'format') || own(value, 'formatVersion') || own(value, 'data')) {
      if (value.format !== FORMAT || value.formatVersion !== VERSION || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) fail('Format, versiune sau dată de export invalidă.');
      validateData(value.data);
      const keys = Object.keys(value.data).sort();
      if (!Array.isArray(value.keys) || value.keys.some(k => typeof k !== 'string') || JSON.stringify([...value.keys].sort()) !== JSON.stringify(keys)) fail('Lista cheilor nu corespunde datelor. Fișier incomplet.');
      return { ...value, kind: 'complete' };
    }
    // Historical exports: retain the original JSON text, without adding default fields.
    if (Array.isArray(value.tasks) && own(value, 'xp')) {
      shape(MAIN, text); return { ...pack({ [MAIN]: text }), kind: 'legacy-main' };
    }
    if (Array.isArray(value.paths) && object(value.answers) && typeof value.finished === 'boolean') {
      shape(AW, text); return { ...pack({ [AW]: text }), kind: 'legacy-awakening' };
    }
    fail('Backup nerecunoscut sau incomplet. Nu s-a modificat nimic.');
  }
  function create(storage) {
    function snapshot() {
      const data = Object.create(null);
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (profileKey(key)) {
          const raw = storage.getItem(key);
          if (raw === null) fail('Datele s-au schimbat în timpul citirii. Închide celelalte file și reîncearcă.');
          data[key] = raw;
        }
      }
      return data;
    }
    const equal = (a,b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
    function journal() {
      const raw = storage.getItem(JOURNAL);
      if (raw === null) return null;
      let j;
      try { j = JSON.parse(raw); } catch { fail('Copia de recuperare este deteriorată. Exportă datele înainte de alte operații.'); }
      if (!object(j) || j.version !== VERSION || !['pending','complete','rolled-back'].includes(j.status) || !object(j.before) || !Array.isArray(j.touched) || !j.touched.length || j.touched.some(k => !profileKey(k)) || Object.entries(j.before).some(([k,v]) => !profileKey(k) || typeof v !== 'string')) fail('Copia de recuperare are structură invalidă.');
      return j;
    }
    function writeJournal(j) {
      const raw = JSON.stringify(j);
      storage.setItem(JOURNAL, raw);
      if (storage.getItem(JOURNAL) !== raw) fail('Copia de recuperare nu a putut fi verificată.');
    }
    function rollback() {
      const j = journal();
      if (!j) fail('Nu există o copie de recuperare.');
      // Persist intent first; an interrupted rollback must also block normal startup.
      writeJournal({ ...j, status: 'pending' });
      for (const key of j.touched) {
        if (own(j.before, key)) storage.setItem(key, j.before[key]);
        else storage.removeItem(key); // Only keys introduced by this operation, never unrelated keys.
      }
      for (const key of j.touched) if (storage.getItem(key) !== (own(j.before,key) ? j.before[key] : null)) fail('Recuperarea nu a fost completă. Copia este păstrată; reîncearcă.');
      writeJournal({ ...j, status: 'rolled-back' });
    }
    function restore(backup, expected) {
      validateData(backup.data);
      const existing = journal();
      if (existing?.status === 'pending') fail('Finalizează recuperarea operației întrerupte înainte de un alt import.');
      const before = snapshot();
      if (expected && !equal(expected, before)) fail('Datele curente s-au schimbat după previzualizare. Verifică din nou backupul.');
      const touched = Object.keys(backup.data);
      const j = { version: VERSION, status: 'pending', createdAt: new Date().toISOString(), before, touched };
      // If this fails (e.g. quota), no profile key has been changed.
      writeJournal(j);
      try {
        for (const key of touched) storage.setItem(key, backup.data[key]);
        for (const key of touched) if (storage.getItem(key) !== backup.data[key]) fail('Scrierea nu a putut fi verificată: ' + key);
        writeJournal({ ...j, status: 'complete' });
      } catch (error) {
        let recovered = false;
        try { rollback(); recovered = true; } catch { /* Keep the durable journal for explicit recovery. */ }
        fail(recovered ? 'Restaurarea a eșuat. Datele anterioare au fost recuperate integral.' : 'Restaurare incompletă. Copia anterioară este păstrată. Folosește „Recuperează datele anterioare” înainte de a continua.');
      }
    }
    function inspect() {
      const data = snapshot(), issues = [];
      for (const [key,raw] of Object.entries(data)) try { shape(key,raw); } catch (e) { issues.push(e.message); }
      return { data, issues, missing: known.slice(0,5).filter(k => !own(data,k)) };
    }
    function retake(current, expected) {
      const raw = storage.getItem(AW);
      if (raw === null || Object.entries(JSON.parse(raw)).some(([k,v])=>JSON.stringify(v)!==JSON.stringify(current[k]))) fail('Profilul s-a schimbat. Reîncarcă înainte de a reface chestionarul.');
      shape(AW, raw);
      // Keep path identities and every progress/customization field. Only questionnaire answers restart.
      const next = { ...current, step: 0, answers: {}, assessment: {}, finished: false, dashboard: false, review: false, progressShieldRetake: true };
      restore({ data: { [AW]: JSON.stringify(next) } }, expected);
      return next;
    }
    return { snapshot, export: () => pack(snapshot()), parse, inspect, journal, restore, rollback, retake, equal };
  }
  function describe(key, raw) {
    let v; try { v = JSON.parse(raw); } catch { return key + ' — valoare originală păstrată; JSON invalid'; }
    if (key === MAIN && object(v)) return key + ' — ' + v.xp + ' Hunter XP; ' + (v.history?.length || 0) + ' realizări';
    if (key === AW && object(v)) return key + ' — campanie, Skill XP, direcții, profil și personalizare';
    if (key === PLANNER) return key + ' — obiective, lecții, dificultăți și rapoarte';
    return key + ' — ' + raw.length + ' caractere originale';
  }
  function mount(win) {
    const doc = win.document;
    let shield, ready = false;
    const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const list = data => '<ul>' + Object.entries(data).map(([k,v]) => '<li>' + escape(describe(k,v)) + '</li>').join('') + '</ul>';
    function status(message) { const el = doc.getElementById('shield-status'); if (el) el.textContent = message; }
    function download(value, name) {
      const url = win.URL.createObjectURL(new win.Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
      const a = doc.createElement('a'); a.href = url; a.download = name + '-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
      (doc.querySelector('#shield-dialog .life25-panel') || doc.body).append(a); a.click(); a.remove(); win.setTimeout(()=>win.URL.revokeObjectURL(url),60000);
    }
    function run(fn) { try { fn(); } catch (e) { if(doc.getElementById('shield-status')) status(e.message); else dialog('Operație oprită', '<p>'+escape(e.message)+'</p>'); } }
    function dialog(title, body, locked = false) {
      doc.getElementById('shield-dialog')?.remove();
      const el = doc.createElement('div'); el.id = 'shield-dialog'; el.className = 'life25-modal shield-modal';
      el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','shield-title');
      el.innerHTML = '<section class="life25-panel"><h2 id="shield-title" tabindex="-1">' + escape(title) + '</h2>' + body + '<p id="shield-status" role="status" aria-live="polite"></p>' + (locked ? '' : '<button type="button" class="life25-muted" id="shield-close">Închide</button>') + '</section>';
      doc.body.append(el); doc.getElementById('shield-title').focus();
      el.querySelector('#shield-close')?.addEventListener('click',()=>{el.remove();if(!ready && boot()) win.location.reload();});
      return el;
    }
    function exportCurrent() { download(shield.export(), 'monarch-backup-complet'); }
    function recoverUI(locked = false) {
      const j = shield.journal();
      if (!j) throw new Error('Nu există încă o copie de recuperare.');
      const expected = shield.snapshot();
      const affected = Object.fromEntries(j.touched.filter(k=>own(j.before,k)).map(k=>[k,j.before[k]]));
      const introduced = j.touched.filter(k=>!own(j.before,k));
      const el = dialog('Recuperarea datelor anterioare', '<p>Operație: ' + escape(j.createdAt || '') + '. Vor fi readuse doar cheile afectate de acea operație. Alte chei rămân păstrate.</p>' + list(affected) + (introduced.length ? '<p>Chei introduse de operația anulată, care vor fi eliminate: '+escape(introduced.join(', '))+'.</p>' : '') + '<p class="note">Exportă și datele curente dacă ai făcut progrese după această copie. Recuperarea va înlocui valorile afișate, fără recalcularea XP.</p><button id="shield-save-current">Exportă datele curente</button><button id="shield-save-before">Exportă copia anterioară</button><button id="shield-rollback">Recuperează datele anterioare</button>', locked);
      el.querySelector('#shield-save-current').onclick=()=>run(exportCurrent);
      el.querySelector('#shield-save-before').onclick=()=>run(()=>download(pack(j.before),'monarch-inainte-de-restaurare'));
      el.querySelector('#shield-rollback').onclick=()=>run(()=>{
        if (!win.confirm('Confirmi recuperarea datelor anterioare? Valorile curente ale cheilor afectate vor fi înlocuite.')) return;
        if (!shield.equal(expected,shield.snapshot())) throw new Error('Datele s-au schimbat. Redeschide recuperarea.');
        shield.rollback(); win.location.reload();
      });
    }
    function preview(backup) {
      const expected = shield.snapshot();
      const preserved = Object.keys(expected).filter(k=>!own(backup.data,k));
      const el = dialog('Verifică backupul înainte de restaurare', '<p>' + (backup.kind === 'complete' ? 'Backup complet' : 'Backup istoric parțial') + ' · ' + escape(backup.exportedAt) + '</p>' + list(backup.data) + '<p>' + preserved.length + ' chei existente, absente din fișier, vor rămâne nemodificate.</p><p class="note">Înlocuiește valorile cheilor afișate, inclusiv XP dacă diferă. Nu combină și nu recalculează progresul. Copia curentă va fi salvată local înainte de scriere. Închide celelalte file MONARCH.</p><button id="shield-preview-export">Exportă datele curente</button><label><input type="checkbox" id="shield-confirm"> Am verificat datele și confirm înlocuirea lor.</label><button id="shield-restore" disabled>Restaurează backupul</button>');
      el.querySelector('#shield-preview-export').onclick=()=>run(exportCurrent);
      el.querySelector('#shield-confirm').onchange=e=>{el.querySelector('#shield-restore').disabled=!e.target.checked;};
      el.querySelector('#shield-restore').onclick=()=>run(()=>{
        if (!el.querySelector('#shield-confirm').checked || !win.confirm('Restaurezi datele afișate? Se creează mai întâi o copie de recuperare a datelor curente.')) return;
        try { shield.restore(backup,expected); win.location.reload(); }
        catch (e) {
          ready = false; win.MONARCH_PROGRESS_SHIELD.ready = false;
          const block = dialog('Restaurare oprită', '<p>' + escape(e.message) + '</p><button id="shield-recover-now">Deschide recuperarea</button><button id="shield-reload">Reverifică și reîncarcă</button><button id="shield-error-export">Exportă datele curente</button>', true);
          block.querySelector('#shield-recover-now').onclick=()=>run(()=>recoverUI(true));
          block.querySelector('#shield-reload').onclick=()=>win.location.reload();
          block.querySelector('#shield-error-export').onclick=()=>run(exportCurrent);
        }
      });
    }
    async function readFile(file) {
      if (!file) return;
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('Fișierul depășește limita de 10 MB.');
        const backup = shield.parse(await file.text());
        preview(backup);
      } catch (e) { dialog('Import oprit — datele nu au fost modificate', '<p>' + escape(e.message) + '</p>', !ready); if (!ready) addBlockedActions(); }
    }
    function addBlockedActions() {
      const panel = doc.querySelector('#shield-dialog .life25-panel');
      panel.insertAdjacentHTML('beforeend','<button id="shield-block-export">Exportă datele curente</button><button id="shield-block-import">Alege alt backup</button><button id="shield-block-recheck">Reverifică după recuperare</button><input type="file" id="shield-block-file" accept="application/json,.json" hidden>');
      panel.querySelector('#shield-block-export').onclick=()=>run(exportCurrent);
      panel.querySelector('#shield-block-import').onclick=()=>panel.querySelector('#shield-block-file').click();
      panel.querySelector('#shield-block-file').onchange=e=>readFile(e.target.files[0]);
      panel.querySelector('#shield-block-recheck').onclick=()=>win.location.reload();
    }
    function boot() {
      try {
        shield ||= create(win.localStorage);
        const j = shield.journal();
        if (j?.status === 'pending') { recoverUI(true); return false; }
        const report = shield.inspect();
        if (report.issues.length) {
          dialog('Date salvate care necesită verificare', '<p>Încărcarea normală este oprită pentru a evita suprascrierea datelor. Nu s-a resetat nimic. Poți exporta originalele și importa un backup valid.</p><ul>' + report.issues.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>',true);
          addBlockedActions(); return false;
        }
        return true;
      } catch (e) {
        dialog('Protecția progresului a oprit încărcarea', '<p>' + escape(e.message) + '</p><p>Nu șterge datele browserului. Dacă stocarea este blocată sau plină, permite accesul ori eliberează spațiu fără a șterge datele MONARCH.</p>',true);
        if(shield) addBlockedActions();
        return false;
      }
    }
    win.MONARCH_PROGRESS_SHIELD = {
      ready: false,
      importFile: readFile,
      restartAwakening(current, apply) {
        run(()=>{
          const expected = shield.snapshot();
          const el = dialog('Refacerea chestionarului Awakening', '<p>Se refac doar răspunsurile și evaluarea introductivă. Hunter XP, Skill XP, lecțiile, echipamentele și personalizarea sunt păstrate. Cele trei direcții și ordinea lor rămân aceleași pentru a proteja lecțiile deja finalizate.</p><p class="note">Copia profilului curent este salvată înainte de modificare. Poți descărca și un backup complet acum.</p><button id="shield-retake-export">Exportă backup complet</button><button id="shield-retake-confirm">Refă chestionarul și păstrează progresul</button>');
          el.querySelector('#shield-retake-export').onclick=()=>run(exportCurrent);
          el.querySelector('#shield-retake-confirm').onclick=()=>run(()=>{
            if (!win.confirm('Confirmi refacerea răspunsurilor, cu păstrarea progresului și a direcțiilor?')) return;
            try { const next=shield.retake(current,expected); el.remove(); apply(next); }
            catch(e) { status(e.message); if(shield.journal()?.status==='pending') { ready=false;win.MONARCH_PROGRESS_SHIELD.ready=false;recoverUI(true); } }
          });
        });
      }
    };
    ready = boot(); win.MONARCH_PROGRESS_SHIELD.ready = ready;
    for (const event of ['click','submit','change','input']) doc.addEventListener(event,e=>{
      if ((!ready || doc.getElementById('shield-dialog')) && !e.target.closest('#shield-dialog')) { e.preventDefault(); e.stopImmediatePropagation(); }
    },true);
    doc.addEventListener('keydown',e=>{
      const modal=doc.getElementById('shield-dialog');
      if(!modal || e.key!=='Tab')return;
      const items=[...modal.querySelectorAll('button:not(:disabled),input:not([hidden]),[tabindex="0"]')];
      if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&(doc.activeElement===first||doc.activeElement.id==='shield-title')){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(doc.activeElement===last||doc.activeElement.id==='shield-title')){e.preventDefault();first.focus();}
    });
    doc.addEventListener('click', e=>{
      const b=e.target.closest('button'); if(!b)return;
      if (b.id==='shield-export') run(()=>{dialog('Backup complet','<p>Se exportă toate cheile MONARCH ale acestui profil, cu valorile originale. Păstrează fișierul într-un loc sigur; poate conține jurnalul personal.</p>');exportCurrent();status('Fișierul a fost pregătit pentru descărcare. Verifică dacă apare în Descărcări / Fișiere.');});
      if (b.id==='shield-import') doc.getElementById('shield-importfile').click();
      if (b.id==='shield-recovery') run(()=>recoverUI());
      if (b.id==='shield-check') run(()=>{
        const report=shield.inspect();
        dialog('Verificarea datelor salvate', list(report.data) + '<p>' + (report.issues.length ? 'Probleme: '+escape(report.issues.join(' ')) : 'Structurile recunoscute sunt valide. Verificarea nu modifică datele și nu recalculează XP.') + '</p><p>Chei opționale absente: '+escape(report.missing.join(', ') || 'niciuna')+'.</p><p>Cheile MONARCH necunoscute sunt păstrate ca valori originale; nu sunt interpretate.</p>');
      });
    });
    doc.addEventListener('change',e=>{if(e.target.id==='shield-importfile') { const file=e.target.files[0];e.target.value='';readFile(file); }});
    // A second tab must not keep writing an old in-memory profile during recovery.
    win.addEventListener('storage',e=>{if(e.key===JOURNAL) { ready=false;win.MONARCH_PROGRESS_SHIELD.ready=false;dialog('Date modificate într-o altă filă','<p>Reîncarcă înainte de a continua. Nu folosi alte file în timpul restaurării.</p><button id="shield-other-reload">Reîncarcă și verifică</button>',true).querySelector('#shield-other-reload').onclick=()=>win.location.reload(); }});
  }
  return { FORMAT, VERSION, JOURNAL, known, profileKey, shape, pack, parse, create, mount };
});
