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

```powershell
git --version
node --version
npm --version

git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
npm install
cd apps/mobile
npm install
cd ../..
```

Copier `.env.example` vers `apps/api/.env`, puis renseigner `DATABASE_URL`, `JWT_ACCESS_SECRET` et une seule des variables TMDB. Avant toute migration ou seed, vérifier que `DATABASE_URL` vise bien PostgreSQL local et non une base distante. Créer ensuite les fichiers propres aux clients :

Ne pas écraser un fichier `apps/api/.env` existant sans avoir vérifié sa destination.

```powershell
Copy-Item .env.example apps/api/.env
Select-String '^DATABASE_URL=' apps/api/.env
Set-Content apps/web/.env.local 'NEXT_PUBLIC_API_URL=http://localhost:4000/v1'

# Téléphone physique : remplacer l'adresse par l'IPv4 locale du PC.
Set-Content apps/mobile/.env 'EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/v1'

# Émulateur Android standard :
# Set-Content apps/mobile/.env 'EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/v1'
```

## Base de données

La méthode locale recommandée utilise Docker uniquement pour PostgreSQL :

```powershell
docker compose up -d db
docker compose ps db

cd apps/api
npx prisma generate
npx prisma migrate deploy
# Facultatif : ajoute les données d'exemple.
npm run prisma:seed
cd ../..
```

## Développement local

Depuis la racine du projet, ouvrir trois terminaux. Démarrer l'API en premier et contrôler sa sonde avant les clients :

```powershell
# Terminal 1
npm run dev:api

# Contrôle dans un autre terminal
Invoke-RestMethod http://localhost:4000/healthz

# Terminal 2
npm run dev:web

# Terminal 3
npm run dev:mobile
```

Adresses attendues :

- API : <http://localhost:4000/v1>
- Santé API : <http://localhost:4000/healthz>
- Web : <http://localhost:3000>
- Mobile : QR affiché par Expo/Metro

Après les essais, arrêter les trois processus avec `Ctrl+C`. Si PostgreSQL a été lancé avec la commande ci-dessus :

```powershell
docker compose stop db
```

Pour un téléphone physique, `EXPO_PUBLIC_API_URL` doit viser l'adresse IPv4 locale du PC, jamais `localhost`. Le pare-feu doit autoriser le port `4000`.

Si le port `4000` est occupé, utiliser par exemple le port `4100` pour l’API, puis reporter ce port dans `NEXT_PUBLIC_API_URL` et `EXPO_PUBLIC_API_URL` avant de redémarrer les trois applications.

Les commandes directes restent :

```powershell
npm run dev:api
npm run dev:web
npm run dev:mobile
```

## Docker

Docker Compose lit automatiquement le fichier `.env` situé à la racine lorsqu'il existe. Le lancement minimal requiert une clé ou un token TMDB valide. Pour que l'application ouverte dans Expo Go utilise l'API Docker, `EXPO_PUBLIC_API_URL` doit contenir l'adresse IP locale du PC :

```powershell
Copy-Item .env.example .env
# Renseigner TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN dans .env
# Remplacer l'adresse d'exemple par l'adresse IPv4 locale du PC :
# EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/v1
docker compose up --build
```

La variable peut aussi être définie sans créer de fichier `.env` :

```powershell
$env:TMDB_API_KEY='votre_cle_tmdb'
docker compose up --build
```

Google OAuth, Cloudinary et Resend sont optionnels au démarrage. Renseigner leurs variables pour activer respectivement la connexion Google, l'envoi d'avatars/bannières et les e-mails.

Compose lance PostgreSQL, l'API, le web et le serveur Expo/Metro. Le QR Expo est visible dans la sortie de Compose ou avec :

```powershell
docker compose logs -f mobile
```

Scanner ce QR avec Expo Go exécute l'application sur le téléphone. Docker lance le serveur Expo, mais ne peut pas exécuter directement Android ou iOS dans un conteneur. Le téléphone et le PC doivent avoir accès à Internet pour le tunnel Expo, et l'adresse IP locale utilisée par `EXPO_PUBLIC_API_URL` doit être joignable depuis le téléphone.

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
- `RESEND_API_KEY`
- `EMAIL_FROM`

Ne jamais versionner les fichiers `.env` ni les secrets de production.
