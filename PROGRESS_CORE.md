# V9.2 — Progress Core și identificatori permanenți

Auditul și deciziile de risc au fost finalizate înainte de refactorizare: [PROGRESS_CORE_AUDIT.md](PROGRESS_CORE_AUDIT.md). Implementarea este graduală: păstrează UI și formulele existente, introduce infrastructura și adaptează scriitorii activi. Nu este o rescriere a aplicației.

## Contractul de stocare

Ordine: `lesson-ids.js` → `progress-core.js` → `progress-shield.js` → app → Awakening → Hunter24 → Life25. Core recuperează operațiile întrerupte înainte de cititorii aplicației; Shield furnizează aceeași validare de profil folosită pentru backupuri.

Fiecare modul primește un scope propriu. `read(key, fallback)` păstrează valoarea originală ca așteptare pentru următoarea scriere, fără materializarea defaulturilor în localStorage. `write(key,value)` și `commit({key:value,...})`:

1. verifică valorile citite și schema tuturor valorilor propuse;
2. salvează și verifică jurnalul înainte/după;
3. scriu și recitesc fiecare cheie;
4. marchează operația confirmată, apoi elimină jurnalul verificat;
5. la eșec înainte de confirmare, readuc valorile originale, inclusiv absența unei chei.

Jurnalul temporar este `__monarch_progress_core_txn_v1__`, în afara namespace-ului de profil. Nu înlocuiește `monarch-progress-shield-v1` și nu intră în backup. Jurnalul pending este anulat la următoarea pornire; un jurnal committed păstrează rezultatul confirmat și verifică finalizarea. Un jurnal invalid nu este șters sau reparat automat. Erorile opresc scrierile și afișează opțiunile Shield pentru export/reîncărcare. Un export făcut cu operația Core nefinalizată este etichetat drept copie de diagnostic, posibil parțială.

Nu se citește XP din history pentru a reconstrui totalul. Completarea educațională, Skill XP/skills/raportul și XP/history principal sunt salvate printr-un singur commit recuperabil. Un flag istoric de finalizare sau de recompensă rămâne autoritativ; nu declanșează recompense retroactive chiar dacă un client vechi a pierdut XP printr-o scriere parțială.

La o recompensă nouă, history absent/null poate primi lista normală în memorie și la scrierea explicită; profilul principal complet absent folosește seed-ul normal al aplicației. Nu se scrie nimic la simpla pornire a unui profil sănătos. Câmpurile necunoscute sunt păstrate, inclusiv în rădăcina echipamentelor V24.

## Identitatea lecțiilor

- Academia (`ai1`, `ai2`, `ai3`, `mkt1`, `mkt2`) și `promptcraft` păstrează ID-urile existente.
- Planner: ID explicit pe descriptor, de exemplu `planner.finance.reserve` și `planner.discipline.small-step`. Provocarea asociată are un `challengeId` explicit, independent de ordinea catalogului.
- Awakening: ID explicit, de exemplu `awakening.finance.budget`; marcajul din questDone este `lesson:awakening.finance.budget`. XP-ul de 20/30/40 este atașat descriptorului, nu poziției sale actuale.
- Aliasurile `Finanțe:4` etc. se rezolvă cu cardinalitatea istorică înghețată, nu cu lungimea catalogului curent. `lesson:path-i-tier` folosește direcțiile originale salvate. Acea ordine nu este rescrisă.
- Înregistrările vechi done/questDone/questRewards, rapoartele și notele rămân pe loc. Resolverele sunt read-only. Activitățile noi folosesc ID permanent în colecțiile existente, fără a crea o dublă recompensă.
- „Continuă lecția începută” redeschide activitatea planner păstrată, inclusiv un ID istoric, fără resetarea etapelor. Activitățile necunoscute nu sunt atribuite arbitrar altor lecții și nu acordă XP.
- Inventory/cosmetice recunosc aliasurile fără a număra un marcaj nou și aliasul său drept două recompense. Marcajele istorice necunoscute și pragurile de deblocare existente sunt păstrate conservator.

Pentru extensie: adaugă un ID explicit unic descriptorului, păstrează ID-urile/aliasurile publicate și definește explicit provocarea/recompensa. Nu genera identitatea din titlu sau din index și nu modifica tabelele de aliasuri istorice. Noile module cu alte chei necesită extinderea listei aprobate Core și a validatorului, cu teste.

## Compatibilitate și limite

Cheile de profil și formatul backupului rămân neschimbate (v1). Backupurile istorice pot fi importate, inspectate și exportate fără rescrierea valorilor. Opțiunile de copiere/verificare/import din text V9.1.2 sunt păstrate.

Nu se combină `Sport` cu `Mișcare și sport`, nu se redenumesc cheile de Skill XP/assessment/skills și nu se reordonează chestionarul. Dacă paths a fost modificat extern înainte de V9.2, identitatea unor completări vechi poate fi imposibil de dedus; cazul necesită analiză manuală. Nu se repară presupuse pierderi anterioare.

Folosește o singură filă MONARCH pentru modificări. Scope-urile resping modelele vechi, iar evenimentele storage opresc fila afectată; localStorage nu oferă compare-and-swap între scriitori simultani. Web Locks cu adaptoare asincrone ar fi o etapă separată. O versiune veche a aplicației nu cunoaște ID-urile noi: revenirea la V9.1.2 după completări V9.2 nu este un mod sigur de continuare a progresului. Păstrează un backup anterior dacă revizuiești o versiune veche în alt profil de test.

Nu este certificată funcționarea pe un Telegram Android real prin teste Chromium. Nu se adaugă servere, sincronizare sau mesaje Telegram.

## Verificare

Toate testele care scriu date folosesc profiluri fictive:

```sh
node --test tests/*.test.cjs
node tests/browser-progress-core.cjs
node tests/browser-progress-shield.cjs
node tests/browser-backup-export.cjs
node tests/browser-backup-v912.cjs
node tests/browser-historical-compatibility.cjs
git diff --check
```

Testele browser necesită Playwright și Chromium; `CHROMIUM_PATH` poate selecta executabilul. Suita istorică folosește commitul V9.0 fixat `28a901e` din Git sau aceleași șase surse prin `MONARCH_V90_DIR`, precum în V9.1.2. Sunt verificate reordonarea/extinderea catalogului real, lecțiile active istorice, prevenirea repetării recompenselor, quota/readback/rollback/întreruperi, copii Shield păstrate și export/import v1.
