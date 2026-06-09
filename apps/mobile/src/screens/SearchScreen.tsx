import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
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
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { UserAvatar } from "../components/UserAvatar";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { MOVIE_GENRES, TV_GENRES } from "../lib/genres";
import { genreLabel } from "../lib/i18n";
import { discoverAllUsers } from "../lib/publicDiscovery";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;
type SearchType = "all" | "movie" | "tv" | "users" | "lists";
type Unified = {
  users: { id: string; displayName: string; avatarUrl?: string | null }[];
  lists: { id: string; name: string; user: { displayName: string } }[];
};

const SORTS = ["relevance", "popularity.desc", "vote_average.desc", "release_date.desc"] as const;
type SortKey = (typeof SORTS)[number];

export function SearchScreen({ navigation }: Props) {
  const { locale } = useLocale();
  const { colors } = useThemeColors();
  const s = makeStyles(colors);
  const [q, setQ] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const language = locale === "en" ? "en-US" : "fr-FR";
  const genres = type === "tv" ? TV_GENRES : MOVIE_GENRES;

  const movies = useMemo(
    () => results.filter((item) => item.media_type !== "tv"),
    [results],
  );
  const series = useMemo(
    () => results.filter((item) => item.media_type === "tv"),
    [results],
  );

  useEffect(() => {
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => setMeId(null));
  }, []);

  async function search(targetPage = 1, append = false, requestedType = type) {
    if (!q.trim() && !creator.trim() && requestedType === "all") {
      setResults([]);
      setUsers([]);
      setLists([]);
      return;
    }
    setLoading(true);
    try {
      const needsUnified = q.trim() || requestedType === "users" || requestedType === "lists";
      const unifiedPromise = needsUnified
        ? apiFetch<Unified>(`/search?q=${encodeURIComponent(q)}&page=${targetPage}`, { auth: false })
        : Promise.resolve({ users: [], lists: [] });
      const mediaPromise =
        requestedType === "users" || requestedType === "lists"
          ? Promise.resolve({ results: [], total_pages: 1 })
          : apiFetch<{ results: PosterItem[]; total_pages: number }>(
              !q.trim() && !creator.trim() && requestedType !== "all"
                ? `/media/discover/${requestedType}?page=${targetPage}&sort=${encodeURIComponent(sort === "relevance" ? "popularity.desc" : sort)}${year ? `&year=${year}` : ""}${genre ? `&genre=${genre}` : ""}${minVote ? `&minVote=${minVote}` : ""}&language=${language}`
                : `/media/search?q=${encodeURIComponent(q)}&page=${targetPage}${year ? `&year=${year}` : ""}${genre ? `&genre=${genre}` : ""}${minVote ? `&minVote=${minVote}` : ""}${requestedType === "movie" || requestedType === "tv" ? `&type=${requestedType}` : ""}${creator.trim() ? `&creator=${encodeURIComponent(creator.trim())}` : ""}&language=${language}`,
              { auth: false },
            );
      const [unified, media] = await Promise.all([unifiedPromise, mediaPromise]);
      const discoveredUsers =
        requestedType === "users" && !q.trim() ? await discoverAllUsers() : null;
      setUsers(requestedType === "lists" ? [] : discoveredUsers ?? unified.users ?? []);
      setLists(requestedType === "lists" || requestedType === "all" ? unified.lists ?? [] : []);
      setResults((previous) => append ? [...previous, ...(media.results ?? [])] : media.results ?? []);
      setPage(targetPage);
      setTotalPages(media.total_pages ?? 1);
    } finally {
      setLoading(false);
    }
  }

  function switchType(next: SearchType) {
    setType(next);
    setGenre("");
    void search(1, false, next);
  }

  async function follow(userId: string) {
    await apiFetch(`/users/${userId}/follow`, { method: "POST" });
    setFollowed((current) => ({ ...current, [userId]: true }));
  }

  function openWork(item: PosterItem) {
    navigation.navigate("Title", {
      type: item.media_type === "tv" ? "tv" : "movie",
      id: item.id,
      title: item.title ?? item.name ?? "Sans titre",
    });
  }

  const WorkSection = ({ title, items, nextType }: { title: string; items: PosterItem[]; nextType: "movie" | "tv" }) => (
    <View style={s.sectionBlock}>
      <View style={s.sectionHeader}>
        <Text style={s.section}>{title}</Text>
        <Pressable onPress={() => switchType(nextType)}>
          <Text style={s.seeAll}>{locale === "fr" ? "Voir tout" : "See all"} →</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.slice(0, 5).map((item) => (
          <PosterCard key={`${nextType}-${item.id}`} item={item} onPress={() => openWork(item)} />
        ))}
      </ScrollView>
    </View>
  );

  const UsersSection = ({ limited }: { limited: boolean }) => {
    const visibleUsers = users.filter((user) => user.id !== meId);
    return (
      <View style={s.sectionBlock}>
        <View style={s.sectionHeader}>
          <Text style={s.section}>{locale === "fr" ? "Utilisateurs" : "Users"}</Text>
          {limited && (
            <Pressable onPress={() => switchType("users")}>
              <Text style={s.seeAll}>{locale === "fr" ? "Voir tout" : "See all"} →</Text>
            </Pressable>
          )}
        </View>
        {(limited ? visibleUsers.slice(0, 5) : visibleUsers).map((user) => (
          <View key={user.id} style={s.userRow}>
            <Pressable style={s.userLink} onPress={() => navigation.navigate("Profile", { userId: user.id })}>
              <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={42} />
              <Text style={s.userName} numberOfLines={1}>{user.displayName}</Text>
            </Pressable>
            {meId && (
              <Pressable style={s.followBtn} disabled={followed[user.id]} onPress={() => follow(user.id)}>
                <Text style={s.btnText}>{followed[user.id] ? (locale === "fr" ? "Suivi" : "Following") : (locale === "fr" ? "Suivre" : "Follow")}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    );
  };

  const header = (
    <View>
      <View style={s.searchPanel}>
        <Text style={s.eyebrow}>{locale === "fr" ? "EXPLORER" : "EXPLORE"}</Text>
        <Text style={s.h1}>{locale === "fr" ? "Recherche" : "Search"}</Text>
        <TextInput
          style={s.input}
          placeholder={locale === "fr" ? "Œuvre, utilisateur, liste..." : "Title, user, list..."}
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => search()}
          returnKeyType="search"
        />
        <View style={s.row}>
          {(["all", "movie", "tv", "users", "lists"] as const).map((value) => (
            <Pressable key={value} style={[s.chip, type === value && s.chipOn]} onPress={() => switchType(value)}>
              <Text style={s.chipText}>{value === "all" ? (locale === "fr" ? "Tout" : "All") : value === "movie" ? (locale === "fr" ? "Films" : "Movies") : value === "tv" ? (locale === "fr" ? "Séries" : "Series") : value === "users" ? (locale === "fr" ? "Utilisateurs" : "Users") : (locale === "fr" ? "Listes" : "Lists")}</Text>
            </Pressable>
          ))}
        </View>
        {type !== "users" && type !== "lists" && (
          <>
            <Pressable style={s.filterToggle} onPress={() => setFiltersOpen((open) => !open)}>
              <Text style={s.filterToggleText}>{locale === "fr" ? "Filtres avancés" : "Advanced filters"}</Text>
              <Text style={s.filterToggleText}>{filtersOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {filtersOpen && (
              <View style={s.filters}>
                <Text style={s.filterLabel}>{locale === "fr" ? "Trier par" : "Sort by"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                  {SORTS.map((value) => <Pressable key={value} style={[s.chip, sort === value && s.chipOn]} onPress={() => setSort(value)}><Text style={s.chipText}>{value === "relevance" ? "Pertinence" : value === "popularity.desc" ? "Popularité" : value === "vote_average.desc" ? "Mieux notés" : "Plus récents"}</Text></Pressable>)}
                </ScrollView>
                {(type === "movie" || type === "tv") && <>
                  <Text style={s.filterLabel}>Genre</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                    {genres.map((item) => <Pressable key={item.slug} style={[s.chip, genre === item.id && s.chipOn]} onPress={() => setGenre(item.id)}><Text style={s.chipText}>{item.slug === "all" ? (locale === "fr" ? "Tous" : "All") : genreLabel(locale, item.slug)}</Text></Pressable>)}
                  </ScrollView>
                </>}
                <Text style={s.filterLabel}>{locale === "fr" ? "Note minimale" : "Minimum rating"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                  {[0, 5, 6, 7, 8, 9].map((value) => <Pressable key={value} style={[s.chip, minVote === value && s.chipOn]} onPress={() => setMinVote(value)}><Text style={s.chipText}>{value === 0 ? (locale === "fr" ? "Toutes" : "Any") : `${value}+/10`}</Text></Pressable>)}
                </ScrollView>
                <TextInput style={s.input} placeholder={locale === "fr" ? "Année (optionnel)" : "Year (optional)"} placeholderTextColor={colors.muted} keyboardType="number-pad" value={year} onChangeText={setYear} />
                <TextInput style={s.input} placeholder={locale === "fr" ? "Réalisateur / auteur (optionnel)" : "Director / creator (optional)"} placeholderTextColor={colors.muted} value={creator} onChangeText={setCreator} />
              </View>
            )}
          </>
        )}
        <Pressable style={s.btn} onPress={() => search()}>
          <Text style={s.btnText}>{loading ? "..." : (locale === "fr" ? "Rechercher" : "Search")}</Text>
        </Pressable>
      </View>
      {type === "all" && (results.length > 0 || users.length > 0) && <>
        {movies.length > 0 && <WorkSection title={locale === "fr" ? "Films" : "Movies"} items={movies} nextType="movie" />}
        {series.length > 0 && <WorkSection title={locale === "fr" ? "Séries" : "Series"} items={series} nextType="tv" />}
        {users.length > 0 && <UsersSection limited />}
      </>}
      {type === "users" && users.length > 0 && <UsersSection limited={false} />}
      {type === "lists" && lists.length > 0 && <View style={s.sectionBlock}><Text style={s.section}>{locale === "fr" ? "Listes publiques" : "Public lists"}</Text>{lists.map((list) => <Pressable key={list.id} style={s.listRow} onPress={() => navigation.navigate("ListDetail", { listId: list.id, listName: list.name })}><Text style={s.userName}>{list.name}</Text><Text style={s.muted}>· {list.user.displayName}</Text></Pressable>)}</View>}
    </View>
  );

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={type === "movie" || type === "tv" ? results : []}
        numColumns={2}
        key={type}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        keyExtractor={(item) => `${item.id}-${item.media_type ?? type}`}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onEndReached={() => {
          if ((type === "movie" || type === "tv") && page < totalPages && !loading) void search(page + 1, true);
        }}
        renderItem={({ item }) => <View style={s.gridItem}><PosterCard item={item} fullWidth onPress={() => openWork(item)} /></View>}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useThemeColors>["colors"]) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  searchPanel: { padding: spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: colors.kinoHot },
  h1: { fontSize: 30, fontWeight: "800", color: colors.text, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 13, color: colors.text, backgroundColor: colors.panel, marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panelSoft, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  chipOn: { borderColor: colors.kino, backgroundColor: `${colors.kino}25` },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  filterToggle: { marginTop: 14, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.panel },
  filterToggleText: { color: colors.text, fontWeight: "700" },
  filters: { marginTop: 6 },
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 10, textTransform: "uppercase" },
  filterScroll: { gap: 8, paddingVertical: 7 },
  btn: { backgroundColor: colors.kino, borderRadius: radius.pill, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "800" },
  sectionBlock: { paddingHorizontal: spacing.lg, marginTop: 8, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  section: { color: colors.text, fontWeight: "800", fontSize: 20, marginBottom: 8 },
  seeAll: { color: colors.kinoHot, fontWeight: "700" },
  gridItem: { width: "50%", paddingHorizontal: 5, paddingBottom: 12 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  userLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  userName: { color: colors.text, fontWeight: "700", flex: 1 },
  followBtn: { backgroundColor: colors.kino, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  listRow: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.panel, marginBottom: 8 },
  muted: { color: colors.muted, marginTop: 3 },
});
