# Kino — SUPCONTENT (Culture Connect)

Monorepo : API **NestJS** (`apps/api`), client **Next.js** (`apps/web`), **Expo** (`apps/mobile`). Les métadonnées films/séries proviennent de **TMDB uniquement côté serveur** (jamais depuis le navigateur ou l’app mobile).

Dépôt Git : `https://github.com/CelianSUPINFO/3PROJ_Kino.git`

## Prérequis

- Node.js 20+ (recommandé) ou 22
- npm 10+
- PostgreSQL 16+ (ou Docker pour `docker compose`)
- Compte développeur [TMDB](https://www.themoviedb.org/settings/api) (clé API **v3** ou token **v4**)

## Configuration

1. Copier [`.env.example`](.env.example) vers `apps/api/.env` et renseigner au minimum `DATABASE_URL`, `JWT_ACCESS_SECRET`, et **un des deux**: `TMDB_API_KEY` **ou** `TMDB_READ_ACCESS_TOKEN`. Pour l'upload avatar/bannière, renseigner aussi `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET`.
2. Pour le web : `apps/web/.env.local` avec `NEXT_PUBLIC_API_URL=http://localhost:4000/v1`.
3. OAuth Google (barème) : créer des identifiants OAuth dans Google Cloud Console ; autoriser la redirect URI `http://localhost:4000/v1/auth/google/callback` (adapter en prod).

## Base de données

```bash
cd apps/api
npx prisma migrate deploy
# ou en dev : npx prisma migrate dev
npx prisma generate
```

### Données de démo (comptes test + admins)

```bash
cd apps/api
npm run prisma:seed
```

Comptes générés:

- Admins: `admin1@kino.local`, `admin2@kino.local`
- Utilisateurs: `alice@kino.local`, `bob@kino.local`, `chloe@kino.local`, etc.
- Mot de passe commun (dev): `Kino1234!`

## Lancer en local

Terminal 1 — API (port 4000) :

```bash
cd apps/api
npm run start:dev
```

Terminal 2 — Web (port 3000 par défaut Next, ou 3001 si configuré) :

```bash
cd apps/web
npm run dev
```

Terminal 3 — Mobile :

```bash
cd apps/mobile
npx expo start
```

Sur émulateur Android, remplacer dans `apps/mobile/app.json` → `extra.apiUrl` par `http://10.0.2.2:4000/v1` pour joindre l’API sur la machine hôte.

## Docker Compose

À la racine du projet :

```bash
docker compose up --build
```

Services : `db` (Postgres), `redis` (optionnel futur), `api`, `web`. Définir `TMDB_API_KEY` ou `TMDB_READ_ACCESS_TOKEN` dans l’environnement ou un fichier `.env` non versionné.

## Cible actuelle

Le projet est actuellement préparé pour un usage **local** (API + Web + Mobile en développement).

## Structure API (préfixe `/v1`)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /auth/google`, `GET /auth/google/callback`
- `GET /media/search`, `GET /media/discover/:type`, `GET /media/:type/:tmdbId` (cache TMDB)
- Bibliothèque, critiques, fil, notifications, messagerie, admin — voir les modules Nest dans `apps/api/src`

## Documentation de rendu

- Manuel utilisateur: `docs/manuel-utilisateur.md`
- Doc technique: `docs/documentation-technique.md`
- Guide déploiement: `docs/deploy.md`
- Checklist de démo: `docs/checklist-demo.md`
- Historique Git **privé** jusqu’à la date de rendu Moodle

## Secrets

Ne jamais committer `.env`, clés TMDB, secrets JWT ou mots de passe base.

## Couverture fonctionnelle

- Web : recherche, fiches média, bibliothèque/listes, critiques, likes, commentaires, signalement, profils, follow, fil, notifications temps réel, messagerie avec état non lu, paramètres, export RGPD JSON/CSV, suppression de compte et admin.
- Mobile : consultation rapide, recherche, fiches média, statuts, publication d’avis, avis communautaires, recommandations “Ce soir”, fil, notifications par polling, messages avec compteur non lu, paramètres, export JSON et suppression de compte.
- Serveur : toute la logique métier, tous les appels TMDB et les uploads Cloudinary passent par l’API NestJS.
