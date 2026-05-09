"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ListDetail = {
  name: string;
  isPublic: boolean;
  items: { tmdbId: number; mediaType: string }[];
};

export default function ListPage() {
  const params = useParams<{ id: string }>();
  const [l, setL] = useState<ListDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    apiFetch<ListDetail>(`/library/lists/${params.id}`, { auth: false })
      .then(setL)
      .catch(() => setErr("List not found or private"));
  }, [params]);

  if (err) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-red-300">{err}</div>
    );
  }
  if (!l) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-24 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          Custom list
        </p>
        <h1 className="text-display text-4xl font-bold text-white">{l.name}</h1>
        <span className="chip">
          {l.isPublic ? "Public" : "Private"} · {l.items.length} items
        </span>
      </header>
      <ul className="grid gap-2 md:grid-cols-2">
        {l.items.map((i) => (
          <li key={`${i.mediaType}-${i.tmdbId}`}>
            <Link
              href={`/title/${i.mediaType === "TV" ? "tv" : "movie"}/${i.tmdbId}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white transition hover:border-kino/40 hover:bg-white/5"
            >
              <span className="text-kino-muted">{i.mediaType}</span>
              <span className="font-medium">title #{i.tmdbId} →</span>
            </Link>
          </li>
        ))}
        {l.items.length === 0 && (
          <li className="text-kino-muted md:col-span-2">This list is empty.</li>
        )}
      </ul>
    </div>
  );
}
