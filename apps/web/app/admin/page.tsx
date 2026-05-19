"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ReportRow = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reviewId: string;
  review: { id: string; body: string; userId: string };
  reporter: { id: string; displayName: string };
};

type Me = { role: string };

const STATUS_TONE: Record<ReportRow["status"], string> = {
  OPEN: "bg-kino/20 text-kino-hot border-kino/40",
  RESOLVED: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  DISMISSED: "bg-white/10 text-white/60 border-white/10",
};

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const me = await apiFetch<Me>("/users/me");
      setRole(me.role);
      if (me.role === "ADMIN") {
        const rows = await apiFetch<ReportRow[]>("/admin/reports");
        setReports(rows);
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
    setMsg("Review deleted.");
    load();
  }

  async function banUser(userId: string) {
    await apiFetch(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ until: null }),
    });
    setMsg("User banned.");
  }

  if (role !== "ADMIN") {
    return (
      <div className="glass rounded-2xl p-6 text-center text-kino-muted">
        Admin access required.
      </div>
    );
  }

  const open = reports.filter((r) => r.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          Moderation
        </p>
        <h1 className="text-display text-4xl font-bold text-white">Admin panel</h1>
        <p className="text-kino-muted">
          {open > 0
            ? `${open} open ${open === 1 ? "report" : "reports"} awaiting review.`
            : "No open reports right now."}
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
                Reason ·
              </span>{" "}
              <span className="text-white">{r.reason}</span>
            </p>
            <blockquote className="mt-3 rounded-xl border-l-2 border-kino/50 bg-black/30 px-4 py-3 text-sm text-white/85">
              &ldquo;{r.review.body}&rdquo;
            </blockquote>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="chip" onClick={() => resolve(r.id, "RESOLVED")}>
                Mark resolved
              </button>
              <button className="chip" onClick={() => resolve(r.id, "DISMISSED")}>
                Dismiss
              </button>
              <button
                className="chip border-red-400/40 bg-red-500/10 text-red-300"
                onClick={() => deleteReview(r.reviewId)}
              >
                Delete review
              </button>
              <button
                className="chip border-red-400/40 bg-red-500/10 text-red-300"
                onClick={() => banUser(r.review.userId)}
              >
                Ban author
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
    </div>
  );
}
