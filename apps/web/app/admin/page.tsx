"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../components/AppProviders";

type ReportRow = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reviewId: string;
  review: { id: string; body: string; userId: string };
  reporter: { id: string; displayName: string };
};

type Me = { role: string };

type ReviewAdmin = {
  id: string;
  body: string;
  rating: number;
  featured: boolean;
  user: { displayName: string };
};

const STATUS_TONE: Record<ReportRow["status"], string> = {
  OPEN: "bg-kino/20 text-kino-hot border-kino/40",
  RESOLVED: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  DISMISSED: "bg-white/10 text-white/60 border-white/10",
};

export default function AdminPage() {
  const { t } = useLocale();
  const [role, setRole] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reviews, setReviews] = useState<ReviewAdmin[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const me = await apiFetch<Me>("/users/me");
      setRole(me.role);
      if (me.role === "ADMIN") {
        const [rows, rev] = await Promise.all([
          apiFetch<ReportRow[]>("/admin/reports"),
          apiFetch<ReviewAdmin[]>("/admin/reviews"),
        ]);
        setReports(rows);
        setReviews(rev);
      }
    } catch {
      setRole(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, status: "RESOLVED" | "DISMISSED") {
    await apiFetch(`/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteReview(reviewId: string) {
    await apiFetch(`/admin/reviews/${reviewId}`, { method: "DELETE" });
    setMsg(t("admin.reviewDeleted"));
    load();
  }

  async function banUser(userId: string) {
    await apiFetch(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ until: null }),
    });
    setMsg(t("admin.userBanned"));
  }

  if (role !== "ADMIN") {
    return (
      <div className="glass rounded-2xl p-6 text-center text-kino-muted">
        {t("admin.accessRequired")}
      </div>
    );
  }

  const open = reports.filter((r) => r.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("admin.title")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white">{t("admin.panel")}</h1>
        <p className="text-kino-muted">
          {open > 0
            ? t("admin.reportsAwaiting", { count: open })
            : t("admin.noReports")}
        </p>
      </header>

      {msg && (
        <p className="rounded-xl border border-kino/30 bg-kino/10 px-4 py-2 text-sm text-kino-hot">
          {msg}
        </p>
      )}

      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${STATUS_TONE[r.status]}`}
                >
                  {r.status}
                </span>
                <span className="text-kino-muted">
                  reported by{" "}
                  <span className="font-medium text-white">
                    {r.reporter.displayName}
                  </span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-kino-muted">
              <span className="font-semibold uppercase tracking-widest text-kino-muted">
                {t("admin.reason")} ·
              </span>{" "}
              <span className="text-white">{r.reason}</span>
            </p>
            <blockquote className="mt-3 rounded-xl border-l-2 border-kino/50 bg-black/30 px-4 py-3 text-sm text-white/85">
              &ldquo;{r.review.body}&rdquo;
            </blockquote>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="chip" onClick={() => resolve(r.id, "RESOLVED")}>
                {t("admin.resolve")}
              </button>
              <button className="chip" onClick={() => resolve(r.id, "DISMISSED")}>
                {t("admin.dismiss")}
              </button>
              <button
                className="chip border-red-400/40 bg-red-500/10 text-red-300"
                onClick={() => deleteReview(r.reviewId)}
              >
                {t("admin.deleteReview")}
              </button>
              <button
                className="chip border-red-400/40 bg-red-500/10 text-red-300"
                onClick={() => banUser(r.review.userId)}
              >
                {t("admin.ban")}
              </button>
            </div>
          </li>
        ))}
        {reports.length === 0 && (
          <li className="glass rounded-2xl p-6 text-center text-kino-muted">
            No reports.
          </li>
        )}
      </ul>

      <section className="space-y-3">
        <h2 className="text-display text-2xl font-semibold text-white">{t("admin.featured")}</h2>
        <p className="text-sm text-kino-muted">{t("admin.featuredHint")}</p>
        <ul className="space-y-2">
          {reviews.slice(0, 15).map((rev) => (
            <li
              key={rev.id}
              className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {rev.user.displayName} · {rev.rating}/5
                  {rev.featured && (
                    <span className="ml-2 text-kino-gold">{t("admin.featuredBadge")}</span>
                  )}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-kino-muted">{rev.body}</p>
              </div>
              <button
                className="chip"
                onClick={async () => {
                  await apiFetch(`/reviews/admin/${rev.id}/featured`, {
                    method: "POST",
                    body: JSON.stringify({ featured: !rev.featured }),
                  });
                  load();
                }}
              >
                {rev.featured ? t("admin.unfeature") : t("admin.feature")}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
