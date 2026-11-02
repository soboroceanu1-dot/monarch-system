# Importul resurselor finale V9.3

## Starea livrată

Infrastructură pregătită în PR #6, pe `feature/v9.3-a-dashboard`.
Nu există imagini finale sau provizorii în `assets/graphics/v9.3/`.
Cele șase subdirectoare sunt păstrate în Git prin `.gitkeep`.
`integration_enabled` este `false`; `index.html`, `app.js`, `style.css`,
Progress Core și Progress Shield sunt neschimbate de această etapă.
Nu se face merge/deploy. Nu se folosesc date sau profiluri reale în verificări.

## Fișierele exacte de furnizat

```text
assets/graphics/v9.3/
  manifest.json
  hero/
    hero_rank_e.webp
    hero_rank_d.webp
    hero_rank_c.webp
    hero_rank_b.webp
    hero_rank_a.webp
    hero_rank_s.webp
  character/
    aether_monarch.png
  banners/
    banner_compania_mea.webp
  monarch/
    monarch_misiuni.png
    monarch_academie.png
    monarch_proiecte.png
    monarch_obiectiv.png
  attributes/
    attribute_vitality.png
    attribute_intelligence.png
    attribute_wealth.png
    attribute_leadership.png
    attribute_discipline.png
    attribute_mindset.png
  nav/
    nav_acasa.png
    nav_aventuri.png
    nav_plan.png
    nav_hunter.png
    nav_evolutie.png
```

Doar cele 23 de imagini finale aprobate separat; nu planșe, arhive, imagini
concept, fișiere cu text sau exporturi decupate automat din planșe.
Numele sunt case-sensitive. Nu copia peste manifest un manifest dintr-un pachet
extern. Nu înlocui și nu șterge imaginile istorice în timpul importului.

## Dimensiuni și aprobare

Manifestul conține pentru fiecare fișier: formatul, rezoluția, raportul de aspect,
transparența, măsurătorile celor patru viewporturi, zona sigură normalizată,
modul de afișare, politica de decupare, fallbackul, bugetul estimat, rezultatul
tehnic și aprobarea vizuală. Contractele sunt centralizate și în
`GRAPHICS_DIMENSIONS_AUDIT.md`. Schimbarea dimensiunilor de export necesită
revizuirea contractului și a validatorului, nu redimensionarea dashboardului.

`validation.status` este missing/invalid/passed, calculat tehnic.
`visual_review.status` rămâne pending până la aprobarea umană.
Aprobarea vizuală este legată de SHA-256 în `approved_sha256`:
fișierele schimbate ulterior necesită revalidare și o nouă aprobare.
Un rezultat tehnic passed nu dovedește că nu există text sau fragmente străine.

## Comenzi de import și verificare

Rulează din rădăcina repository-ului, pe ramura existentă:

```sh
git switch feature/v9.3-a-dashboard
python3 -m venv /tmp/monarch-graphics-venv
/tmp/monarch-graphics-venv/bin/python -m pip install -r scripts/graphics-requirements.txt
```

Copiază manual fiecare imagine aprobată la calea exactă din lista de mai sus.
Fără conversii, eliminare automată de fundal sau generare de imagini de rezervă.
Apoi:

```sh
/tmp/monarch-graphics-venv/bin/python scripts/validate-graphics.py --write-status --report docs/graphics/validation-report.json
```

Coduri de ieșire:

- `0`: verificările cerute au trecut; fără `--require-approved` este numai rezultat tehnic.
- `1`: imagini lipsă/invalide, fișiere suplimentare sau aprobare cerută dar absentă.
- `2`: manifest/configurare/execuție invalidă; nu este un rezultat de validare reușit.

Pentru infrastructura goală, singura verificare permisivă este:

```sh
/tmp/monarch-graphics-venv/bin/python scripts/validate-graphics.py --allow-missing
```

Aceasta poate ieși cu `0` și 23 lipsă: verifică infrastructura, NU declară
pachetul pregătit. Nu folosi `--allow-missing` ca poartă de integrare.

După aprobarea vizuală a fiecărui fișier, înscrie pentru intrarea respectivă
`visual_review.status: "approved"` și hashul exact din raport în
`visual_review.approved_sha256`. Nu aproba în bloc și nu copia automat rezultatul
tehnic în aprobarea vizuală. Rulează poarta completă:

```sh
/tmp/monarch-graphics-venv/bin/python scripts/validate-graphics.py --require-approved --write-status --report docs/graphics/validation-report.json
```

Rezultatul cerut: 23 passed, 0 missing, 0 invalid, toate cele 23 de aprobări
vizuale pentru octeții curenți, niciun fișier suplimentar, cod `0`.
Bugetul depășit este avertizare; nu comprimă automat imaginile.
Validatorul nu accesează rețeaua, aplicația, localStorage sau datele utilizatorului.
`--write-status` actualizează numai metadatele tehnice ale manifestului.

## Fallbackuri pregătite, fără activare în dashboard

`assets/graphics/final-assets.js` este un helper UMD/CommonJS opțional,
neîncărcat de `index.html`. Nu trebuie adăugat în aplicație în această etapă.

- Personaj absent/respins: `assets/characters/aether-placeholder.svg`.
- Hero/banner absent/respins: `assets/scenes/monarch-castle-panorama.webp`.
- Pictogramă absentă/respinsă: simbolul semantic și eticheta HTML intacte.
- Eșec și al imaginii de rezervă: ascunde imaginea defectă, păstrează HTML-ul.
- Nu încearcă să încarce fișiere finale nevalidate/neaprobate; nu cade înapoi
  pe pictogramele concept sau personajele deteriorate. Nu există retry infinit.

În etapa viitoare, după autorizarea integrării, consumatorul poate folosi:

```js
const cleanup = MonarchFinalAssets.attachImage(imageElement, manifest,
  'monarch_misiuni', existingGlyphElement);
// La demontarea/reutilizarea elementului:
cleanup();
```

Helperul cere simultan integration_enabled=true, validation.status=passed,
visual_review.status=approved și hashuri identice în manifest. Gate-ul este de
metadate; verificarea octeților se face de validator înainte de integrare.
Manifestul se citește o singură dată, cu verificare de fetch/JSON și fallback
HTML dacă nu poate fi citit. Nu se activează global doar pentru a testa importul.

Integrarea finală va necesita legarea helperului la DOM, gestionarea fetch-ului
manifestului și revizuirea poziționării personajului. Acestea nu sunt incluse acum.
Nu reutiliza offseturile personajelor istorice și nici fereastra de 200% a scenei
concept pentru noile imagini. Păstrează toate dimensiunile componentelor,
ordinea, denumirile, patru carduri pe un rând și cinci opțiuni de navigare.
Nu schimba Core, Shield, XP/rangurile E–S, lecțiile, recompensele, inventarul,
stocarea sau backupul. Pachetul nu poate fi considerat gata doar pentru că
fallbackul funcționează.

## Testarea infrastructurii

```sh
/tmp/monarch-graphics-venv/bin/python -m unittest discover -s tests/graphics -p '*_test.py' -v
node tests/graphics/fallback.test.cjs
```

Testele validatorului folosesc imagini sintetice strict în directoare temporare,
pentru cazuri valide/invalide; nu sunt artă provizorie și nu sunt adăugate în assets.
Helperul este testat izolat: imagini lipsă, 404, fallback eșuat, hash schimbat,
resurse neaprobate, ID-uri duplicate și curățarea listenerelor.
Nicio imagine finală sau aplicație de producție nu este modificată de teste.

După integrarea autorizată separat: capturi comparative la 360×800, 390×844,
430×932 și 390×740; toate rangurile E–S; nivel/XP dinamice; navigare; Core,
Shield și backup; persistență cu profil fictiv valid; zero erori JS.
Testele structurale nu înlocuiesc inspecția vizuală și verificarea pe Telegram real.
