"use client";

import Link from "next/link";
import { useLocale } from "./AppProviders";
import { StarRating } from "./StarRating";

export type HeroItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: string;
};

export function Hero({
  item,
  type,
  genreMap,
}: {
  item: HeroItem | null;
  type: "movie" | "tv";
  genreMap?: Record<number, string>;
}) {
  const { t } = useLocale();

  if (!item) {
    return (
      <section className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-kino-panel">
        <div className="skeleton absolute inset-0" />
      </section>
    );
  }

  const mediaType = item.media_type === "tv" ? "tv" : type;
  const title = item.title ?? item.name ?? t("common.untitled");
  const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
  const rating =
    typeof item.vote_average === "number" ? item.vote_average / 2 : undefined;
  const backdrop = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : null;
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;
  const genres =
    item.genre_ids && genreMap
      ? item.genre_ids.slice(0, 3).map((id) => genreMap[id]).filter(Boolean)
      : [];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-kino-panel shadow-card">
      <div className="image-text-surface relative h-[360px] w-full md:h-[480px]">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-kino-ink via-kino-ink/70 to-kino-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-kino-ink via-kino-ink/40 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-end gap-6 p-6 md:flex-row md:items-end md:p-10">
          {poster && (
            <div className="float-slow hidden w-[180px] shrink-0 md:block">
              <div className="poster-tilt overflow-hidden rounded-2xl border border-white/10 shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt={title} className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          <div className="max-w-2xl space-y-4 card-animate">
            <p className="inline-flex items-center gap-2 rounded-full border border-kino/40 bg-kino/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-kino-hot">
              {t("hero.featured")}
            </p>
            <h1 className="text-display text-4xl font-bold leading-tight text-white md:text-6xl">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
              {year && <span>{year}</span>}
              {year && genres.length > 0 && <span className="text-white/30">·</span>}
              {genres.length > 0 && <span>{genres.join(" · ")}</span>}
              {rating !== undefined && (
                <>
                  <span className="text-white/30">·</span>
                  <StarRating value={rating} size={14} />
                  <span className="text-kino-gold">
                    {(item.vote_average ?? 0).toFixed(1)}
                  </span>
                </>
              )}
            </div>
            {item.overview && (
              <p className="line-clamp-3 max-w-xl text-base text-white/80 md:text-lg">
                {item.overview}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/title/${mediaType}/${item.id}`} className="btn-primary">
                <PlayIcon /> {t("hero.details")}
              </Link>
              <Link href="/ce-soir" className="btn-ghost">
                <SparkleIcon /> {t("hero.tonight")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 14l.9 2.4L22 17l-2.1.6L19 20l-.9-2.4L16 17l2.1-.6L19 14z" />
    </svg>
  );
}
