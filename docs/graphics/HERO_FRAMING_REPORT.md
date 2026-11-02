# MONARCH V9.3 — Hero și Personaj: diagnostic și încadrare

## Captura E și calculul rangului

Bază: PR #6, `feature/v9.3-a-dashboard`, commit
`c65f2d174b8e71c3aaa1d4919096787008a53451`.

Am inspectat fișierul real `docs/screenshots/v93-approved/E-390x844.jpg`, inclusiv
versiunea GitHub de la acest commit. SHA Git al fișierului remote și local:
`ac50f215d5e2b54cd157c67b8df10a239cf588a4`. Imaginea afișează **E, Nivel 5,
425 XP total**, nu S/Nivel 51. Este păstrată nemodificată pentru trasabilitate.

Datele suitei sunt E=425 XP și S=5000 XP, în contexte browser separate.
Captura este făcută înaintea navigării sau simulărilor de dimensiune.
În fișierul verificat nu am reprodus o eroare de denumire, date sau calcul.
S/Nivel 51 corespunde profilului fictiv separat de 5000 XP; nu putem atribui
neconcordanța din previzualizarea semnalată unei cauze care nu apare în artefact.
Nu s-a schimbat regula de progres pentru a compensa această observație.

| Profil de test | XP | Nivel observat | Rang observat |
|---|---:|---:|---|
| E | 425 | 5 | E |
| D | 1000 | 11 | D |
| C | 2000 | 21 | C |
| B | 3000 | 31 | B |
| A | 4000 | 41 | A |
| S | 5000 | 51 | S |

Au fost adăugate 16 cazuri explicite pentru pragurile XP, inclusiv 0/99/100,
999/1000, 1999/2000, 2999/3000, 3999/4000, 4999/5000 și limita de rang S la
XP mai mare. Valorile așteptate sunt scrise explicit în test, nu sunt derivate
dintr-o copie a formulei pentru verificarea nivelului/rangului.

`capture-index.json` leagă acum fiecare captură de fixture, rangul de pe
insignă, rangul din DOM, nivelul/XP-ul observate, viewport și SHA-256 al imaginii.
Testul compară toate aceste valori înainte de captură; numele folosește rangul
observat numai după verificarea față de profilul așteptat. O nepotrivire oprește
suita și nu este prezentată drept rezultat reușit.

## Modificarea vizuală

Doar dashboardul (`single-screen` / `single-dashboard`) primește încadrarea nouă:

- Hero: scara desenului crește **2,6×** față de încadrarea anterioară.
- Personaj: scara desenului crește **3×** în aceeași fereastră.
- Lățimea este automată, proporțiile intrinseci sunt păstrate, imaginea este
  centrată orizontal. Se afișează un portret cu partea inferioară a corpului
  decupată intenționat; nu se pretinde afișarea întregului corp.
- Poziția verticală ține cont de marginea transparentă a PNG-urilor E/S și,
  separat, de viewBox-ul SVG-ului placeholder. Capul/coroana rămân în cadru.
- Pentru E/S se verifică un dreptunghi sursă care include capul, coroana,
  gâtul și detalii din partea superioară a pieptului. Pentru placeholder se
  protejează coroana și casca. Regiunile sunt specificații revizuite manual,
  nu recunoaștere automată a personajului.
- Rangul, nivelul și XP-ul nu sunt acoperite de regiunea protejată a personajului.
  Textele, dimensiunile fonturilor și geometria panoului de progres sunt identice.
- Butonul Personalizează păstrează minimum 44×44 px și deschide Hunter în toate
  cele 36 de combinații. Încadrarea personajului din Hunter rămâne neschimbată.

Containerul Hero și cardul Personaj nu sunt redimensionate sau mutate. Nu se
modifică celelalte șase zone, pictogramele, bannerul, grilele sau ordinea.
Personajele D/C/B/A continuă să folosească placeholderul, conform aprobării
anterioare. Nu au fost modificate imaginile originale sau placeholderul.
Manifestul documentează noua politică de portret; aprobările și hashurile rămân.

## Comparații și măsurători

Testul `tests/browser-hero-framing.cjs` folosește aceeași pagină și același profil
pentru fiecare pereche: CSS-ul din commitul de bază, apoi CSS-ul actual.
Codul aplicației și resursele grafice sunt identice în cele două stări.

Rezoluții: **360×800, 390×844, 430×932, 360×740, 390×740 și 430×740**.
Șase ranguri × șase viewporturi = 36 comparații. Se cer identice coordonatele,
dimensiunile, textele și fonturile containerelor, plus stilurile calculate ale
componentelor din afara modificării. Regiunile de progres și butonul sunt
verificate separat. Comparația pixelilor în afara Hero/Personaj admite numai
zgomotul mic de redesenare a contururilor: cel mult 0,05% pixeli și maximum
16/255 diferență pe canal. Nu se pretinde identitate binară a tuturor pixelilor;
geometria și stilurile calculate trebuie să fie identice, fără toleranță.
Valorile efectiv observate sunt salvate în `framing-measurements.json`.

Capturi noi: `docs/screenshots/v93-framing/after/` (36 dashboarduri complete).
Comparații focalizate înainte/după pentru E și S la 390×844 și 390×740:

- `hero-E-390x844.jpg`, `personaj-E-390x844.jpg`
- `hero-S-390x844.jpg`, `personaj-S-390x844.jpg`
- `hero-E-390x740.jpg`, `personaj-E-390x740.jpg`
- `hero-S-390x740.jpg`, `personaj-S-390x740.jpg`

În fiecare imagine comparativă: stânga = înainte (`c65f2d1`), dreapta = după.
Capturile istorice v93-approved nu sunt suprascrise și nu sunt redenumite.

## Teste și protejarea datelor

- 108 teste Node existente: trecute.
- 36 combinații dashboard/rang și 36 simulări Telegram safe-area: trecute.
- 36 comparații înainte/după și 16 praguri XP/nivel/rang: trecute.
- 10 scenarii browser Progress Core: trecute.
- Suitele mobile/regresie Progress Shield: trecute.
- Cinci scenarii browser pentru manifest/helper/imagini lipsă și reîncărcare:
  trecute, fără modificarea datelor.
- Validator grafic: 28/28 conforme tehnic; D/C/B/A rămân blocate vizual.
- Nicio eroare JavaScript în scenariile executate. Startupul, schimbarea stilului,
  navigarea și reîncărcarea păstrează byte-for-byte profilurile fictive verificate.

Fișierele runtime app.js, helperul grafic, Progress Core, Progress Shield,
lesson-ids, awakening, hunter24 și life25 sunt byte-for-byte identice cu baza.
Toate cele 28 de imagini și SVG-ul placeholder au hashuri neschimbate.
Modificările de producție sunt regulile CSS de portret și tokenul comun de
cache din index.html; nu există cod nou de progres sau scrieri de date.

Rulare:

```sh
node --test tests/*.test.cjs
node tests/browser-dashboard.cjs
node tests/browser-hero-framing.cjs
node tests/browser-progress-core.cjs
node tests/browser-progress-shield.cjs
node tests/browser-graphics-fallback.cjs
python3 scripts/validate-graphics.py
```

Suitele browser necesită Playwright și /usr/bin/chromium; comparația de pixeli
folosește Pillow din scripts/graphics-requirements.txt. Testele nu certifică
Telegram Android/Samsung real. Fallbackul accesibil la text foarte mărit sau
spațiu sub 680 px utili rămâne o limită explicită. Exclusiv profiluri fictive;
fără resetări de progres, merge sau deploy.
