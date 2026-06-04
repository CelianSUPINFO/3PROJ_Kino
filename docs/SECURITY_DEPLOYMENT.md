# Sécurité avant diffusion publique

Les secrets suivants ont déjà été exposés pendant le développement. Ils doivent être renouvelés avant une diffusion publique.

## Rotation obligatoire

1. **Neon**
   - Réinitialiser le mot de passe du rôle de production.
   - Remplacer `DATABASE_URL` dans `apps/api/.env` et Render.

2. **Google Cloud OAuth**
   - Créer un nouveau secret pour le client OAuth Web.
   - Remplacer `GOOGLE_CLIENT_SECRET` dans `apps/api/.env` et Render.

3. **Cloudinary**
   - Réinitialiser l'API secret.
   - Remplacer `CLOUDINARY_API_SECRET` dans `apps/api/.env` et Render.

4. **JWT**
   - Générer une nouvelle valeur longue et aléatoire.
   - Remplacer `JWT_ACCESS_SECRET` dans `apps/api/.env` et Render.
   - La rotation déconnectera les sessions existantes.

5. **TMDB**
   - Révoquer puis recréer le jeton de lecture.
   - Remplacer `TMDB_READ_ACCESS_TOKEN` dans `apps/api/.env` et Render.

## E-mails transactionnels

La récupération de mot de passe et la validation d'adresse fonctionnent avec Resend :

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Kino <no-reply@votre-domaine.fr>
```

Sans `RESEND_API_KEY`, les liens de test sont retournés uniquement lorsque `NODE_ENV` n'est pas `production`.

## Vérifications après rotation

- Relancer un déploiement Render.
- Tester inscription, connexion classique et Google.
- Tester l'envoi d'une image Cloudinary.
- Tester la récupération de mot de passe.
- Vérifier `GET /healthz` sur l'API de production.
