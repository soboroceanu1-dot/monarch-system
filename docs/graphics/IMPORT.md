# MONARCH V9.3 — 28 resurse furnizate și integrare

## Starea actuală

Contractul schema 2 înlocuiește personajul unic din schema 1 cu șase personaje
E–S. Sunt 28 de imagini în `assets/graphics/v9.3/`, copiate byte-for-byte din
arhiva utilizatorului; fără recomprimare, retușuri sau schimbări de format.
Manifestul JSON este sursa de adevăr. `manifest.js` este proiecția runtime generată.

24 resurse sunt active: șase fundaluri, personajele E/S, patru MONARCH,
șase atribute, cinci navigare și bannerul. Personajele D/C/B/A sunt importate,
dar `visual_review.status=blocked_source_contour`: utilizatorul a cerut explicit
placeholderul pentru contururile afectate. Validarea tehnică nu le aprobă vizual.

Fișiere: hero/hero_rank_{e,d,c,b,a,s}.webp (1640×640),
character/aether_rank_{e,d,c,b,a,s}.png (900×1200),
banners/banner_compania_mea.webp (1640×220),
monarch/monarch_{misiuni,academie,proiecte,obiectiv}.png (144×144),
attributes/attribute_{vitality,intelligence,wealth,leadership,discipline,mindset}.png
(84×84), nav/nav_{acasa,aventuri,plan,hunter,evolutie}.png (132×132).
Toate PNG-urile au alpha; toate WebP-urile sunt opace. Nu există planșe integrate.

## Importarea unor înlocuitori aprobați

Pe `feature/v9.3-a-dashboard`, înlocuiește numai fișierul individual aprobat la
calea exactă din manifest. Nu copia manifestul din arhive externe. Nu schimba
layoutul, registrele de lecții, XP/rangurile, inventarul sau stocarea.

```sh
python3 -m venv /tmp/monarch-graphics-venv
/tmp/monarch-graphics-venv/bin/python -m pip install -r scripts/graphics-requirements.txt
/tmp/monarch-graphics-venv/bin/python scripts/validate-graphics.py --write-status --report docs/graphics/validation-report.json
```

După inspecția vizuală și aprobarea utilizatorului, setează DOAR la resursa
aprobată `visual_review.status=approved` și `approved_sha256` egal cu hashul
curent din raport. Nu copia automat toate hashurile în aprobări. Pentru
personajele D/C/B/A, păstrează blocarea până la primirea înlocuitorilor aprobați.

```sh
/tmp/monarch-graphics-venv/bin/python scripts/validate-graphics.py --write-status --browser-manifest --report docs/graphics/validation-report.json
```

`--browser-manifest` regenerează scriptul runtime din manifest, inclusiv porțile
vizuale. Nu activează resurse neaprobate. Actualizează tokenul comun al tuturor
fișierelor locale din index.html la o nouă versiune pentru invalidarea cache-ului.

Coduri: 0 = verificările cerute trecute, 1 = resurse lipsă/invalide sau aprobări
cerute dar absente, 2 = eroare de manifest/configurare/execuție.
`--require-approved` cere aprobarea vizuală pentru toate 28. În livrarea actuală
iese intenționat cu 1 pentru D/C/B/A, deși toate 28 trec verificările tehnice.
`--allow-missing` este numai diagnostic de infrastructură, niciodată aprobare de
integrare. Bugetele de fișier sunt avertizări; nu comprimă automat imaginile.

## Runtime și fallbackuri

index.html încarcă helperul final-assets.js și manifest.js înainte de app.js.
`bindGraphics()` leagă elementele decorative prin data-art-id. Rangul rămâne
calculat exclusiv de funcțiile existente, fără un al doilea sistem XP.
Aprobarea necesită status tehnic passed, status vizual approved și hashuri egale.
Doar rangul curent este solicitat; cele șase URL-uri nu declanșează preload.

- Personaj neaprobat/lipsă: aether-placeholder.svg, niciodată WebP-ul deteriorat.
- Hero/banner lipsă: panorama istorică intactă.
- Pictograme lipsă: simbolul semantic existent; etichetele HTML rămân separate.
- Fallback imagine eșuat: imaginea se ascunde, HTML-ul/gradientul rămân.
- Manifest absent/malformat sau helper absent: fallback fără acces la stocare.

Personajele sunt acum încadrate ca portret în dashboard: 2,6× în Hero și 3× în
Personaj, cu proporții păstrate și verificări pentru cap/coroană/piept. Partea
inferioară este decupată intenționat; containerele rămân identice. Încadrarea
celorlalte vizualizări este păstrată. Vezi HERO_FRAMING_REPORT.md. Bannerul este contain și aliniat
dreapta pentru a conserva castelul; textul este HTML. Scenele Hero sunt cover
la 100% din fereastră, cu decupare decorativă dependentă de aspect, fără vechea
fereastră la 200%. Nu se modifică trackurile, dimensiunile sau ordinea zonelor.
Pictogramele folosesc contain, fără mix-blend-mode:screen.

## Teste

```sh
node --test tests/*.test.cjs
python3 -m unittest discover -s tests/graphics -p '*_test.py' -v
node tests/graphics/fallback.test.cjs
node tests/browser-dashboard.cjs
node tests/browser-graphics-fallback.cjs
node tests/browser-progress-core.cjs
node tests/browser-progress-shield.cjs
node tests/browser-backup-export.cjs
node tests/browser-backup-v912.cjs
node tests/browser-historical-compatibility.cjs
```

Suitele browser necesită Playwright și Chromium disponibil la /usr/bin/chromium.
Dashboardul verifică șase ranguri × patru viewporturi: 360×800, 390×844,
430×932, 390×740, plus safe-area Telegram simulat. Compară geometria celor opt
zone cu măsurătorile de dinaintea integrării și salvează 24 capturi în
`docs/screenshots/v93-approved/`. D/C/B/A trebuie să arate placeholderul, nu
PNG-ul blocat. Testele de fallback verifică și manifest/helper/imagini 404,
reîncărcare și localStorage byte-identic. Imaginile sintetice din testele Python
există numai în TemporaryDirectory, nu sunt resurse provizorii în aplicație.

Nu este certificare Telegram Android/Samsung real. Nu face merge/deploy automat.
Raport: `docs/graphics/INTEGRATION_REPORT.md`; inventar și hashuri:
`docs/graphics/supplied-inventory.json`. Auditul și măsurătorile istorice rămân
separate, legate de commitul lor original, fără rescriere retroactivă.

Capturile și diagnosticul E/S actualizate sunt în [HERO_FRAMING_REPORT.md](HERO_FRAMING_REPORT.md).
