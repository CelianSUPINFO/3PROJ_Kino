"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { statusLabel } from "@/lib/i18n";
import { UserAvatar } from "../components/UserAvatar";

type Activity = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  user: { displayName: string; id?: string; avatarUrl?: string | null };
};

function workTitle(p: Record<string, unknown>) {
  return String(p.title ?? `#${p.tmdbId ?? "?"}`);
}

export default function FeedPage() {
  const { locale, t } = useLocale();
  const [items, setItems] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activityMeta = useMemo(
    () => ({
      FOLLOW: { icon: "👤", label: () => t("activity.follow") },
      RATED: {
        icon: "★",
        label: (p: Record<string, unknown>) =>
          t("activity.rated", {
            title: workTitle(p),
            rating: String(p.rating ?? "?"),
          }),
      },
      REVIEWED: {
        icon: "✍",
        label: (p: Record<string, unknown>) =>
          t("activity.reviewed", { title: workTitle(p) }),
      },
      LIST_ADDED: {
        icon: "＋",
        label: (p: Record<string, unknown>) =>
          t("activity.listAdded", { title: workTitle(p) }),
      },
      STATUS_CHANGED: {
        icon: "⏵",
        label: (p: Record<string, unknown>) =>
          t("activity.statusChanged", {
            title: workTitle(p),
            status: statusLabel(locale, String(p.status ?? "")).toLowerCase(),
          }),
      },
    }),
    [locale, t],
  );

  useEffect(() => {
    apiFetch<{ items: Activity[]; nextCursor: string | null }>("/feed")
      .then((r) => {
        setItems(r.items);
        setNextCursor(r.nextCursor);
      })
      .catch(() => setErr(t("feed.signIn")));
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch<{ items: Activity[]; nextCursor: string | null }>(
        `/feed?cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((prev) => [...prev, ...r.items]);
      setNextCursor(r.nextCursor);
    } catch {
      setNextCursor(null);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("feed.social")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white">{t("feed.title")}</h1>
        <p className="text-kino-muted">{t("feed.subtitle")}</p>
      </header>

      {err && (
        <section className="glass rounded-2xl p-6 text-center">
          <h2 className="text-display text-2xl font-semibold text-white">{t("nav.login")}</h2>
          <p className="mt-2 text-kino-muted">{err}</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/login" className="btn-primary !py-2 text-sm">
              {t("nav.login")}
            </Link>
            <Link href="/register" className="btn-ghost !py-2 text-sm">
              {t("nav.register")}
            </Link>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {items.map((a, idx) => {
          const meta = activityMeta[a.type as keyof typeof activityMeta] ?? {
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
              <UserAvatar
                name={a.user.displayName}
                avatarUrl={a.user.avatarUrl}
                className="h-10 w-10 text-sm shadow-kino"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-kino-muted">
                  <span className="font-semibold text-white">{a.user.displayName}</span>{" "}
                  · {new Date(a.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </p>
                <p className="mt-1 text-white">
                  <span className="mr-1 text-kino-gold">{meta.icon}</span>
                  {meta.label(a.payload)}
                  {linkTarget && (
                    <Link
                      href={linkTarget}
                      className="ml-2 text-kino hover:text-kino-hot hover:underline"
                    >
                      {t("feed.view")}
                    </Link>
                  )}
                </p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && !err && (
          <li className="glass rounded-2xl p-6 text-center">
            <h2 className="text-display text-2xl font-semibold text-white">{t("feed.empty")}</h2>
            <p className="mx-auto mt-2 max-w-md text-kino-muted">{t("feed.emptyFollow")}</p>
            <Link href="/search" className="btn-primary mt-5 !py-2 text-sm">
              {t("nav.search")}
            </Link>
          </li>
        )}
      </ul>
      {nextCursor && (
        <div className="flex justify-center">
          <button
            className="btn-ghost !py-2 text-sm disabled:opacity-50"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? t("common.loading") : t("feed.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

