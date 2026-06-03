import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import type { I18nKey } from "../lib/i18n";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

type LibraryRow = {
  tmdbId: number;
  mediaType: string;
  status: string;
  title: string;
  posterPath: string | null;
};

type ListRow = {
  id: string;
  name: string;
  isPublic: boolean;
  _count?: { items: number };
};

type Stats = {
  byStatus: Record<string, number>;
  total: number;
  completed: number;
  estimatedHoursWatched: number;
};

const STATUS_ORDER = ["WATCHLIST", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const;

const STATUS_I18N: Record<(typeof STATUS_ORDER)[number], I18nKey> = {
  WATCHLIST: "library.toWatch",
  IN_PROGRESS: "library.inProgress",
  COMPLETED: "library.completed",
  DROPPED: "library.dropped",
};

const STATUS_PATH: Record<(typeof STATUS_ORDER)[number], string> = {
  WATCHLIST: "watchlist",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  DROPPED: "dropped",
};

function toPoster(row: LibraryRow): PosterItem {
  return {
    id: row.tmdbId,
    media_type: row.mediaType === "TV" ? "tv" : "movie",
    title: row.title,
    name: row.title,
    poster_path: row.posterPath ?? undefined,
  };
}

export function LibraryScreen({ navigation }: Props) {
  const { t } = useLocale();
  const { colors } = useThemeColors();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const [addQ, setAddQ] = useState("");
  const [addResults, setAddResults] = useState<{ id: number; title?: string }[]>([]);
  const [addType, setAddType] = useState<"movie" | "tv">("movie");

  async function load() {
    try {
      const [lib, listRows, st] = await Promise.all([
        apiFetch<LibraryRow[]>("/library/me"),
        apiFetch<ListRow[]>("/library/lists/mine"),
        apiFetch<Stats>("/library/stats"),
      ]);
      setRows(lib);
      setLists(listRows);
      setStats(st);
      setMsg(null);
    } catch {
      setMsg(t("library.signIn"));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!addTargetId || addQ.trim().length < 2) {
      setAddResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof addResults }>(`/media/search?q=${encodeURIComponent(addQ)}&type=${addType}&page=1`, { auth: false })
        .then((data) => setAddResults(data.results.slice(0, 6)))
        .catch(() => setAddResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, addTargetId, addType]);

  const byStatus = useMemo(() => {
    const map: Record<string, PosterItem[]> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const row of rows) {
      if (map[row.status]) map[row.status].push(toPoster(row));
    }
    return map;
  }, [rows]);

  async function createList() {
    if (!newListName.trim()) return;
    await apiFetch("/library/lists", {
      method: "POST",
      body: JSON.stringify({ name: newListName, isPublic: newListPublic }),
    });
    setNewListName("");
    setNewListPublic(false);
    load();
  }

  async function addWorkToList(tmdbId: number) {
    if (!addTargetId) return;
    await apiFetch(`/library/lists/${addTargetId}/items`, { method: "POST", body: JSON.stringify({ tmdbId, mediaType: addType === "tv" ? "TV" : "MOVIE" }) });
    setAddQ("");
    setAddResults([]);
    await load();
  }

  function openTitle(item: PosterItem) {
    navigation.navigate("Title", {
      type: item.media_type === "tv" ? "tv" : "movie",
      id: item.id,
      title: item.title ?? item.name ?? "…",
    });
  }

  if (msg && rows.length === 0) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
        <Text style={{ color: colors.muted, padding: spacing.lg, textAlign: "center" }}>
          {msg}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ padding: spacing.lg }}>
          <Text style={[s.eyebrow, { color: colors.kinoHot }]}>{t("nav.library")}</Text>
          <Text style={[s.h1, { color: colors.text }]}>{t("library.title")}</Text>
          <Text style={[s.sub, { color: colors.muted }]}>{t("library.subtitle")}</Text>
          {stats && (
            <Text style={[s.sub, { color: colors.muted }]}>
              {stats.total} {t("library.stats", { hours: stats.estimatedHoursWatched })}
            </Text>
          )}
        </View>

        {STATUS_ORDER.map((status) => {
          const items = byStatus[status] ?? [];
          if (items.length === 0) return null;
          return (
            <View key={status} style={{ marginBottom: spacing.lg }}>
              <View style={s.rowHead}>
                <Text style={[s.section, { color: colors.text }]}>{t(STATUS_I18N[status])}</Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate("LibraryStatus", {
                      status,
                      title: t(STATUS_I18N[status]),
                    })
                  }
                >
                  <Text style={{ color: colors.kinoHot, fontWeight: "600" }}>
                    {t("common.seeAll")} →
                  </Text>
                </Pressable>
              </View>
              <FlatList
                horizontal
                data={items.slice(0, 12)}
                keyExtractor={(item) => `${status}-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}
                renderItem={({ item }) => (
                  <PosterCard item={item} onPress={() => openTitle(item)} width={110} />
                )}
              />
            </View>
          );
        })}

        <View style={[s.listsBox, { marginHorizontal: spacing.lg, borderColor: colors.border, backgroundColor: colors.panel }]}>
          <Text style={[s.section, { color: colors.text }]}>{t("library.lists")}</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="…"
              placeholderTextColor={colors.muted}
              style={[s.input, { flex: 1, minWidth: 120, borderColor: colors.border, color: colors.text }]}
            />
            <Switch value={newListPublic} onValueChange={setNewListPublic} />
            <Pressable
              style={[s.addBtn, { backgroundColor: colors.kino }]}
              onPress={createList}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>+</Text>
            </Pressable>
          </View>
          {lists.map((l) => (
            <Pressable
              key={l.id}
              style={s.listRow}
              onPress={() => navigation.navigate("ListDetail", { listId: l.id, listName: l.name })}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {l.name} · {l._count?.items ?? 0}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {l.isPublic ? "Public" : "Private"}
              </Text>
            </Pressable>
          ))}
          {lists.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.muted, marginBottom: 6 }}>Ajouter une œuvre à une liste</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Pressable accessibilityRole="button" onPress={() => setAddType("movie")} style={[s.targetChip, { borderColor: addType === "movie" ? colors.kino : colors.border }]}><Text style={{ color: colors.text }}>Films</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setAddType("tv")} style={[s.targetChip, { borderColor: addType === "tv" ? colors.kino : colors.border }]}><Text style={{ color: colors.text }}>Séries</Text></Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
                {lists.map((list) => (
                  <Pressable key={list.id} style={[s.targetChip, { borderColor: addTargetId === list.id ? colors.kino : colors.border }]} onPress={() => setAddTargetId(list.id)}>
                    <Text style={{ color: colors.text }}>{list.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput value={addQ} onChangeText={setAddQ} editable={!!addTargetId} placeholder="Rechercher une œuvre..." placeholderTextColor={colors.muted} style={[s.input, { borderColor: colors.border, color: colors.text, opacity: addTargetId ? 1 : 0.5 }]} />
              {addResults.map((result) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${result.title ?? ""}`} key={result.id} style={[s.resultRow, { borderBottomColor: colors.border }]} onPress={() => addWorkToList(result.id)}>
                  <Text style={{ color: colors.text, flex: 1 }}>{result.title}</Text><Text style={{ color: colors.kinoHot, fontWeight: "700" }}>Ajouter</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  h1: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  sub: { marginTop: 6, lineHeight: 20 },
  rowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: { fontSize: 18, fontWeight: "700" },
  listsBox: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  listRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" },
  targetChip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
});
