"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { discoverAllUsers } from "@/lib/publicDiscovery";
import { genreChipList, genreIdForMedia, genreSlugFromId } from "@/lib/genres";
import { genreLabel } from "@/lib/i18n";
import { useLocale } from "../components/AppProviders";
import { Chip } from "../components/Chip";
import { PosterCard, type PosterCardData } from "../components/PosterCard";
import { Skeleton } from "../components/Skeleton";
import { UserAvatar } from "../components/UserAvatar";

type Unified = {
  users: { id: string; displayName: string; avatarUrl: string | null }[];
  lists: { id: string; name: string; user: { displayName: string } }[];
  works: { results: PosterCardData[] };
};

const SORT_KEYS = ["relevance", "popularity.desc", "vote_average.desc", "release_date.desc"] as const;
type SortKey = (typeof SORT_KEYS)[number];
type WorkType = "all" | "movie" | "tv" | "users" | "lists";

function genreQuery(media: "movie" | "tv", genreId: string) {
  const mapped = genreIdForMedia(genreSlugFromId(genreId), media);
  return mapped ? `&genre=${mapped}` : "";
}

function workFilterQuery(media: "movie" | "tv", year: string, minVote: number, genre: string) {
  return `${year ? `&year=${year}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}${genreQuery(media, genre)}`;
}

async function fetchWorks(
  opts: {
    q: string;
    creator: string;
    type: WorkType;
    page: number;
    year: string;
    minVote: number;
    sort: SortKey;
    genre: string;
  },
) {
  const { q, creator, type, page, year, minVote, sort, genre } = opts;
  if (type === "users" || type === "lists") {
    return { results: [] as PosterCardData[], total_pages: 1 };
  }

  const slug = genreSlugFromId(genre);
  const hasGenre = slug !== "all";
  const mediaForDiscover = type === "tv" ? "tv" : "movie";

  const searchMedia = async (media: "movie" | "tv") => {
    const qs = new URLSearchParams({
      q: q.trim(),
      page: String(page),
      type: media,
      ...(creator.trim() ? { creator: creator.trim() } : {}),
    });
    if (year) qs.set("year", year);
    if (minVote > 0) qs.set("minVote", String(minVote));
    const mappedGenre = genreIdForMedia(slug, media);
    if (mappedGenre) qs.set("genre", mappedGenre);
    return apiFetch<{ results: PosterCardData[]; total_pages: number }>(
      `/media/search?${qs.toString()}`,
      { auth: false },
    );
  };

  const discoverMedia = async (media: "movie" | "tv") =>
    apiFetch<{ results: PosterCardData[]; total_pages: number }>(
      `/media/discover/${media}?page=${page}&sort=${encodeURIComponent(
        sort === "relevance" ? "popularity.desc" : sort,
      )}${workFilterQuery(media, year, minVote, genre)}`,
      { auth: false },
    );

  if (type === "all" && hasGenre) {
    const useSearch = Boolean(q.trim() || creator.trim() || sort === "relevance");
    const [movies, series] = await Promise.all([
      useSearch ? searchMedia("movie") : discoverMedia("movie"),
      useSearch ? searchMedia("tv") : discoverMedia("tv"),
    ]);
    return {
      results: [...(movies.results ?? []), ...(series.results ?? [])],
      total_pages: Math.max(movies.total_pages ?? 1, series.total_pages ?? 1),
    };
  }

  if (type === "all") {
    const qs = new URLSearchParams({
      q: q.trim(),
      page: String(page),
      ...(year ? { year } : {}),
      ...(minVote > 0 ? { minVote: String(minVote) } : {}),
      ...(creator.trim() ? { creator: creator.trim() } : {}),
    });
    if (sort === "relevance" || creator.trim()) {
      return apiFetch<{ results: PosterCardData[]; total_pages: number }>(
        `/media/search?${qs.toString()}`,
        { auth: false },
      );
    }
    return discoverMedia(mediaForDiscover);
  }

  const media = type === "tv" ? "tv" : "movie";
  if (!q.trim() && !creator.trim()) {
    return discoverMedia(media);
  }
  if (sort === "relevance" || creator.trim()) {
    return searchMedia(media);
  }
  return discoverMedia(media);
}

export default function SearchPage() {
  const { locale, t } = useLocale();
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
      { id: "users" as const, label: t("search.users") },
      { id: "lists" as const, label: t("search.publicLists") },
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
  const [type, setType] = useState<"all" | "movie" | "tv" | "users" | "lists">("all");
  const [year, setYear] = useState("");
  const [creator, setCreator] = useState("");
  const [genre, setGenre] = useState("");
  const [minVote, setMinVote] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [meId, setMeId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const presetType = params.get("type");
    const presetQ = params.get("q");
    if (presetType === "movie" || presetType === "tv" || presetType === "users" || presetType === "lists") setType(presetType);
    if (presetQ) setQ(presetQ);
  }, []);

  useEffect(() => {
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, []);

  useEffect(() => {
    if (type === "users" || type === "lists") {
      setGenre("");
      return;
    }
    if (!genre) return;
    const slug = genreSlugFromId(genre);
    const mapped = genreIdForMedia(slug, type === "tv" ? "tv" : "movie");
    if (mapped && mapped !== genre) setGenre(mapped);
  }, [type, genre]);

  const genreOptions = useMemo(() => genreChipList(type === "tv" ? "tv" : "movie"), [type]);

  async function follow(userId: string) {
    await apiFetch(`/users/${userId}/follow`, { method: "POST" });
    setFollowed((current) => ({ ...current, [userId]: true }));
  }

  useEffect(() => {
    if (!q.trim() && !creator.trim() && (type === "users" || type === "lists")) {
      setLoading(true);
      Promise.all([
        apiFetch<Unified>("/search?q=", { auth: false }),
        type === "users" ? discoverAllUsers() : Promise.resolve(null),
      ])
        .then(([result, discoveredUsers]) => {
          setData({
            ...result,
            users: type === "lists" ? [] : discoveredUsers ?? result.users,
            lists: type === "users" ? [] : result.lists,
          });
          setWorks([]);
        })
        .catch(() => setErr(t("common.networkError")))
        .finally(() => setLoading(false));
      return;
    }
    if (!q.trim() && !creator.trim()) {
      if (type === "all" && genreSlugFromId(genre) === "all") {
        setData(null);
        setWorks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);
      fetchWorks({ q, creator, type, page: 1, year, minVote, sort, genre })
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
      Promise.all([
        apiFetch<Unified>(`/search?q=${encodeURIComponent(q)}`, { auth: false }),
        fetchWorks({ q, creator, type, page: 1, year, minVote, sort, genre }),
      ])
        .then(([u, media]) => {
          setData({ ...u, users: type === "lists" ? [] : u.users, lists: type === "users" ? [] : u.lists });
          setWorks(media.results ?? []);
          setPage(1);
          setTotalPages(Math.max(1, media.total_pages ?? 1));
        })
        .catch(() => setErr(t("common.networkError")))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, type, year, minVote, sort, creator, genre, t]);

  const loadMore = useCallback(async () => {
    if (page >= totalPages || type === "users" || type === "lists") return;
    const next = page + 1;
    const media = await fetchWorks({
      q,
      creator,
      type,
      page: next,
      year,
      minVote,
      sort,
      genre,
    });
    setWorks((prev) => [...prev, ...(media.results ?? [])]);
    setPage(next);
  }, [creator, genre, minVote, page, q, sort, totalPages, type, year]);

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
  const movieResults = works.filter((work) => work.media_type !== "tv");
  const tvResults = works.filter((work) => work.media_type === "tv");

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
            <Chip
              key={t.id}
              active={type === t.id}
              onClick={() => {
                setType(t.id);
                if (t.id === "users" || t.id === "lists") setGenre("");
              }}
            >
              {t.label}
            </Chip>
          ))}
          {type !== "users" && type !== "lists" && (
            <>
              <span className="mx-1 h-6 w-px self-center bg-white/10" />
              {SORTS.map((s) => (
                <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>
              ))}
            </>
          )}
        </div>

        {type !== "users" && type !== "lists" && (
          <>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-kino-muted">
                {t("search.genre")}
              </p>
              <div className="flex flex-wrap gap-2">
                {genreOptions.map((item) => (
                  <Chip
                    key={item.slug}
                    active={genreSlugFromId(genre) === item.slug}
                    onClick={() => setGenre(item.id)}
                  >
                    {item.slug === "all" ? t("nav.all") : genreLabel(locale, item.slug)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white/80">
            <span className="text-xs uppercase tracking-wider text-kino-muted">{t("search.year")}</span>
            <input
              className="w-full bg-transparent text-white focus:outline-none"
              placeholder="2024"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white/80">
            <span className="shrink-0 text-xs uppercase tracking-wider text-kino-muted">Réalisateur / auteur</span>
            <input className="min-w-0 w-full bg-transparent text-white focus:outline-none" placeholder="Greta Gerwig" value={creator} onChange={(e) => setCreator(e.target.value)} />
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
          </>
        )}
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

      {type === "all" && (works.length > 0 || (data?.users.length ?? 0) > 0) && (
        <div className="space-y-10">
          <SearchWorkSection title={t("nav.movies")} items={movieResults.slice(0, 5)} type="movie" seeAll={() => setType("movie")} />
          <SearchWorkSection title={t("nav.series")} items={tvResults.slice(0, 5)} type="tv" seeAll={() => setType("tv")} />
          {data && data.users.length > 0 && (
            <section className="space-y-3">
              <SectionHeading title={t("search.users")} onClick={() => setType("users")} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.users.filter((user) => user.id !== meId).slice(0, 5).map((user) => (
                  <UserResult key={user.id} user={user} followed={followed[user.id]} canFollow={!!meId} onFollow={() => void follow(user.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {type !== "all" && type !== "users" && type !== "lists" && works.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-display text-xl font-semibold text-white">{t("search.titles")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {works.map((w, idx) => (
              <PosterCard
                key={`${w.media_type ?? type}-${w.id}-${idx}`}
                item={w}
                type={type === "tv" ? "tv" : "movie"}
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

      {type === "users" && data && data.users.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-display text-xl font-semibold text-white">{t("search.users")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.users.filter((user) => user.id !== meId).map((user) => (
              <UserResult key={user.id} user={user} followed={followed[user.id]} canFollow={!!meId} onFollow={() => void follow(user.id)} />
            ))}
          </div>
        </section>
      )}

      {type === "lists" && data && data.lists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-display text-xl font-semibold text-white">{t("search.publicLists")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.lists.map((list) => (
              <Link key={list.id} href={`/list/${list.id}`} className="rounded-xl border border-white/10 px-4 py-3 text-white transition hover:border-kino/50">
                <span className="font-semibold">{list.name}</span>
                <span className="block text-sm text-kino-muted">· {list.user.displayName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title, onClick }: { title: string; onClick: () => void }) {
  return <div className="flex items-center justify-between gap-4"><h2 className="text-display text-xl font-semibold text-white">{title}</h2><button type="button" className="text-sm font-semibold text-kino-hot hover:text-kino" onClick={onClick}>Voir tout →</button></div>;
}

function SearchWorkSection({ title, items, type, seeAll }: { title: string; items: PosterCardData[]; type: "movie" | "tv"; seeAll: () => void }) {
  if (items.length === 0) return null;
  return <section className="space-y-3"><SectionHeading title={title} onClick={seeAll} /><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">{items.map((item, index) => <PosterCard key={`${type}-${item.id}`} item={item} type={type} width={0} index={index} className="w-full" />)}</div></section>;
}

function UserResult({ user, followed, canFollow, onFollow }: { user: Unified["users"][number]; followed?: boolean; canFollow: boolean; onFollow: () => void }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2"><Link href={`/u/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-white"><UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} className="h-9 w-9 text-[10px]" /><span className="truncate font-semibold">{user.displayName}</span></Link>{canFollow && <button type="button" className="chip shrink-0" disabled={followed} onClick={onFollow}>{followed ? "Suivi" : "Suivre"}</button>}</div>;
}
