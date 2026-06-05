"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { Chip } from "../components/Chip";
import { EngagementBadges } from "../components/EngagementBadges";
import { StarRating } from "../components/StarRating";
import { Toast } from "../components/Toast";

type TonightItem = {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  score: number;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string;
  genreNames?: string[];
};

type TonightPayload = {
  personalized: boolean;
  source: string;
  results: TonightItem[];
};

type ToastTone = "success" | "danger";

export default function CeSoirPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<TonightItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<{
    streakDays: number;
    weekly: { reviews: number; completed: number; targetReviews: number; targetCompleted: number };
    recommendationRefreshAt: string;
  } | null>(null);

  async function loadPicks() {
    setLoading(true);
    return apiFetch<TonightPayload>(`/reco/tonight?type=${type}&limit=20`, { auth: true })
      .then((r) => {
        setItems(r.results);
        setIdx(0);
        setMsg(r.personalized ? t("tonight.personalized") : t("tonight.discover"));
      })
      .catch(() => setMsg(t("tonight.signInSwipe")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPicks();
    apiFetch("/engagement/summary", { auth: true })
      .then((r) =>
        setEngagement(
          r as {
            streakDays: number;
            weekly: {
              reviews: number;
              completed: number;
              targetReviews: number;
              targetCompleted: number;
            };
            recommendationRefreshAt: string;
          },
        ),
      )
      .catch(() => setEngagement(null));
  }, [type]);

  const current = items[idx];
  const next = items[idx + 1];
  const progress = useMemo(
    () => (items.length > 0 ? Math.min(1, idx / items.length) : 0),
    [idx, items.length],
  );

  async function swipe(choice: "SMASH" | "PASS") {
    if (!current || leaving) return;
    setLeaving(choice === "SMASH" ? "right" : "left");
    let saved = false;
    try {
      await apiFetch("/reco/swipe", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: current.id,
          type: current.mediaType,
          choice,
        }),
      });
      saved = true;
    } catch {
      saved = false;
    }
    setToast(
      choice === "SMASH"
        ? {
            msg: saved ? t("tonight.savedSmash") : t("tonight.signInRemember"),
            tone: saved ? "success" : "danger",
          }
        : { msg: saved ? t("tonight.passSaved") : t("tonight.passGuest"), tone: "danger" },
    );
    setTimeout(() => {
      setIdx((prev) => prev + 1);
      setLeaving(null);
    }, 320);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
            {t("tonight.title")}
          </p>
          <h1 className="text-display mt-1 text-3xl font-bold text-white md:text-4xl">
            {t("tonight.headline")}
          </h1>
        </div>
        <div className="flex gap-2">
          <Chip active={type === "movie"} onClick={() => setType("movie")}>
            {t("nav.movies")}
          </Chip>
          <Chip active={type === "tv"} onClick={() => setType("tv")}>
            {t("nav.series")}
          </Chip>
        </div>
      </div>

      {msg && <p className="text-sm text-kino-muted">{msg}</p>}
      {engagement && <EngagementBadges data={engagement} />}

      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-kino to-kino-hot transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {loading ? (
        <div className="skeleton h-[520px] w-full rounded-3xl" />
      ) : !current ? (
        <div className="glass flex h-[400px] flex-col items-center justify-center gap-3 rounded-3xl text-center">
          <p className="text-display text-2xl font-semibold text-white">
            {t("tonight.allSeen")}
          </p>
          <p className="max-w-sm text-sm text-kino-muted">
            {t("tonight.allSeenHint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setIdx(0);
              loadPicks();
            }}
            className="btn-primary"
          >
            {t("tonight.reload")}
          </button>
        </div>
      ) : (
        <div className="relative h-[560px] md:h-[620px]">
          {next && <SwipeCard item={next} stacked />}
          <SwipeCard item={current} leaving={leaving} />
        </div>
      )}

      {current && !loading && (
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            aria-label={t("tonight.passAria")}
            onClick={() => swipe("PASS")}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300 shadow-card transition hover:scale-105 hover:bg-red-500/20"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <Link
            href={`/title/${current.mediaType}/${current.id}`}
            className="flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {t("tonight.details")}
          </Link>
          <button
            type="button"
            aria-label={t("tonight.smashAria")}
            onClick={() => swipe("SMASH")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-white shadow-kino transition hover:scale-105"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27l-5.18 3.05 1.4-5.97L3.5 9.97l6.12-.53L12 3.75l2.38 5.69 6.12.53-4.72 4.38 1.4 5.97z" />
            </svg>
          </button>
        </div>
      )}

      <Toast
        message={toast?.msg ?? null}
        tone={toast?.tone ?? "default"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

function SwipeCard({
  item,
  stacked = false,
  leaving = null,
}: {
  item: TonightItem;
  stacked?: boolean;
  leaving?: "left" | "right" | null;
}) {
  const transformClass = leaving
    ? leaving === "right"
      ? "translate-x-[140%] rotate-[12deg] opacity-0"
      : "-translate-x-[140%] -rotate-[12deg] opacity-0"
    : stacked
    ? "scale-[0.94] translate-y-3 opacity-70"
    : "opacity-100";

  const rating = item.score / 2;
  const poster = item.posterPath
    ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
    : null;
  const backdrop = item.backdropPath
    ? `https://image.tmdb.org/t/p/original${item.backdropPath}`
    : poster;

  return (
    <div
      className={`absolute inset-0 transform transition-all duration-300 ease-out ${transformClass}`}
      style={{ zIndex: stacked ? 1 : 2 }}
    >
      <div className="image-text-surface relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-kino-panel shadow-card">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-kino-ink via-kino-ink/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            {(item.genreNames ?? []).slice(0, 3).map((g) => (
              <span key={g} className="chip">
                {g}
              </span>
            ))}
          </div>
          <h2 className="text-display text-3xl font-bold text-white md:text-4xl">
            {item.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <StarRating value={rating} size={14} />
            <span className="text-kino-gold">{item.score.toFixed(1)}</span>
            <span className="text-white/40">/ 10</span>
          </div>
          {item.overview && (
            <p className="line-clamp-3 text-sm text-white/75">{item.overview}</p>
          )}
        </div>
      </div>
    </div>
  );
}
