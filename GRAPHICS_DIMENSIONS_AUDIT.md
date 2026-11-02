# MONARCH V9.3 — audit dimensional și recuperare

## Proveniență și limite

Sursă inspectată: PR #6, `feature/v9.3-a-dashboard`, commit
`d72ff6c3b96a8625d9a7bedd1e09339b97909507`. PR deschis, fără merge și fără
conflicte raportate la verificare. Cele șapte commituri existente sunt păstrate.
Nu exista anterior `GRAPHICS_DIMENSIONS_AUDIT.md` sau un JSON de măsurători în
arborele/istoricul ramurii consultate. Documentele existente sunt
`V93_GRAPHICS_AUDIT.md` și `V93_DASHBOARD.md`; rămân rapoarte istorice.

Măsurători noi: `docs/graphics/measurements.json`, cu valori brute din
`getBoundingClientRect()` și `getComputedStyle()`, după decodarea imaginilor și
stabilizarea a două cadre. Chromium mobil simulat, text standard, profil fictiv
`profile()` din `tests/browser-dashboard.cjs`, rang E, 425 XP. Fără safe-area
Telegram în măsurătorile tabelului; simulările separate la 740 px au inseturi
8/16 px. Aceste condiții nu trebuie confundate. Sunt observații la commitul
indicat, nu o promisiune pentru orice font, profil sau dispozitiv Telegram real.

## Dimensiuni CSS observate (px, rotunjire la două zecimale)

| Element | 360×800 | 390×844 | 430×932 | 390×740 |
|---|---|---|---|---|
| Hero exterior | 340×131,34 | 370×140,25 | 410×158,05 | 370×121,42 |
| Fereastră fundal Hero | 338×129,34 | 368×138,25 | 408×156,05 | 368×119,42 |
| Fereastră personaj Hero | 169×129,34 | 184×138,25 | 204×156,05 | 184×119,42 |
| Fiecare card MONARCH | 76,50×59,70 | 84×66 | 94×78,58 | 84,50×56,72 |
| Container pictogramă MONARCH | 33,59×24 | 33,59×24 | 33,59×24 | 29,39×21 |
| Banner exterior | 340×46,36 | 370×49,50 | 410×55,78 | 370×42,86 |
| Fereastră Personalizare | 153×74,53 | 168×85 | 188×105,94 | 168×62,86 |
| Pictogramă atribut | 14×14 | 14×14 | 14×14 | 14×14 |
| Meniu inferior | 340×58 | 370×58 | 410×58 | 370×54 |

Hero are raport interior 2,6132 / 2,6618 / 2,6146 / 3,0815:1.
Bannerul exterior are raport 7,3340 / 7,4747 / 7,3501 / 8,6329:1.
Pictogramele MONARCH au container de aproximativ 1,4:1, nu pătrat; imaginile
pătrate vor folosi `contain` fără modificarea containerului. Atributele sunt 1:1.
Navigarea actuală folosește caractere cu font de 22 px, nu imagini de 22×22;
22×22 este o țintă de integrare viitoare, explicit propusă în manifest.
În dashboard meniul este `position: static` ancorat jos în grila ecranului;
în celelalte vizualizări există reguli `fixed`. Nu s-a schimbat acest comportament.

## Inventar verificat și respingeri

Repository-ul sursă are 58 fișiere urmărite. Sunt prezente:

- Șase `assets/characters/aether-{e,d,c,b,a,s}.webp`, 900×1200, RGBA,
  și `aether-placeholder.svg`.
- Șase scene `assets/graphics/concept/hero-{e,d,c,b,a,s}.webp`: E/D 1200×199,
  C/B 1200×202, A/S 1200×211; toate RGB opace.
- Patru `icon-*-concept.webp`: missions 163×114, academy/projects 164×114,
  objective 173×114; toate RGB opace.
- Trei `attribute-*-concept.webp`: energy 101×89, intelligence 100×89,
  leadership 104×89; toate RGB opace.
- `assets/scenes/monarch-castle-panorama.webp`, 2172×724 RGB, și
  `assets/monarch-castle.svg`.

Cele 17 WebP din arhiva descrisă de auditul istoric nu sunt toate în repository:
numai 13 sunt în `concept`. Bannerul cu text și cele trei atribute respinse nu
sunt fișiere disponibile aici. Nu se pretinde verificarea unei arhive absente.

Personajele RGBA au conținut într-o bandă îngustă cu tăieri verticale; unele
ranguri conțin fragmente străine în dreapta. Alpha bounds observate (x0,y0,x1,y1):
E (310,305,589,1200), D (311,338,589,1200), C (310,338,589,1200),
B (310,323,589,1200), A (311,261,589,1200), S (310,259,589,1200).
Transparența singură nu înseamnă o resursă validă. Toate sunt de înlocuit.

Pictogramele MONARCH au rame tăiate și fundal opac. Cele trei atribute grafice
au rame/fundal opac. Scenele au rang/personaj deja pictate; CSS-ul existent
folosește `width:200%`, `cover`, aliniere dreapta și gradient pentru a le exclude.
Nu sunt acceptate ca resurse finale. Wealth, Discipline, Mindset și cele cinci
opțiuni de navigare nu au fișiere finale individuale; folosesc simboluri.

Portretul Personalizare este 430×573 CSS px, top −145 px, într-o fereastră de
62,86–105,94 px înălțime. Personajul Hero este 440×587, top −135 px.
Capturile confirmă încadrarea greșită a portretului; aceasta nu se repară prin
redimensionarea componentei sau ascunderea fragmentelor deteriorate.
Panorama companiei poate rămâne temporar. Noul banner final nu există.

## Contractul propus pentru cele 23 de exporturi

Manifest: `assets/graphics/v9.3/manifest.json`. Dimensiunile de export sunt
recomandări contractuale noi, nu dimensiuni CSS măsurate:

| Grup | Număr | Export | Raport | Format | Estimare octeți/fișier |
|---|---:|---|---|---|---|
| Hero E–S | 6 | 1640×640 | 2,5625:1 | WebP opac | 120000–300000 |
| Aether Monarch | 1 | 900×1200 | 3:4 | PNG RGBA | 300000–900000 |
| Compania mea | 1 | 1640×220 | 7,4545:1 | WebP opac | 70000–180000 |
| MONARCH | 4 | 144×144 | 1:1 | PNG RGBA | 8000–30000 |
| Atribute | 6 | 84×84 | 1:1 | PNG RGBA | 2000–10000 |
| Navigare | 5 | 132×132 | 1:1 | PNG RGBA | 4000–18000 |

Pentru Hero: margini verticale decorative de 10%, zona din dreapta 49–98%
liniștită pentru text dinamic, fără text/rang/personaj pictat. Banner: stânga
60% liniștită, castel în dreapta, margini verticale decorative de 10%.
`cover` presupune decupare verticală variabilă; fără subiect critic la margini.
Pentru PNG: `contain`, margini transparente, subiect central 80% (personaj 84%),
cap/accesorii complete. Personajul necesită poziționare revizuită în ambele
ferestre existente după primirea imaginii finale; nu reutilizăm offseturile vechi.
Validatorul cere o bordură exterioară transparentă de minimum un pixel, nu
pretinde că poate recunoaște automat capul sau artefactele. Zonele sigure,
textele și calitatea se aprobă manual. Estimările de greutate sunt avertizări,
nu motive de compresie automată cu pierderi.

## Dovezi și limite ale testării auditului

O copie temporară a suitei dashboard a adăugat viewportul 390×740, măsurători
JSON și capturi în `/tmp`, fără modificarea suitei/proiectului:
24 combinații rang/viewport și 24 simulări Telegram 740 au trecut cu cod 0.
Sunt verificate zonele, rândul de patru carduri, meniul cu cinci opțiuni,
navigarea, accesul la inventar, XP dinamic, fallbackurile istorice, localStorage
nemodificat la navigare și lipsa erorilor JS. Aceasta NU certifică imaginile.
Profilurile sunt fictive; nu au fost citite/modificate date reale.

Rularea inițială Node a raportat șapte fișiere trecute; cele 108 cazuri declarate
istoric în PR nu sunt reconfirmate individual de acel sumar. O reverificare a
fost întreruptă. Telegram Android/Samsung real nu este certificat.
Sub 680 px utili și la text foarte mărit există fallback accesibil cu scroll,
nu un rezultat single-screen reușit. Nu s-a făcut merge sau deploy.

## Etapa autorizată: infrastructură

Cele 23 de resurse finale lipsesc intenționat, fără imagini provizorii.
Raportul `docs/graphics/validation-report.json` indică 23 lipsă, 0 trecute.
Modulul opțional `assets/graphics/final-assets.js` nu este încărcat de aplicație;
nu schimbă imaginile curente, CSS-ul, progresul sau datele. Integrarea finală
rămâne dezactivată. Instrucțiuni: `docs/graphics/IMPORT.md`.
