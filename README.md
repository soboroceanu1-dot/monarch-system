# MONARCH SYSTEM — Life Ascension (prototip 1.0)

Aplicație web statică, compatibilă cu Telegram Mini Apps. Interfață în română.

## Testare rapidă

Deschide `index.html` într-un browser modern. Pentru testare mai fidelă pe calculator:

```bash
cd monarch_app
python -m http.server 8000
```

Accesează `http://localhost:8000` în browserul calculatorului.

## Publicare ca Telegram Mini App

1. Publică cele trei fișiere (`index.html`, `style.css`, `app.js`) pe un hosting static cu HTTPS, de exemplu GitHub Pages sau Cloudflare Pages.
2. În Telegram, deschide **@BotFather**, creează un bot cu `/newbot` și păstrează tokenul secret. Nu îl introduce în codul frontend.
3. Configurează Mini App URL în setările botului din BotFather (Menu Button / Mini App) folosind adresa HTTPS a aplicației.
4. Deschide Mini App din bot și testează.

## Limitări importante

- Progresul este salvat în `localStorage` pe dispozitivul/browserul curent, nu pe server.
- Nu există încă autentificare verificată de server, sincronizare între dispozitive, notificări automate sau AI integrat.
- Backup manual: Setări → Export JSON; importul înlocuiește progresul local.
- Jurnalele de sănătate și finanțe sunt opționale. Evită informațiile sensibile pe dispozitive partajate.
- Butonul „Pas verificat” pentru BOSS înregistrează auto-raportarea utilizatorului; nu este verificare independentă.

## Arhitectura versiunii următoare

Backend Python/FastAPI + bază de date PostgreSQL, verificare server-side a `Telegram.WebApp.initData`, sincronizare per utilizator, reguli anti-duplicare XP, backup și notificări opționale prin bot.
