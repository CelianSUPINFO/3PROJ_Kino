import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;
type ListItem = { id: string; tmdbId: number; mediaType: string };
type ListDetail = {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverUrl?: string | null;
  isPublic: boolean;
  items: ListItem[];
};
type EnrichedItem = ListItem & { title: string; posterPath: string | null };

export function ListDetailScreen({ route, navigation }: Props) {
  const { listId, listName } = route.params;
  const { locale, t } = useLocale();
  const { colors } = useThemeColors();
  const [list, setList] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [editName, setEditName] = useState(listName);
  const [editDescription, setEditDescription] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [addQ, setAddQ] = useState("");
  const [addType, setAddType] = useState<"movie" | "tv">("movie");
  const [results, setResults] = useState<{ id: number; title?: string; name?: string }[]>([]);

  async function load() {
    const data = await apiFetch<ListDetail>(`/library/lists/${listId}`);
    setList(data);
    setEditName(data.name);
    setEditDescription(data.description ?? "");
    setEditCoverUrl(data.coverUrl ?? "");
    const enriched = await Promise.all(
      data.items.map(async (item) => {
        const type = item.mediaType === "TV" ? "tv" : "movie";
        try {
          const result = await apiFetch<{ data: { title?: string; name?: string; poster_path?: string } }>(
            `/media/${type}/${item.tmdbId}?language=${locale === "fr" ? "fr-FR" : "en-US"}`,
            { auth: false },
          );
          return {
            ...item,
            title: result.data.title ?? result.data.name ?? `#${item.tmdbId}`,
            posterPath: result.data.poster_path ?? null,
          };
        } catch {
          return { ...item, title: `#${item.tmdbId}`, posterPath: null };
        }
      }),
    );
    setItems(enriched);
  }

  useEffect(() => {
    void load().catch(() => setList(null));
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, [listId, locale]);

  useEffect(() => {
    if (!list || meId !== list.userId || addQ.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: typeof results }>(
        `/media/search?q=${encodeURIComponent(addQ)}&type=${addType}&page=1&language=${locale === "fr" ? "fr-FR" : "en-US"}`,
        { auth: false },
      )
        .then((data) => setResults(data.results.slice(0, 6)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQ, addType, list, meId, locale]);

  async function saveMetadata() {
    if (!list || editName.trim().length < 2) return;
    await apiFetch(`/library/lists/${list.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim(),
        coverUrl: editCoverUrl.trim() || undefined,
      }),
    });
    await load();
  }

  async function toggleVisibility() {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPublic: !list.isPublic }),
    });
    await load();
  }

  async function addItem(tmdbId: number) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items`, {
      method: "POST",
      body: JSON.stringify({ tmdbId, mediaType: addType === "tv" ? "TV" : "MOVIE" }),
    });
    setAddQ("");
    setResults([]);
    await load();
  }

  async function remove(item: EnrichedItem) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items/${item.mediaType === "TV" ? "tv" : "movie"}/${item.tmdbId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function move(itemId: string, direction: -1 | 1) {
    if (!list) return;
    const ids = list.items.map((item) => item.id);
    const index = ids.indexOf(itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await apiFetch(`/library/lists/${list.id}/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ itemIds: ids }),
    });
    await load();
  }

  function confirmDelete() {
    if (!list) return;
    Alert.alert(
      locale === "fr" ? "Supprimer la liste ?" : "Delete this list?",
      locale === "fr" ? "Cette action est définitive." : "This action cannot be undone.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: locale === "fr" ? "Supprimer" : "Delete",
          style: "destructive",
          onPress: async () => {
            await apiFetch(`/library/lists/${list.id}`, { method: "DELETE" });
            navigation.goBack();
          },
        },
      ],
    );
  }

  async function shareList() {
    if (!list) return;
    await Share.share({ message: `Kino · ${list.name}\nhttps://kino-web-ten.vercel.app/list/${list.id}` });
  }

  const owner = !!list && meId === list.userId;
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View>
            {list?.coverUrl ? <Image source={{ uri: list.coverUrl }} style={s.cover} /> : null}
            <View style={s.header}>
              <Text style={[s.eyebrow, { color: colors.kinoHot }]}>{locale === "fr" ? "LISTE KINO" : "KINO LIST"}</Text>
              <Text style={[s.h1, { color: colors.text }]}>{list?.name ?? listName}</Text>
              {list && <Text style={{ color: colors.muted, marginTop: 4 }}>{list.isPublic ? t("common.public") : t("common.private")} · {list.items.length} {locale === "fr" ? "œuvre(s)" : "title(s)"}</Text>}
              {!!list?.description && <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 21 }}>{list.description}</Text>}
              {list?.isPublic && <Pressable accessibilityRole="button" style={[s.button, { borderColor: colors.kino, alignSelf: "flex-start", marginTop: 12 }]} onPress={shareList}><Text style={{ color: colors.kinoHot, fontWeight: "800" }}>{locale === "fr" ? "Partager" : "Share"}</Text></Pressable>}

              {owner && (
                <View style={[s.editor, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                  <Text style={[s.section, { color: colors.text }]}>{locale === "fr" ? "Personnaliser la liste" : "Customize list"}</Text>
                  <TextInput value={editName} onChangeText={setEditName} placeholderTextColor={colors.muted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
                  <TextInput value={editDescription} onChangeText={setEditDescription} multiline placeholder={locale === "fr" ? "Description" : "Description"} placeholderTextColor={colors.muted} style={[s.input, s.description, { borderColor: colors.border, color: colors.text }]} />
                  <TextInput value={editCoverUrl} onChangeText={setEditCoverUrl} placeholder={locale === "fr" ? "URL de couverture (optionnelle)" : "Cover URL (optional)"} placeholderTextColor={colors.muted} autoCapitalize="none" style={[s.input, { borderColor: colors.border, color: colors.text }]} />
                  <View style={s.actions}>
                    <Pressable accessibilityRole="button" style={[s.primary, { backgroundColor: colors.kino }]} onPress={saveMetadata}><Text style={s.primaryText}>{t("common.save")}</Text></Pressable>
                    <Pressable accessibilityRole="button" style={[s.button, { borderColor: colors.border }]} onPress={toggleVisibility}><Text style={{ color: colors.text, fontWeight: "700" }}>{list?.isPublic ? (locale === "fr" ? "Rendre privée" : "Make private") : (locale === "fr" ? "Rendre publique" : "Make public")}</Text></Pressable>
                    <Pressable accessibilityRole="button" style={[s.button, { borderColor: colors.danger }]} onPress={confirmDelete}><Text style={{ color: colors.danger, fontWeight: "700" }}>{locale === "fr" ? "Supprimer" : "Delete"}</Text></Pressable>
                  </View>
                </View>
              )}

              {owner && (
                <View style={[s.editor, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                  <Text style={[s.section, { color: colors.text }]}>{locale === "fr" ? "Ajouter une œuvre" : "Add a title"}</Text>
                  <View style={s.actions}>
                    {(["movie", "tv"] as const).map((type) => <Pressable accessibilityRole="button" key={type} onPress={() => setAddType(type)} style={[s.button, { borderColor: addType === type ? colors.kino : colors.border }]}><Text style={{ color: colors.text }}>{type === "movie" ? t("nav.movies") : t("nav.series")}</Text></Pressable>)}
                  </View>
                  <TextInput value={addQ} onChangeText={setAddQ} placeholder={locale === "fr" ? "Rechercher une œuvre…" : "Search for a title…"} placeholderTextColor={colors.muted} style={[s.input, { borderColor: colors.border, color: colors.text }]} />
                  {results.map((result) => <Pressable accessibilityRole="button" key={result.id} onPress={() => addItem(result.id)} style={[s.result, { borderBottomColor: colors.border }]}><Text style={{ color: colors.text, flex: 1 }}>{result.title ?? result.name}</Text><Text style={{ color: colors.kinoHot, fontWeight: "800" }}>{locale === "fr" ? "Ajouter" : "Add"}</Text></Pressable>)}
                </View>
              )}

              <Text style={[s.section, { color: colors.text, marginTop: spacing.lg }]}>{locale === "fr" ? "Contenu de la liste" : "List contents"}</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[s.row, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            {owner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${item.title}`}
                style={[s.removeBadge, { backgroundColor: colors.ink, borderColor: colors.danger }]}
                onPress={() => remove(item)}
              >
                <Text style={{ color: colors.danger, fontWeight: "800", fontSize: 16, lineHeight: 18 }}>×</Text>
              </Pressable>
            )}
            <Text style={{ width: 24, color: colors.muted, fontWeight: "700" }}>{index + 1}</Text>
            <Pressable accessibilityRole="button" style={s.titleLink} onPress={() => navigation.navigate("Title", { type: item.mediaType === "TV" ? "tv" : "movie", id: item.tmdbId, title: item.title })}>
              {item.posterPath ? <Image source={{ uri: `https://image.tmdb.org/t/p/w92${item.posterPath}` }} style={s.poster} /> : <View style={[s.poster, { backgroundColor: colors.panel }]} />}
              <Text style={[s.title, { color: colors.text }]}>{item.title}</Text>
            </Pressable>
            {owner && <View style={s.itemActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Monter ${item.title}`} style={s.smallAction} onPress={() => move(item.id, -1)}><Text style={{ color: colors.text }}>↑</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Descendre ${item.title}`} style={s.smallAction} onPress={() => move(item.id, 1)}><Text style={{ color: colors.text }}>↓</Text></Pressable>
            </View>}
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: colors.muted, paddingHorizontal: spacing.lg }}>{locale === "fr" ? "Cette liste est vide." : "This list is empty."}</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  cover: { width: "100%", height: 180 },
  header: { padding: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  h1: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  section: { fontSize: 18, fontWeight: "800" },
  editor: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10, marginTop: 10 },
  description: { minHeight: 78, textAlignVertical: "top" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  primary: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  result: { minHeight: 48, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  titleLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  poster: { width: 78, height: 117, borderRadius: radius.md },
  title: { flex: 1, fontWeight: "700" },
  itemActions: { flexDirection: "row", alignItems: "center" },
  smallAction: { minWidth: 40, minHeight: 44, alignItems: "center", justifyContent: "center" },
  removeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
