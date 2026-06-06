"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, clearTokens, getAccessToken, logoutSession } from "@/lib/api";
import { useApp } from "../components/AppProviders";

type Me = {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  website?: string | null;
  avatarUrl?: string | null;
  theme: string;
  locale: string;
  notifyPush: boolean;
  notifyEmail: boolean;
};

export default function SettingsPage() {
  const { setTheme, setLocale, t } = useApp();
  const [me, setMe] = useState<Me | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function save() {
    if (!me) return;
    setLoading(true);
    setMsg(null);
    try {
      const updated = await apiFetch<Me>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: me.displayName,
          bio: me.bio,
          website: me.website ?? "",
          avatarUrl: me.avatarUrl ?? "",
          theme: me.theme,
          locale: me.locale,
          notifyPush: me.notifyPush,
          notifyEmail: me.notifyEmail,
        }),
      });
      setMe(updated);
      setTheme(updated.theme === "light" ? "light" : "dark");
      setLocale(updated.locale === "en" ? "en" : "fr");
      setMsg(t("common.save"));
    } catch {
      setMsg(t("settings.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function exportJson() {
    try {
      const data = await apiFetch<unknown>("/users/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kino-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg(t("settings.exportFailed"));
    }
  }

  async function exportCsv() {
    try {
      const base =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
      const token = getAccessToken();
      const res = await fetch(`${base}/users/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("csv export failed");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kino-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg(t("settings.exportFailed"));
    }
  }

  async function deleteAccount() {
    if (!confirm(t("settings.deleteConfirm"))) return;
    setLoading(true);
    setMsg(null);
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      clearTokens();
      setMe(null);
      setMsg(t("settings.accountDeleted"));
      window.location.href = "/";
    } catch {
      setMsg(t("settings.deleteFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await logoutSession();
    setMe(null);
    window.location.href = "/";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("common.yourAccount")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white">
          {me ? t("common.hello", { name: me.displayName }) : t("settings.title")}
        </h1>
      </header>

      {!me && (
        <div className="glass rounded-2xl p-6 text-center text-kino-muted">
          {t("settings.signIn")}
        </div>
      )}

      {me && (
        <>
          <section className="glass space-y-3 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              {t("settings.account")}
            </h2>
            <p className="text-sm text-kino-muted">
              <span className="font-medium text-white">{me.displayName}</span> · {me.email}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/u/${me.id}`} className="btn-primary inline-block !py-2 text-center text-sm">
                {t("profile.edit")}
              </Link>
              <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => void logout()}>
                {t("nav.logout")}
              </button>
            </div>
          </section>

          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              {t("settings.appearance")}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label={t("settings.theme")}
                value={me.theme}
                onChange={(v) => {
                  setMe({ ...me, theme: v });
                  setTheme(v === "light" ? "light" : "dark");
                }}
                options={[
                  { id: "dark", label: t("settings.themeDark") },
                  { id: "light", label: t("settings.themeLight") },
                ]}
              />
              <SelectField
                label={t("settings.language")}
                value={me.locale}
                onChange={(v) => {
                  setMe({ ...me, locale: v });
                  setLocale(v === "en" ? "en" : "fr");
                }}
                options={[
                  { id: "fr", label: t("settings.langFr") },
                  { id: "en", label: t("settings.langEn") },
                ]}
              />
            </div>
          </section>

          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              {t("settings.notifications")}
            </h2>
            <label className="flex items-center gap-2 text-sm text-kino-muted">
              <input
                type="checkbox"
                checked={me.notifyPush}
                onChange={(e) => setMe({ ...me, notifyPush: e.target.checked })}
                className="accent-[#ff2e7e]"
              />
              {t("settings.notifyPush")}
            </label>
            <label className="flex items-center gap-2 text-sm text-kino-muted">
              <input
                type="checkbox"
                checked={me.notifyEmail}
                onChange={(e) => setMe({ ...me, notifyEmail: e.target.checked })}
                className="accent-[#ff2e7e]"
              />
              {t("settings.notifyEmail")}
            </label>
          </section>

          <section className="glass space-y-3 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              {t("settings.privacy")}
            </h2>
            <p className="text-sm text-kino-muted">{t("settings.privacyHint")}</p>
            <div className="flex flex-wrap gap-2">
              <button className="chip" onClick={exportJson}>
                {t("settings.exportJson")}
              </button>
              <button className="chip" onClick={exportCsv}>
                {t("settings.exportCsv")}
              </button>
              <button
                className="chip"
                onClick={() => void logout()}
                type="button"
              >
                {t("nav.logout")}
              </button>
            </div>
          </section>

          <section className="glass space-y-3 rounded-2xl border-red-300/20 p-5">
            <h2 className="text-display text-lg font-semibold text-red-100">
              {t("settings.danger")}
            </h2>
            <p className="text-sm text-kino-muted">{t("settings.logoutHint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => void logout()}>
                {t("nav.logout")}
              </button>
              <button
                type="button"
                className="btn-danger !py-2 text-sm"
                onClick={deleteAccount}
                disabled={loading}
              >
                {t("settings.deleteAccount")}
              </button>
            </div>
          </section>

          <div className="sticky bottom-6 z-20">
            <div className="glass-strong flex items-center justify-between gap-3 rounded-full px-4 py-3">
              <p className="truncate text-sm text-kino-muted">
                {msg ?? t("common.changesHint")}
              </p>
              <button
                className="btn-primary !py-2 !px-5 text-sm disabled:opacity-60"
                onClick={save}
                disabled={loading}
              >
                {loading ? t("common.saving") : t("common.saveChanges")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-kino-muted">
        {label}
      </span>
      <select
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white focus:border-kino/60 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
