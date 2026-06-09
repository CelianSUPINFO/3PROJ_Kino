import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { discoverAllUsers } from "../lib/publicDiscovery";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { UserAvatar } from "../components/UserAvatar";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { MOVIE_GENRES, TV_GENRES } from "../lib/genres";
import { genreLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

type Unified = {
  users: { id: string; displayName: string; avatarUrl?: string | null }[];
  lists: { id: string; name: string; user: { displayName: string } }[];
  works: { results: PosterItem[]; total_pages?: number };
};

const SORTS = ["relevance", "popularity.desc", "vote_average.desc", "release_date.desc"] as const;
type SortKey = (typeof SORTS)[number];

export function SearchScreen({ navigation }: Props) {
  const { locale } = useLocale();
  const { colors } = useThemeColors();
  const s = makeStyles(colors);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "movie" | "tv" | "users" | "lists">("all");
  const [year, setYear] = useState("");
  const [creator, setCreator] = useState("");
  const [genre, setGenre] = useState("");
  const [minVote, setMinVote] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [results, setResults] = useState<PosterItem[]>([]);
  const [users, setUsers] = useState<Unified["users"]>([]);
  const [lists, setLists] = useState<Unified["lists"]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const genres = type === "tv" ? TV_GENRES : MOVIE_GENRES;
  const language = locale === "en" ? "en-US" : "fr-FR";

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
              : apiFetch<{ results: PosterItem[]; total_pages: number }>(
                  sort !== "relevance" && !creator.trim() && (type === "movie" || type === "tv")
                    ? `/media/discover/${type}?page=${targetPage}&sort=${encodeURIComponent(sort)}${year ? `&year=${year}` : ""}${genre ? `&genre=${genre}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}&language=${language}`
                    : `/media/search?q=${encodeURIComponent(q)}&page=${targetPage}${year ? `&year=${year}` : ""}${genre ? `&genre=${genre}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}${type === "movie" || type === "tv" ? `&type=${type}` : ""}${creator.trim() ? `&creator=${encodeURIComponent(creator.trim())}` : ""}&language=${language}`,
                  { auth: false },
                ),
          ]);
          const discoveredUsers =
            type === "users" && !q.trim() ? await discoverAllUsers() : null;
          setUsers(type === "lists" ? [] : discoveredUsers ?? data.users ?? []);
          setLists(type === "users" ? [] : data.lists ?? []);
          const works = media.results ?? [];
          setResults((prev) => (append ? [...prev, ...works] : works));
          setTotalPages(media.total_pages ?? 1);
        } else {
          const path = `/media/discover/${type}?page=${targetPage}&sort=${encodeURIComponent(sort === "relevance" ? "popularity.desc" : sort)}${year ? `&year=${year}` : ""}${genre ? `&genre=${genre}` : ""}${minVote > 0 ? `&minVote=${minVote}` : ""}&language=${language}`;
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
    [creator, genre, language, minVote, q, sort, type, year],
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
        {type !== "users" && type !== "lists" && (
          <>
            <Text style={s.filterLabel}>{locale === "fr" ? "Trier par" : "Sort by"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
              {SORTS.map((value) => (
                <Pressable key={value} style={[s.chip, sort === value && s.chipOn]} onPress={() => setSort(value)}>
                  <Text style={s.chipText}>
                    {value === "relevance"
                      ? locale === "fr" ? "Pertinence" : "Relevance"
                      : value === "popularity.desc"
                        ? locale === "fr" ? "Popularité" : "Popularity"
                        : value === "vote_average.desc"
                          ? locale === "fr" ? "Mieux notés" : "Top rated"
                          : locale === "fr" ? "Plus récents" : "Recent"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {(type === "movie" || type === "tv") && (
              <>
                <Text style={s.filterLabel}>{locale === "fr" ? "Genre" : "Genre"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                  {genres.map((item) => (
                    <Pressable key={item.slug} style={[s.chip, genre === item.id && s.chipOn]} onPress={() => setGenre(item.id)}>
                      <Text style={s.chipText}>
                        {item.slug === "all" ? (locale === "fr" ? "Tous" : "All") : genreLabel(locale, item.slug)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={s.filterLabel}>{locale === "fr" ? "Note minimale" : "Minimum rating"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
              {[0, 5, 6, 7, 8, 9].map((value) => (
                <Pressable key={value} style={[s.chip, minVote === value && s.chipOn]} onPress={() => setMinVote(value)}>
                  <Text style={s.chipText}>{value === 0 ? (locale === "fr" ? "Toutes" : "Any") : `${value}+/10`}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
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
      {(users.length > 0 || lists.length > 0) && (
        <ScrollView
          style={{ maxHeight: type === "users" || type === "lists" ? 360 : 220 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
      {users.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={s.section}>Utilisateurs</Text>
          {users.filter((user) => user.id !== meId).map((u) => (
            <View key={u.id} style={s.userRow}>
              <Pressable style={s.userLink} onPress={() => navigation.navigate("Profile", { userId: u.id })}>
                <UserAvatar name={u.displayName} avatarUrl={u.avatarUrl} size={38} />
                <Text style={s.userName} numberOfLines={1}>{u.displayName}</Text>
              </Pressable>
              {meId && meId !== u.id && (
                <Pressable style={s.followBtn} disabled={followed[u.id]} onPress={() => follow(u.id)}>
                  <Text style={followed[u.id] ? s.followedText : s.btnText}>{followed[u.id] ? "Suivi" : "Suivre"}</Text>
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
        </ScrollView>
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

const makeStyles = (colors: ReturnType<typeof useThemeColors>["colors"]) => StyleSheet.create({
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
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 10, textTransform: "uppercase" },
  filterScroll: { gap: 8, paddingVertical: 6 },
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
  section: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: 8 },
  link: { color: colors.kinoHot, paddingVertical: 6, fontWeight: "600" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  userLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  userName: { flex: 1, color: colors.text, fontWeight: "700" },
  followBtn: { minWidth: 76, alignItems: "center", backgroundColor: colors.kino, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  followedText: { color: colors.muted, fontWeight: "700" },
});
