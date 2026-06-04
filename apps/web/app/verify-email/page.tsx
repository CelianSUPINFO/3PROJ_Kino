"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "../components/AuthShell";
import { useLocale } from "../components/AppProviders";

export default function VerifyEmailPage() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [token, setToken] = useState("");
  const [message, setMessage] = useState(fr ? "Validation en cours..." : "Verifying...");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/email/verify", { method: "POST", auth: false, body: JSON.stringify({ token }) })
      .then(() => setMessage(fr ? "Votre adresse e-mail est validée." : "Your email address is verified."))
      .catch((error) => setMessage(error instanceof Error ? error.message : fr ? "Lien invalide." : "Invalid link."));
  }, [fr, token]);

  return (
    <AuthShell eyebrow={fr ? "Sécurité" : "Security"} title={fr ? "Validation e-mail" : "Email verification"} footer={<Link className="block text-center text-sm font-semibold text-kino" href="/">{fr ? "Retour à Kino" : "Back to Kino"}</Link>}>
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-kino-muted">{message}</p>
    </AuthShell>
  );
}
