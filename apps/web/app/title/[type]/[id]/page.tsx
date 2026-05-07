"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { StarRating } from "../../../components/StarRating";

type Detail = { source: string; data: Record<string, unknown> };

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
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
  const params = useParams<{ type: string; id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [myRating, setMyRating] = useState(4);
  const [myBody, setMyBody] = useState("");
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
        setLoadError("Œuvre introuvable ou API TMDB momentanément indisponible.");
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
  }, [params]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
        <h1 className="text-display text-2xl font-bold text-white">Œuvre indisponible</h1>
        <p className="mt-2 text-sm text-kino-muted">
          {loadError ?? "Impossible de charger cette fiche."}
        </p>
        <button className="btn-primary mt-5" onClick={loadAll}>
          Réessayer
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
      setMsg(`Status updated: ${status}`);
    } catch {
      setMsg("Sign in required to update your library.");
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
          spoiler: false,
        }),
      });
      setMyBody("");
      await loadAll();
      setMsg("Review posted.");
    } catch {
      setMsg("Unable to post (sign in required).");
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
      setMsg("Added to list.");
    } catch {
      setMsg("Unable to add to list.");
    }
  }

  async function removeReview(reviewId: string) {
    try {
      await apiFetch(`/reviews/${reviewId}`, { method: "DELETE" });
      await loadAll();
      setMsg("Review deleted.");
    } catch {
      setMsg("Delete failed.");
    }
  }

  async function toggleLike(reviewId: string) {
    try {
      await apiFetch(`/reviews/${reviewId}/like`, { method: "POST" });
      await loadAll();
    } catch {
      setMsg("Sign in required to like.");
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
      setMsg("Sign in required to comment.");
    }
  }

  async function reportReview(reviewId: string) {
    const reason = reportInputs[reviewId]?.trim();
    if (!reason) {
      setMsg("Indiquez une raison avant de signaler une critique.");
      return;
    }
    try {
      await apiFetch(`/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setReportInputs((prev) => ({ ...prev, [reviewId]: "" }));
      setMsg("Signalement transmis à la modération.");
    } catch {
      setMsg("Connectez-vous pour signaler une critique.");
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
                  {params.type === "tv" ? "Série" : "Film"} ·{" "}
                  {detail.source === "cache" ? "Cache local" : "TMDB"}
                </p>
                <h1 className="text-display text-4xl font-bold leading-tight text-white md:text-6xl">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                  {year && <span>{year}</span>}
                  {runtime && (
                    <>
                      <span className="text-white/30">·</span>
                      <span>{runtime} min</span>
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
              Actions rapides
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { s: "WATCHLIST", l: "À voir" },
                { s: "IN_PROGRESS", l: "En cours" },
                { s: "COMPLETED", l: "Terminé" },
                { s: "DROPPED", l: "Abandonné" },
              ].map((b) => (
                <button
                  key={b.s}
                  className="chip"
                  onClick={() =>
                    setStatus(b.s as "WATCHLIST" | "IN_PROGRESS" | "COMPLETED" | "DROPPED")
                  }
                >
                  {b.l}
                </button>
              ))}
            </div>
            {lists.length > 0 && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs uppercase tracking-wider text-kino-muted">
                  Ajouter à une liste
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
              <h2 className="text-display text-xl font-semibold text-white">Synopsis</h2>
              <p className="leading-relaxed text-white/80">{overview}</p>
            </section>
          )}

          <section className="md:hidden">
            <div className="glass space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { s: "WATCHLIST", l: "À voir" },
                  { s: "IN_PROGRESS", l: "En cours" },
                  { s: "COMPLETED", l: "Terminé" },
                  { s: "DROPPED", l: "Abandonné" },
                ].map((b) => (
                  <button
                    key={b.s}
                    className="chip"
                    onClick={() =>
                      setStatus(
                        b.s as "WATCHLIST" | "IN_PROGRESS" | "COMPLETED" | "DROPPED",
                      )
                    }
                  >
                    {b.l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="glass space-y-4 rounded-2xl p-5">
            <h2 className="text-display text-xl font-semibold text-white">Votre critique</h2>
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
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
              rows={4}
              value={myBody}
              onChange={(e) => setMyBody(e.target.value)}
              placeholder={
                myExistingReview
                  ? `Critique actuelle : ${myExistingReview.body}`
                  : "Partagez votre avis..."
              }
            />
            <button
              className="btn-primary disabled:opacity-60"
              onClick={publishReview}
              disabled={saving}
            >
              {saving ? "Publication..." : myExistingReview ? "Modifier" : "Publier"}
            </button>
          </section>

          {msg && (
            <p className="rounded-xl border border-kino/30 bg-kino/10 px-4 py-2 text-sm text-kino-hot">
              {msg}
            </p>
          )}

          <section>
            <h2 className="text-display mb-3 text-xl font-semibold text-white">
              Critiques Kino
            </h2>
            <ul className="space-y-3">
              {reviews.length === 0 && (
                <li className="text-sm text-kino-muted">Aucune critique pour le moment.</li>
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
                        </p>
                        <StarRating value={r.rating} size={12} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-white/85">{r.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="chip" onClick={() => toggleLike(r.id)}>
                      J&apos;aime ({r._count?.likes ?? 0})
                    </button>
                    <button className="chip" onClick={() => loadComments(r.id)}>
                      Commentaires ({r._count?.comments ?? 0})
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
                        Signaler
                      </button>
                    )}
                    {meId && r.userId === meId && (
                      <button
                        className="chip border-red-400/40 bg-red-500/10 text-red-300"
                        onClick={() => removeReview(r.id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  {Object.prototype.hasOwnProperty.call(reportInputs, r.id) && (
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                        Raison du signalement
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                          placeholder="Spoiler non marqué, insulte..."
                          value={reportInputs[r.id] ?? ""}
                          onChange={(e) =>
                            setReportInputs((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                        />
                        <button className="chip" onClick={() => reportReview(r.id)}>
                          Envoyer
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
                          <li className="text-sm text-kino-muted">Aucun commentaire.</li>
                        )}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <input
                          className="flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                          placeholder="Ajouter un commentaire..."
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
                          Envoyer
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
