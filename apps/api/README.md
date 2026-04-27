# API Kino

Serveur NestJS de Kino, le projet SUPCONTENT orienté cinéma et séries. Il expose l'API REST `/v1`, gère l'authentification, les collections, les critiques, le social, la messagerie, l'admin et le proxy/cache TMDB.

## Lancer en développement

```bash
npm install
cp ../../.env.example .env
npx prisma migrate deploy
npm run start:dev
```

La clé TMDB reste uniquement côté serveur via `TMDB_API_KEY` ou `TMDB_READ_ACCESS_TOKEN`.
Les uploads avatar/bannière passent aussi par le serveur et nécessitent `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET`.

## Commandes utiles

```bash
npm run build
npm run test:e2e
npm run prisma:seed
```

La documentation complète est dans `../../docs/documentation-technique.md` et `../../docs/deploy.md`.
