# MONARCH SYSTEM V9.2 — Progress Core

Aplicație statică pentru GitHub Pages / Telegram WebApp. Evaluarea din Disciplină este locală, pe reguli; nu este evaluare AI.

V9.2 introduce salvări verificate și recuperabile prin Progress Core, identificatori permanenți ai lecțiilor și adaptoare pentru progresul istoric. Nu recalculează progresul și nu migrează automat profilurile. Auditul anterior modificărilor: [PROGRESS_CORE_AUDIT.md](PROGRESS_CORE_AUDIT.md). Contract, compatibilitate, limite și teste: [PROGRESS_CORE.md](PROGRESS_CORE.md). Funcțiile backup Progress Shield V9.1.2 sunt păstrate.

Folosește o singură filă pentru modificări. PR-urile nu sunt integrate sau publicate automat. Informațiile V9.0 de mai jos descriu istoricul funcționalităților; ordinea de încărcare și verificările curente sunt documentate în Progress Core.

## Corecții și diagnostic

- Antetul afișa V8.1 deoarece textul era fix în `app.js`. Variabila V9 din `life25.js` nu era folosită de interfață. Antetul, planificatorul și cardul de competențe folosesc acum `window.MONARCH_BUILD`, definit înainte de prima randare în `app.js`.
- Validatorul folosea `\b` cu litere românești: verbe precum „Încep”, „Învăț” și „Împart” puteau fi respinse, iar expresii vagi precum „odată” puteau fi omise. Normalizarea diacriticelor și compararea cuvintelor întregi corectează aceste cazuri, inclusiv majuscule, Unicode descompus și sedile vechi. Rămâne un validator orientativ cu vocabular limitat, fără analiză semantică.
- `index.html` încarcă, în ordine, `app.js`, `awakening.js`, `hunter24.js`, `life25.js`. `hunter23.js` și `unified30.js` sunt fișiere existente neîncărcate; sunt păstrate.
- Nu există service worker, Cache Storage sau loader dinamic. Cache-ul HTTP este diferențiat prin `?v=...`. Toate resursele locale au acum identificatorul `monarch-v90-fix1-20261030`, astfel încât URL-urile vechi nu sunt refolosite la încărcarea noului HTML. SDK-ul Telegram rămâne separat.
- Nu sunt schimbate stilurile, formulele XP, recompensele, inventarul, caracteristicile, cheile localStorage sau structura progresului. Nu se șterg date și nu se migrează salvările. Automat / Manual și cele patru dificultăți sunt păstrate.

## Verificare

Cu Node.js 24:

```sh
node --test --test-isolation=none tests/*.test.cjs
for file in *.js tests/*.cjs; do node --check "$file" || exit; done
git diff --check
```

Testele acoperă diacritice, răspunsuri respinse, grile, ajutor, provocări, recompensa unică de 20 XP, recapitularea cu 0 XP, păstrarea datelor existente și URL-urile resurselor.

## Publicare și cache

La fiecare publicare care schimbă resurse, actualizează identificatorul `?v=` pentru resursele locale din `index.html`; actualizează și `MONARCH_BUILD` când se schimbă versiunea afișată. Păstrează ordinea scripturilor.

După integrarea PR-ului, verifică publicarea GitHub Pages din ramura `main` și URL-ul folosit de Telegram. În Network, confirmă noul `index.html` și URL-urile locale cu identificatorul curent. Închide și redeschide WebApp-ul sau reîncarcă pagina dacă documentul HTML vechi este încă păstrat de client. Parametrii resurselor nu pot actualiza un document deja deschis sau un HTML vechi livrat din cache. Nu șterge localStorage pentru actualizare: conține progresul.

## V9.1 Progress Shield (ramură de dezvoltare)

Backup complet, import cu previzualizare și copie de recuperare, verificare nedistructivă și refacerea protejată a chestionarului. Detalii despre format, recuperare, limite, teste și verificarea în Telegram: [PROGRESS_SHIELD.md](PROGRESS_SHIELD.md). Regulile XP și inventarul rămân neschimbate. Nu se publică automat și nu se integrează PR-ul automat.

Revizuirea compatibilității: validarea respectă câmpurile opționale și valorile implicite din V9.0, fără rescrierea salvărilor. Exportul complet are opțiuni de descărcare, partajare și afișare/copiere JSON, inclusiv în timpul chestionarului și înaintea restaurării. Testele comparative folosesc 26 de profiluri fictive și sursa V9.0 din Git.
