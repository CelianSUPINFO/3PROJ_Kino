# Découpage Git proposé pour Kino

Objectif : transformer le gros travail actuel en un historique Git progressif, crédible et facile à expliquer. Le découpage suit 4 grandes parties, comme une équipe de 4 étudiants qui avance par petits incréments.

Important : ne pas utiliser `git add .`. Les commandes ci-dessous ajoutent des chemins précis. Quand un fichier mélange plusieurs sujets (`apps/mobile/App.tsx`, `apps/api/prisma/schema.prisma`, `package-lock.json`), utiliser `git add -p` si vous voulez un historique très fin.

## Avant de commencer

Créer une sauvegarde récupérable de l'état actuel :

```powershell
$sha = git stash create "backup-before-kino-split"
if ($sha) { git update-ref "refs/backup/kino-split-$(Get-Date -Format yyyyMMddHHmmss)" $sha }
git status --short
```

Créer une branche de travail :

```powershell
git switch -c feature/kino-finalisation
```

## Partie 1 - Socle backend, données et déploiement

But : montrer que l'équipe a d'abord construit le serveur, la base et les fondations de déploiement.

### Push 1.1 - Schéma métier et migrations

```powershell
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/20260418140000_init/migration.sql
git add apps/api/prisma/migrations/20260420170000_add_swipe_decision/migration.sql
git add apps/api/prisma/migrations/20260425165000_unique_report_per_user/migration.sql
git commit -m "feat(api): model social library and moderation data"
git push -u origin feature/kino-finalisation
```

### Push 1.2 - Configuration API et sécurité de base

```powershell
git add .env.example
git add apps/api/package.json package-lock.json
git add apps/api/src/main.ts
git add apps/api/src/common/guards/admin.guard.ts
git add apps/api/src/common/guards/optional-jwt.guard.ts
git commit -m "chore(api): configure validation cors and guards"
git push
```

### Push 1.3 - Authentification et utilisateurs

```powershell
git add apps/api/src/auth/auth.controller.ts
git add apps/api/src/auth/auth.service.ts
git add apps/api/src/users/users.controller.ts
git add apps/api/src/users/users.module.ts
git add apps/api/src/users/users.service.ts
git commit -m "feat(api): add auth profiles follow and data export"
git push
```

### Push 1.4 - Docker et seed de démonstration

```powershell
git add apps/api/Dockerfile docker-compose.yml
git add apps/api/prisma/seed.ts
git add apps/api/src/app.controller.ts apps/api/src/app.module.ts
git add apps/api/src/app.service.ts
git commit -m "chore(devops): prepare docker stack and demo seed"
git push
```

## Partie 2 - Fonctionnalités métier SUPCONTENT

But : faire apparaître progressivement les fonctionnalités notées côté API.

### Push 2.1 - TMDB, cache et recherche

```powershell
git add apps/api/src/media/media.controller.ts
git add apps/api/src/media/tmdb.service.ts
git add apps/api/src/home/
git add apps/api/src/recommendations/
git add apps/api/src/engagement/
git commit -m "feat(api): add tmdb cache home and recommendations"
git push
```

### Push 2.2 - Bibliothèque et listes

```powershell
git add apps/api/src/library/library.controller.ts
git add apps/api/src/library/library.service.ts
git add apps/api/src/library/dto/
git commit -m "feat(api): manage library statuses and custom lists"
git push
```

### Push 2.3 - Critiques, commentaires et signalements

```powershell
git add apps/api/src/reviews/reviews.controller.ts
git add apps/api/src/reviews/reviews.module.ts
git add apps/api/src/reviews/reviews.service.ts
git add apps/api/src/reviews/dto/
git commit -m "feat(api): add reviews comments likes and reports"
git push
```

### Push 2.4 - Social, notifications, messages et admin

```powershell
git add apps/api/src/feed/feed.controller.ts
git add apps/api/src/messages/messages.controller.ts
git add apps/api/src/messages/messages.service.ts
git add apps/api/src/notifications/notifications.controller.ts
git add apps/api/src/notifications/notifications.gateway.ts
git add apps/api/src/admin/admin.controller.ts
git add apps/api/src/admin/admin.service.ts
git commit -m "feat(api): add feed notifications messages and moderation"
git push
```

## Partie 3 - Clients web et mobile

But : montrer la construction progressive des interfaces et de l'expérience utilisateur.

### Push 3.1 - Design system web

```powershell
git add apps/web/package.json package-lock.json
git add apps/web/tailwind.config.ts
git add apps/web/app/globals.css
git add apps/web/app/layout.tsx
git add apps/web/app/components/
git commit -m "feat(web): add kino layout and reusable components"
git push
```

### Push 3.2 - Parcours publics web

```powershell
git add apps/web/lib/api.ts
git add apps/web/app/page.tsx
git add apps/web/app/search/page.tsx
git add apps/web/app/title/[type]/[id]/page.tsx
git add apps/web/app/list/[id]/page.tsx
git commit -m "feat(web): add discovery search and title pages"
git push
```

### Push 3.3 - Parcours connectés web

```powershell
git add apps/web/app/login/page.tsx
git add apps/web/app/register/page.tsx
git add apps/web/app/oauth/
git add apps/web/app/library/page.tsx
git add apps/web/app/feed/page.tsx
git add apps/web/app/u/[id]/page.tsx
git add apps/web/app/notifications/page.tsx
git add apps/web/app/messages/
git add apps/web/app/settings/
git commit -m "feat(web): add account social library and messages"
git push
```

### Push 3.4 - Recommandations et admin web

```powershell
git add apps/web/app/ce-soir/
git add apps/web/app/admin/
git add apps/web/app/components/Nav.tsx
git add apps/web/Dockerfile
git add apps/web/README.md
git commit -m "feat(web): add tonight recommendations and admin tools"
git push
```

### Push 3.5 - Application mobile

```powershell
git add apps/mobile/App.tsx
git add apps/mobile/app.json
git add apps/mobile/eas.json
git add apps/mobile/src/api.ts
git add apps/mobile/src/components/
git add apps/mobile/src/theme.ts
git commit -m "feat(mobile): add expo client for quick kino flows"
git push
```

## Partie 4 - Documentation, tests et rendu final

But : finaliser comme un rendu académique sérieux.

### Push 4.1 - Tests API ciblés

```powershell
git add apps/api/test/app.e2e-spec.ts
git add apps/api/src/app.controller.spec.ts
git commit -m "test(api): cover core demo endpoints"
git push
```

### Push 4.2 - README projet et apps

```powershell
git add README.md
git add apps/api/README.md
git add apps/web/README.md
git commit -m "docs: document kino project structure"
git push
```

### Push 4.3 - Documentation technique et déploiement

```powershell
git add docs/documentation-technique.md
git add docs/deploy.md
git commit -m "docs: complete technical and deployment guides"
git push
```

### Push 4.4 - Manuel utilisateur et checklist de démo

```powershell
git add docs/manuel-utilisateur.md
git add docs/checklist-demo.md
git add docs/screenshots/README.md
git commit -m "docs: add user manual and demo checklist"
git push
```

## Vérifications à lancer avant le dernier push

```powershell
npm run build:api
npm run build:web
npm run test:e2e -w api
cd apps/mobile
npx tsc --noEmit
cd ../..
git status --short
```

## Variante avec 4 branches

Si vous préférez 4 grandes branches au lieu d'une seule branche :

1. `feature/kino-api-foundation`
2. `feature/kino-api-features`
3. `feature/kino-clients`
4. `feature/kino-docs-tests`

Dans ce cas, chaque partie devient une branche/PR. La branche 3 dépend naturellement des endpoints de la branche 2, donc il est plus simple de les merger dans l'ordre.

## Rythme crédible sur 1 mois

- Semaine 1 : socle API, Prisma, Docker, auth.
- Semaine 2 : TMDB, bibliothèque, critiques, social.
- Semaine 3 : web complet et début mobile.
- Semaine 4 : mobile, admin, docs, tests, corrections UX.

Chaque journée peut contenir 3 à 4 petits pushs : un modèle ou endpoint, un écran, une correction UX, puis un test ou une documentation.
