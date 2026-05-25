# Manuel Utilisateur — Kino

## 1) Présentation

Kino est un réseau social orienté films/séries.  
Vous pouvez rechercher des oeuvres TMDB, gérer votre bibliothèque, publier des critiques et interagir avec la communauté.

## 2) Démarrage rapide

1. Ouvrir l’application web (`/`) ou mobile.
2. Créer un compte (`Inscription`) ou se connecter.
3. Utiliser la page `Recherche` pour trouver une oeuvre.

## 2.1 Captures d’écran du rendu

Les captures de démonstration sont à placer dans `docs/screenshots/` avec les noms suivants avant la génération de l’archive finale:

- `01-home-web.png`
- `02-search-web.png`
- `03-title-web.png`
- `04-library-web.png`
- `05-admin-web.png`
- `06-home-mobile.png`
- `07-title-mobile.png`
- `08-messages-mobile.png`

Parcours recommandés pour les captures : accueil web, recherche, fiche œuvre avec critique, bibliothèque, admin, accueil mobile, fiche mobile et messages.

## 3) Fonctions principales

## 3.1 Compte

- Inscription email + mot de passe.
- Connexion classique.
- Connexion Google (si activée dans la config).
- Déconnexion depuis la navigation web ou les paramètres mobile.

## 3.2 Recherche

- Barre de recherche unifiée:
  - oeuvres TMDB
  - utilisateurs
  - listes publiques

## 3.3 Fiche média

Depuis une fiche film/série:

- définir un statut (`A voir`, `En cours`, `Terminé`, `Abandonné`)
- ajouter l’oeuvre à une liste
- publier ou modifier une critique
- liker et commenter les critiques
- signaler une critique inappropriée

## 3.4 Bibliothèque

- Consulter ses statuts d’oeuvres
- Créer des listes personnalisées
- Rendre une liste publique/privée
- Supprimer une liste

## 3.5 Social

- Suivre / ne plus suivre un utilisateur
- Voir les abonnés et abonnements sur un profil
- Fil d’actualité des personnes suivies
- Notifications (likes, commentaires, follows), en temps réel sur web et rafraîchies régulièrement sur mobile
- Messagerie privée (si follow mutuel)

## 3.6 Paramètres et données personnelles

- Modifier pseudo, bio, site, avatar
- Choisir thème/langue
- Exporter ses données:
  - JSON
  - CSV

## 4) Modération (admin)

Un compte admin peut:

- visualiser les signalements
- marquer un signalement résolu/rejeté
- supprimer une critique
- bannir un utilisateur

La page admin est visible dans la navigation web lorsqu’un compte administrateur est connecté.

## 5) Bonnes pratiques utilisateur

- Ne pas partager d’informations sensibles dans les messages.
- Respecter les autres utilisateurs dans les critiques/commentaires.
- Signaler les contenus inappropriés.
