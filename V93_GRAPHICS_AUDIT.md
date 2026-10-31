# V9.3-A — auditul pachetului grafic

Audit efectuat înainte de integrare. Arhiva utilizatorului a fost extrasă în `/tmp/monarch-v93-graphics-original`, fără a suprascrie fișiere existente. Conține 17 imagini WebP și README.txt. Toate imaginile sunt RGB, complet opace, fără canal alpha; sunt decupaje dintr-o planșă, nu resurse native transparente. Nu conțin niveluri sau XP pictate.

| Fișier | Rezoluție | Octeți | Problemă / decizie |
| --- | --- | ---: | --- |
| hero-e.webp | 1200×199 | 41434 | Rang E și personaj pictate în stânga; utilizabil numai ca fereastră pe decorul din dreapta |
| hero-d.webp | 1200×199 | 47722 | Rang D / personaj în stânga; aceeași precauție |
| hero-c.webp | 1200×202 | 54414 | Rang C / personaj în stânga; aceeași precauție |
| hero-b.webp | 1200×202 | 61424 | Rang B / personaj în stânga; aceeași precauție |
| hero-a.webp | 1200×211 | 69158 | Rang A / personaj în stânga; aceeași precauție |
| hero-s.webp | 1200×211 | 78936 | Rang S; coroana și un vârf de castel ating marginea superioară a sursei; fără reconstrucție prin întindere |
| company-concept-with-text.webp | 1200×313 | 99446 | Conține „Compania mea” și „AETHER CORPORATION”; respins ca banner direct, pentru a păstra titlul/subtitlul HTML fără dublare |
| icon-missions-concept.webp | 163×114 | 6284 | Pergament cu bifă: semnificație potrivită; fără cuvinte; fundal opac, necesită verificare la dimensiunea mobilă |
| icon-academy-concept.webp | 164×114 | 7616 | Carte: potrivită, fără cuvinte; fundal opac |
| icon-projects-concept.webp | 164×114 | 6912 | Plan și compas: potrivită, fără cuvinte; fundal opac |
| icon-objective-concept.webp | 173×114 | 7822 | Țintă: potrivită, fără cuvinte; fundal opac |
| attribute-energy-concept.webp | 101×89 | 3356 | Inimă/puls: poate reprezenta Vitality, fără redenumirea atributului |
| attribute-intelligence-concept.webp | 100×89 | 4102 | Creier: corespunde Intelligence |
| attribute-leadership-concept.webp | 104×89 | 3610 | Grup: corespunde Leadership |
| attribute-discipline-concept.webp | 103×89 | 3638 | Scut: metaforă ambiguă; se păstrează pictograma Discipline existentă |
| attribute-strength-concept.webp | 101×89 | 3152 | Halteră: nu reprezintă Wealth sau Mindset; respinsă pentru mapare automată |
| attribute-focus-concept.webp | 100×89 | 3922 | Reticul: nu reprezintă Wealth sau Mindset; respinsă pentru mapare automată |

## Integrare aprobată de audit

Se păstrează cele opt zone, dimensiunile grilelor și toate datele/funcțiile existente. Antetul folosește exclusiv imaginea rangului calculat de funcția existentă. Imaginile-sursă rămân byte-for-byte WebP, fără conversie cu pierderi suplimentare. O fereastră CSS pe jumătatea dreaptă a panoramei, cu `object-fit: cover`, exclude permanent insigna și personajul pictate în stânga, inclusiv pe ecrane mai late. Nu sunt întinse. AETHER E–S transparent și singura insignă HTML rămân în prim-plan; nivelul și XP-ul sunt HTML dinamice. La eroare se folosește panorama originală deja existentă.

Pictogramele sunt strict decorative, cu `alt=""`; titlurile și indicatorii rămân HTML. Fundalurile lor opace se îmbină prin CSS cu panourile, fără a pretinde transparență nativă și fără a deforma proporțiile. La eroare de încărcare se reafișează simbolul existent. Cele șase atribute și regulile lor rămân neschimbate; trei pictograme au corespondențe clare, celelalte se păstrează.

Bannerul companiei existent nu este înlocuit cu un decupaj nepotrivit sau cu text duplicat. Navigarea inferioară își păstrează etichetele, ordinea, starea activă și funcțiile.

## Resurse care necesită regenerare separată

- Banner panoramic original fără niciun text sau logo încorporat, cu castelul în dreapta și spațiu întunecat pentru titlul HTML în stânga.
- Pictograme native transparente (SVG/PNG/WebP alpha), fără rame decupate; set semantic complet pentru Vitality, Intelligence, Wealth, Leadership, Discipline, Mindset.
- Opțional: variante originale E–S fără insignă/personaj pictate și fără vârfuri tăiate, dacă se dorește afișarea întregii compoziții în locul ferestrei pe decor.

Sursa S are deja detalii care ating/depășesc marginea superioară; nu este afișată ca planșă integrală. Coroana tăiată rămâne în afara ferestrei decorative, iar marginea superioară a decorului este estompată într-un gradient bleumarin pentru a nu expune tăieturi dure. CSS nu poate recupera pixeli inexistenți; o variantă nativă fără tăieri rămâne recomandată. Nu se pretinde reproducere integrală pixel cu pixel. Nu se încarcă simultan cele șase fundaluri: registrul conține URL-uri, iar DOM-ul solicită numai rangul curent. Nu sunt adăugate animații, preloaduri pentru toate rangurile sau biblioteci grafice.

## Buget și validare

Au fost integrate 13 resurse, total 392.790 octeți, verificate byte-for-byte cu arhiva. La un profil se solicită numai fundalul rangului curent (41.434–78.936 octeți), plus patru pictograme de acțiuni și trei de atribute (39.702 octeți împreună): aproximativ 81–119 KB de grafică nouă, nu toate cele șase scene. Resursele existente pentru personaj și banner se păstrează. Nu se adaugă preloaduri pentru toate rangurile sau animații.

Verificarea încadrării se reexecută după încărcarea/eroarea imaginilor și după stabilizarea fonturilor. Cererile din același cadru sunt grupate, pentru a evita măsurări repetate sau activarea temporară nejustificată a modului cu derulare. Pragurile și comportamentul accesibil existent rămân aceleași.

Testele acoperă 108 cazuri Node, 18 combinații de rang și viewport țintă, toate cele șase ranguri la WebView740 pe cele trei lățimi, încărcarea exclusivă a scenei curente, excluderea prin geometrie a insignei/personajului pictate, fallbackul personajului/scenei și al celor șapte pictograme. Sunt păstrate testele de navigare, inventar, XP real, zero scrieri la navigare și zero erori JavaScript. Au fost executate separat suitele Core, Shield, export/import V9.1.2 și compatibilitatea celor 26 de profiluri istorice.

Șase comparații înainte/după (E și S × cele trei viewporturi) confirmă coordonate și dimensiuni identice pentru toate cele opt zone și aceleași fonturi principale. Capturile noi sunt în `docs/screenshots/dashboard-{360,390,430}.jpg`. Toate profilurile de test sunt fictive. Testarea Chromium/Telegram simulat nu certifică Telegram Android sau Samsung real.
