# Checklist Démo Locale (Correction)

## Préparation

- [ ] API lancée (`apps/api`, port 4000)
- [ ] Web lancé (`apps/web`)
- [ ] Mobile lancé (`apps/mobile`, Expo)
- [ ] Base PostgreSQL disponible
- [ ] Clé TMDB configurée

## Parcours minimum à montrer

### Auth

- [ ] Inscription utilisateur
- [ ] Connexion utilisateur
- [ ] Déconnexion

### TMDB et recherche

- [ ] Recherche oeuvre (film/série)
- [ ] Filtres recherche (type, année, note minimale, tri)
- [ ] Infinite scroll actif + bouton retour en haut
- [ ] Ouverture fiche détaillée
- [ ] Vérification retour cache (`source=cache` après second appel)

### Ce soir ? (Smash / Pass)

- [ ] Ouvrir l'onglet "Ce soir ?" (web + mobile)
- [ ] Voir affiche, titre, genres, note moyenne
- [ ] Action "Smash" puis "Pass"
- [ ] Ouvrir la fiche depuis une carte recommandée
- [ ] Vérifier feedback micro-interaction (toast/status)

### Homepage enrichie

- [ ] Films du moment visibles (5 à 10 selon écran)
- [ ] Dernières notes visibles
- [ ] Derniers films vus visibles si connecté
- [ ] Rangées catégories + lien "Voir tout"
- [ ] Badges engagement visibles (streak + compteurs hebdo)

### Bibliothèque et listes

- [ ] Changer statut d’une oeuvre
- [ ] Voir la bibliothèque (`/library/me`)
- [ ] Créer une liste
- [ ] Ajouter une oeuvre à une liste
- [ ] Basculer public/privé

### Critiques et social

- [ ] Publier une critique
- [ ] Liker une critique
- [ ] Commenter une critique
- [ ] Suivre un autre utilisateur

### Feed et notifications

- [ ] Ouvrir fil d’actualité
- [ ] Voir notification non lue
- [ ] Marquer notification lue

### Messagerie

- [ ] Créer relation follow mutuel
- [ ] Ouvrir conversation
- [ ] Envoyer un message
- [ ] Voir la notification de nouveau message
- [ ] Rouvrir la conversation et vérifier le passage en lu

### Paramètres / RGPD

- [ ] Modifier bio/pseudo/thème/langue
- [ ] Export JSON
- [ ] Export CSV
- [ ] Suppression de compte testée sur un compte de démonstration non nécessaire

### Admin

- [ ] Ouvrir page admin (compte admin)
- [ ] Traiter un signalement
- [ ] Supprimer critique signalée
- [ ] Bannir un utilisateur

## Données de test à préparer

- [ ] Lancer `npm run prisma:seed` dans `apps/api`
- [ ] Connexion admin: `admin1@kino.local` / `Kino1234!`
- [ ] Connexion user: `alice@kino.local` / `Kino1234!`

## Vérifications techniques avant rendu

- [ ] `npm run build:api`
- [ ] `npm run build:web`
- [ ] `cd apps/mobile && npx tsc --noEmit`
- [ ] `docker compose up --build`
- [ ] Aucun fichier `.env` réel dans l’archive
- [ ] Aucune clé TMDB, Google ou JWT en clair dans le code
