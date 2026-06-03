import type { Metadata } from "next";
import { LegalLayout } from "../components/LegalLayout";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return <LegalLayout title="Mentions légales">
    <p>Kino est un projet Culture Connect édité par son propriétaire. Contact : via le dépôt officiel du projet.</p>
    <p>Hébergement : Vercel pour le site, Render pour l’API, Neon pour la base de données et Cloudinary pour les images.</p>
    <p>Les données relatives aux films et séries proviennent de TMDB. Kino n’est ni approuvé ni certifié par TMDB.</p>
  </LegalLayout>;
}
