"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";
import { PosterCard, type PosterCardData } from "../../components/PosterCard";
import { PosterRowSkeleton } from "../../components/Skeleton";
import { genreLabel } from "@/lib/i18n";
import { MOVIE_GENRES, TV_GENRES } from "@/lib/genres";

export default function BrowsePage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const type = params.type === "tv" ? "tv" : "movie";
  const genre = searchParams.get("genre") ?? "";
  const genres = type === "tv" ? TV_GENRES : MOVIE_GENRES;
  const genreSlug = genres.find((g) => g.id === genre)?.slug ?? "all";
  const title =
    type === "tv"
      ? `${t("browse.series")}${genreSlug !== "all" ? ` · ${genreLabel(locale, genreSlug)}` : ""}`
      : `${t("browse.movies")}${genreSlug !== "all" ? ` · ${genreLabel(locale, genreSlug)}` : ""}`;

  const [items, setItems] = useState<PosterCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: "1", sort: "popularity.desc" });
    if (genre) qs.set("genre", genre);
    apiFetch<{ results: PosterCardData[]; total_pages: number }>(
      `/media/discover/${type}?${qs.toString()}`,
      { auth: false },
    )
      .then((data) => {
        setItems(data.results ?? []);
        setTotalPages(data.total_pages ?? 1);
        setPage(1);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, genre]);

  async function loadMore() {
    const next = page + 1;
    if (next > totalPages) return;
    const qs = new URLSearchParams({ page: String(next), sort: "popularity.desc" });
    if (genre) qs.set("genre", genre);
    const data = await apiFetch<{ results: PosterCardData[]; total_pages: number }>(
      `/media/discover/${type}?${qs.toString()}`,
      { auth: false },
    );
    setItems((prev) => [...prev, ...(data.results ?? [])]);
    setPage(next);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("browse.tmdb")}
        </p>
        <h1 className="text-display text-3xl font-bold text-white md:text-4xl">{title}</h1>
      </header>
      {loading && <PosterRowSkeleton />}
      {!loading && items.length === 0 && (
        <p className="text-kino-muted">{t("common.loading")}</p>
      )}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((m, idx) => (
            <PosterCard key={`${m.id}-${idx}`} item={m} type={type} index={idx} />
          ))}
        </div>
      )}
      {page < totalPages && (
        <div className="text-center">
          <button type="button" className="btn-primary" onClick={loadMore}>
            {t("common.more")}
          </button>
        </div>
      )}
    </div>
  );
}
