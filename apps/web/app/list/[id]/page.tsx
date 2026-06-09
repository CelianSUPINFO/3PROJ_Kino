"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLocale } from "../../components/AppProviders";
import { PosterCard, type PosterCardData } from "../../components/PosterCard";

type ListItem = { itemId: string; tmdbId: number; mediaType: string } & PosterCardData;
type ApiListItem = { id: string; tmdbId: number; mediaType: string };
type ListDetail = {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  items: ListItem[];
};

export default function ListPage() {
  const { locale, t } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [addQ, setAddQ] = useState("");
  const [addType, setAddType] = useState<"movie" | "tv">("movie");
  const [results, setResults] = useState<{ id: number; title?: string; name?: string }[]>([]);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const data = await apiFetch<Omit<ListDetail, "items"> & { items: ApiListItem[] }>(`/library/lists/${params.id}`);
      const items = await Promise.all(data.items.map(async (item) => {
        const type = item.mediaType === "TV" ? "tv" : "movie";
        try {
          const result = await apiFetch<{ data: PosterCardData }>(`/media/${type}/${item.tmdbId}?language=${locale === "fr" ? "fr-FR" : "en-US"}`, { auth: false });
          return { ...item, ...result.data, itemId: item.id, id: item.tmdbId, media_type: type, title: result.data.title ?? result.data.name ?? `#${item.tmdbId}` };
        } catch {
          return { ...item, itemId: item.id, id: item.tmdbId, media_type: type, title: `#${item.tmdbId}` };
        }
      }));
      setList({ ...data, items });
      setEditName(data.name);
      setErr(null);
    } catch {
      setErr(t("list.notFound"));
    }
  }, [locale, params?.id, t]);

  useEffect(() => {
    void load();
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, [load]);

  useEffect(() => {
    if (!list || meId !== list.userId || addQ.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof results }>(`/media/search?q=${encodeURIComponent(addQ)}&type=${addType}&page=1`, { auth: false })
        .then((data) => setResults(data.results.slice(0, 6)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, addType, list, meId]);

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

  async function moveItem(itemId: string, direction: -1 | 1) {
    if (!list) return;
    const ids = list.items.map((item) => item.itemId);
    const index = ids.indexOf(itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await apiFetch(`/library/lists/${list.id}/reorder`, { method: "PATCH", body: JSON.stringify({ itemIds: ids }) });
    await load();
  }

  async function addItem(tmdbId: number) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items`, { method: "POST", body: JSON.stringify({ tmdbId, mediaType: addType === "tv" ? "TV" : "MOVIE" }) });
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
        <span className="chip">{list.isPublic ? t("common.public") : t("common.private")} &middot; {t("list.items", { count: list.items.length })}</span>
        {owner && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-[180px] flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white" />
              <button className="chip" type="button" onClick={() => void update({ name: editName.trim() })}>Renommer</button>
              <button className="chip" type="button" onClick={() => void update({ isPublic: !list.isPublic })}>{list.isPublic ? "Rendre privee" : "Rendre publique"}</button>
              <button className="chip !border-red-300/30 !text-red-200" type="button" onClick={() => void removeList()}>Supprimer</button>
            </div>
            <div className="flex gap-2">
              {(["movie", "tv"] as const).map((type) => <button key={type} type="button" className={`chip ${addType === type ? "chip-active" : ""}`} onClick={() => setAddType(type)}>{type === "movie" ? t("nav.movies") : t("nav.series")}</button>)}
            </div>
            <div className="relative max-w-xl">
              <input value={addQ} onChange={(e) => setAddQ(e.target.value)} placeholder="Rechercher une oeuvre a ajouter..." className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white" />
              {results.length > 0 && <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-kino-panel p-2 shadow-card">
                {results.map((result) => <button key={result.id} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => void addItem(result.id)}>{result.title ?? result.name}</button>)}
              </div>}
            </div>
          </div>
        )}
      </header>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.items.map((item, index) => (
          <li key={`${item.mediaType}-${item.tmdbId}`} className="relative min-w-0">
            <PosterCard item={item} type={item.mediaType === "TV" ? "tv" : "movie"} width={0} index={index} className="w-full" />
            {owner && <button type="button" aria-label="Retirer" className="chip absolute left-2 top-2 z-10 !border-red-300/40 !bg-black/80 !text-red-200" onClick={() => void removeItem(item.mediaType, item.tmdbId)}>&times;</button>}
            {owner && (
              <span className="absolute bottom-2 right-2 z-10 flex gap-1">
                {index > 0 && (
                  <button type="button" aria-label="Monter" className="chip !bg-black/80 !px-2" onClick={() => void moveItem(item.itemId, -1)}>↑</button>
                )}
                {index < list.items.length - 1 && (
                  <button type="button" aria-label="Descendre" className="chip !bg-black/80 !px-2" onClick={() => void moveItem(item.itemId, 1)}>↓</button>
                )}
              </span>
            )}
          </li>
        ))}
        {list.items.length === 0 && <li className="col-span-full text-kino-muted">{t("list.empty")}</li>}
      </ul>
    </div>
  );
}
