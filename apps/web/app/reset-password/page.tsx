"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "../components/AuthShell";
import { useLocale } from "../components/AppProviders";

export default function ResetPasswordPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch("/auth/password/reset", { method: "POST", auth: false, body: JSON.stringify({ token, password }) });
      setMessage(fr ? "Mot de passe modifié. Vous pouvez vous connecter." : "Password updated. You can now log in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fr ? "Lien invalide." : "Invalid link.");
    }
  }

  return (
    <AuthShell eyebrow={fr ? "Sécurité" : "Security"} title={fr ? "Nouveau mot de passe" : "New password"} subtitle={fr ? "Utilisez au moins 8 caractères, une majuscule, une minuscule et un chiffre." : "Use at least 8 characters, one uppercase, one lowercase and one number."} footer={<Link className="block text-center text-sm font-semibold text-kino" href="/login">{fr ? "Retour à la connexion" : "Back to login"}</Link>}>
      <form className="space-y-4" onSubmit={submit}>
        <input aria-label={fr ? "Nouveau mot de passe" : "New password"} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
        {message && <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-kino-muted">{message}</p>}
        <button className="btn-primary w-full" disabled={!token}>{fr ? "Modifier le mot de passe" : "Update password"}</button>
      </form>
    </AuthShell>
  );
}
