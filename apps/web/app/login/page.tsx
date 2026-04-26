"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, setTokens } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { AuthShell } from "../components/AuthShell";

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
          auth: false,
        },
      );
      setTokens(res.accessToken, res.refreshToken);
      router.push("/feed");
    } catch {
      setErr(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={t("auth.welcomeBack")}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <p className="pt-3 text-center text-sm text-kino-muted">
          {t("auth.newToKino")}{" "}
          <Link className="font-semibold text-kino hover:text-kino-hot" href="/register">
            {t("auth.createAccount")}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <LabeledInput
          label={t("common.email")}
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <LabeledInput
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
          {loading ? t("auth.signingIn") : t("auth.loginTitle")}
        </button>
      </form>
      <div className="relative py-1 text-center text-xs uppercase tracking-widest text-kino-muted">
        <span className="relative z-10 bg-kino-panel px-3">{t("common.or")}</span>
        <span className="absolute left-0 top-1/2 h-px w-full bg-white/10" aria-hidden />
      </div>
      <a
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
        href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1"}/auth/google`}
      >
        <GoogleIcon /> {t("auth.google")}
      </a>
    </AuthShell>
  );
}

function LabeledInput({
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.6 6.1 29.6 4 24 4 16.1 4 9.3 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.5-2.1 14.2-5.5l-6.6-5.4c-2 1.4-4.6 2.3-7.6 2.3-5.4 0-9.7-3.5-11.3-8l-6.6 5.1C9.2 39.6 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C40.7 36.7 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
