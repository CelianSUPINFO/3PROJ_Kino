"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, setTokens } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { AuthShell } from "../components/AuthShell";

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password, displayName }),
          auth: false,
        },
      );
      setTokens(res.accessToken, res.refreshToken);
      router.push("/feed");
    } catch {
      setErr(t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={t("auth.registerEyebrow")}
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerPasswordHint")}
      footer={
        <p className="pt-3 text-center text-sm text-kino-muted">
          {t("auth.hasAccount")}{" "}
          <Link className="font-semibold text-kino hover:text-kino-hot" href="/login">
            {t("auth.signInLink")}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field
          label={t("auth.displayName")}
          value={displayName}
          onChange={setDisplayName}
          required
        />
        <Field label={t("common.email")} type="email" value={email} onChange={setEmail} required />
        <Field
          label={t("common.password")}
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        {err && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? t("auth.creating") : t("auth.createAccount")}
        </button>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-kino-muted">
        {label}
      </span>
      <input
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
      />
    </label>
  );
}
