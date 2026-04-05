"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type StatusRow = {
  tmdbId: number;
  mediaType: string;
  status: string;
};

type ListRow = {
  id: string;
  name: string;
  isPublic: boolean;
  _count?: { items: number };
};

const STATUS_LABEL: Record<string, string> = {
  WATCHLIST: "To watch",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

const STATUS_ORDER = ["WATCHLIST", "IN_PROGRESS", "COMPLETED", "DROPPED"];

export default function LibraryPage() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadData() {
    apiFetch<StatusRow[]>("/library/me")
      .then(setRows)
      .catch(() => setErr("Sign in required"));
    apiFetch<ListRow[]>("/library/lists/mine")
      .then(setLists)
      .catch(() => setLists([]));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createList() {
    if (!newListName.trim()) return;
    try {
      await apiFetch("/library/lists", {
        method: "POST",
        body: JSON.stringify({ name: newListName, isPublic: newListPublic }),
      });
      setNewListName("");
      setNewListPublic(false);
      loadData();
    } catch {
      setErr("Unable to create list");
    }
  }

  async function togglePrivacy(list: ListRow) {
    await apiFetch(`/library/lists/${list.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPublic: !list.isPublic }),
    });
    loadData();
  }

  async function removeList(id: string) {
    await apiFetch(`/library/lists/${id}`, { method: "DELETE" });
    loadData();
  }

  if (err) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-kino-muted">{err}</div>
    );
  }

  const counts = STATUS_ORDER.map((s) => ({
    status: s,
    count: rows.filter((r) => r.status === s).length,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          Your library
        </p>
        <h1 className="text-display text-4xl font-bold text-white">My library</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {counts.map(({ status, count }) => (
          <div key={status} className="glass rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-kino-muted">
              {STATUS_LABEL[status]}
            </p>
            <p className="text-display mt-1 text-3xl font-bold text-white">{count}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-display text-xl font-semibold text-white">Tracked titles</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => (
            <li
              key={`${r.mediaType}-${r.tmdbId}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
            >
              <span className="text-kino-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
              <Link
                href={`/title/${r.mediaType === "TV" ? "tv" : "movie"}/${r.tmdbId}`}
                className="font-medium text-white hover:text-kino-hot"
              >
                title #{r.tmdbId} →
              </Link>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-kino-muted md:col-span-2">
              No entries yet.
            </li>
          )}
        </ul>
      </section>

      <section className="glass space-y-4 rounded-2xl p-5">
        <h2 className="text-display text-xl font-semibold text-white">Custom lists</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name..."
            className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-kino-muted">
            <input
              type="checkbox"
              checked={newListPublic}
              onChange={(e) => setNewListPublic(e.target.checked)}
              className="accent-[#ff2e7e]"
            />
            Public
          </label>
          <button className="btn-primary !py-2 !px-5 text-sm" onClick={createList}>
            Create
          </button>
        </div>
        <ul className="space-y-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
            >
              <div>
                <Link
                  href={`/list/${l.id}`}
                  className="font-medium text-white hover:text-kino-hot"
                >
                  {l.name}
                </Link>{" "}
                <span className="text-kino-muted">
                  · {l._count?.items ?? 0} items · {l.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="chip" onClick={() => togglePrivacy(l)}>
                  {l.isPublic ? "Make private" : "Make public"}
                </button>
                <button
                  className="chip border-red-400/40 bg-red-500/10 text-red-300"
                  onClick={() => removeList(l.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {lists.length === 0 && <li className="text-kino-muted">No lists yet.</li>}
        </ul>
      </section>
    </div>
  );
}
