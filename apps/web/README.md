# Web Kino

Client web Next.js de Kino. L'application consomme uniquement l'API NestJS (`NEXT_PUBLIC_API_URL`) et ne contacte jamais TMDB directement.

## Lancer en développement

```bash
npm install
npm run dev
```

Par défaut Next.js écoute sur `http://localhost:3000`. En Docker Compose, le service web est exposé sur `http://localhost:3001`.

## Pages principales

- `/` : accueil, tendances et recommandations.
- `/search` : recherche TMDB, utilisateurs et listes publiques.
- `/title/[type]/[id]` : fiche média, bibliothèque, critiques, commentaires et signalement.
- `/library`, `/feed`, `/notifications`, `/messages`, `/settings`.
- `/admin` : modération des signalements pour les comptes administrateurs.

Voir `../../docs/manuel-utilisateur.md` pour les parcours utilisateur.
