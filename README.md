# Kino

Kino est une plateforme sociale dédiée aux films et aux séries. Le projet réunit une API NestJS, un site Next.js et une application mobile Expo pour Android et iOS.

## Production

- Web : <https://kino-web-ten.vercel.app>
- API : <https://kino-api-9ipb.onrender.com>
- Santé API : <https://kino-api-9ipb.onrender.com/healthz>

Le web est hébergé sur Vercel, l'API sur Render et la base PostgreSQL sur Neon. Les images sont stockées avec Cloudinary et les métadonnées de films et séries proviennent de TMDB via l'API Kino.

## Fonctionnalités

- Authentification par e-mail et Google
- Recherche de films, séries, membres et listes
- Bibliothèque personnelle et listes personnalisées
- Critiques, notes, commentaires et likes
- Profils, abonnements et fil d'activité
- Notifications et messagerie
- Recommandations « Ce soir »
- Modération et administration
- Export et suppression des données utilisateur

## Architecture

```text
apps/
  api/       API NestJS, Prisma et PostgreSQL
  web/       Application web Next.js
  mobile/    Application mobile Expo
```

Les clients web et mobile communiquent uniquement avec l'API NestJS. Les secrets et les appels TMDB restent côté serveur.

## Prérequis

- Node.js 22
- npm 10 ou supérieur
- PostgreSQL ou Docker
- Une clé API TMDB ou un token TMDB v4

## Installation

```bash
git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
npm install
```

Copier `.env.example` vers `apps/api/.env`, puis renseigner les variables nécessaires. Pour le web local, créer `apps/web/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
```

## Base de données

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

## Développement local

Depuis la racine du projet :

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

- API : <http://localhost:4000/v1>
- Web : <http://localhost:3000>

## Docker

```bash
docker compose up --build
```

## Validation

```bash
npm run verify
```

Cette commande compile l'API et le web, vérifie le TypeScript mobile et exécute les tests e2e de l'API.

## Mobile

Les profils EAS utilisent l'API de production.

```bash
cd apps/mobile
eas build -p android --profile preview-device
eas build -p android --profile production
eas build -p ios --profile production
```

## Variables principales

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `TMDB_API_KEY` ou `TMDB_READ_ACCESS_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Ne jamais versionner les fichiers `.env` ni les secrets de production.
