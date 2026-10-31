# MONARCH V9.2-A — audit înainte de refactorizare

Data: 2026-10-31. Bază: main `153b251bfacef18b9f4b0e8709929297831f5bdb` (V9.1.2).

## Starea execuției întrerupte

Verificate `git status`, branchurile, istoricul și fișierele: branchul local `feature/v9.2-progress-core` exista, fără modificări nefinalizate, fără fișiere Progress Core și fără commituri de implementare V9.2. Ultimul commit local de aplicație era V9.1.2 (`4318ae8`). Istoricul local este un snapshot obținut anterior prin conectorul GitHub, nu o clonă cu toate obiectele istorice. Nu s-a șters sau suprascris muncă anterioară.

Auditul de mai jos a fost finalizat înainte de introducerea codului V9.2. Testele Node existente: 56/56 trecute pe baza nemodificată. Sunt analizate toate modulele, inclusiv cele neîncărcate.

## Chei localStorage și proprietari

| Cheie | Conținut și scriitori/cititori |
|---|---|
| `monarch-life-v1` | XP autoritativ, history, tasks/customTasks, completed/deferred/debts/recovery, bosses, academy, adaptive, player, jurnale și finanțe. app.js citește la încărcare, `save`, `award`, handler-ele click/submit scriu; Awakening și Life Evolution adaugă XP/history separat. Hunter și unified30 citesc. |
| `monarch-awakening-v2` | answers, step, paths, assessment, finished/dashboard/review, questDone, questRewards, skillXP, activeQuest/activeStep, avatarStyle și câmpuri viitoare. awakening.js: încărcare, `save`, render handlers, finalizarea active-next. App, planner și Hunter citesc. Shield poate restaura/reface chestionarul. |
| `monarch-planner-v25` | goals, done, notes, active, skills, reports. life25.js: `get`, `state`, `save`, `questPanel`, `recordError`, `recordHelp`, `award`, handler-ele etapelor, dificultății și obiectivelor. App/unified30 citesc. |
| `monarch-hunter-equipment-v24` | slots; hunter24.js `equipment` citește, `save` scrie echiparea. Slots absente/null folosesc fallback V23. |
| `monarch-hunter-equipment-v23` | equipped; citit ca fallback de hunter24. hunter23.js îl scrie, dar modulul nu este încărcat în index.html. |
| `monarch-awakening-previous-backup` | Arhivă istorică opacă. Nu există scriitor activ. Shield o păstrează exact, inclusiv text istoric deteriorat. |
| `monarch-progress-shield-v1` | Jurnal intern import/refacere/recuperare. Shield `writeJournal`, `restore`, `rollback`, `retake`. Exclus din exportul profilului. Nu trebuie reutilizat pentru recompense curente. |
| Alte `monarch-*` | Chei viitoare/necunoscute: Shield le exportă ca șiruri opace. Nu există alte chei concrete în sursele aplicației. |

Nu există sessionStorage, IndexedDB, service worker, bază de date sau sincronizare de progres în sursele actuale. Cheile fixture-initialized/fixture/unrelated din teste sunt exclusiv fixture-uri, nu contract de producție.

## Module și dependențe

Ordinea activă: progress-shield.js → app.js → awakening.js → hunter24.js → life25.js. hunter23.js și unified30.js sunt prezente dar neîncărcate; ultimul doar agregă citiri/UI. style.css nu scrie date. index.html controlează ordinea și cache tokenul.

- XP principal salvat este autoritativ. Nivel = floor(XP/100)+1; rangurile E/D/C/B/A/S avansează la fiecare 10 niveluri. Nu se reconstruiește XP din history.
- Caracteristicile folosesc numărul evenimentelor history pe categorie. Modificarea/dublarea history schimbă caracteristicile chiar dacă XP pare corect.
- App: misiuni zilnice prin data+task.id; recuperări prin data+recover+id; BOSS prin claimed; Academia prin ai1, ai2, ai3, mkt1, mkt2 și bossClaimed; curs adaptiv prin promptcraft.done. Aceste ID-uri sunt deja permanente și trebuie păstrate.
- Awakening acordă 20/30/40 XP principal și Skill XP pe etapele lecțiilor; reflecția este zilnică (+10). Skill XP și assessment rămân asociate etichetelor istorice. Lecțiile determină pragurile cosmetice și inventarul (1/3/6/9); nu există un inventar separat de deblocări.
- Life Evolution acordă +20 XP/lecție și actualizează skills.completed/streak/level/reports. Dificultatea manuală/automată influențează provocările, nu XP principal existent.
- `Sport` și `Mișcare și sport` NU sunt echivalente în datele istorice: plannerul Sport are trei lecții extinse, Mișcare și sport are o lecție generică; Awakening folosește conținut diferit. Comasarea lor ar acorda/refuza recompense incorect.

## Probleme și risc

| Risc | Nivel | Dovadă și efect |
|---|---|---|
| Recompensa Awakening scrie MAIN înaintea AW, fără tranzacție | Critic | awakening.js active-next: MAIN reușește, AW eșuează → reluarea poate dubla XP/history. |
| Planner scrie done/skills înaintea MAIN | Critic | life25.js award: MAIN eșuează → lecție marcată completă fără XP; inversarea simplă a ordinii nu rezolvă problema. |
| Modelul din memorie este modificat înaintea unui setItem neverificat | Ridicat | app/AW: un eșec poate lăsa UI și modelul avansate; o salvare ulterioară poate persista starea greșită. |
| Identificatori Awakening `lesson:path-i-tier` | Ridicat | i este poziția direcției din paths; activeQuest folosește aceeași poziție. Mutarea selecției stocate reatribuie progresul. |
| Identificatori planner `p:index` și modulo lungimea actuală | Ridicat | Finanțe:4 este slot1 la 3 lecții, slot0 la 4 lecții. Reordonarea/extinderea schimbă lecția, active/reports/notes și protecția împotriva repetării recompensei. |
| Dublarea alias + ID nou în numărătoare | Ridicat | Hunter numără chei lesson:. Scrierea a două marcaje pentru o lecție poate debloca echipamente prematur. |
| Salvări istorice fără colecții, null și numere ca șiruri | Ridicat | 26 fixture-uri arată defaulturi tolerate de cititorii vechi. Validarea prea strictă sau materializarea automată poate bloca ori rescrie profiluri valide. |
| Două file / modele vechi | Ridicat | app și AW păstrează modele în memorie; o salvare veche poate suprascrie progresul scris de alt modul/filă. |
| Import / restaurare și recompense simultane | Ridicat | Un jurnal nou nu trebuie să înlocuiască copia Shield; operațiile trebuie serializate și oprite dacă există recuperare în curs. |
| Progres corupt/istoric ambiguu | Ridicat | Nu se poate deduce sigur XP deja pierdut sau ordinea direcțiilor înaintea unei schimbări vechi; nu se „repară” și nu se recalculează automat. |
| Numărarea și conținutul catalogului sunt amestecate cu ordinea | Mediu | Lecțiile trebuie să poarte ID explicit, cu aliases istorice fixate și cardinalitate legacy înghețată. |

## Plan V9.2-B — Progress Core gradual

1. Modul separat, adaptoare peste aceleași chei; citire fără scrieri la pornire. Folosește validatorul compatibil Shield, fără a introduce valori implicite în datele salvate la simpla deschidere.
2. Salvări verificate și control optimist al valorii citite: o salvare cu model vechi este refuzată, nu combinată arbitrar. La erori de acces, cotă sau citire după scriere, se opresc scrierile și se cere reîncărcarea, păstrând exportul/recuperarea.
3. Tranzacții pentru recompense pe două chei: jurnal intern separat `__monarch_progress_core_txn_v1__` (în afara namespace-ului de profil), valori originale exacte și rollback verificat. Recuperarea rulează înaintea modulelor vechi. Jurnalul Shield rămâne intact. Jurnalul nou este metadată temporară de operare, nu migrare de profil; formatul backupului rămâne v1.
4. Migrare graduală a scriitorilor activi prin adaptoare; nu rescrierea UI sau a formulelor. Recunoaște flagurile istorice ca recompense deja acordate; nu recompensează retroactiv flaguri vechi.
5. Teste: erori înainte/durante scriere, întreruperi, citire după scriere, modele vechi, profiluri istorice, checkpoint Shield nemodificat, backup/import.

## Plan V9.2-C — identificatori permanenți

1. ID semantic explicit pe fiecare descriptor de lecție. ID-urile existente Academy/promptcraft sunt păstrate; namespace-uri distincte pentru Awakening/planner.
2. Resolver read-only pentru aliasurile vechi. Cardinalitatea legacy planner este înghețată (3 pentru Finanțe/Disciplină/Organizare/Sport, 1 pentru celelalte generice), independent de catalogul viitor.
3. Aliasurile AW folosesc ordinea direcțiilor salvate în profilul istoric. Acea ordine nu se sortează și nu se rescrie. Un profil vechi a cărui ordine a fost deja schimbată extern este ambiguu și necesită analiză manuală, nu presupuneri.
4. Se păstrează activeQuest/active.id, etapele, notele, rapoartele și toate marcajele vechi; noile finalizări folosesc ID permanent în colecțiile existente. Nu se dublează marcaje și nu se mută date vechi. Numărătoarea inventarului deduplică aliasurile semantice.
5. Pentru ordinea viitoare a catalogului, citirea se face după ID-ul descriptorului, nu după index. Testele inversează și extind catalogul și verifică aceeași lecție activă, aceleași finalizări și zero recompense duplicate.

## Decizie de risc

Se aprobă tehnic implementarea graduală fără migrare destructivă și fără rescriere la pornire. Nu se aprobă recalcularea XP/Skill XP, comasarea Sport cu Mișcare și sport, ștergerea aliasurilor, reutilizarea jurnalului Shield sau schimbarea formatului backupului. Orice viitoare migrare de conținut/ordine istorică trebuie propusă separat. V9.2 nu promite repararea pierderilor produse înaintea acestei versiuni și nu certifică Telegram Android prin teste Chromium.

Limită de concurență: localStorage nu oferă compare-and-swap. Se verifică modelele vechi și se invalidează fila la evenimente storage; contractul sincron din această etapă presupune un singur scriitor activ. Serializarea strictă între file care scriu simultan prin Web Locks ar necesita adaptoare asincrone și se tratează separat. Nu se promite atomicitate distribuită între versiuni vechi deschise simultan.
