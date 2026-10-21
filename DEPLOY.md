# Як викласти Pocket Aces в інтернет

Увесь проєкт піднімається однією командою через Docker Compose на будь-якому VPS
(Hetzner, DigitalOcean, OVH, Mikrus тощо; вистачить 1 vCPU / 1–2 GB RAM).

```
Інтернет ──HTTPS──▶ Caddy :443 ──▶ web (Next.js :3000) ──/api/...──▶ api (бот + API :4000)
                                                                  └─ том pa-data: db.json і фото
```

Назовні відкритий лише Caddy. Сайт сам пересилає `/api/...` на API всередині Docker-мережі,
тому сайт і API — на одному домені, і вхід через Telegram (cookies) працює без додаткових налаштувань.

## 1. Що потрібно

- VPS з Ubuntu/Debian і встановленим Docker (`curl -fsSL https://get.docker.com | sh`).
- Домен (напр. `pocketaces.pl`), у якого A-запис указує на IP сервера.
- Токен бота від @BotFather (той самий, що в `apps/api/.env`).

## 2. Перший запуск

```bash
git clone https://github.com/ivan-yasenovskyi/Pocket-Aces.git
cd Pocket-Aces

# токен бота
cp apps/api/.env.example apps/api/.env
nano apps/api/.env            # BOT_TOKEN=...

# домен сайту
echo "SITE_DOMAIN=pocketaces.pl" > .env

docker compose up -d --build
```

Caddy сам отримає HTTPS-сертифікат. За хвилину сайт відкриється на `https://pocketaces.pl`.

> Важливо: бот може працювати лише в **одному** місці. Перед запуском на сервері зупини локальний
> `npm start` в `apps/api`, інакше Telegram видаватиме помилку 409 (два процеси з одним токеном).

## 3. Перенести дані з комп'ютера

Тренування, голоси, матчі й прив'язки карток лежать у `apps/api/data/db.json`. Щоб забрати їх на сервер:

```bash
docker compose cp apps/api/data/db.json api:/data/db.json
docker compose restart api
```

## 4. Оновлення

```bash
git pull
docker compose up -d --build
```

Том `pa-data` при цьому не чіпається — дані зберігаються.

## 5. Резервна копія

```bash
docker compose cp api:/data ./backup-$(date +%F)
```

Варто поставити це в `cron` раз на добу.

## 6. Перевірка

- `https://ТВІЙ-ДОМЕН/api/health` → `{"ok":true}`
- `docker compose logs -f api` — журнал бота (синхронізація з лігою, помилки)
- `docker compose ps` — усі три сервіси мають бути `running` / `healthy`

## Змінні середовища

| Де | Змінна | Навіщо |
|---|---|---|
| `apps/api/.env` | `BOT_TOKEN` | токен бота |
| `.env` (корінь) | `SITE_DOMAIN` | домен для HTTPS і превʼю посилань |
| api (у compose) | `NODE_ENV=production` | cookies лише через HTTPS (`Secure`) |
| api (у compose) | `DATA_FILE=/data/db.json` | база на постійному томі; фото — у `/data/photos` |
| web (build arg) | `API_URL=http://api:4000` | куди сайт пересилає `/api/...` |
| web (build arg) | `SITE_URL` | адреса сайту для Open Graph |
