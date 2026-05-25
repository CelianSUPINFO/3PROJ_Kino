"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";

type ListDetail = {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  items: { tmdbId: number; mediaType: string; title?: string }[];
};

export default function ListPage() {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [addQ, setAddQ] = useState("");
  const [results, setResults] = useState<{ id: number; title?: string; poster_path?: string }[]>([]);

  async function load() {
    if (!params?.id) return;
    try {
      const data = await apiFetch<ListDetail>(`/library/lists/${params.id}`);
      const items = await Promise.all(data.items.map(async (item) => {
        const type = item.mediaType === "TV" ? "tv" : "movie";
        try {
          const result = await apiFetch<{ data: { title?: string; name?: string } }>(`/media/${type}/${item.tmdbId}`, { auth: false });
          return { ...item, title: result.data.title ?? result.data.name ?? `#${item.tmdbId}` };
        } catch {
          return { ...item, title: `#${item.tmdbId}` };
        }
      }));
      setList({ ...data, items });
      setEditName(data.name);
      setErr(null);
    } catch {
      setErr(t("list.notFound"));
    }
  }

  useEffect(() => {
    void load();
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  useEffect(() => {
    if (!list || meId !== list.userId || addQ.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof results }>(`/media/search?q=${encodeURIComponent(addQ)}&type=movie&page=1`, { auth: false })
        .then((data) => setResults(data.results.slice(0, 6)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, list, meId]);

  async function update(patch: { name?: string; isPublic?: boolean }) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await load();
  }

  async function removeItem(mediaType: string, tmdbId: number) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items/${mediaType === "TV" ? "tv" : "movie"}/${tmdbId}`, { method: "DELETE" });
    await load();
  }

  async function addItem(tmdbId: number) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items`, { method: "POST", body: JSON.stringify({ tmdbId, mediaType: "MOVIE" }) });
    setAddQ("");
    setResults([]);
    await load();
  }

  async function removeList() {
    if (!list || !confirm(`Supprimer la liste "${list.name}" ?`)) return;
    await apiFetch(`/library/lists/${list.id}`, { method: "DELETE" });
    router.push("/library");
  }

  if (err) return <div className="glass rounded-2xl p-6 text-center text-red-300">{err}</div>;
  if (!list) return <div className="skeleton h-40 rounded-2xl" />;
  const owner = meId === list.userId;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">{t("list.custom")}</p>
        <h1 className="break-words text-display text-4xl font-bold text-white">{list.name}</h1>
        <span className="chip">{list.isPublic ? t("common.public") : t("common.private")} · {t("list.items", { count: list.items.length })}</span>
        {owner && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-2">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-[180px] flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white" />
            <button className="chip" type="button" onClick={() => void update({ name: editName.trim() })}>Renommer</button>
            <button className="chip" type="button" onClick={() => void update({ isPublic: !list.isPublic })}>{list.isPublic ? "Rendre privée" : "Rendre publique"}</button>
            <button className="chip !border-red-300/30 !text-red-200" type="button" onClick={() => void removeList()}>Supprimer</button>
            </div>
            <div className="relative max-w-xl">
              <input value={addQ} onChange={(e) => setAddQ(e.target.value)} placeholder="Rechercher un film à ajouter..." className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white" />
              {results.length > 0 && <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-kino-panel p-2 shadow-card">
                {results.map((result) => <button key={result.id} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => void addItem(result.id)}>{result.title}</button>)}
              </div>}
            </div>
          </div>
        )}
      </header>
      <ul className="grid gap-2 md:grid-cols-2">
        {list.items.map((item) => (
          <li key={`${item.mediaType}-${item.tmdbId}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <Link href={`/title/${item.mediaType === "TV" ? "tv" : "movie"}/${item.tmdbId}`} className="flex min-w-0 flex-1 items-center justify-between px-2 py-1 text-white">
              <span className="text-kino-muted">{item.mediaType === "TV" ? t("nav.series") : t("nav.movies")}</span>
              <span className="truncate pl-3 font-medium">{item.title} →</span>
            </Link>
            {owner && <button type="button" aria-label="Retirer" className="chip !text-red-200" onClick={() => void removeItem(item.mediaType, item.tmdbId)}>×</button>}
          </li>
        ))}
        {list.items.length === 0 && <li className="text-kino-muted md:col-span-2">{t("list.empty")}</li>}
      </ul>
    </div>
  );
}
