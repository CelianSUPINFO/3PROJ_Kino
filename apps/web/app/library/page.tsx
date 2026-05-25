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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addTargetId, setAddTargetId] = useState("");
  const [addQ, setAddQ] = useState("");
  const [addResults, setAddResults] = useState<{ id: number; title?: string }[]>([]);

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

  useEffect(() => {
    if (!addTargetId || addQ.trim().length < 2) {
      setAddResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof addResults }>(`/media/search?q=${encodeURIComponent(addQ)}&type=movie&page=1`, { auth: false })
        .then((data) => setAddResults(data.results.slice(0, 6)))
        .catch(() => setAddResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, addTargetId]);

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

  async function updateList(list: ListRow, patch: { name?: string; isPublic?: boolean }) {
    await apiFetch(`/library/lists/${list.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setEditingId(null);
    await loadData();
  }

  async function deleteList(list: ListRow) {
    if (!confirm(`Supprimer la liste "${list.name}" ?`)) return;
    await apiFetch(`/library/lists/${list.id}`, { method: "DELETE" });
    await loadData();
  }

  async function addMovieToList(tmdbId: number) {
    if (!addTargetId) return;
    await apiFetch(`/library/lists/${addTargetId}/items`, { method: "POST", body: JSON.stringify({ tmdbId, mediaType: "MOVIE" }) });
    setAddQ("");
    setAddResults([]);
    await loadData();
  }

  if (err) {
    return (
      <section className="glass rounded-2xl p-6 text-center">
        <h1 className="text-display text-2xl font-semibold text-white">{t("nav.login")}</h1>
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

      {rows.length === 0 && (
        <section className="glass rounded-2xl p-6 text-center">
          <h2 className="text-display text-2xl font-semibold text-white">
            {t("library.emptyTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-kino-muted">
            {t("library.emptyBody")}
          </p>
          <Link href="/search" className="btn-primary mt-5 !py-2 text-sm">
            {t("nav.search")}
          </Link>
        </section>
      )}

      <section className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-display text-xl font-semibold text-white">
          {t("library.lists")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={t("library.listNamePlaceholder")}
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
        {lists.length > 0 && (
          <div className="relative flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
            <select value={addTargetId} onChange={(e) => setAddTargetId(e.target.value)} className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white">
              <option value="">Choisir une liste</option>
              {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
            <div className="relative flex-1">
              <input value={addQ} onChange={(e) => setAddQ(e.target.value)} disabled={!addTargetId} placeholder="Rechercher un film à ajouter..." className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white disabled:opacity-50" />
              {addResults.length > 0 && <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-kino-panel p-2 shadow-card">
                {addResults.map((result) => <button key={result.id} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => void addMovieToList(result.id)}>{result.title}</button>)}
              </div>}
            </div>
          </div>
        )}
        <ul className="space-y-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              {editingId === l.id ? (
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-[180px] flex-1 rounded-full border border-kino/50 bg-black/30 px-3 py-2 text-white focus:outline-none" />
              ) : (
                <Link href={`/list/${l.id}`} className="min-w-0 flex-1 truncate font-medium text-white hover:text-kino-hot">
                  {l.name} · {l._count?.items ?? 0}
                </Link>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button className="chip" type="button" onClick={() => void updateList(l, { isPublic: !l.isPublic })}>{l.isPublic ? t("common.public") : t("common.private")}</button>
                {editingId === l.id ? (
                  <button className="chip" type="button" onClick={() => void updateList(l, { name: editName.trim() })}>{t("common.save")}</button>
                ) : (
                  <button className="chip" type="button" onClick={() => { setEditingId(l.id); setEditName(l.name); }}>Modifier</button>
                )}
                <button className="chip !border-red-300/30 !text-red-200" type="button" onClick={() => void deleteList(l)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

