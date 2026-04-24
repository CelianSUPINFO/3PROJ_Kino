"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  website?: string | null;
};
type PublicUser = { id: string; displayName: string; avatarUrl?: string | null };
type Me = { id: string };

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
  const [p, setP] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<PublicUser[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function loadProfile() {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [profile, followerRows, followingRows, me] = await Promise.all([
        apiFetch<Profile>(`/users/${params.id}`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${params.id}/followers`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${params.id}/following`, { auth: false }),
        apiFetch<Me>("/users/me").catch(() => null),
      ]);
      setP(profile);
      setFollowers(followerRows);
      setFollowing(followingRows);
      setMeId(me?.id ?? null);
    } catch {
      setP(null);
      setError("Profil introuvable ou momentanément indisponible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function toggleFollow() {
    if (!p) return;
    setActionMsg(null);
    try {
      const isFollowing = followers.some((u) => u.id === meId);
      await apiFetch(`/users/${p.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      await loadProfile();
      setActionMsg(isFollowing ? "Abonnement retiré." : "Vous suivez maintenant ce profil.");
    } catch {
      setActionMsg("Connectez-vous pour suivre ce profil.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !p) {
    return (
      <section className="glass rounded-3xl p-6 text-center">
        <h1 className="text-display text-2xl font-bold text-white">Profil indisponible</h1>
        <p className="mt-2 text-sm text-kino-muted">{error}</p>
        <button className="btn-primary mt-5" onClick={loadProfile}>
          Réessayer
        </button>
      </section>
    );
  }

  const isOwnProfile = meId === p.id;
  const isFollowing = followers.some((u) => u.id === meId);

  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-kino/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-xl font-bold text-white shadow-kino">
              {initials(p.displayName)}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
              Kino member
            </p>
            <h1 className="text-display text-3xl font-bold text-white md:text-4xl">
              {p.displayName}
            </h1>
            {p.bio && <p className="max-w-xl text-kino-muted">{p.bio}</p>}
            {p.website && (
              <a
                href={p.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-kino hover:text-kino-hot hover:underline"
              >
                {p.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          {!isOwnProfile && (
            <button className="btn-primary" onClick={toggleFollow}>
              {isFollowing ? "Ne plus suivre" : "Suivre"}
            </button>
          )}
        </div>
        {actionMsg && (
          <p className="relative mt-4 rounded-xl border border-kino/30 bg-kino/10 px-4 py-2 text-sm text-kino-hot">
            {actionMsg}
          </p>
        )}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <SocialList title="Abonnés" users={followers} empty="Aucun abonné pour le moment." />
        <SocialList title="Abonnements" users={following} empty="Ce membre ne suit encore personne." />
      </section>
    </div>
  );
}

function SocialList({
  title,
  users,
  empty,
}: {
  title: string;
  users: PublicUser[];
  empty: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-display text-lg font-semibold text-white">
        {title} <span className="text-kino-muted">({users.length})</span>
      </h2>
      <ul className="mt-4 space-y-2">
        {users.length === 0 && <li className="text-sm text-kino-muted">{empty}</li>}
        {users.slice(0, 8).map((u) => (
          <li key={u.id} className="flex items-center gap-3 text-sm text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
              {initials(u.displayName)}
            </span>
            {u.displayName}
          </li>
        ))}
      </ul>
    </div>
  );
}
