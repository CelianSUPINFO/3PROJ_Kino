"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useLocale } from "./AppProviders";
import { PosterCard, type PosterCardData } from "./PosterCard";

export type CarouselItem = PosterCardData;

export function MediaCarousel({
  title,
  type,
  items,
  seeAllHref,
  seeAllLabel,
}: {
  title: ReactNode;
  type: "movie" | "tv";
  items: CarouselItem[];
  seeAllHref?: string;
  seeAllLabel?: string;
}) {
  const { t } = useLocale();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 320), behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-display text-xl font-semibold text-white md:text-2xl">
          {title}
        </h2>
        <Link
          href={seeAllHref ?? `/search?type=${type}`}
          className="text-sm font-medium text-kino-muted transition hover:text-kino"
        >
          {seeAllLabel ?? "See all"} →
        </Link>
      </div>
      <div className="group relative">
        <button
          type="button"
          aria-label={t("common.scrollLeft")}
          onClick={() => scrollBy(-1)}
          className={`absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-kino-panel/90 p-2 text-white shadow-card backdrop-blur transition md:flex ${
            atStart ? "pointer-events-none opacity-0" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          aria-label={t("common.scrollRight")}
          onClick={() => scrollBy(1)}
          className={`absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-kino-panel/90 p-2 text-white shadow-card backdrop-blur transition md:flex ${
            atEnd ? "pointer-events-none opacity-0" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Chevron dir="right" />
        </button>
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="fade-edges flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {items.map((m, idx) => {
            const itemType =
              m.media_type === "tv" || m.media_type === "movie"
                ? m.media_type
                : type;
            return (
              <PosterCard
                key={`${itemType}-${m.id}`}
                item={m}
                type={itemType}
                index={idx}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
