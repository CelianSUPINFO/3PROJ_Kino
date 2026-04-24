"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Activity = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  user: { displayName: string; id?: string };
};

const ACTIVITY_META: Record<string, { icon: string; label: (p: Record<string, unknown>) => string }> = {
  FOLLOW: { icon: "👤", label: () => "started following someone" },
  RATED: {
    icon: "★",
    label: (p) => `rated title #${String(p.tmdbId ?? "?")} · ${String(p.rating ?? "?")}/5`,
  },
  REVIEWED: { icon: "✍", label: (p) => `posted a review on title #${String(p.tmdbId ?? "?")}` },
  LIST_ADDED: { icon: "＋", label: (p) => `added title #${String(p.tmdbId ?? "?")} to a list` },
  STATUS_CHANGED: {
    icon: "⏵",
    label: (p) =>
      `marked title #${String(p.tmdbId ?? "?")} as ${String(p.status ?? "?").toLowerCase()}`,
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function FeedPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Activity[] }>("/feed")
      .then((r) => setItems(r.items))
      .catch(() => setErr("Sign in to view your feed."));
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          Social
        </p>
        <h1 className="text-display text-4xl font-bold text-white">Activity feed</h1>
        <p className="text-kino-muted">
          The latest ratings, reviews and library moves from people you follow.
        </p>
      </header>

      {err && <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-kino-muted">{err}</p>}

      <ul className="space-y-3">
        {items.map((a, idx) => {
          const meta = ACTIVITY_META[a.type] ?? {
            icon: "•",
            label: () => a.type.toLowerCase(),
          };
          const linkTarget =
            a.payload?.tmdbId !== undefined
              ? `/title/${a.payload.mediaType === "TV" ? "tv" : "movie"}/${a.payload.tmdbId}`
              : null;
          return (
            <li
              key={a.id}
              className="glass card-animate flex items-start gap-3 rounded-2xl p-4"
              style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-sm font-bold text-white shadow-kino">
                {initials(a.user.displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-kino-muted">
                  <span className="font-semibold text-white">{a.user.displayName}</span>{" "}
                  · {new Date(a.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 text-white">
                  <span className="mr-1 text-kino-gold">{meta.icon}</span>
                  {linkTarget ? (
                    <>
                      {meta.label(a.payload)}
                      <Link
                        href={linkTarget}
                        className="ml-2 text-kino hover:text-kino-hot hover:underline"
                      >
                        View →
                      </Link>
                    </>
                  ) : (
                    meta.label(a.payload)
                  )}
                </p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && !err && (
          <li className="glass rounded-2xl p-6 text-center text-kino-muted">
            Nothing yet — follow people to see their activity.
          </li>
        )}
      </ul>
    </div>
  );
}
