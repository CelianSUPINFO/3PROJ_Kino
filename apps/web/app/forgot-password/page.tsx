"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "../components/AuthShell";
import { useLocale } from "../components/AppProviders";

export default function ForgotPasswordPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await apiFetch<{ developmentUrl?: string }>("/auth/password/request", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email }),
      });
      setMessage(
        result.developmentUrl
          ? `${fr ? "Mode développement :" : "Development mode:"} ${result.developmentUrl}`
          : fr
            ? "Si ce compte existe, un lien vient d'être envoyé."
            : "If this account exists, a link has been sent.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fr ? "Envoi impossible." : "Unable to send.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={fr ? "Sécurité" : "Security"}
      title={fr ? "Mot de passe oublié" : "Forgot password"}
      subtitle={fr ? "Recevez un lien valable pendant une heure." : "Get a link valid for one hour."}
      footer={<Link className="block text-center text-sm font-semibold text-kino" href="/login">{fr ? "Retour à la connexion" : "Back to login"}</Link>}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-kino-muted">
          Email
          <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message && <p className="break-words rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-kino-muted">{message}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : fr ? "Envoyer le lien" : "Send link"}</button>
      </form>
    </AuthShell>
  );
}
