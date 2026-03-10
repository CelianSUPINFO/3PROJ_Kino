"use client";

import Link from "next/link";
import { StarRating } from "./StarRating";

export type PosterCardData = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
};

export function PosterCard({
  item,
  type,
  width = 170,
  index = 0,
  className = "",
}: {
  item: PosterCardData;
  type: "movie" | "tv";
  width?: number;
  index?: number;
  className?: string;
}) {
  const sizeStyle = width > 0 ? { width, animationDelay: `${Math.min(index * 40, 280)}ms` } : { animationDelay: `${Math.min(index * 40, 280)}ms` };
  const mediaType = item.media_type === "tv" ? "tv" : item.media_type === "movie" ? "movie" : type;
  const title = item.title ?? item.name ?? "Untitled";
  const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
  const rating = typeof item.vote_average === "number" ? item.vote_average / 2 : undefined;

  return (
    <Link
      href={`/title/${mediaType}/${item.id}`}
      className={`card-animate group relative block shrink-0 snap-start rounded-2xl ${className}`}
      style={sizeStyle}
    >
      <div className="poster-tilt relative overflow-hidden rounded-2xl border border-white/10 bg-kino-panel shadow-card">
        <div className="relative aspect-[2/3] w-full bg-black/40">
          {item.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
              src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">
              No poster
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
          {typeof item.vote_average === "number" && item.vote_average > 0 && (
            <div className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-kino-gold backdrop-blur">
              ★ {item.vote_average.toFixed(1)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
            <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
              {title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              {year && <span>{year}</span>}
              {rating !== undefined && <StarRating value={rating} size={10} />}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
