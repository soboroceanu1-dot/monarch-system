# MONARCH V9.3 — raportul integrării celor 28 de resurse

## Domeniu și audit înainte de integrare

Continuare în PR #6, `feature/v9.3-a-dashboard`, pornind de la `e7c3dfc`.
Arhiva furnizată: `MONARCH_V9_3_TOATE_28_REUNITE_PENTRU_VERIFICARE.zip`, SHA-256
`a46bbbe896b4159fa271302d88ebe17c6b240938e736856fc594834c061be08b`.
Extracție separată în /tmp, cu verificarea căilor; 28 de imagini și două fișiere
informative. Manifestul extern nu a suprascris manifestul aplicației.

Cele 28 de imagini sunt importate identic cu sursa, total 5.162.888 octeți.
Verificările Pillow, alpha și hashurile sunt în `supplied-inventory.json` și
`validation-report.json`; toate fișierele trec validarea tehnică.

| Grup | Număr | Dimensiuni | Format efectiv |
|---|---:|---|---|
| Personaje E–S | 6 | 900×1200 | PNG RGBA, transparență reală |
| Fundaluri E–S | 6 | 1640×640 | WebP RGB, opace |
| MONARCH | 4 | 144×144 | PNG RGBA |
| Atribute | 6 | 84×84 | PNG RGBA |
| Navigare | 5 | 132×132 | PNG RGBA |
| Compania mea | 1 | 1640×220 | WebP RGB, opac |

Contactele de audit au inclus toate cele 28 de resurse; contururile A/S și
personajul D au fost inspectate și separat la scară mai mare. Nu au fost găsite
fragmente evidente de pictograme vecine în seturile de pictograme sau text
încorporat în fundaluri/banner. Personajele D/C/B/A au segmente de contur
vertical suspecte în sursă. De exemplu, marginea alpha stângă rămâne exact la
x=321 pentru 169 rânduri în D, x=317 pentru 283 rânduri în C, x=314 pentru
176 rânduri în B și x=290 pentru 167 rânduri în A; observația statistică susține
inspecția vizuală, nu este singură un detector universal de artefacte.

Problema a fost raportată înainte de integrare. Utilizatorul a ales explicit:
**„Păstrează placeholderul pentru sursele afectate.”** Prin urmare:

- 24 resurse sunt aprobate pentru afișare.
- D/C/B/A sunt prezente pentru trasabilitate, dar `blocked_source_contour` în
  manifest; nu sunt solicitate de browser. Hero și Personalizare arată SVG-ul
  placeholder, păstrând rangul și XP-ul reale.
- Aceste patru personaje necesită înlocuitori și aprobare vizuală; nu sunt
  declarate finalizate grafic. Nu s-au retușat sau ascuns prin CSS contururile.

S are capul/coroana în interiorul canvasului; E/S sunt afișate integral cu contain.
Castelul bannerului ajunge la marginea dreaptă a sursei. Imaginea este contain,
aliniată dreapta, pentru a evita tăieri suplimentare. Marginea sursei nu este
reconstruită. Fundalurile Hero sunt cover, cu decupare decorativă verticală
variabilă între rapoartele viewporturilor, fără rang/personaj pictat în sursă.

15 pictograme depășesc bugetele orientative de fișier. Sunt avertizări de greutate,
nu erori de format. Nu au fost recomprimate sau modificate designurile aprobate.
Un profil E solicită aproximativ 1,07 MB de imagini noi; S aproximativ 1,37 MB
(suma resurselor active, fără cache, fără scripturi sau SVG-ul fallback). Nu se
încarcă simultan toate cele șase scene/personaje.

## Implementare și protejarea progresului

- `app.js`: IDs pentru ranguri, cele 15 pictograme și banner; textul și valorile
  rămân HTML. Sunt păstrate cele opt zone, patru carduri pe un rând și cinci
  opțiuni de navigare în aceeași ordine.
- `final-assets.js`: acceptă numai resurse validate și aprobate pentru hashul
  curent. Lipsa manifestului/helperului/imaginilor are fallback; fără retry infinit.
- `manifest.json`: contract schema 2, șase personaje în loc de unul; stări separate
  pentru validare tehnică și aprobare vizuală. `manifest.js`: proiecție generată.
- `index.html`: ordinea helper/manifest/app și token comun de versiune pentru cache.
- `style.css`: numai încadrarea straturilor grafice și transparența. Trackurile,
  dimensiunile componentelor, fonturile și ordinea dashboardului nu sunt schimbate.
  Se elimină zoomul 200% al fundalului concept și offseturile negative ale
  personajelor. Pictogramele nu mai folosesc mix-blend-mode:screen.
- Validatorul și testele sunt extinse de la 23 la 28 de intrări; nu acceptă
  imagini cu extensii false, dimensiuni greșite, alpha absent/opac/gol, contur
  care atinge canvasul, animații, căi nepermise sau fișiere suplimentare.

Progress Core, Progress Shield, lesson-ids, awakening, hunter24, life25,
hunter23 și unified30 sunt byte-for-byte identice cu baza PR-ului. Nu sunt
modificate calculele XP/nivel/rang, premiile, lecțiile, inventarul, echipamentele
sau handler-ele de progres. Testele folosesc exclusiv profiluri fictive.
Nu sunt accesate/modificate date reale și nu se face merge sau deploy.

## Rezultate de verificare

| Verificare | Rezultat |
|---|---|
| Validator tehnic | 28 passed, 0 invalid, 0 missing, fără fișiere suplimentare |
| Poarta vizuală pentru toate 28 | cod 1 intenționat: D/C/B/A blocate |
| Teste Python validator | 8 trecute |
| Teste Node fallback | 6 trecute |
| Teste Node existente | 108/108 trecute |
| Dashboard | 24 combinații: E–S × 360×800 / 390×844 / 430×932 / 390×740 |
| Telegram safe-area simulat | 24 verificări la înălțime 740, top 8/bottom 16 |
| Fallback browser | 5 scenarii × două încărcări: manifest lipsă/malformat, helper lipsă, imagini finale lipsă, toate imaginile lipsă |
| Progress Core browser | 10 scenarii trecute |
| Progress Shield browser | suitele mobile/regresie trecute |
| Export browser | 9 scenarii trecute |
| Backup V9.1.2 browser | 13 scenarii trecute |
| Compatibilitate istorică browser | 26 profiluri comparate cu V9.0, plus limitări host și profil corupt |

Suitele browser au ieșit cu cod 0. Sunt verificate: geometria celor opt zone
comparată cu măsurătorile dinainte, lipsa scrollului în cazurile țintă, ținte
principale ≥44 px, pictograme decodate/afișate, contain pentru personaj/banner,
selecția scenei numai pentru rangul curent, rang/XP/nivel dinamice, navigare,
inventar, fallbackuri, localStorage byte-identic la navigare și reîncărcare,
fără erori JavaScript în scenariile executate.

Testele nu certifică perfecțiunea artistică sau Telegram Android/Samsung real.
La spațiu sub 680 px utili și text foarte mărit rămâne fallbackul accesibil
cu scroll, raportat ca limită, nu rezultat single-screen trecut.

## Capturi și fișiere modificate

24 capturi noi: `docs/screenshots/v93-approved/{E,D,C,B,A,S}-{360x800,390x844,430x932,390x740}.jpg`.
Capturile istorice `docs/screenshots/dashboard-{360,390,430}.jpg` sunt păstrate
pentru comparație, fără suprascriere. D/C/B/A trebuie să prezinte placeholderul.
Inspecția vizuală a confirmat încadrarea personajelor E/S și a bannerului în
capturile 360/390/430 și la 390×740; nu se pretinde corectarea surselor blocate.

Fișierele de cod schimbate sunt app.js, index.html, style.css, helperul grafic,
validatorul și testele dashboard/fallback/release-token. Datele noi sunt cele 28
de imagini, manifestul/proiecția runtime, inventarul, raportul validatorului,
raportul de integrare, instrucțiunile IMPORT.md și capturile. Rapoartele grafice
istorice au primit doar un link către această etapă. Nu există PR nou.


> Etapa ulterioară de încadrare Hero/Personaj și diagnosticul capturii E sunt
> în [HERO_FRAMING_REPORT.md](HERO_FRAMING_REPORT.md). Capturile de mai sus rămân
> referința de dinaintea măririi portretelor.
