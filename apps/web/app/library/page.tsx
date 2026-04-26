"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { MediaCarousel } from "../components/MediaCarousel";
import type { PosterCardData } from "../components/PosterCard";
import type { I18nKey } from "@/lib/i18n";

type StatusRow = {
  tmdbId: number;
  mediaType: string;
  status: string;
  title?: string;
  posterPath?: string | null;
};

type LibraryStats = {
  total: number;
  completed: number;
  estimatedHoursWatched: number;
};

type ListRow = {
  id: string;
  name: string;
  isPublic: boolean;
  _count?: { items: number };
};

const STATUS_ORDER = ["WATCHLIST", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const;

const STATUS_PATH: Record<(typeof STATUS_ORDER)[number], string> = {
  WATCHLIST: "watchlist",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  DROPPED: "dropped",
};

const STATUS_I18N: Record<(typeof STATUS_ORDER)[number], I18nKey> = {
  WATCHLIST: "library.toWatch",
  IN_PROGRESS: "library.inProgress",
  COMPLETED: "library.completed",
  DROPPED: "library.dropped",
};

function toPoster(row: StatusRow): PosterCardData {
  const type = row.mediaType === "TV" ? "tv" : "movie";
  return {
    id: row.tmdbId,
    media_type: type,
    title: row.title,
    name: row.title,
    poster_path: row.posterPath ?? undefined,
  };
}

export default function LibraryPage() {
  const { t } = useLocale();
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);

  async function loadData() {
    apiFetch<StatusRow[]>("/library/me")
      .then(setRows)
      .catch(() => setErr(t("library.signIn")));
    apiFetch<LibraryStats>("/library/stats")
      .then(setStats)
      .catch(() => setStats(null));
    apiFetch<ListRow[]>("/library/lists/mine")
      .then(setLists)
      .catch(() => setLists([]));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<string, PosterCardData[]> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const row of rows) {
      if (map[row.status]) map[row.status].push(toPoster(row));
    }
    return map;
  }, [rows]);

  async function createList() {
    if (!newListName.trim()) return;
    await apiFetch("/library/lists", {
      method: "POST",
      body: JSON.stringify({ name: newListName, isPublic: newListPublic }),
    });
    setNewListName("");
    setNewListPublic(false);
    loadData();
  }

  if (err) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-kino-muted">{err}</div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("nav.library")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white">{t("library.title")}</h1>
        <p className="text-sm text-kino-muted">{t("library.subtitle")}</p>
        {stats && (
          <p className="text-sm text-kino-muted">
            {stats.total} {t("library.stats", { hours: stats.estimatedHoursWatched })}
          </p>
        )}
      </header>

      {STATUS_ORDER.map((status) => {
        const items = byStatus[status] ?? [];
        if (items.length === 0) return null;
        return (
          <MediaCarousel
            key={status}
            title={t(STATUS_I18N[status])}
            type="movie"
            items={items.slice(0, 10)}
            seeAllHref={`/library/${STATUS_PATH[status]}`}
            seeAllLabel={t("common.seeAll")}
          />
        );
      })}

      <section className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-display text-xl font-semibold text-white">
          {t("library.lists")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="…"
            className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-kino-muted">
            <input
              type="checkbox"
              checked={newListPublic}
              onChange={(e) => setNewListPublic(e.target.checked)}
              className="accent-[#ff2e7e]"
            />
            {t("common.public")}
          </label>
          <button type="button" className="btn-primary !py-2 !px-5 text-sm" onClick={createList}>
            +
          </button>
        </div>
        <ul className="space-y-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              <Link href={`/list/${l.id}`} className="font-medium text-white hover:text-kino-hot">
                {l.name} · {l._count?.items ?? 0}
              </Link>
              <span className="text-kino-muted">{l.isPublic ? t("common.public") : t("common.private")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
