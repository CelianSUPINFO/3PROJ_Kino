import type { Metadata } from "next";
import { LegalLayout } from "../components/LegalLayout";

export const metadata: Metadata = { title: "Conditions d’utilisation" };

export default function TermsPage() {
  return <LegalLayout title="Conditions d’utilisation">
    <p>Utilisez Kino dans le respect des autres membres et des lois applicables.</p>
    <p>Les contenus haineux, harcelants, illégaux, trompeurs ou destinés au spam peuvent être supprimés et les comptes concernés suspendus.</p>
    <p>Les utilisateurs restent responsables des critiques, commentaires et messages qu’ils publient.</p>
  </LegalLayout>;
}
