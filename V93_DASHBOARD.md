# V9.3-A — structura exactă a dashboardului

## Audit și limitele modificării

Continuare pe branch-ul existent `feature/v9.3-a-dashboard`, exclusiv în PR #6. Au fost verificate starea Git și commiturile anterioare înainte de editare. Capturile PNG locale din execuțiile anterioare sunt păstrate. Nu sunt modificate Progress Core, Progress Shield, registrul lesson-ids, handler-ele de recompense, inventarul, stocarea sau formatele backupurilor.

Sunt reutilizate `hero()`, `level()`, `rank()`, `counts()`, `unifiedGoals()`, lista reală de misiuni și proiectele `bosses`. Navigarea rămâne delegată prin `data-tab` / `data-adventure`. Personalizarea deschide Hunter și inventarul Hunter24 existent. Panoul Atribute deschide detaliile existente, cu numărul integral de realizări.

Această implementare înlocuiește modul compact anterior care ascundea cardurile MONARCH și înlocuia personajul/atributele cu scurtături. Aceste zone rămân acum vizibile; nu există ecran suplimentar „Panoul MONARCH”.

## Cele opt zone, în ordinea cerută

| Zonă | Structură |
| --- | --- |
| A. Header | Un rând: logo/versiune, indicatori neutri sau calculați, activitate recentă, setări |
| B. Hero | Personaj E–S în stânga; o singură insignă de rang, nivel și XP în dreapta |
| C. Panoul MONARCH | Titlu și EXACT patru carduri egale într-un singur rând: Misiuni, Academie, Proiecte, Obiectiv |
| D. Compania mea | Banner panoramic compact, titlu/subtitlu în stânga, castel în dreapta |
| E. Misiune | Card orizontal auriu: titlu/nume în stânga, XP real/acțiune în dreapta |
| F. Progres | Două coloane egale: obiectiv săptămânal în stânga; proiect sus și citat dedesubt în dreapta |
| G. Personaj și atribute | Două coloane: portret/Personalizează; șase rânduri cu atribute reale |
| H. Navigare | Un rând separat, fără suprapunere: Acasă, Aventuri, Plan, Hunter, Evoluție |

Structura exterioară folosește CSS Grid pentru header, conținut și meniu; conținutul este o grilă cu șase rânduri `minmax(0, …fr)`. Astfel se obțin cele opt zone. Proporțiile sunt ajustate pentru ca cele șase rânduri de atribute și butonul Personalizează să rămână lizibile. Nu se folosește `transform: scale()` pe dashboard. Toate grilele relevante au dimensiuni minime zero. `.monarch-actions` utilizează `repeat(4, minmax(0, 1fr))` la toate lățimile. Modul compact modifică numai spațierea, fără schimbarea coloanelor sau ascunderea secțiunilor. Cardurile nu au scroll interior.

## Sursele datelor

- XP, nivel, rang: aceleași funcții și reguli existente; fără un al doilea sistem XP.
- Misiuni: `tasks + customTasks`, excluzând misiunile finalizate/amânate astăzi. Misiunea afișată este prima disponibilă, iar XP-ul aparține aceleiași misiuni. Dacă există numai text în Plan, acesta nu primește o recompensă inventată.
- Academie: lecțiile fixe nefinalizate și cursul Promptcraft nefinalizat. Indicatorul nu pretinde că numără toate activitățile Awakening.
- Proiecte: `bosses` fără `claimed`. Proiectul prezentat este primul activ; datele existente nu conțin o ordine de prioritate distinctă. Bara folosește `progress/target` numai când ambele valori sunt finite și ținta este pozitivă.
- Obiectiv săptămânal: textul salvat în Plan. Nu există checklist sau țintă numerică, deci se afișează „Progres necuantificat” și un indicator neutru, fără procent sau umplere fictivă.
- Atribute: `counts(category)`, nivel `floor(n/5)+1`, progres nativ `n%5` din 5. Barele reprezintă realizările până la nivelul următor. De exemplu, 6 realizări înseamnă LVL 2 și 1/5. Nu se modifică datele pentru afișare.
- Header: contorul calendarului reprezintă realizările din ultimele șapte zile, fără o țintă inventată. Streak-ul nesalvat este „—”. Accesul la activitate deschide Evoluție; nu se fabrică notificări sau buline de necitit.
- Citatul este text editorial static, fără semnificație de progres/recompensă.

Cardurile deschid modulele existente. Dashboardul nu finalizează misiuni și nu acordă XP. Denumirile și descrierile integrale rămân disponibile în modulele respective. Textele obișnuite din profilul fictiv de verificare nu sunt decupate prin elipsă.

## Viewport Telegram și accesibilitate

CSS utilizează `100dvh`, cu fallback `100vh`. JavaScript folosește minimul valorilor pozitive disponibile din `innerHeight`, `visualViewport.height` și `Telegram.WebApp.viewportHeight` (sau `viewportStableHeight` ca fallback). Antetul nativ Telegram nu este scăzut a doua oară. Sunt urmărite resize și evenimentele Telegram disponibile pentru viewport/safe area. Paddingul folosește maximul dintre inseturile CSS și Telegram, fără însumare dublă.

Pentru datele scurte testate, cele opt zone încap simultan la 360×800, 390×844 și 430×932 px, precum și într-un WebView simulat cu înălțime 740 px și inseturi top 8/bottom 16. Butoanele principale au ținte de minimum 44×44 px, inclusiv fiecare card MONARCH, personalizare, panoul atributelor și meniul inferior. Nu există scroll orizontal sau vertical pe aceste cazuri.

Limita de încadrare nu este o promisiune pentru orice text sau dispozitiv: sub 680 px utili (după safe area), la font rădăcină peste 21 px sau când măsurarea arată text/carduri care depășesc spațiul disponibil, apare o explicație și se păstrează derulare accesibilă a paginii. Coloanele și toate secțiunile rămân prezente. Nu se decupează pagina pentru a simula un test trecut. Textul folosește rem; la 200% se mărește efectiv. Acest caz este o limitare explicită a cerinței single-screen, nu un rezultat trecut. Nu există scroll în carduri și nu este introdus un meniu suplimentar.

## Resurse și comparație cu referința

`CHARACTER_ART` păstrează cele șase WebP furnizate, nemodificate: `assets/characters/aether-{e,d,c,b,a,s}.webp`. Eroarea de încărcare a oricărei forme folosește placeholderul existent, atât în hero cât și în portret. Încadrarea CSS compensează marginile transparente ale imaginilor.

Panorama originală `assets/scenes/monarch-castle-panorama.webp` rămâne bannerul Compania mea și fallbackul hero. Fundalul primar al hero este acum varianta E–S din pachetul utilizatorului, afișată printr-o fereastră pe decorul din dreapta pentru a exclude rangul/personajul deja pictate. Nu se folosește imaginea integrală a interfeței. Auditul tuturor resurselor, inclusiv cele respinse, este în [V93_GRAPHICS_AUDIT.md](V93_GRAPHICS_AUDIT.md). Personajele sau elementele Solo Leveling nu sunt copiate.

Capturile noi reproduc structura referinței: cele opt zone, rândul de patru carduri colorate, misiune aurie, obiectiv/proiect/citat în coloanele cerute și personaj/atribute alăturate. Diferențe rămase: decorul E–S este afișat selectiv din pachet, fără reproducerea întregii planșe sau a întregului dragon; emblema și meniul inferior rămân în HTML/CSS, iar cele patru acțiuni și trei atribute folosesc pictogramele potrivite din pachet; fonturile și bordurile sunt realizate în CSS; datele reale nu permit procente/checklist-uri demonstrative. La 360 px, etichetele atributelor au 11 px la text standard, iar textele principale 12–17 px; reglajele de text Android pot activa fallbackul accesibil.

Resurse opționale pentru o etapă grafică ulterioară: set original coerent de pictograme SVG pentru cele patru acțiuni și meniul inferior, emblemă MONARCH vectorială, un banner fără text și fără decupaje la margini, variante native ale decorurilor E–S și un familiar/efect de energie original separat. Nicio resursă suplimentară nu este necesară pentru structura funcțională livrată.

## Teste și capturi

Rezultate finale: 108 teste Node trecute; 18 combinații exacte viewport/rang; 18 simulări Telegram la 740 px; limite confirmate la 700 px cu 24 px safe area și la 420 px/text 200%; 10 scenarii browser Progress Core; regresia mobilă Progress Shield; nouă scenarii export și 13 scenarii V9.1.2; 26 de profiluri istorice comparate cu V9.0 plus verificări de backup pentru host limitat și profil corupt. Toate suitele au ieșit cu cod 0. Sunt verificate separat navigarea panoului Atribute, inventarul, forma E–S, fallbackul imaginilor, valorile reale, lipsa scrierilor la navigare și absența erorilor JavaScript. Toate profilurile care sunt modificate în teste sunt fictive. Capturi: `docs/screenshots/dashboard-360.jpg` (360×800), `dashboard-390.jpg` (390×844), `dashboard-430.jpg` (430×932). Capturile mai vechi cu alte dimensiuni sunt păstrate ca istoric, nu ca dovezi pentru această structură.

Testarea Chromium și simularea API-urilor Telegram nu certifică Telegram Android/Samsung real. Verificarea pe dispozitiv rămâne necesară. Nu se efectuează merge sau deploy automat.
