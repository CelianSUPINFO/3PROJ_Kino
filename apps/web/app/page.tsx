"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { categoryLabel, statusLabel } from "@/lib/i18n";
import { useLocale } from "./components/AppProviders";
import { EngagementBadges } from "./components/EngagementBadges";
import { Hero, type HeroItem } from "./components/Hero";
import { MediaCarousel } from "./components/MediaCarousel";
import { PosterRowSkeleton } from "./components/Skeleton";
import { StarRating } from "./components/StarRating";

type HomeWork = HeroItem & {
  id: number;
  media_type?: string;
};

type HomePayload = {
  trending: { movies: HomeWork[]; tv: HomeWork[] };
  latestRatings: {
    id: string;
    rating: number;
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    title: string;
    user: { id: string; displayName: string };
  }[];
  recentWatched: {
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    status: string;
    title: string;
  }[];
  categories: { id: string; label: string; items: HomeWork[]; type: "movie" | "tv" }[];
};

type EngagementPayload = {
  streakDays: number;
  weekly: { reviews: number; completed: number; targetReviews: number; targetCompleted: number };
  recommendationRefreshAt: string;
};

export default function Home() {
  const { locale, t } = useLocale();
  const [data, setData] = useState<HomePayload | null>(null);
  const [engagement, setEngagement] = useState<EngagementPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError(null);
    apiFetch<HomePayload>(`/home?language=${locale === "fr" ? "fr-FR" : "en-US"}`, { auth: true })
      .then(setData)
      .catch(() => setError(t("home.loadError")))
      .finally(() => setLoading(false));
    apiFetch<EngagementPayload>("/engagement/summary", { auth: true })
      .then(setEngagement)
      .catch(() => undefined);
  }, [locale, t]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const featured = data?.trending.movies[0] ?? data?.trending.tv[0] ?? null;

  return (
    <div className="space-y-10">
      <Hero item={featured} type={featured?.media_type === "tv" ? "tv" : "movie"} />

      {engagement && <EngagementBadges data={engagement} />}

      {loading && !data && (
        <div className="space-y-8">
          <PosterRowSkeleton />
          <PosterRowSkeleton />
        </div>
      )}

      {error && !data && (
        <section className="glass rounded-3xl p-6 text-center">
          <h1 className="text-display text-2xl font-bold text-white">{t("home.unavailable")}</h1>
          <p className="mt-2 text-sm text-kino-muted">{error}</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <button className="btn-primary" onClick={loadHome}>
              {t("common.retry")}
            </button>
            <Link href="/search" className="btn-ghost">
              {t("home.ctaExplore")}
            </Link>
          </div>
        </section>
      )}

      {data && (
        <>
          <MediaCarousel title={t("home.trendingMovies")} items={data.trending.movies.slice(0, 14)} type="movie" />
          <MediaCarousel title={t("home.trendingTv")} items={data.trending.tv.slice(0, 14)} type="tv" />

          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-kino/25 via-kino-panel to-kino-panel p-8 md:p-10">
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                {t("home.ctaBadge")}
              </p>
              <h2 className="text-display text-3xl font-bold text-white md:text-4xl">
                {t("home.ctaTitle")}
              </h2>
              <p className="text-white/80">{t("home.ctaBody")}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/ce-soir" className="btn-primary">
                  {t("home.ctaTonight")}
                </Link>
                <Link href="/search" className="btn-ghost">
                  {t("home.ctaExplore")}
                </Link>
              </div>
            </div>
          </section>

          {data.categories.map((row) => (
            <MediaCarousel
              key={row.id}
              title={categoryLabel(locale, row.id)}
              items={row.items.slice(0, 14)}
              type={row.type}
              seeAllHref={`/search?type=${row.type}`}
              seeAllLabel={t("common.seeAll")}
            />
          ))}

          <section className="grid gap-5 md:grid-cols-2">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-display mb-4 text-xl font-semibold text-white">
                {t("home.latestRatings")}
              </h3>
              <ul className="space-y-3">
                {data.latestRatings.length === 0 && (
                  <li className="text-sm text-kino-muted">{t("home.noRatings")}</li>
                )}
                {data.latestRatings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.user.displayName} />
                      <div className="min-w-0">
                        <Link href={`/u/${r.user.id}`} className="block truncate text-sm font-medium text-white hover:text-kino-hot">
                          {r.user.displayName}
                        </Link>
                        <p className="truncate text-xs text-kino-muted">
                          {t("home.rated")}{" "}
                          <Link
                            href={`/title/${r.mediaType === "TV" ? "tv" : "movie"}/${r.tmdbId}`}
                            className="text-kino hover:underline"
                          >
                            {r.title}
                          </Link>
                        </p>
                      </div>
                    </div>
                    <StarRating value={r.rating} size={13} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="text-display mb-4 text-xl font-semibold text-white">
                {t("home.inProgress")}
              </h3>
              <ul className="space-y-2">
                {data.recentWatched.length === 0 && (
                  <li className="text-sm text-kino-muted">{t("home.inProgressHint")}</li>
                )}
                {data.recentWatched.map((w) => (
                  <li
                    key={`${w.mediaType}-${w.tmdbId}`}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white"
                  >
                    <span className="text-kino-muted">{statusLabel(locale, w.status)}</span>
                    <Link
                      href={`/title/${w.mediaType === "TV" ? "tv" : "movie"}/${w.tmdbId}`}
                      className="font-medium text-kino hover:underline"
                    >
                      {w.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-xs font-bold text-white shadow-kino">
      {initials || "?"}
    </span>
  );
}

