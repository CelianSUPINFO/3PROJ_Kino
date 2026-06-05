"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useLocale } from "./AppProviders";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="relative -mx-4 grid min-h-[70vh] overflow-hidden rounded-3xl border border-white/10 bg-kino-panel shadow-card md:-mx-6 md:grid-cols-2">
      <div className="relative hidden md:block">
        <img
          src="https://image.tmdb.org/t/p/original/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-kino-ink/40 via-kino-ink/70 to-kino-ink" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-kino">
              <img src="/kino-logo.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="text-display text-2xl font-bold">kino</span>
          </Link>
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
              {t("authShell.tagline")}
            </p>
            <h2 className="text-display mt-2 text-4xl font-bold leading-tight text-white">
              {t("authShell.headline")}
            </h2>
            <p className="mt-3 text-white/70">{t("authShell.body")}</p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
              {eyebrow}
            </p>
            <h1 className="text-display mt-1 text-3xl font-bold text-white md:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-kino-muted">{subtitle}</p>}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
