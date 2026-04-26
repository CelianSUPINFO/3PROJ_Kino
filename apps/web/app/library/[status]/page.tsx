"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";
import { PosterCard, type PosterCardData } from "../../components/PosterCard";
import type { I18nKey } from "@/lib/i18n";

type StatusRow = {
  tmdbId: number;
  mediaType: string;
  status: string;
  title?: string;
  posterPath?: string | null;
};

const STATUS_MAP: Record<string, { api: string; key: I18nKey }> = {
  watchlist: { api: "WATCHLIST", key: "library.toWatch" },
  "in-progress": { api: "IN_PROGRESS", key: "library.inProgress" },
  "in_progress": { api: "IN_PROGRESS", key: "library.inProgress" },
  completed: { api: "COMPLETED", key: "library.completed" },
  dropped: { api: "DROPPED", key: "library.dropped" },
};

export default function LibraryStatusPage() {
  const params = useParams<{ status: string }>();
  const { t } = useLocale();
  const [rows, setRows] = useState<StatusRow[]>([]);
  const meta = STATUS_MAP[params.status?.toLowerCase() ?? ""] ?? STATUS_MAP.watchlist;

  useEffect(() => {
    apiFetch<StatusRow[]>(`/library/me?status=${meta.api}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [meta.api]);

  const items: PosterCardData[] = useMemo(
    () =>
      rows.map((row) => ({
        id: row.tmdbId,
        media_type: row.mediaType === "TV" ? "tv" : "movie",
        title: row.title,
        name: row.title,
        poster_path: row.posterPath ?? undefined,
      })),
    [rows],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
          {t("nav.library")}
        </p>
        <h1 className="text-display text-3xl font-bold text-white">{t(meta.key)}</h1>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((m, idx) => (
          <PosterCard
            key={`${m.id}-${idx}`}
            item={m}
            type={m.media_type === "tv" ? "tv" : "movie"}
            index={idx}
          />
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-kino-muted">{t("common.loading")}</p>
      )}
    </div>
  );
}
