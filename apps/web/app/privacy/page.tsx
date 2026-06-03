import type { Metadata } from "next";
import { LegalLayout } from "../components/LegalLayout";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return <LegalLayout title="Politique de confidentialité">
    <p>Kino conserve les informations nécessaires au compte, aux critiques, listes, abonnements, messages et notifications.</p>
    <p>Les données ne sont pas vendues. Elles sont transmises uniquement aux prestataires nécessaires au fonctionnement du service.</p>
    <p>Vous pouvez exporter vos données et supprimer votre compte depuis les paramètres. La suppression entraîne l’effacement des données liées au compte.</p>
  </LegalLayout>;
}
