import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiFetch } from "../api";
import type { RootStackParamList } from "../navigation/types";
import { useThemeColors } from "../context/ThemeContext";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;
type ListDetail = {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  items: { tmdbId: number; mediaType: string }[];
};
type Title = { tmdbId: number; mediaType: string; title: string; posterPath: string | null };

export function ListDetailScreen({ route, navigation }: Props) {
  const { listId, listName } = route.params;
  const { colors } = useThemeColors();
  const [list, setList] = useState<ListDetail | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [editName, setEditName] = useState(listName);
  const [addQ, setAddQ] = useState("");
  const [results, setResults] = useState<{ id: number; title?: string }[]>([]);

  async function load() {
    const data = await apiFetch<ListDetail>(`/library/lists/${listId}`);
    setList(data);
    setEditName(data.name);
    const enriched = await Promise.all(data.items.map(async (item) => {
      const type = item.mediaType === "TV" ? "tv" : "movie";
      try {
        const result = await apiFetch<{ data: { title?: string; name?: string; poster_path?: string } }>(`/media/${type}/${item.tmdbId}`, { auth: false });
        return { ...item, title: result.data.title ?? result.data.name ?? `#${item.tmdbId}`, posterPath: result.data.poster_path ?? null };
      } catch {
        return { ...item, title: `#${item.tmdbId}`, posterPath: null };
      }
    }));
    setTitles(enriched);
  }

  useEffect(() => {
    void load().catch(() => setList(null));
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

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

  async function remove(item: Title) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items/${item.mediaType === "TV" ? "tv" : "movie"}/${item.tmdbId}`, { method: "DELETE" });
    await load();
  }

  async function toggleVisibility() {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}`, { method: "PATCH", body: JSON.stringify({ isPublic: !list.isPublic }) });
    await load();
  }

  async function renameList() {
    if (!list || editName.trim().length < 2) return;
    await apiFetch(`/library/lists/${list.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName.trim() }),
    });
    await load();
  }

  async function deleteList() {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}`, { method: "DELETE" });
    navigation.goBack();
  }

  async function addItem(tmdbId: number) {
    if (!list) return;
    await apiFetch(`/library/lists/${list.id}/items`, { method: "POST", body: JSON.stringify({ tmdbId, mediaType: "MOVIE" }) });
    setAddQ("");
    setResults([]);
    await load();
  }

  const owner = !!list && meId === list.userId;
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[s.eyebrow, { color: colors.kinoHot }]}>LISTE</Text>
        <Text style={[s.h1, { color: colors.text }]}>{list?.name ?? listName}</Text>
        {list && <Text style={{ color: colors.muted, marginTop: 4 }}>{list.isPublic ? "Publique" : "Privée"} · {list.items.length} œuvre(s)</Text>}
        {owner && (
          <View>
            <View style={s.renameRow}>
              <TextInput value={editName} onChangeText={setEditName} style={[s.renameInput, { borderColor: colors.border, color: colors.text }]} />
              <Pressable style={[s.button, { borderColor: colors.kino }]} onPress={renameList}><Text style={{ color: colors.text }}>Renommer</Text></Pressable>
            </View>
            <View style={s.actions}>
            <Pressable style={[s.button, { borderColor: colors.border }]} onPress={toggleVisibility}><Text style={{ color: colors.text }}>{list?.isPublic ? "Rendre privée" : "Rendre publique"}</Text></Pressable>
            <Pressable style={[s.button, { borderColor: "#fca5a5" }]} onPress={deleteList}><Text style={{ color: "#fca5a5" }}>Supprimer la liste</Text></Pressable>
            </View>
            <TextInput value={addQ} onChangeText={setAddQ} placeholder="Rechercher un film à ajouter..." placeholderTextColor={colors.muted} style={[s.renameInput, { borderColor: colors.border, color: colors.text, marginTop: 12 }]} />
            {results.map((result) => (
              <Pressable key={result.id} style={[s.resultRow, { borderBottomColor: colors.border }]} onPress={() => addItem(result.id)}>
                <Text style={{ color: colors.text, flex: 1 }}>{result.title}</Text><Text style={{ color: colors.kinoHot, fontSize: 20 }}>+</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <FlatList
        data={titles}
        keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[s.row, { borderBottomColor: colors.border }]}>
            <Pressable style={s.titleLink} onPress={() => navigation.navigate("Title", { type: item.mediaType === "TV" ? "tv" : "movie", id: item.tmdbId, title: item.title })}>
              {item.posterPath ? <Image source={{ uri: `https://image.tmdb.org/t/p/w92${item.posterPath}` }} style={s.poster} /> : <View style={[s.poster, { backgroundColor: colors.panel }]} />}
              <Text style={[s.title, { color: colors.text }]}>{item.title}</Text>
            </Pressable>
            {owner && <Pressable style={s.remove} onPress={() => remove(item)}><Text style={{ color: "#fca5a5", fontSize: 20 }}>×</Text></Pressable>}
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>Aucune œuvre dans cette liste.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  h1: { fontSize: 24, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  renameInput: { flex: 1, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  button: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  titleLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  poster: { width: 44, height: 66, borderRadius: radius.sm },
  title: { flex: 1, fontWeight: "600" },
  remove: { padding: 10 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
});
