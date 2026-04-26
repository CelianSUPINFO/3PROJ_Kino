"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";

type ListDetail = {
  name: string;
  isPublic: boolean;
  items: { tmdbId: number; mediaType: string; title?: string }[];
};

export default function ListPage() {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const [l, setL] = useState<ListDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    apiFetch<ListDetail>(`/library/lists/${params.id}`, { auth: false })
      .then(async (list) => {
        const enriched = await Promise.all(
          list.items.map(async (item) => {
            const type = item.mediaType === "TV" ? "tv" : "movie";
            try {
              const r = await apiFetch<{ data: { title?: string; name?: string } }>(
                `/media/${type}/${item.tmdbId}`,
                { auth: false },
              );
              return {
                ...item,
                title: r.data?.title ?? r.data?.name ?? `#${item.tmdbId}`,
              };
            } catch {
              return { ...item, title: `#${item.tmdbId}` };
            }
          }),
        );
        setL({ ...list, items: enriched });
      })
      .catch(() => setErr(t("list.notFound")));
  }, [params, t]);

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
          {t("list.custom")}
        </p>
        <h1 className="text-display text-4xl font-bold text-white">{l.name}</h1>
        <span className="chip">
          {l.isPublic ? t("common.public") : t("common.private")} ·{" "}
          {t("list.items", { count: l.items.length })}
        </span>
      </header>
      <ul className="grid gap-2 md:grid-cols-2">
        {l.items.map((i) => (
          <li key={`${i.mediaType}-${i.tmdbId}`}>
            <Link
              href={`/title/${i.mediaType === "TV" ? "tv" : "movie"}/${i.tmdbId}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white transition hover:border-kino/40 hover:bg-white/5"
            >
              <span className="text-kino-muted">
                {i.mediaType === "TV" ? t("nav.series") : t("nav.movies")}
              </span>
              <span className="font-medium">{i.title ?? `#${i.tmdbId}`} →</span>
            </Link>
          </li>
        ))}
        {l.items.length === 0 && (
          <li className="text-kino-muted md:col-span-2">{t("list.empty")}</li>
        )}
      </ul>
    </div>
  );
}
