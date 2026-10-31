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
