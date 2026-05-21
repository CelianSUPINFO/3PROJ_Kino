import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

type Unified = {
  users: { id: string; displayName: string }[];
  lists: { id: string; name: string; user: { displayName: string } }[];
  works: { results: PosterItem[]; total_pages?: number };
};

export function SearchScreen({ navigation }: Props) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "movie" | "tv" | "users" | "lists">("all");
  const [year, setYear] = useState("");
  const [creator, setCreator] = useState("");
  const [results, setResults] = useState<PosterItem[]>([]);
  const [users, setUsers] = useState<Unified["users"]>([]);
  const [lists, setLists] = useState<Unified["lists"]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, []);

  const search = useCallback(
    async (targetPage = 1, append = false) => {
      if (!q.trim() && !creator.trim() && type === "all") {
        setResults([]);
        setUsers([]);
        setLists([]);
        return;
      }
      setLoading(true);
      try {
        if (q.trim() || creator.trim() || type === "users" || type === "lists") {
          const [data, media] = await Promise.all([
            apiFetch<Unified>(`/search?q=${encodeURIComponent(q)}&page=${targetPage}`, { auth: false }),
            type === "users" || type === "lists"
              ? Promise.resolve({ results: [], total_pages: 1 })
              : apiFetch<{ results: PosterItem[]; total_pages: number }>(`/media/search?q=${encodeURIComponent(q)}&page=${targetPage}${year ? `&year=${year}` : ""}${type === "movie" || type === "tv" ? `&type=${type}` : ""}${creator.trim() ? `&creator=${encodeURIComponent(creator.trim())}` : ""}`, { auth: false }),
          ]);
          setUsers(type === "lists" ? [] : data.users ?? []);
          setLists(type === "users" ? [] : data.lists ?? []);
          const works = media.results ?? [];
          setResults((prev) => (append ? [...prev, ...works] : works));
          setTotalPages(media.total_pages ?? 1);
        } else {
          const path = `/media/discover/${type}?page=${targetPage}${year ? `&year=${year}` : ""}`;
          const media = await apiFetch<{ results: PosterItem[]; total_pages: number }>(
            path,
            { auth: false },
          );
          setUsers([]);
          setLists([]);
          setResults((prev) =>
            append ? [...prev, ...(media.results ?? [])] : media.results ?? [],
          );
          setTotalPages(media.total_pages ?? 1);
        }
        setPage(targetPage);
      } finally {
        setLoading(false);
      }
    },
    [creator, q, type, year],
  );

  async function follow(userId: string) {
    await apiFetch(`/users/${userId}/follow`, { method: "POST" });
    setFollowed((current) => ({ ...current, [userId]: true }));
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Text style={s.eyebrow}>EXPLORER</Text>
        <Text style={s.h1}>Recherche</Text>
        <TextInput
          style={s.input}
          placeholder="Œuvre, utilisateur, liste..."
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => search(1, false)}
          returnKeyType="search"
        />
        <View style={s.row}>
          {(["all", "movie", "tv", "users", "lists"] as const).map((t) => (
            <Pressable
              key={t}
              style={[s.chip, type === t && s.chipOn]}
              onPress={() => setType(t)}
            >
              <Text style={s.chipText}>
                {t === "all" ? "Tout" : t === "movie" ? "Films" : t === "tv" ? "Séries" : t === "users" ? "Utilisateurs" : "Listes"}
              </Text>
            </Pressable>
          ))}
        </View>
        {type !== "users" && type !== "lists" && <TextInput
          style={[s.input, { marginTop: 8 }]}
          placeholder="Année (optionnel)"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          value={year}
          onChangeText={setYear}
        />}
        {type !== "users" && type !== "lists" && <TextInput
          style={[s.input, { marginTop: 8 }]}
          placeholder="Réalisateur / auteur (optionnel)"
          placeholderTextColor={colors.muted}
          value={creator}
          onChangeText={setCreator}
        />}
        <Pressable style={s.btn} onPress={() => search(1, false)}>
          <Text style={s.btnText}>{loading ? "..." : "Rechercher"}</Text>
        </Pressable>
      </View>
      {users.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={s.section}>Utilisateurs</Text>
          {users.map((u) => (
            <View key={u.id} style={s.userRow}>
              <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("Profile", { userId: u.id })}>
                <Text style={s.link}>{u.displayName}</Text>
              </Pressable>
              {meId && meId !== u.id && (
                <Pressable style={s.followBtn} disabled={followed[u.id]} onPress={() => follow(u.id)}>
                  <Text style={s.btnText}>{followed[u.id] ? "Suivi" : "Suivre"}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
      {lists.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 8 }}>
          <Text style={s.section}>Listes publiques</Text>
          {lists.map((l) => (
            <Pressable
              key={l.id}
              onPress={() =>
                navigation.navigate("ListDetail", {
                  listId: l.id,
                  listName: l.name,
                })
              }
            >
              <Text style={s.link}>
                {l.name} · par {l.user.displayName}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <FlatList
        data={results}
        numColumns={2}
        keyExtractor={(item) => `${item.id}-${item.media_type ?? "m"}`}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 8 }}
        onEndReached={() => {
          if (page < totalPages && !loading) search(page + 1, true);
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / 2, padding: 4 }}>
            <PosterCard
              item={item}
              fullWidth
              onPress={() =>
                navigation.navigate("Title", {
                  type: item.media_type === "tv" ? "tv" : "movie",
                  id: item.id,
                  title: item.title ?? item.name ?? "Sans titre",
                })
              }
            />
          </View>
        )}
        ListFooterComponent={
          page < totalPages ? (
            <Pressable style={s.btn} onPress={() => search(page + 1, true)}>
              <Text style={s.btnText}>Charger plus</Text>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.panel,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { borderColor: colors.kino, backgroundColor: `${colors.kino}33` },
  chipText: { color: colors.text, fontSize: 12 },
  btn: {
    backgroundColor: colors.kino,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  section: { color: colors.text, fontWeight: "700", marginBottom: 6 },
  link: { color: colors.kinoHot, paddingVertical: 6, fontWeight: "600" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  followBtn: { backgroundColor: colors.kino, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
