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
type Filter = "all" | "movie" | "tv";
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
  description?: string;
  coverUrl?: string | null;
  isPublic: boolean;
  _count?: { items: number };
};
type Stats = {
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
const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  WATCHLIST: "#38bdf8",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#10b981",
  DROPPED: "#fb7185",
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
  const { locale, t } = useLocale();
  const { colors } = useThemeColors();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const [addType, setAddType] = useState<"movie" | "tv">("movie");
  const [addQ, setAddQ] = useState("");
  const [addResults, setAddResults] = useState<{ id: number; title?: string; name?: string }[]>([]);

  async function load() {
    try {
      const [library, customLists, summary] = await Promise.all([
        apiFetch<LibraryRow[]>("/library/me"),
        apiFetch<ListRow[]>("/library/lists/mine"),
        apiFetch<Stats>("/library/stats"),
      ]);
      setRows(library);
      setLists(customLists);
      setStats(summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("library.signIn"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!addTargetId || addQ.trim().length < 2) {
      setAddResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof addResults }>(
        `/media/search?q=${encodeURIComponent(addQ)}&type=${addType}&page=1&language=${locale === "fr" ? "fr-FR" : "en-US"}`,
        { auth: false },
      )
        .then((data) => setAddResults(data.results.slice(0, 6)))
        .catch(() => setAddResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, addTargetId, addType, locale]);

  const byStatus = useMemo(() => {
    const map: Record<string, PosterItem[]> = Object.fromEntries(STATUS_ORDER.map((status) => [status, []]));
    for (const row of rows) {
      const type = row.mediaType === "TV" ? "tv" : "movie";
      if (filter === "all" || filter === type) map[row.status]?.push(toPoster(row));
    }
    return map;
  }, [rows, filter]);

  async function createList() {
    if (newListName.trim().length < 2) return;
    await apiFetch("/library/lists", {
      method: "POST",
      body: JSON.stringify({
        name: newListName.trim(),
        description: newListDescription.trim(),
        isPublic: newListPublic,
      }),
    });
    setNewListName("");
    setNewListDescription("");
    setNewListPublic(false);
    setCreating(false);
    await load();
  }

  async function addWork(tmdbId: number) {
    if (!addTargetId) return;
    await apiFetch(`/library/lists/${addTargetId}/items`, {
      method: "POST",
      body: JSON.stringify({ tmdbId, mediaType: addType === "tv" ? "TV" : "MOVIE" }),
    });
    setAddQ("");
    setAddResults([]);
    await load();
  }

  function openTitle(item: PosterItem) {
    navigation.navigate("Title", {
      type: item.media_type === "tv" ? "tv" : "movie",
      id: item.id,
      title: item.title ?? item.name ?? "",
    });
  }

  if (error && rows.length === 0) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
        <View style={s.centerState}>
          <Text style={[s.section, { color: colors.text }]}>{t("library.signIn")}</Text>
          <Text style={[s.sub, { color: colors.muted }]}>{error}</Text>
          <Pressable accessibilityRole="button" style={[s.primaryWide, { backgroundColor: colors.kino }]} onPress={() => navigation.navigate("Login")}>
            <Text style={s.primaryText}>{t("nav.login")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.header}>
          <Text style={[s.eyebrow, { color: colors.kinoHot }]}>{t("nav.library").toUpperCase()}</Text>
          <Text style={[s.h1, { color: colors.text }]}>{t("library.title")}</Text>
          <Text style={[s.sub, { color: colors.muted }]}>{t("library.subtitle")}</Text>
          {stats && (
            <View style={s.statsRow}>
              {[
                [stats.total, locale === "fr" ? "Œuvres" : "Titles"],
                [stats.completed, t("library.completed")],
                [`${stats.estimatedHoursWatched} h`, locale === "fr" ? "Visionnées" : "Watched"],
              ].map(([value, label]) => (
                <View key={String(label)} style={[s.stat, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                  <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
                  <Text style={[s.statLabel, { color: colors.muted }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {(["all", "movie", "tv"] as const).map((value) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === value }}
                key={value}
                onPress={() => setFilter(value)}
                style={[s.chip, { borderColor: filter === value ? colors.kino : colors.border, backgroundColor: filter === value ? `${colors.kino}20` : "transparent" }]}
              >
                <Text style={{ color: colors.text }}>{value === "all" ? t("nav.all") : value === "movie" ? t("nav.movies") : t("nav.series")}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {STATUS_ORDER.map((status) => {
          const items = byStatus[status] ?? [];
          if (!items.length) return null;
          return (
            <View key={status} style={s.mediaSection}>
              <View style={s.sectionHead}>
                <Text style={[s.section, { color: STATUS_COLORS[status] }]}>{t(STATUS_I18N[status])}</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate("LibraryStatus", { status, title: t(STATUS_I18N[status]) })}>
                  <Text style={{ color: colors.kinoHot, fontWeight: "700" }}>{t("common.seeAll")} →</Text>
                </Pressable>
              </View>
              <FlatList
                horizontal
                data={items.slice(0, 12)}
                keyExtractor={(item) => `${status}-${item.media_type}-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.posterRow}
                renderItem={({ item }) => <PosterCard item={item} onPress={() => openTitle(item)} width={110} />}
              />
            </View>
          );
        })}

        <View style={s.customLists}>
          <View style={s.listHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.section, { color: colors.text }]}>{t("library.lists")}</Text>
              <Text style={[s.sub, { color: colors.muted }]}>
                {locale === "fr" ? "Organisez et partagez vos sélections." : "Organize and share your picks."}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={locale === "fr" ? "Créer une liste" : "Create a list"} style={[s.createButton, { backgroundColor: colors.kino }]} onPress={() => setCreating((value) => !value)}>
              <Text style={s.primaryText}>{creating ? t("common.cancel") : locale === "fr" ? "Créer" : "Create"}</Text>
            </Pressable>
          </View>

          {creating && (
            <View style={[s.form, { backgroundColor: colors.panel, borderColor: colors.border }]}>
              <TextInput value={newListName} onChangeText={setNewListName} placeholder={locale === "fr" ? "Nom de la liste" : "List name"} placeholderTextColor={colors.muted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
              <TextInput value={newListDescription} onChangeText={setNewListDescription} placeholder={locale === "fr" ? "Description (optionnelle)" : "Description (optional)"} placeholderTextColor={colors.muted} multiline style={[s.input, s.descriptionInput, { borderColor: colors.border, color: colors.text }]} />
              <View style={s.visibilityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{newListPublic ? t("common.public") : t("common.private")}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{newListPublic ? (locale === "fr" ? "Visible et partageable." : "Visible and shareable.") : (locale === "fr" ? "Visible uniquement par vous." : "Visible only to you.")}</Text>
                </View>
                <Switch value={newListPublic} onValueChange={setNewListPublic} />
              </View>
              <Pressable accessibilityRole="button" disabled={newListName.trim().length < 2} style={[s.primaryWide, { backgroundColor: colors.kino, opacity: newListName.trim().length < 2 ? 0.5 : 1 }]} onPress={createList}>
                <Text style={s.primaryText}>{locale === "fr" ? "Créer la liste" : "Create list"}</Text>
              </Pressable>
            </View>
          )}

          {lists.map((list) => (
            <Pressable accessibilityRole="button" accessibilityLabel={list.name} key={list.id} style={[s.listCard, { backgroundColor: colors.panel, borderColor: colors.border }]} onPress={() => navigation.navigate("ListDetail", { listId: list.id, listName: list.name })}>
              <View style={[s.listCover, { backgroundColor: colors.panelSoft }]}>
                <Text style={{ color: colors.kinoHot, fontSize: 24, fontWeight: "800" }}>{list.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{list.name}</Text>
                {!!list.description && <Text numberOfLines={2} style={{ color: colors.muted, marginTop: 3 }}>{list.description}</Text>}
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{list._count?.items ?? 0} {locale === "fr" ? "œuvre(s)" : "title(s)"} · {list.isPublic ? t("common.public") : t("common.private")}</Text>
              </View>
              <Text style={{ color: colors.kinoHot, fontSize: 26 }}>›</Text>
            </Pressable>
          ))}

          {!!lists.length && (
            <View style={[s.quickAdd, { borderColor: colors.border }]}>
              <Text style={[s.section, { color: colors.text }]}>{locale === "fr" ? "Ajout rapide" : "Quick add"}</Text>
              <Text style={[s.sub, { color: colors.muted }]}>{locale === "fr" ? "Choisissez une liste, puis recherchez une œuvre." : "Choose a list, then search for a title."}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
                {lists.map((list) => <Pressable accessibilityRole="button" key={list.id} onPress={() => setAddTargetId(list.id)} style={[s.chip, { borderColor: addTargetId === list.id ? colors.kino : colors.border }]}><Text style={{ color: colors.text }}>{list.name}</Text></Pressable>)}
              </ScrollView>
              <View style={s.filterRow}>
                {(["movie", "tv"] as const).map((type) => <Pressable accessibilityRole="button" key={type} onPress={() => setAddType(type)} style={[s.chip, { borderColor: addType === type ? colors.kino : colors.border }]}><Text style={{ color: colors.text }}>{type === "movie" ? t("nav.movies") : t("nav.series")}</Text></Pressable>)}
              </View>
              <TextInput value={addQ} onChangeText={setAddQ} editable={!!addTargetId} placeholder={locale === "fr" ? "Rechercher une œuvre…" : "Search for a title…"} placeholderTextColor={colors.muted} style={[s.input, { borderColor: colors.border, color: colors.text, opacity: addTargetId ? 1 : 0.5 }]} />
              {addResults.map((result) => (
                <Pressable accessibilityRole="button" key={result.id} onPress={() => addWork(result.id)} style={[s.resultRow, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.text, flex: 1 }}>{result.title ?? result.name}</Text>
                  <Text style={{ color: colors.kinoHot, fontWeight: "800" }}>{locale === "fr" ? "Ajouter" : "Add"}</Text>
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
  header: { padding: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  h1: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  sub: { marginTop: 5, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  stat: { flex: 1, minHeight: 82, borderWidth: 1, borderRadius: radius.md, padding: 10, justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 3 },
  filterRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  chip: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  mediaSection: { marginBottom: spacing.lg },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  section: { fontSize: 18, fontWeight: "800" },
  posterRow: { paddingHorizontal: spacing.lg, gap: 12 },
  customLists: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  listHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.md },
  createButton: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryWide: { minHeight: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { color: "#fff", fontWeight: "800" },
  form: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, marginTop: 10 },
  descriptionInput: { minHeight: 84, textAlignVertical: "top" },
  visibilityRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  listCard: { minHeight: 96, borderWidth: 1, borderRadius: radius.lg, padding: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  listCover: { width: 66, height: 66, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  quickAdd: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.lg },
  resultRow: { minHeight: 48, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  centerState: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center" },
});
