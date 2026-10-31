# V9.3-A — adaptarea conceptului MONARCH SYSTEM

## Audit înainte de modificări

app.js oferă hero(), level(), rank(), questItems(), bossItems(), unifiedGoals() și navigarea delegată. Hunter24 oferă inventarul și echiparea. Meniul inferior și modalele existente sunt păstrate. Core V9.2, Shield și lesson-ids rămân nemodificate. Capturile PNG locale din execuția anterioară au fost păstrate fără ștergere.

## Resurse și implementare

Referința vizuală atașată este adaptată prin componente HTML/CSS: logo cu coroană, panou nivel/rang/XP auriu, personaj pe decor violet-albastru electric, carduri transparente cu contur luminos, Compania mea și acțiuni aurii. Imaginea întreagă nu este folosită drept fundal. Layoutul orizontal este transformat în flux vertical pentru telefon, fără statistici fictive, streak-uri inventate sau procente fără sursă.

Cele șase fișiere WebP au fost extrase byte-for-byte din arhiva furnizată în assets/characters/aether-{e,d,c,b,a,s}.webp. Toate sunt RGBA 900×1200. CHARACTER_ART mapează fiecare rang existent la resursa corespunzătoare; src absent sau eroare de încărcare folosește SVG-ul placeholder existent. Imaginile au margini transparente ample, compensate prin încadrare CSS fără modificarea fișierelor originale.

În partea de sus: rang/nivel/XP și personajul. Misiunea zilei începe înainte de 650px pe fixture-ul mobil testat. Obiectivul săptămânal este textul salvat; proiectul este primul proiect activ, etichetat ca atare. Atributele sunt într-o secțiune extensibilă. Inventarul și evoluția au acces separat. Meniul inferior este singurul meniu permanent; scurtăturile duplicate și al doilea card vizual de personaj din Acasă nu mai sunt afișate. Funcțiile Hunter24 sunt accesibile prin pagina Personaj și inventar.

## Verificare vizuală

Capturile 360/390/430px din docs/screenshots/dashboard-*.jpg au fost comparate cu referința: au fost apropiate paleta, contururile violet, progresul auriu, titlul serif al brandului și ierarhia companiei. Nu sunt reproduse castelul panoramic, meniul lateral ori barele numerice fictive; spațiul și datele reale impun adaptarea mobilă. Misiunea și progresul au prioritate față de decor. Animațiile ușoare respectă reduced motion.

## Teste și limite

108 teste Node; 18 combinații viewport/rang (360/390/430 × E–S), cu verificarea resursei, fallbackului, XP real, overflow, reduced motion, un singur nav, inventar, navigare și lipsa scrierilor în profil. Integrarea Progress Core rămâne testată separat. Toate capturile și scrierile de test folosesc profiluri fictive. Testele Chromium nu certifică Telegram Android real. Nu se modifică chei localStorage, reguli XP, recompense, echipamente, lecții sau planificare. Nu se face merge/deploy automat.

## Redesign final — referința aprobată

Zona superioară folosește o singură insignă de rang și o singură afișare a nivelului, alături de XP-ul real și forma E–S. Butonul din brand este acces către setări/evoluție, fără al doilea rang. Nu se afișează streak sau un progres săptămânal fictiv.

Panoul MONARCH: carduri albastre/violet/aurii/turcoaz într-o grilă 2×2. Misiuni = tasks + customTasks nefinalizate și neamânate astăzi; Academie = lecțiile fixe nefinalizate + cursul promptcraft dacă nu este finalizat (nu toate activitățile Awakening); Proiecte = bosses fără claimed; Obiectiv = existența textului săptămânal. Textul de obiectiv nu are criterii/checklist măsurabile, deci nu se inventează un procent. Progresul proiectului este raportul real progress/target. Mesajul motivațional este static, fără valoare de progres.

Compania mea include banner cu castel, misiune, obiectiv săptămânal, primul proiect activ, mesaj motivațional, portret/personalizare și atribute reale. La 390/430px cardurile companiei și zona secundară pot folosi două coloane; la 360px păstrează lizibilitatea prin stivuire. Navigarea permanentă unică este Acasă / Aventuri / Plan / Hunter / Evoluție, mapată la aceleași data-tab existente.

### Castel și resurse lipsă

Repository-ul nu conține picturile panoramice din referință. assets/monarch-castle.svg este un decor vectorial original, provizoriu, creat pentru această compoziție (castel, munți, cer violet și lumină aurie), nu o imagine aleatorie și nici imaginea de referință integrală. Nu este o reproducere fotorealistă a castelului aprobat și nu folosește elemente Solo Leveling.

Pentru fidelitatea finală sunt necesare două ilustrații originale/autorizate:
- assets/scenes/monarch-castle-hero.webp: aproximativ 1600×700 px, cetate gotică pe creastă, cer bleumarin, lumină violet/albastru electric, puncte aurii; spațiu întunecat pentru text/rang în centru-dreapta și personaj în stânga.
- assets/scenes/monarch-company-panorama.webp: aproximativ 1600×400 px, castel auriu pe stâncă în dreapta, apus violet/albastru, jumătatea stângă liberă pentru titlul Compania mea.

Diferențe rămase: decorul este vectorial, nu pictat; energia este realizată în CSS, fără creatura/dragonul din referință (resursă originală separată nepusă la dispoziție); iconografia și portretele sunt adaptate la dimensiunile telefonului. Nu se vor substitui bare numerice demonstrative pentru a imita compoziția.

Verificări finale: 108 teste Node, 18 combinații ecran/rang, fallback, valori reale și stări goale, cele patru acțiuni ale panoului, etichetele meniului, conținut accesibil la finalul paginii fără acoperire de meniu, reduced motion și lipsa erorilor/scrierilor la navigare. Suitele Core, Shield, backup și compatibilitatea celor 26 de profiluri istorice sunt rulate separat. Capturile JPG sunt regenerate și inspectate față de referință; profilul din capturi este fictiv.

Cardul Misiuni deschide lista zilnică reală (componenta quests existentă) împreună cu lecțiile ghidate din Aventuri, astfel încât numărul afișat corespunde misiunilor accesibile. Nu se modifică handler-ele de finalizare sau recompensele.

## Final visual polish — panoramă originală integrată

Resursa assets/scenes/monarch-castle-panorama.webp înlocuiește decorul vectorial în hero și în bannerul Compania mea. Este o panoramă originală generată pentru acest proiect: castel pe creastă, nori violet/albastru, ferestre și lumină aurie, jumătate stângă întunecată pentru text. Sursa PNG generată este păstrată local în generated_images; resursa WebP este codificată pentru livrare, fără modificarea formelor de personaj E–S. Secțiunile anterioare care solicită pregătirea panoramei descriu etapa precedentă și sunt acum depășite: panorama este furnizată în această actualizare.

Personajul principal și portretul sunt mărite, conturul misiunii este auriu mai vizibil, panoul păstrează cele patru culori și valori reale. Cardurile obiectiv/proiect și personalizare nu mai sunt întinse artificial pe înălțimea coloanei vecine.

Atributele folosesc în continuare counts(category) și nivelul existent floor(n/5)+1. Prezentarea adaugă elemente progress native cu max=5 și value=n%5: progresul ciclului curent către următorul nivel. Etichetele arată numărul real de realizări și fracția 0–4/5; nu se inventează procente, valori de atribut sau un sistem XP secundar. Bara revine la 0/5 când începe un nivel nou. Testele verifică explicit 3 realizări → LVL1, 3/5 și 6 realizări → LVL2, 1/5, fără scriere în profil.

Capturile de la 360/390/430px sunt regenerate și comparate cu referința. Diferențe intenționate: profilul fictiv de test nu are toate atributele avansate; obiectivul săptămânal rămâne text fără procent; nu sunt afișate streak sau checklist-uri inexistente. Nu este inclus un dragon/familiar — ar necesita o resursă originală suplimentară și nu trebuie confundat cu o recompensă de inventar. Panorama furnizată este o compoziție nouă, nu o copie pixel cu pixel a referinței. Testarea Telegram Android real rămâne necesară.
