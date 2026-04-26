# Planning Git détaillé après initialisation

Le dépôt GitHub est maintenant réinitialisé proprement sur `main` avec uniquement le commit initial. Les branches suivantes partent donc toutes de `main` et peuvent avancer en parallèle sans mélanger les responsabilités.

Dépôt : `https://github.com/CelianSUPINFO/3PROJ_Kino.git`

## État de départ propre

Le GitHub doit contenir uniquement la branche `main` avec le commit initial. Toutes les branches de travail doivent être recréées depuis ce `main`.

Avant de commencer, chaque personne doit éviter de repartir d'un ancien dossier du projet. Si un ancien clone existe déjà sur le PC, le renommer ou le supprimer, puis recloner le dépôt :

```powershell
cd ..
ren 3PROJ_Kino 3PROJ_Kino_old
git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
git switch main
git pull origin main
```

Si le dossier `3PROJ_Kino` n'existe pas encore :

```powershell
git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
git switch main
git pull origin main
```

Vérification attendue :

```powershell
git branch -a
git log --oneline -5
```

Le résultat doit montrer `main` et le commit `Initial commit`. S'il y a d'anciennes branches locales ou des commits déjà avancés, ne pas les utiliser.

## Règles anti-problèmes

- Ne jamais pousser directement sur `main`.
- Ne jamais pousser la branche locale `local/final-work`.
- Ne jamais utiliser `git add .`.
- Ajouter uniquement les fichiers indiqués dans le push en cours.
- Travailler sur une seule branche par personne.
- Créer les branches depuis `main`, pas depuis une ancienne branche.
- Faire `git fetch origin` puis `git merge origin/main` avant chaque série de modifications.
- Ne pas modifier les mêmes fichiers qu'une autre personne si ce n'est pas prévu.
- Ne jamais ajouter `.env`, `node_modules`, `.next`, `dist`, `coverage`, `apps/api/uploads` ou des captures temporaires non prévues.
- En cas de doute, faire `git status --short` avant le commit.

## Règle de messages de commit propres

Les commits doivent être faits dans le terminal avec `git commit -m`. Le message doit rester court, lisible et centré sur le changement livré.

Avant chaque push, vérifier le dernier message :

```powershell
git log -1 --format=%B
```

Le message ne doit contenir aucune ligne automatique ou hors sujet.

Si une ligne non prévue apparaît avant d'avoir push :

```powershell
git commit --amend -m "message propre"
git log -1 --format=%B
git push
```

Si la mention apparaît après avoir push, prévenir Célian avant de continuer. Ne pas refaire l'historique seul.

## Erreurs fréquentes et correction

### GitHub affiche `ahead and behind`

Cela veut dire que la branche n'a pas récupéré les derniers changements de `main`.

```powershell
git switch <branche>
git fetch origin
git merge origin/main
git push
```

### `git push` refuse avec `non-fast-forward`

Cela veut dire que la branche distante a avancé.

```powershell
git switch <branche>
git pull origin <branche>
git push
```

Si Git demande de résoudre un conflit, ne pas forcer le push.

### Conflit pendant un merge

Ouvrir les fichiers indiqués par Git, garder la bonne version, puis :

```powershell
git status
git add <fichiers corrigés>
git commit
git push
```

### Mauvais fichiers ajoutés au commit

Avant de commit :

```powershell
git status --short
git restore --staged <fichier>
```

Après un commit mais avant le push :

```powershell
git reset --soft HEAD~1
git status --short
git add <bons fichiers>
git commit -m "message propre"
git push
```

### Mauvaise branche

Si les modifications ont été faites sur `main` ou sur la mauvaise branche, ne pas push. Créer la bonne branche en gardant les modifications :

```powershell
git switch -c <bonne-branche>
git status --short
```

Puis faire le commit sur cette branche.

### Fichier secret ajouté par erreur

Ne jamais push. Retirer le fichier du commit :

```powershell
git restore --staged .env
git status --short
```

Si le secret a déjà été push, il faut changer la clé ou le mot de passe concerné.

## Répartition

| Personne | Branche                        | Périmètre                                                                 |
| -------- | ------------------------------ | ------------------------------------------------------------------------- |
| Célian   | `feature/celian-api-quality`   | Stabilisation API, sécurité, notifications, tests et intégration          |
| Yann     | `feature/yann-api-features`    | Fonctionnalités métier API : TMDB, bibliothèque, critiques, social, admin |
| Louison  | `feature/louison-web-client`   | Client web : pages, composants, UX, admin web                             |
| Léo-Paul | `feature/leo-paul-mobile-docs` | Mobile, documentation, captures et rendu final                            |

## Initialisation des branches

À faire une fois par personne :

```powershell
git clone https://github.com/CelianSUPINFO/3PROJ_Kino.git
cd 3PROJ_Kino
git switch main
git pull
```

### Célian

```powershell
git switch -c feature/celian-api-quality
git push -u origin feature/celian-api-quality
```

### Yann

```powershell
git switch -c feature/yann-api-features
git push -u origin feature/yann-api-features
```

### Louison

```powershell
git switch -c feature/louison-web-client
git push -u origin feature/louison-web-client
```

### Léo-Paul

```powershell
git switch -c feature/leo-paul-mobile-docs
git push -u origin feature/leo-paul-mobile-docs
```

## Règle pour chaque push

Avant de travailler, toujours récupérer `main` dans sa branche. Cela évite le message GitHub `X commits ahead and Y commits behind main`.

```powershell
git switch <branche>
git fetch origin
git merge origin/main
git status
```

Après les modifications :

```powershell
git status --short
git add <fichiers>
git commit -m "<message>"
git push
```

Ne pas utiliser `git add .`. Ajouter seulement les fichiers du push.

Important :

- Ce merge quotidien fait `main` vers la branche de travail.
- Il ne faut pas merger la branche de travail vers `main` à chaque push.
- La branche de travail est mergée vers `main` seulement à la fin du périmètre, via Pull Request.

Résumé :

```text
Tous les jours : main -> ma branche
Fin de fonctionnalité : ma branche -> main
```

## Si la branche est en retard sur GitHub

Si GitHub affiche :

```text
This branch is X commits ahead of and Y commits behind main
```

faire :

```powershell
git switch <branche>
git fetch origin
git merge origin/main
git push
```

Après ça, GitHub doit idéalement afficher seulement :

```text
This branch is X commits ahead of main
```

## Pushs de Célian - API qualité et intégration

### Push C1 - App health et module API

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add apps/api/src/app.controller.ts apps/api/src/app.service.ts apps/api/src/app.module.ts
git commit -m "fix(api): stabilize app health and module wiring"
git push
```

### Push C2 - CORS et configuration runtime

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add .env.example apps/api/src/main.ts
git commit -m "chore(api): configure cors origins from environment"
git push
```

### Push C3 - Validation et guards

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add apps/api/src/common/guards/admin.guard.ts apps/api/src/common/guards/optional-jwt.guard.ts
git commit -m "chore(api): improve auth guard behavior"
git push
```

### Push C4 - Notifications temps réel

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add apps/api/src/notifications/notifications.controller.ts
git add apps/api/src/notifications/notifications.gateway.ts
git commit -m "feat(api): add realtime notification channel"
git push
```

### Push C5 - Tests API ciblés

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add apps/api/test/app.e2e-spec.ts apps/api/src/app.controller.spec.ts
git commit -m "test(api): cover core demo flows"
git push
```

### Push C6 - Nettoyage et vérification API

```powershell
git switch feature/celian-api-quality
git fetch origin
git merge origin/main
git add apps/api/README.md
git commit -m "docs(api): describe server setup and commands"
git push
```

## Pushs de Yann - Fonctionnalités métier API

### Push Y1 - TMDB et recherche

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/media/media.controller.ts apps/api/src/media/tmdb.service.ts
git commit -m "feat(api): proxy tmdb search and details"
git push
```

### Push Y2 - Cache TMDB et recherche avancée

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/media/tmdb.service.ts apps/api/src/search/
git commit -m "feat(api): add tmdb cache and unified search"
git push
```

### Push Y3 - Bibliothèque et statuts

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/library/library.controller.ts apps/api/src/library/library.service.ts apps/api/src/library/dto/
git commit -m "feat(api): manage library statuses"
git push
```

### Push Y4 - Listes personnalisées

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/library/library.controller.ts apps/api/src/library/library.service.ts
git commit -m "feat(api): add custom public and private lists"
git push
```

### Push Y5 - Critiques et notes

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/reviews/reviews.controller.ts apps/api/src/reviews/reviews.module.ts apps/api/src/reviews/reviews.service.ts apps/api/src/reviews/dto/
git commit -m "feat(api): add ratings and reviews"
git push
```

### Push Y6 - Likes, commentaires et signalements

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/reviews/reviews.controller.ts apps/api/src/reviews/reviews.service.ts
git add apps/api/prisma/migrations/20260425165000_unique_report_per_user/migration.sql
git commit -m "feat(api): add review interactions and reports"
git push
```

### Push Y7 - Profils publics et follow

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/users/users.controller.ts apps/api/src/users/users.module.ts apps/api/src/users/users.service.ts
git commit -m "feat(api): add profiles and follow system"
git push
```

### Push Y8 - Fil d'activité

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/feed/feed.controller.ts apps/api/src/library/library.service.ts apps/api/src/reviews/reviews.service.ts apps/api/src/users/users.service.ts
git commit -m "feat(api): expose social activity feed"
git push
```

### Push Y9 - Messagerie privée

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/messages/messages.controller.ts apps/api/src/messages/messages.service.ts
git commit -m "feat(api): add mutual-follow messaging"
git push
```

### Push Y10 - Modération admin

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/admin/admin.controller.ts apps/api/src/admin/admin.service.ts
git commit -m "feat(api): add moderation dashboard endpoints"
git push
```

### Push Y11 - Accueil et recommandations

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/src/home/ apps/api/src/recommendations/ apps/api/src/engagement/
git add apps/api/prisma/migrations/20260420170000_add_swipe_decision/migration.sql
git commit -m "feat(api): add home engagement and tonight picks"
git push
```

### Push Y12 - Données de démo

```powershell
git switch feature/yann-api-features
git fetch origin
git merge origin/main
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "chore(api): add demo seed data"
git push
```

## Pushs de Louison - Client web

### Push L1 - Design system web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/layout.tsx apps/web/app/globals.css apps/web/tailwind.config.ts
git add apps/web/app/components/
git commit -m "feat(web): add kino visual system"
git push
```

### Push L2 - Client API web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/lib/api.ts apps/web/package.json package-lock.json
git commit -m "feat(web): add authenticated api client"
git push
```

### Push L3 - Auth web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/login/page.tsx apps/web/app/register/page.tsx apps/web/app/oauth/
git commit -m "feat(web): add login register and oauth screens"
git push
```

### Push L4 - Accueil et recherche

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/page.tsx apps/web/app/search/page.tsx
git commit -m "feat(web): add home and search pages"
git push
```

### Push L5 - Fiche média web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/title/[type]/[id]/page.tsx
git commit -m "feat(web): add title review and report flow"
git push
```

### Push L6 - Bibliothèque web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/library/page.tsx apps/web/app/list/[id]/page.tsx
git commit -m "feat(web): add library and custom lists"
git push
```

### Push L7 - Social web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/u/[id]/page.tsx apps/web/app/feed/page.tsx
git commit -m "feat(web): add profiles follow and feed"
git push
```

### Push L8 - Notifications et messages

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/notifications/page.tsx apps/web/app/messages/
git commit -m "feat(web): add notifications and messages"
git push
```

### Push L9 - Admin et paramètres

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/admin/ apps/web/app/settings/ apps/web/app/components/Nav.tsx
git commit -m "feat(web): add admin and settings pages"
git push
```

### Push L10 - Ce soir

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/app/ce-soir/
git commit -m "feat(web): add tonight recommendations"
git push
```

### Push L11 - Docker et README web

```powershell
git switch feature/louison-web-client
git fetch origin
git merge origin/main
git add apps/web/Dockerfile apps/web/README.md
git commit -m "docs(web): document web client setup"
git push
```

## Pushs de Léo-Paul - Mobile et documentation

### Push LP1 - Configuration mobile

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add apps/mobile/app.json apps/mobile/eas.json apps/mobile/src/api.ts
git commit -m "feat(mobile): add expo configuration and api client"
git push
```

### Push LP2 - UI mobile partagée

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add apps/mobile/src/theme.ts apps/mobile/src/components/
git commit -m "feat(mobile): add shared mobile ui"
git push
```

### Push LP3 - Parcours mobile principaux

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add apps/mobile/App.tsx
git commit -m "feat(mobile): add browsing auth and library flows"
git push
```

### Push LP4 - Social mobile

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add apps/mobile/App.tsx
git commit -m "feat(mobile): add feed notifications and messages"
git push
```

### Push LP5 - Polish mobile

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add apps/mobile/App.tsx apps/mobile/app.json
git commit -m "fix(mobile): polish settings and logout"
git push
```

### Push LP6 - README projet

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add README.md
git commit -m "docs: complete project readme"
git push
```

### Push LP7 - Documentation technique

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add docs/documentation-technique.md docs/deploy.md
git commit -m "docs: complete technical and deployment guides"
git push
```

### Push LP8 - Manuel et checklist

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add docs/manuel-utilisateur.md docs/checklist-demo.md docs/screenshots/README.md
git commit -m "docs: add user manual and demo checklist"
git push
```

### Push LP9 - Planning Git

```powershell
git switch feature/leo-paul-mobile-docs
git fetch origin
git merge origin/main
git add docs/git-decoupage-commits.md docs/git-decoupage-commits-detaille.md
git commit -m "docs: add git workflow planning"
git push
```

## Ordre de merge

Les branches peuvent avancer en parallèle, mais les merges dans `main` doivent suivre cet ordre :

1. `feature/yann-api-features`
2. `feature/celian-api-quality`
3. `feature/louison-web-client`
4. `feature/leo-paul-mobile-docs`

## Commandes de merge locales

### Merge Yann

```powershell
git switch main
git pull origin main
git merge --no-ff feature/yann-api-features -m "merge: integrate Yann API features"
npm run build:api
npm run test:e2e -w api
git push origin main
```

### Merge Célian

```powershell
git switch main
git pull origin main
git merge --no-ff feature/celian-api-quality -m "merge: integrate Celian API quality work"
npm run build:api
npm run test:e2e -w api
git push origin main
```

### Merge Louison

```powershell
git switch main
git pull origin main
git merge --no-ff feature/louison-web-client -m "merge: integrate Louison web client"
npm run build:web
git push origin main
```

### Merge Léo-Paul

```powershell
git switch main
git pull origin main
git merge --no-ff feature/leo-paul-mobile-docs -m "merge: integrate Leo-Paul mobile and docs"
cd apps/mobile
npx tsc --noEmit
cd ../..
npm run build:api
npm run build:web
npm run test:e2e -w api
git push origin main
```

## Tag final

```powershell
git switch main
git pull origin main
git tag -a v1.0-rendu -m "Rendu final SUPCONTENT Kino"
git push origin v1.0-rendu
```
