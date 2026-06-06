"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Report = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reviewId: string;
  review: { id: string; body: string; userId: string };
  reporter: { displayName: string };
};
type User = {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  bannedUntil?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  _count: { reviewsWritten: number; followers: number; reportsFiled: number };
};
type AdminReview = {
  id: string;
  body: string;
  rating: number;
  featured: boolean;
  tmdbId: number;
  mediaType: string;
  user: { id: string; displayName: string };
  _count: { likes: number; comments: number };
};
type MessageReport = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reporter: { id: string; displayName: string };
  message: {
    id: string;
    body: string;
    sender: { id: string; displayName: string };
  };
};
type WorkStat = {
  tmdbId: number;
  mediaType: string;
  title: string;
  count: number;
  average: number;
};
type Stats = {
  totals: {
    users: number;
    activeUsers: number;
    reviews: number;
    reportsOpen: number;
    averageReviewsPerUser: number;
  };
  topReviewedThisWeek: WorkStat[];
  topRatedThisWeek: WorkStat[];
  topFollowed: Array<{ id: string; displayName: string; _count: { followers: number } }>;
  topReviewers: Array<{ id: string; displayName: string; _count: { reviewsWritten: number } }>;
};

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"dashboard" | "reports" | "messages" | "reviews" | "users">("dashboard");
  const [message, setMessage] = useState("");

  async function load() {
    const me = await apiFetch<{ role: string }>("/users/me");
    setRole(me.role);
    if (me.role !== "ADMIN") return;
    const [nextStats, nextReports, nextMessageReports, nextReviews, nextUsers] = await Promise.all([
      apiFetch<Stats>("/admin/stats"),
      apiFetch<Report[]>("/admin/reports"),
      apiFetch<MessageReport[]>("/admin/message-reports").catch(() => [] as MessageReport[]),
      apiFetch<AdminReview[]>("/admin/reviews").catch(() => [] as AdminReview[]),
      apiFetch<User[]>("/admin/users"),
    ]);
    setStats(nextStats);
    setReports(nextReports);
    setMessageReports(nextMessageReports);
    setAdminReviews(nextReviews);
    setUsers(nextUsers);
  }

  useEffect(() => {
    load().catch(() => setRole(null));
    const timer = setInterval(() => load().catch(() => undefined), 30000);
    return () => clearInterval(timer);
  }, []);

  async function updateUser(id: string, data: object, done: string) {
    await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    setMessage(done);
    await load();
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Supprimer définitivement ce compte et toutes ses données ?")) return;
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setMessage("Compte supprimé.");
    await load();
  }

  if (role !== "ADMIN") {
    return <div className="glass p-6 text-center text-kino-muted">Accès administrateur requis.</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-kino-hot">Administration</p>
        <h1 className="text-display mt-2 text-3xl font-bold text-white">Pilotage de Kino</h1>
        <p className="mt-2 text-sm text-kino-muted">Activité récente, modération et gestion des comptes.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["dashboard", "reports", "messages", "reviews", "users"] as const).map((item) => (
          <button key={item} className={`chip ${tab === item ? "border-kino bg-kino/20 text-white" : ""}`} onClick={() => setTab(item)}>
            {item === "dashboard"
              ? "Statistiques"
              : item === "reports"
                ? "Signalements"
                : item === "messages"
                  ? "Messages signalés"
                  : item === "reviews"
                    ? "Coups de cœur"
                    : "Comptes"}
          </button>
        ))}
      </div>
      {message && <p className="border-l-2 border-kino px-3 text-sm text-kino-hot">{message}</p>}

      {tab === "dashboard" && stats && (
        <div className="space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Utilisateurs" value={stats.totals.users} />
            <Metric label="Actifs maintenant" value={stats.totals.activeUsers} accent />
            <Metric label="Critiques" value={stats.totals.reviews} />
            <Metric label="Moyenne / utilisateur" value={stats.totals.averageReviewsPerUser} />
            <Metric label="Signalements ouverts" value={stats.totals.reportsOpen} />
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <Ranking title="Films et séries les plus critiqués cette semaine" rows={stats.topReviewedThisWeek.map((x) => ({ label: x.title, value: x.count }))} />
            <Ranking title="Meilleures notes globales de la semaine" rows={stats.topRatedThisWeek.map((x) => ({ label: x.title, value: x.average }))} suffix="/5" />
            <Ranking title="Personnes les plus suivies" rows={stats.topFollowed.map((x) => ({ label: x.displayName, value: x._count.followers }))} />
            <Ranking title="Personnes ayant le plus critiqué" rows={stats.topReviewers.map((x) => ({ label: x.displayName, value: x._count.reviewsWritten }))} />
          </section>
        </div>
      )}

      {tab === "reports" && (
        <section className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="glass p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{report.reason}</p>
                <span className="text-xs uppercase tracking-wider text-kino-hot">{report.status}</span>
              </div>
              <p className="mt-2 text-sm text-kino-muted">Signalé par {report.reporter.displayName}</p>
              <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm text-white/80">{report.review.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="chip" onClick={async () => { await apiFetch(`/admin/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) }); await load(); }}>Résoudre</button>
                <button className="chip" onClick={async () => { await apiFetch(`/admin/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) }); await load(); }}>Ignorer</button>
                <button className="chip text-red-300" onClick={async () => { await apiFetch(`/admin/reviews/${report.reviewId}`, { method: "DELETE" }); await load(); }}>Supprimer la critique</button>
              </div>
            </article>
          ))}
          {reports.length === 0 && <p className="text-sm text-kino-muted">Aucun signalement.</p>}
        </section>
      )}

      {tab === "messages" && (
        <section className="space-y-3">
          {messageReports.map((report) => (
            <article key={report.id} className="glass p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{report.reason}</p>
                <span className="text-xs uppercase tracking-wider text-kino-hot">{report.status}</span>
              </div>
              <p className="mt-2 text-sm text-kino-muted">
                Signalé par {report.reporter.displayName} · Message de {report.message.sender.displayName}
              </p>
              <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm text-white/80">{report.message.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="chip" onClick={async () => { await apiFetch(`/admin/message-reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) }); await load(); }}>Résoudre</button>
                <button className="chip" onClick={async () => { await apiFetch(`/admin/message-reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: "DISMISSED" }) }); await load(); }}>Ignorer</button>
                <button className="chip text-red-300" onClick={async () => { await apiFetch(`/admin/messages/${report.message.id}`, { method: "DELETE" }); setMessage("Message supprimé."); await load(); }}>Supprimer le message</button>
              </div>
            </article>
          ))}
          {messageReports.length === 0 && <p className="text-sm text-kino-muted">Aucun message signalé.</p>}
        </section>
      )}

      {tab === "reviews" && (
        <section className="space-y-3">
          <p className="text-sm text-kino-muted">Mettez en avant les meilleures critiques : elles s&apos;affichent avec un badge « Coup de cœur » sur les fiches œuvres.</p>
          {adminReviews.map((review) => (
            <article key={review.id} className="glass p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {review.user.displayName} · {review.rating}/5
                  {review.featured && <span className="ml-2 text-xs uppercase tracking-wider text-kino-gold">★ Coup de cœur</span>}
                </p>
                <span className="text-xs text-kino-muted">{review._count.likes} j&apos;aime · {review._count.comments} commentaires</span>
              </div>
              <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm text-white/80">{review.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className={`chip ${review.featured ? "border-kino-gold/60 text-kino-gold" : ""}`}
                  onClick={async () => {
                    await apiFetch(`/reviews/admin/${review.id}/featured`, {
                      method: "POST",
                      body: JSON.stringify({ featured: !review.featured }),
                    });
                    setMessage(review.featured ? "Coup de cœur retiré." : "Critique mise en avant.");
                    await load();
                  }}
                >
                  {review.featured ? "Retirer le coup de cœur" : "Mettre en avant"}
                </button>
                <button className="chip text-red-300" onClick={async () => { await apiFetch(`/admin/reviews/${review.id}`, { method: "DELETE" }); setMessage("Critique supprimée."); await load(); }}>Supprimer</button>
              </div>
            </article>
          ))}
          {adminReviews.length === 0 && <p className="text-sm text-kino-muted">Aucune critique.</p>}
        </section>
      )}

      {tab === "users" && (
        <section className="overflow-x-auto border border-white/10 bg-kino-panel">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-kino-muted">
              <tr><th className="p-3">Compte</th><th>Rôle</th><th>Activité</th><th>Critiques</th><th>Abonnés</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="p-3"><p className="font-medium text-white">{user.displayName}</p><p className="text-xs text-kino-muted">{user.email}</p></td>
                  <td className="text-white">{user.role}</td>
                  <td className="text-kino-muted">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString("fr-FR") : "Jamais"}</td>
                  <td className="text-white">{user._count.reviewsWritten}</td>
                  <td className="text-white">{user._count.followers}</td>
                  <td><div className="flex flex-wrap gap-1">
                    <button className="chip" onClick={() => updateUser(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" }, "Rôle modifié.")}>{user.role === "ADMIN" ? "Retirer admin" : "Rendre admin"}</button>
                    <button className="chip" onClick={() => updateUser(user.id, { bannedUntil: user.bannedUntil ? null : "2099-01-01T00:00:00.000Z" }, user.bannedUntil ? "Compte réactivé." : "Compte suspendu.")}>{user.bannedUntil ? "Réactiver" : "Suspendre"}</button>
                    <button className="chip text-red-300" onClick={() => deleteUser(user.id)}>Supprimer</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return <div className="border border-white/10 bg-kino-panel p-4"><p className="text-xs uppercase tracking-wider text-kino-muted">{label}</p><p className={`mt-2 text-3xl font-bold ${accent ? "text-emerald-300" : "text-white"}`}>{value}</p></div>;
}

function Ranking({ title, rows, suffix = "" }: { title: string; rows: Array<{ label: string; value: number }>; suffix?: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div><h2 className="mb-3 text-lg font-semibold text-white">{title}</h2><div className="space-y-3">{rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-white">{row.label}</span><span className="text-kino-hot">{row.value}{suffix}</span></div><div className="h-2 overflow-hidden bg-white/5"><div className="h-full bg-kino" style={{ width: `${Math.max((row.value / max) * 100, 4)}%` }} /></div></div>)}{rows.length === 0 && <p className="text-sm text-kino-muted">Pas encore assez de données cette semaine.</p>}</div></div>;
}
