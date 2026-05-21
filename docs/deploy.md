# Kino — Deployment Guide

This guide covers three deployment paths:

1. **Local development** (hot reload, Postgres in Docker, native Node for API/Web/Mobile)
2. **Production-like stack with Docker Compose** (containerized API + Web + Postgres, plus Redis available for future cache/rate-limit needs)
3. **Mobile publishing with EAS** (Android APK/AAB, iOS IPA)

All commands are written for Windows PowerShell. On macOS/Linux the same commands work with `bash`.

---

## 1. Prerequisites

- Node.js **22.x** (`node -v`)
- npm **10+** (`npm -v`)
- Docker Desktop with Docker Compose V2 (`docker compose version`)
- (Mobile) **Expo Go** on your phone or an Android/iOS simulator
- (Mobile publishing) An Expo account and `eas-cli` (`npm i -g eas-cli`)

### Clone & install

```bash
git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
npm install
```

### Configure environment

Copy the template and fill in secrets:

```powershell
Copy-Item .env.example .env
```

Minimum values to set:

- `JWT_ACCESS_SECRET` — any long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `TMDB_API_KEY` **or** `TMDB_READ_ACCESS_TOKEN` — create an account at <https://www.themoviedb.org/settings/api>
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — only if you want Google OAuth; otherwise leave empty, the API still boots
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — required for profile avatar and banner uploads
- `CORS_ORIGINS` — comma-separated allowed web origins, for example `http://localhost:3000,http://localhost:3001`

`NEXT_PUBLIC_API_URL` (web) and `EXPO_PUBLIC_API_URL` (mobile) default to `http://localhost:4000/v1`.

---

## 2. Local development

Spin up Postgres and Redis, then run API and Web natively for hot reload. Redis is included in the stack so the deployment shape stays stable if cache or rate-limit features are enabled later.

```powershell
docker compose up -d db redis

# Shell 1 — API (NestJS, http://localhost:4000)
cd apps/api
Copy-Item ../../.env .env            # or maintain a dedicated apps/api/.env
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Shell 2 — Web (Next.js, http://localhost:3000 in native dev)
cd apps/web
npm run dev

# Shell 3 — Mobile (Expo)
cd apps/mobile
npm install
npm start
```

Health checks:

- API root: `GET http://localhost:4000/v1` → `"Hello World!"`
- API health: `GET http://localhost:4000/v1/health` → `{ "status": "ok", ... }`
- Web native: <http://localhost:3000>

### Seed data

`apps/api/prisma/seed.ts` creates 8–12 regular test users plus 2 admins, all with enough rated titles to trigger the personalized “Tonight?” recommendation. Credentials are printed at the end of the seed output.

---

## 3. Production-like stack (Docker Compose)

The root `docker-compose.yml` builds multi-stage, non-root container images with built-in healthchecks and proper `depends_on: service_healthy` ordering.

### Build & start

```powershell
# Uses values from .env at repo root
docker compose build
docker compose up -d
```

Services:

| Service | Host port | Purpose                                                            |
| ------- | --------- | ------------------------------------------------------------------ |
| `db`    | 5432      | Postgres 16 (volume `kino_pg`)                                     |
| `redis` | 6379      | Redis 7, optional extension point for distributed cache/rate-limit |
| `api`   | 4000      | NestJS (runs Prisma migrations on boot)                            |
| `web`   | 3001      | Next.js standalone runtime                                         |

Open <http://localhost:3001>. The web container talks to the API on the Docker network; the browser calls `NEXT_PUBLIC_API_URL` from your `.env` (default `http://localhost:4000/v1`).

### Inspect health

```powershell
docker compose ps
$apiId = docker compose ps -q api
docker inspect --format='{{json .State.Health}}' $apiId
```

Healthchecks used:

- `db`: `pg_isready`
- `redis`: `redis-cli ping`
- `api`: `curl http://localhost:4000/v1/health`
- `web`: `curl http://localhost:3000/`

### Stop & clean

```powershell
docker compose down           # keep volumes
docker compose down -v        # wipe db + redis data
```

### Deploying remotely

The images are self-contained. A typical deployment:

1. Provision a VM (2 vCPU / 4 GB RAM is plenty for a demo).
2. Install Docker Engine + Compose plugin.
3. Copy the repo (or just `docker-compose.yml` + `.env`), then `docker compose pull && docker compose up -d`.
4. Put Nginx/Caddy in front of ports `3001` (web) and `4000` (api) with TLS.
5. Set `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`, `NEXT_PUBLIC_API_URL`, and `EXPO_PUBLIC_API_URL` to the public URLs.

---

## 4. Mobile publishing with EAS

`apps/mobile/eas.json` exposes three profiles:

| Profile       | Distribution | Channel       | `EXPO_PUBLIC_API_URL` default     |
| ------------- | ------------ | ------------- | --------------------------------- |
| `development` | internal     | `development` | `http://localhost:4000/v1`        |
| `preview`     | internal     | `preview`     | `https://kino-api-9ipb.onrender.com/v1` |
| `preview-device` | internal | `preview`     | `https://kino-api-9ipb.onrender.com/v1` |
| `production`  | store        | `production`  | `https://kino-api-9ipb.onrender.com/v1` |

The production API URL is already configured. Render's free instance sleeps after inactivity, so the first mobile or web request can take roughly 30 to 60 seconds. Upgrade the Render instance when continuous availability is required.

For Render, configure the health check path as `/healthz`. This route is intentionally exposed without the `/v1` prefix.

### Native push notifications

Native Android/iOS notifications use Expo Push. After `eas init` has generated the real Expo `projectId`, a native build requests notification permission and registers its Expo push token with the API automatically.

### First-time setup

```powershell
npm install -g eas-cli
cd apps/mobile
eas login
eas init            # generates a projectId; paste it into app.json -> extra.eas.projectId
```

### Build

```powershell
# APK for QA testers (Android)
eas build -p android --profile preview

# iOS simulator build (no Apple Developer account required)
eas build -p ios --profile preview

# Android APK for a physical device
eas build -p android --profile preview-device

# Store-ready builds
eas build -p android --profile production
eas build -p ios --profile production
```

### Submit to stores

```powershell
eas submit -p android --profile production --latest
eas submit -p ios --profile production --latest
```

Store metadata lives in the respective consoles (Google Play / App Store Connect). The bundle identifier / package are already set in `app.json`:

- iOS: `com.cultureconnect.kino`
- Android: `com.cultureconnect.kino`

### OTA updates (optional)

The `runtimeVersion.policy` is set to `appVersion` and each profile pins a `channel`. Once a native build is published, you can ship JS-only updates with:

```powershell
eas update --branch preview --message "UI fixes"
eas update --branch production --message "Release 1.0.1"
```

---

## 5. Troubleshooting

| Symptom                                          | Fix                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `P1001: Can't reach database server`             | `docker compose up -d db` and wait for the healthcheck                                    |
| Web shows empty carousels                        | `TMDB_API_KEY` / `TMDB_READ_ACCESS_TOKEN` missing — check `.env` and restart the API      |
| Profile image upload fails                       | Cloudinary env vars missing or invalid — check API environment and restart the API        |
| `EADDRINUSE: :::4000`                            | Another Node process is running the API — `taskkill /F /IM node.exe` on Windows           |
| `OAuth2Strategy requires a clientID option`      | Leave `GOOGLE_CLIENT_*` unset **or** set both; do not leave one empty                     |
| Mobile cannot reach the API on a physical device | Replace `localhost` with your machine's LAN IP in `EXPO_PUBLIC_API_URL`                   |
| Next.js build complains about `useSearchParams`  | Pages using it must be wrapped in `<Suspense>` — already handled in `app/search/page.tsx` |

---

## 6. Useful commands

```powershell
# Rebuild a single service
docker compose build api
docker compose up -d --no-deps api

# Tail logs
docker compose logs -f api web

# Run Prisma Studio against the running DB
cd apps/api; npx prisma studio

# Web lint + typecheck
cd apps/web; npm run lint; npx tsc --noEmit

# API e2e
cd apps/api; npm run test:e2e

# Mobile typecheck
cd apps/mobile; npx tsc --noEmit
```
