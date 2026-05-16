# Etat de preparation a la mise en ligne

## Deja operationnel

- Web deploye sur Vercel et API deployee sur Render.
- PostgreSQL Neon, migrations Prisma et stockage Cloudinary.
- Authentification e-mail et Google, refresh automatique et deconnexion serveur.
- Recherche d'oeuvres, de membres et de listes publiques avec suivi.
- Bibliotheque, listes personnalisables, critiques et fonctions sociales.
- Interfaces web responsives et application Expo Android/iOS.
- Builds API/web et typecheck mobile automatises par `npm run verify`.

## Session utilisateur

Le web conserve les jetons dans le stockage local du navigateur et le mobile dans AsyncStorage. Fermer puis rouvrir l'application reconnecte automatiquement l'utilisateur tant que le refresh token est valide. La deconnexion revoque le refresh token dans l'API puis efface le stockage local.

## Notifications

Les notifications dans l'application fonctionnent en temps reel sur le web et par rafraichissement sur mobile. Les preferences e-mail et push sont enregistrees, mais l'envoi natif d'e-mails et de notifications systeme necessite encore le choix et la configuration d'un fournisseur externe.

## Dernieres actions externes

1. Executer `eas login`, puis `eas init` dans `apps/mobile` pour remplacer le `projectId` provisoire.
2. Generer un APK avec `eas build -p android --profile preview-device`.
3. Souscrire aux comptes Google Play Console et Apple Developer avant publication en stores.
4. Passer Render sur une instance payante si les demarrages a froid ne sont pas acceptables.
5. Configurer un domaine personnalise et les outils de suivi SEO avant communication publique.
