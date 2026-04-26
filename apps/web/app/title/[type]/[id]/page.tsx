"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { statusLabel } from "@/lib/i18n";
import { useLocale } from "../../../components/AppProviders";
import { FormattedBody } from "../../../components/FormattedBody";
import { StarRating } from "../../../components/StarRating";

type Detail = { source: string; data: Record<string, unknown> };

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  featured?: boolean;
  userId: string;
  user: { id: string; displayName: string };
  _count?: { likes: number; comments: number };
};

type ListRow = { id: string; name: string };
type Me = { id: string };
type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  user: { displayName: string };
};

export default function TitlePage() {
  const { locale, t } = useLocale();
  const params = useParams<{ type: string; id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [myRating, setMyRating] = useState(4);
  const [myBody, setMyBody] = useState("");
  const [mySpoiler, setMySpoiler] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [commentsByReview, setCommentsByReview] = useState<Record<string, CommentRow[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [reportInputs, setReportInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!params?.type || !params?.id) return;
    setLoading(true);
    setLoadError(null);
    await apiFetch<Detail>(`/media/${params.type}/${params.id}`, { auth: false })
      .then(setDetail)
      .catch(() => {
        setDetail(null);
        setLoadError(t("title.notFound"));
      });
    await apiFetch<ReviewRow[]>(`/reviews/work/${params.type}/${params.id}`, {
      auth: false,
    })
      .then(setReviews)
      .catch(() => setReviews([]));
    await apiFetch<{ id: string; name: string }[]>("/library/lists/mine")
      .then((rows) => setLists(rows.map((r) => ({ id: r.id, name: r.name }))))
      .catch(() => setLists([]));
    await apiFetch<Me>("/users/me")
      .then((u) => setMeId(u.id))
      .catch(() => setMeId(null));
    setLoading(false);
  }, [params, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!meId) return;
    const mine = reviews.find((r) => r.userId === meId);
    if (mine) {
      setMyBody(mine.body);
      setMyRating(mine.rating);
      setMySpoiler(mine.spoiler);
    }
  }, [meId, reviews]);

  if (loading) {
    return (
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <div className="skeleton aspect-[2/3] w-full rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-10 w-2/3 rounded-lg" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <section className="glass rounded-3xl p-6 text-center">
        <h1 className="text-display text-2xl font-bold text-white">{t("title.unavailable")}</h1>
        <p className="mt-2 text-sm text-kino-muted">
          {loadError ?? t("title.loadFailed")}
        </p>
        <button className="btn-primary mt-5" onClick={loadAll}>
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const d = detail.data;
  const title = (d.title as string) ?? (d.name as string);
  const overview = (d.overview as string) ?? "";
  const poster = d.poster_path as string | undefined;
  const backdrop = d.backdrop_path as string | undefined;
  const voteAvg = (d.vote_average as number) ?? 0;
  const releaseDate =
    (d.release_date as string | undefined) ?? (d.first_air_date as string | undefined) ?? "";
  const year = releaseDate.slice(0, 4);
  const runtime = d.runtime as number | undefined;
  const genres = ((d.genres as { name: string }[] | undefined) ?? []).map((g) => g.name);
  const tmdbId = Number(params.id);
  const mediaType = params.type === "tv" ? "TV" : "MOVIE";

  async function setStatus(status: "WATCHLIST" | "IN_PROGRESS" | "COMPLETED" | "DROPPED") {
    try {
      await apiFetch("/library/status", {
        method: "POST",
        body: JSON.stringify({ tmdbId, mediaType, status }),
      });
      setMsg(t("title.statusUpdated", { status: statusLabel(locale, status) }));
    } catch {
      setMsg(t("title.signInLibrary"));
    }
  }

  async function publishReview() {
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          tmdbId,
          mediaType,
          rating: myRating,
          body: myBody,
          spoiler: mySpoiler,
        }),
      });
      setMyBody("");
      setMySpoiler(false);
      await loadAll();
      setMsg(t("title.reviewPosted"));
    } catch {
      setMsg(t("title.signInPost"));
    } finally {
      setSaving(false);
    }
  }

  async function addToList(listId: string) {
    try {
      await apiFetch(`/library/lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      setMsg(t("title.addedToList"));
    } catch {
      setMsg(t("title.addToListFailed"));
    }
  }

  async function removeReview(reviewId: string) {
    try {
      await apiFetch(`/reviews/${reviewId}`, { method: "DELETE" });
      await loadAll();
      setMsg(t("title.reviewDeleted"));
    } catch {
      setMsg(t("title.deleteFailed"));
    }
  }

  async function toggleLike(reviewId: string) {
    try {
      await apiFetch(`/reviews/${reviewId}/like`, { method: "POST" });
      await loadAll();
    } catch {
      setMsg(t("title.signInLike"));
    }
  }

  async function loadComments(reviewId: string) {
    const rows = await apiFetch<CommentRow[]>(`/reviews/${reviewId}/comments`, {
      auth: false,
    });
    setCommentsByReview((prev) => ({ ...prev, [reviewId]: rows }));
  }

  async function postComment(reviewId: string) {
    const body = commentInputs[reviewId]?.trim();
    if (!body) return;
    try {
      await apiFetch(`/reviews/${reviewId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setCommentInputs((prev) => ({ ...prev, [reviewId]: "" }));
      await loadComments(reviewId);
    } catch {
      setMsg(t("title.signInComment"));
    }
  }

  async function reportReview(reviewId: string) {
    const reason = reportInputs[reviewId]?.trim();
    if (!reason) {
      setMsg(t("title.reportReasonRequired"));
      return;
    }
    try {
      await apiFetch(`/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setReportInputs((prev) => ({ ...prev, [reviewId]: "" }));
      setMsg(t("title.reportSent"));
    } catch {
      setMsg(t("title.signInReport"));
    }
  }

  const myExistingReview = meId ? reviews.find((r) => r.userId === meId) : undefined;

  return (
    <div className="space-y-8">
      <section className="relative -mx-4 -mt-6 overflow-hidden md:-mx-6">
        <div className="relative h-[360px] md:h-[480px]">
          {backdrop && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/original${backdrop}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-kino-ink via-kino-ink/60 to-kino-ink/40" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 md:px-6">
            <div className="flex flex-wrap items-end gap-6">
              {poster && (
                <div className="hidden w-[180px] shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-card md:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://image.tmdb.org/t/p/w500${poster}`}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
                  {params.type === "tv" ? t("title.tv") : t("title.movie")} ·{" "}
                  {detail.source === "cache" ? t("title.sourceCache") : t("title.sourceTmdb")}
                </p>
                <h1 className="text-display text-4xl font-bold leading-tight text-white md:text-6xl">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                  {year && <span>{year}</span>}
                  {runtime && (
                    <>
                      <span className="text-white/30">·</span>
                      <span>{t("title.runtimeMin", { minutes: runtime })}</span>
                    </>
                  )}
                  {voteAvg > 0 && (
                    <>
                      <span className="text-white/30">·</span>
                      <StarRating value={voteAvg / 2} size={14} />
                      <span className="text-kino-gold">{voteAvg.toFixed(1)}</span>
                    </>
                  )}
                </div>
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g) => (
                      <span key={g} className="chip">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-4 md:block">
          {poster && (
            <div className="poster-tilt overflow-hidden rounded-2xl border border-white/10 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://image.tmdb.org/t/p/w500${poster}`}
                alt={title}
                className="w-full"
              />
            </div>
          )}
          <div className="glass space-y-3 rounded-2xl p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-kino-muted">
              {t("title.quickActions")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(["WATCHLIST", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                <button
                  key={s}
                  className="chip"
                  onClick={() => setStatus(s)}
                >
                  {statusLabel(locale, s)}
                </button>
              ))}
            </div>
            {lists.length > 0 && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs uppercase tracking-wider text-kino-muted">
                  {t("title.addToList")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      className="chip"
                      onClick={() => addToList(l.id)}
                    >
                      + {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6">
          {overview && (
            <section className="space-y-3">
              <h2 className="text-display text-xl font-semibold text-white">{t("title.synopsis")}</h2>
              <p className="leading-relaxed text-white/80">{overview}</p>
            </section>
          )}

          <section className="md:hidden">
            <div className="glass space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {(["WATCHLIST", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const).map((s) => (
                  <button key={s} className="chip" onClick={() => setStatus(s)}>
                    {statusLabel(locale, s)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-xl font-semibold text-white">{t("title.yourReview")}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-kino-muted">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMyRating(n)}
                    aria-label={`${n} stars`}
                    className={`h-8 w-8 rounded-full transition ${
                      n <= myRating
                        ? "text-kino-gold"
                        : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="mx-auto h-6 w-6">
                      <path d="M12 17.27l-5.18 3.05 1.4-5.97L3.5 9.97l6.12-.53L12 3.75l2.38 5.69 6.12.53-4.72 4.38 1.4 5.97z" />
                    </svg>
                  </button>
                ))}
              </div>
              <span className="text-white">{myRating}/5</span>
            </div>
            <p className="text-xs text-kino-muted">
              {t("title.formattingHint")}
            </p>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
              rows={4}
              value={myBody}
              onChange={(e) => setMyBody(e.target.value)}
              placeholder={t("title.reviewPlaceholder")}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-kino-muted">
              <input
                type="checkbox"
                checked={mySpoiler}
                onChange={(e) => setMySpoiler(e.target.checked)}
                className="accent-[#ff2e7e]"
              />
              {t("title.spoilerCheckbox")}
            </label>
            <button
              className="btn-primary disabled:opacity-60"
              onClick={publishReview}
              disabled={saving}
            >
              {saving
                ? t("title.publishing")
                : myExistingReview
                  ? t("title.editReview")
                  : t("title.publish")}
            </button>
          </section>

          {msg && (
            <p className="rounded-xl border border-kino/30 bg-kino/10 px-4 py-2 text-sm text-kino-hot">
              {msg}
            </p>
          )}

          <section>
            <h2 className="text-display mb-3 text-xl font-semibold text-white">
              {t("title.reviewsSection")}
            </h2>
            <ul className="space-y-3">
              {reviews.length === 0 && (
                <li className="text-sm text-kino-muted">{t("title.noReviews")}</li>
              )}
              {reviews.map((r) => (
                <li key={r.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-xs font-bold text-white">
                        {r.user.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {r.user.displayName}
                          {r.featured && (
                            <span className="ml-2 text-[10px] uppercase tracking-widest text-kino-gold">
                              {t("title.featured")}
                            </span>
                          )}
                        </p>
                        <StarRating value={r.rating} size={12} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-white/85">
                    {r.spoiler && (
                      <span className="mr-2 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                        {t("title.spoilerBadge")}
                      </span>
                    )}
                    <FormattedBody text={r.body} />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="chip" onClick={() => toggleLike(r.id)}>
                      {t("title.like")} ({r._count?.likes ?? 0})
                    </button>
                    <button className="chip" onClick={() => loadComments(r.id)}>
                      {t("title.comments")} ({r._count?.comments ?? 0})
                    </button>
                    {meId && r.userId !== meId && (
                      <button
                        className="chip border-amber-400/40 bg-amber-500/10 text-amber-200"
                        onClick={() =>
                          setReportInputs((prev) => ({
                            ...prev,
                            [r.id]: prev[r.id] ?? "",
                          }))
                        }
                      >
                        {t("title.report")}
                      </button>
                    )}
                    {meId && r.userId === meId && (
                      <button
                        className="chip border-red-400/40 bg-red-500/10 text-red-300"
                        onClick={() => removeReview(r.id)}
                      >
                        {t("title.delete")}
                      </button>
                    )}
                  </div>
                  {Object.prototype.hasOwnProperty.call(reportInputs, r.id) && (
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                        {t("title.reportReason")}
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                          placeholder={t("title.reportPlaceholder")}
                          value={reportInputs[r.id] ?? ""}
                          onChange={(e) =>
                            setReportInputs((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                        />
                        <button className="chip" onClick={() => reportReview(r.id)}>
                          {t("title.send")}
                        </button>
                      </div>
                    </div>
                  )}
                  {commentsByReview[r.id] && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <ul className="space-y-2">
                        {commentsByReview[r.id].map((c) => (
                          <li key={c.id} className="text-sm text-kino-muted">
                            <span className="font-medium text-white">
                              {c.user.displayName}:
                            </span>{" "}
                            {c.body}
                          </li>
                        ))}
                        {commentsByReview[r.id].length === 0 && (
                          <li className="text-sm text-kino-muted">{t("title.noComments")}</li>
                        )}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <input
                          className="flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                          placeholder={t("title.commentPlaceholder")}
                          value={commentInputs[r.id] ?? ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="rounded-full bg-gradient-to-r from-kino to-kino-hot px-4 py-2 text-sm font-semibold text-white shadow-kino"
                          onClick={() => postComment(r.id)}
                        >
                          {t("title.send")}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
