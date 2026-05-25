"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";

type FavoriteFilm = {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title?: string;
  posterPath?: string | null;
};

type Profile = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  favoriteFilms?: FavoriteFilm[];
};

type PublicUser = { id: string; displayName: string; avatarUrl?: string | null };
type ProfileReview = {
  id: string;
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title: string;
  posterPath?: string | null;
  rating: number;
  body: string;
  spoiler: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UserPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLocale();
  const [p, setP] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<PublicUser[]>([]);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [pickQ, setPickQ] = useState("");
  const [pickResults, setPickResults] = useState<
    { id: number; title?: string; name?: string; poster_path?: string; media_type?: string }[]
  >([]);

  async function loadProfile() {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [profile, followerRows, followingRows, reviewRows, me] = await Promise.all([
        apiFetch<Profile>(`/users/${params.id}`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${params.id}/followers`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${params.id}/following`, { auth: false }),
        apiFetch<ProfileReview[]>(`/users/${params.id}/reviews`, { auth: false }),
        apiFetch<{ id: string }>("/users/me").catch(() => null),
      ]);
      setP(profile);
      setDraft(profile);
      setFollowers(followerRows);
      setFollowing(followingRows);
      setReviews(reviewRows);
      setMeId(me?.id ?? null);
    } catch {
      setP(null);
      setError(t("profile.unavailable"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!pickQ.trim() || pickQ.length < 2) {
      setPickResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof pickResults }>(
        `/media/search?q=${encodeURIComponent(pickQ)}&page=1&type=movie`,
        { auth: false },
      )
        .then((r) => setPickResults(r.results?.slice(0, 6) ?? []))
        .catch(() => setPickResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [pickQ]);

  const isOwnProfile = meId === p?.id;
  const isFollowing = meId ? followers.some((u) => u.id === meId) : false;
  const favorites = (p?.favoriteFilms ?? []) as FavoriteFilm[];

  async function toggleFollow() {
    if (!p) return;
    try {
      await apiFetch(`/users/${p.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      await loadProfile();
      setActionMsg(isFollowing ? t("profile.unfollow") : t("profile.follow"));
    } catch {
      setActionMsg(t("nav.login"));
    }
  }

  async function saveProfile() {
    if (!draft) return;
    setActionMsg(null);
    try {
      const updated = await apiFetch<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: draft.displayName,
          bio: draft.bio,
          website: draft.website ?? "",
          avatarUrl: draft.avatarUrl ?? "",
          bannerUrl: draft.bannerUrl ?? "",
          favoriteFilms: draft.favoriteFilms ?? [],
        }),
      });
      setP(updated);
      setDraft(updated);
      setEditing(false);
      setActionMsg(t("common.saved"));
    } catch {
      setActionMsg(t("profile.saveFailed"));
    }
  }

  async function uploadProfileImage(kind: "avatar" | "banner", file?: File | null) {
    if (!draft || !file) return;
    setUploading(kind);
    setActionMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await apiFetch<{ url: string; user: Profile }>(
        `/users/me/images/${kind}`,
        {
          method: "POST",
          body: form,
        },
      );
      const next = { ...draft, ...result.user };
      setDraft(next);
      setP(next);
      setActionMsg(t("common.saved"));
    } catch {
      setActionMsg(t("profile.uploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  function addFavorite(item: (typeof pickResults)[0]) {
    if (!draft) return;
    const list = [...(draft.favoriteFilms ?? [])];
    if (list.length >= 5) return;
    if (list.some((f) => f.tmdbId === item.id)) return;
    list.push({
      tmdbId: item.id,
      mediaType: item.media_type === "tv" ? "TV" : "MOVIE",
      title: item.title ?? item.name,
      posterPath: item.poster_path ?? null,
    });
    setDraft({ ...draft, favoriteFilms: list });
    setPickQ("");
    setPickResults([]);
  }

  function removeFavorite(tmdbId: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      favoriteFilms: (draft.favoriteFilms ?? []).filter((f) => f.tmdbId !== tmdbId),
    });
  }

  if (loading) {
    return <div className="skeleton h-48 w-full rounded-3xl" />;
  }

  if (error || !p) {
    return (
      <section className="glass rounded-3xl p-6 text-center">
        <h1 className="text-display text-2xl font-bold text-white">{t("profile.unavailable")}</h1>
        <button type="button" className="btn-primary mt-5" onClick={loadProfile}>
          {t("common.retry")}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-kino-panel/40">
        <div className="relative h-36 md:h-48">
          {p.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-kino/40 via-purple-900/30 to-kino-hot/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-kino-ink/90 to-transparent" />
        </div>
        <div className="relative px-5 pb-6 md:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatarUrl}
                alt=""
                className="h-24 w-24 rounded-2xl border-4 border-kino-ink object-cover shadow-card md:h-28 md:w-28"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-kino-ink bg-gradient-to-br from-kino to-kino-hot text-2xl font-bold text-white md:h-28 md:w-28">
                {initials(p.displayName)}
              </span>
            )}
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
                {t("profile.member")}
              </p>
              {editing && draft ? (
                <input
                  className="mt-1 w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xl font-bold text-white"
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                />
              ) : (
                <h1 className="text-display text-3xl font-bold text-white md:text-4xl">
                  {p.displayName}
                </h1>
              )}
            </div>
            <div className="flex w-full flex-wrap gap-2 pb-1 sm:w-auto">
              {isOwnProfile ? (
                editing ? (
                  <>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        setDraft(p);
                        setEditing(false);
                        setActionMsg(null);
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="button" className="btn-primary !py-2 !px-4 text-sm" onClick={saveProfile}>
                      {t("common.save")}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-primary !py-2 !px-4 text-sm" onClick={() => setEditing(true)}>
                    {t("profile.edit")}
                  </button>
                )
              ) : (
                <button type="button" className="btn-primary !py-2 !px-4 text-sm" onClick={toggleFollow}>
                  {isFollowing ? t("profile.unfollow") : t("profile.follow")}
                </button>
              )}
            </div>
          </div>

          {editing && draft ? (
            <div className="mt-4 space-y-3">
              <Field label={t("profile.bio")} textarea value={draft.bio ?? ""} onChange={(v) => setDraft({ ...draft, bio: v })} />
              <ImageUploadField
                label={t("profile.avatar")}
                busy={uploading === "avatar"}
                previewUrl={draft.avatarUrl}
                onPick={(file) => uploadProfileImage("avatar", file)}
              />
              <ImageUploadField
                label={t("profile.banner")}
                busy={uploading === "banner"}
                previewUrl={draft.bannerUrl}
                onPick={(file) => uploadProfileImage("banner", file)}
              />
              <Field label={t("profile.website")} value={draft.website ?? ""} onChange={(v) => setDraft({ ...draft, website: v })} />
              <div>
                <p className="text-sm font-semibold text-white">{t("profile.favorites")}</p>
                <p className="text-xs text-kino-muted">{t("profile.favoritesHint")}</p>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  placeholder={t("nav.searchPlaceholder")}
                  value={pickQ}
                  onChange={(e) => setPickQ(e.target.value)}
                />
                {pickResults.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/20 p-2">
                    {pickResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-white hover:bg-white/10"
                          onClick={() => addFavorite(r)}
                        >
                          {r.title ?? r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(draft.favoriteFilms ?? []).map((f) => (
                    <div key={f.tmdbId} className="relative">
                      {f.posterPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://image.tmdb.org/t/p/w92${f.posterPath}`}
                          alt=""
                          className="h-20 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-white/10 text-xs text-white">
                          #{f.tmdbId}
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs text-white"
                        onClick={() => removeFavorite(f.tmdbId)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-4 max-w-2xl text-kino-muted">
                {p.bio || t("profile.noBio")}
              </p>
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-kino hover:text-kino-hot">
                  {p.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </>
          )}

          {actionMsg && (
            <p className="mt-4 rounded-xl border border-kino/30 bg-kino/10 px-4 py-2 text-sm text-kino-hot">
              {actionMsg}
            </p>
          )}
        </div>
      </section>

      {!editing && (
        <section className="glass rounded-2xl p-5">
          <h2 className="text-display text-lg font-semibold text-white">{t("profile.favorites")}</h2>
          {favorites.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 min-[420px]:grid-cols-4 sm:flex sm:flex-wrap">
              {favorites.map((f) => (
                <Link
                  key={f.tmdbId}
                  href={`/title/${f.mediaType === "TV" ? "tv" : "movie"}/${f.tmdbId}`}
                  className="group min-w-0 sm:w-24 sm:shrink-0"
                >
                  {f.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w185${f.posterPath}`}
                      alt=""
                      className="aspect-[2/3] w-full rounded-xl object-cover transition group-hover:ring-2 group-hover:ring-kino"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-white/10 text-xs text-white">
                      #{f.tmdbId}
                    </div>
                  )}
                  <p className="mt-1 truncate text-xs text-kino-muted">{f.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-kino-muted">{t("profile.noFavorites")}</p>
          )}
        </section>
      )}

      {!editing && (
        <section className="glass rounded-2xl p-5">
          <h2 className="text-display text-lg font-semibold text-white">
            Critiques <span className="text-kino-muted">({reviews.length})</span>
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reviews.map((review) => (
              <Link
                key={review.id}
                href={`/title/${review.mediaType === "TV" ? "tv" : "movie"}/${review.tmdbId}`}
                className="flex gap-3 border border-white/10 bg-white/[0.03] p-3 transition hover:border-kino/40"
              >
                {review.posterPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://image.tmdb.org/t/p/w185${review.posterPath}`} alt="" className="h-24 w-16 shrink-0 object-cover" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-white">{review.title}</p>
                  <p className="mt-1 text-sm text-kino-gold">{"★".repeat(review.rating)} {review.rating}/5</p>
                  <p className="mt-2 line-clamp-3 text-sm text-kino-muted">{review.spoiler ? "[Spoiler] " : ""}{review.body}</p>
                </div>
              </Link>
            ))}
            {reviews.length === 0 && <p className="text-sm text-kino-muted">Aucune critique publiée.</p>}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <SocialList title={t("profile.followers")} users={followers} empty={t("profile.noFollowers")} />
        <SocialList title={t("profile.following")} users={following} empty={t("profile.noFollowing")} />
      </section>
    </div>
  );
}

function ImageUploadField({
  label,
  busy,
  previewUrl,
  onPick,
}: {
  label: string;
  busy: boolean;
  previewUrl?: string | null;
  onPick: (file?: File | null) => void;
}) {
  const { t } = useLocale();

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-widest text-kino-muted">
        {label}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-16 w-16 rounded-xl border border-white/10 object-cover"
          />
        )}
        <label className="chip cursor-pointer">
          {busy ? t("common.uploading") : t("common.chooseImage")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-kino-muted">{label}</span>
      {textarea ? (
        <textarea
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function SocialList({ title, users, empty }: { title: string; users: PublicUser[]; empty: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-display text-lg font-semibold text-white">
        {title} <span className="text-kino-muted">({users.length})</span>
      </h2>
      {users.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {users.slice(0, 8).map((u) => (
            <li key={u.id}>
              <Link href={`/u/${u.id}`} className="flex items-center gap-3 text-sm text-white hover:text-kino-hot">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                    {initials(u.displayName)}
                  </span>
                )}
                {u.displayName}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-kino-muted">{empty}</p>
      )}
    </div>
  );
}

