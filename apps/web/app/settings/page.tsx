"use client";

import { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type Me = {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  website?: string | null;
  avatarUrl?: string | null;
  theme: string;
  locale: string;
};

export default function SettingsPage() {
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
        }),
      });
      setMe(updated);
      setMsg("Profile updated.");
    } catch {
      setMsg("Unable to save.");
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
      setMsg("Export failed.");
    }
  }

  async function exportCsv() {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
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
      setMsg("CSV export failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          Your account
        </p>
        <h1 className="text-display text-4xl font-bold text-white">
          {me ? `Hello, ${me.displayName}` : "Settings"}
        </h1>
      </header>

      {!me && (
        <div className="glass rounded-2xl p-6 text-center text-kino-muted">
          Sign in to edit your profile.
        </div>
      )}

      {me && (
        <>
          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">Profile</h2>
            <Field
              label="Display name"
              value={me.displayName}
              onChange={(v) => setMe({ ...me, displayName: v })}
            />
            <Field
              label="Bio"
              textarea
              value={me.bio ?? ""}
              onChange={(v) => setMe({ ...me, bio: v })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Website"
                value={me.website ?? ""}
                onChange={(v) => setMe({ ...me, website: v })}
              />
              <Field
                label="Avatar URL"
                value={me.avatarUrl ?? ""}
                onChange={(v) => setMe({ ...me, avatarUrl: v })}
              />
            </div>
          </section>

          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              Preferences
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Theme"
                value={me.theme}
                onChange={(v) => setMe({ ...me, theme: v })}
                options={[
                  { id: "dark", label: "Dark" },
                  { id: "light", label: "Light" },
                ]}
              />
              <SelectField
                label="Language"
                value={me.locale}
                onChange={(v) => setMe({ ...me, locale: v })}
                options={[
                  { id: "en", label: "English" },
                  { id: "fr", label: "Français" },
                ]}
              />
            </div>
          </section>

          <section className="glass space-y-3 rounded-2xl p-5">
            <h2 className="text-display text-lg font-semibold text-white">
              Data & privacy
            </h2>
            <p className="text-sm text-kino-muted">
              Export your Kino data any time (GDPR-friendly).
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="chip" onClick={exportJson}>
                Export JSON
              </button>
              <button className="chip" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          </section>

          <div className="sticky bottom-6 z-20">
            <div className="glass-strong flex items-center justify-between gap-3 rounded-full px-4 py-3">
              <p className="truncate text-sm text-kino-muted">
                {msg ?? "Changes are local until saved."}
              </p>
              <button
                className="btn-primary !py-2 !px-5 text-sm disabled:opacity-60"
                onClick={save}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-kino-muted">
        {label}
      </span>
      {textarea ? (
        <textarea
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
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
