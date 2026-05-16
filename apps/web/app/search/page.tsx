"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { Chip } from "../components/Chip";
import { PosterCard, type PosterCardData } from "../components/PosterCard";
import { ScrollToTop } from "../components/ScrollToTop";
import { Skeleton } from "../components/Skeleton";

type Unified = {
  users: { id: string; displayName: string; avatarUrl: string | null }[];
  lists: { id: string; name: string; user: { displayName: string } }[];
  works: { results: PosterCardData[] };
};

const SORT_KEYS = ["relevance", "popularity.desc", "vote_average.desc", "release_date.desc"] as const;
type SortKey = (typeof SORT_KEYS)[number];

export default function SearchPage() {
  const { t } = useLocale();
  const SORTS = useMemo(
    () =>
      SORT_KEYS.map((id) => ({
        id,
        label:
          id === "relevance"
            ? t("search.sort.relevance")
            : id === "popularity.desc"
              ? t("search.sort.popularity")
              : id === "vote_average.desc"
                ? t("search.sort.topRated")
                : t("search.sort.recent"),
      })),
    [t],
  );
  const TYPES = useMemo(
    () => [
      { id: "all" as const, label: t("nav.all") },
      { id: "movie" as const, label: t("nav.movies") },
      { id: "tv" as const, label: t("nav.series") },
    ],
    [t],
  );
  const [q, setQ] = useState("");
  const [data, setData] = useState<Unified | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [works, setWorks] = useState<PosterCardData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<"all" | "movie" | "tv">("all");
  const [year, setYear] = useState("");
  const [minVote, setMinVote] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [meId, setMeId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const presetType = params.get("type");
    const presetQ = params.get("q");
    if (presetType === "movie" || presetType === "tv") setType(presetType);
    if (presetQ) setQ(presetQ);
  }, []);

  useEffect(() => {
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, []);

  async function follow(userId: string) {
    await apiFetch(`/users/${userId}/follow`, { method: "POST" });
    setFollowed((current) => ({ ...current, [userId]: true }));
  }

  useEffect(() => {
    if (!q.trim()) {
      if (type === "all") {
        setData(null);
        setWorks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);
      apiFetch<{ results: PosterCardData[]; total_pages: number }>(
        `/media/discover/${type}?page=1&sort=${encodeURIComponent(
          sort === "relevance" ? "popularity.desc" : sort,
        )}${year ? `&year=${year}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}`,
        { auth: false },
      )
        .then((media) => {
          setData({ users: [], lists: [], works: { results: [] } });
          setWorks(media.results ?? []);
          setPage(1);
          setTotalPages(Math.max(1, media.total_pages ?? 1));
        })
        .catch(() => setErr(t("common.networkError")))
        .finally(() => setLoading(false));
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      setErr(null);
      const qs = new URLSearchParams({
        q: q.trim(),
        page: "1",
        ...(type !== "all" ? { type } : {}),
        ...(year ? { year } : {}),
        ...(minVote > 0 ? { minVote: String(minVote) } : {}),
      });
      const mediaPath =
        sort === "relevance"
          ? `/media/search?${qs}`
          : `/media/discover/${type === "all" ? "movie" : type}?page=1&sort=${encodeURIComponent(
              sort,
            )}${year ? `&year=${year}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}`;
      Promise.all([
        apiFetch<Unified>(`/search?q=${encodeURIComponent(q)}`, { auth: false }),
        apiFetch<{ results: PosterCardData[]; total_pages: number }>(mediaPath, {
          auth: false,
        }),
      ])
        .then(([u, media]) => {
          setData(u);
          setWorks(media.results ?? []);
          setPage(1);
          setTotalPages(Math.max(1, media.total_pages ?? 1));
        })
        .catch(() => setErr(t("common.networkError")))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, type, year, minVote, sort, t]);

  const loadMore = useCallback(async () => {
    if (page >= totalPages) return;
    const next = page + 1;
    const qs = new URLSearchParams({
      q: q.trim(),
      page: String(next),
      ...(type !== "all" ? { type } : {}),
      ...(year ? { year } : {}),
      ...(minVote > 0 ? { minVote: String(minVote) } : {}),
    });
    const mediaPath =
      !q.trim() && type !== "all"
        ? `/media/discover/${type}?page=${next}&sort=${encodeURIComponent(
            sort === "relevance" ? "popularity.desc" : sort,
          )}${year ? `&year=${year}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}`
        : sort === "relevance"
          ? `/media/search?${qs}`
          : `/media/discover/${type === "all" ? "movie" : type}?page=${next}&sort=${encodeURIComponent(
              sort,
            )}${year ? `&year=${year}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}`;
    const media = await apiFetch<{ results: PosterCardData[] }>(mediaPath, { auth: false });
    setWorks((prev) => [...prev, ...(media.results ?? [])]);
    setPage(next);
  }, [minVote, page, q, sort, totalPages, type, year]);

  useEffect(() => {
    const onScroll = () => {
      if (loading || page >= totalPages) return;
      if (window.innerHeight + window.scrollY < document.body.offsetHeight - 600) {
        return;
      }
      void loadMore();
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, page, totalPages, loadMore]);

  const hasResults = works.length > 0 || (data?.users.length ?? 0) > 0 || (data?.lists.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("search.title")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white md:text-5xl">
          {t("search.pageTitle")}
        </h1>
        <p className="max-w-2xl text-kino-muted">{t("search.subtitle")}</p>
      </header>

      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="w-full rounded-full border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
            placeholder={t("search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </Chip>
          ))}
          <span className="mx-1 h-6 w-px self-center bg-white/10" />
          {SORTS.map((s) => (
            <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:max-w-xl">
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white/80">
            <span className="text-xs uppercase tracking-wider text-kino-muted">{t("search.year")}</span>
            <input
              className="w-full bg-transparent text-white focus:outline-none"
              placeholder="2024"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
          </label>
          <label className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-sm text-white/80">
            <span className="text-xs uppercase tracking-wider text-kino-muted">
              {t("search.minRating")}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={minVote}
              onChange={(e) => setMinVote(Number(e.target.value))}
              className="flex-1 accent-[#ff2e7e]"
            />
            <span className="w-10 text-right font-medium text-white">
              {minVote.toFixed(1)}
            </span>
          </label>
        </div>
      </div>

      {err && <p className="text-red-400">{err}</p>}

      {loading && works.length === 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && q.trim() && !hasResults && !err && (
        <p className="text-sm text-kino-muted">{t("search.noResults")}</p>
      )}

      {works.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-display text-xl font-semibold text-white">{t("search.titles")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {works.map((w, idx) => (
              <PosterCard
                key={`${w.media_type ?? type}-${w.id}-${idx}`}
                item={w}
                type={type === "all" ? "movie" : type}
                width={0}
                index={idx}
                className="w-full"
              />
            ))}
          </div>
          {page < totalPages && (
            <p className="pt-3 text-center text-sm text-kino-muted">{t("search.loadingMore")}</p>
          )}
        </section>
      )}

      {data && (data.users.length > 0 || data.lists.length > 0) && (
        <section className="grid gap-6 md:grid-cols-2">
          {data.users.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-display mb-3 text-xl font-semibold text-white">{t("search.users")}</h2>
              <ul className="space-y-2">
                {data.users.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-1">
                    <Link
                      href={`/u/${u.id}`}
                      className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-white transition hover:bg-white/5"
                    >
                      {u.displayName}
                    </Link>
                    {meId && meId !== u.id && (
                      <button type="button" className="chip shrink-0" disabled={followed[u.id]} onClick={() => void follow(u.id)}>
                        {followed[u.id] ? "Suivi" : "Suivre"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.lists.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-display mb-3 text-xl font-semibold text-white">
                {t("search.publicLists")}
              </h2>
              <ul className="space-y-2">
                {data.lists.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/list/${l.id}`}
                      className="block rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-white transition hover:border-kino/40 hover:bg-white/5"
                    >
                      {l.name}{" "}
                      <span className="text-kino-muted">· {l.user.displayName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <ScrollToTop />
    </div>
  );
}
