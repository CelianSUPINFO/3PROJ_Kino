import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../api";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;

type ListDetail = {
  id: string;
  name: string;
  isPublic: boolean;
  items: { tmdbId: number; mediaType: string }[];
};

export function ListDetailScreen({ route, navigation }: Props) {
  const { listId, listName } = route.params;
  const [list, setList] = useState<ListDetail | null>(null);
  const [titles, setTitles] = useState<
    { tmdbId: number; mediaType: string; title: string; posterPath: string | null }[]
  >([]);

  useEffect(() => {
    apiFetch<ListDetail>(`/library/lists/${listId}`, { auth: false })
      .then(async (data) => {
        setList(data);
        const enriched = await Promise.all(
          data.items.map(async (item) => {
            const type = item.mediaType === "TV" ? "tv" : "movie";
            try {
              const r = await apiFetch<{ data: { title?: string; name?: string; poster_path?: string } }>(
                `/media/${type}/${item.tmdbId}`,
                { auth: false },
              );
              return {
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: r.data.title ?? r.data.name ?? `#${item.tmdbId}`,
                posterPath: r.data.poster_path ?? null,
              };
            } catch {
              return {
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                title: `#${item.tmdbId}`,
                posterPath: null,
              };
            }
          }),
        );
        setTitles(enriched);
      })
      .catch(() => setList(null));
  }, [listId]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Text style={s.eyebrow}>LISTE</Text>
        <Text style={s.h1}>{list?.name ?? listName}</Text>
        {list && (
          <Text style={s.sub}>
            {list.isPublic ? "Publique" : "Privée"} · {list.items.length} œuvre(s)
          </Text>
        )}
      </View>
      <FlatList
        data={titles}
        keyExtractor={(i) => `${i.mediaType}-${i.tmdbId}`}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            style={s.row}
            onPress={() =>
              navigation.navigate("Title", {
                type: item.mediaType === "TV" ? "tv" : "movie",
                id: item.tmdbId,
                title: item.title,
              })
            }
          >
            {item.posterPath ? (
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w92${item.posterPath}` }}
                style={s.poster}
              />
            ) : (
              <View style={[s.poster, { backgroundColor: colors.panel }]} />
            )}
            <Text style={s.title}>{item.title}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={s.sub}>Aucune œuvre dans cette liste.</Text>
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
  h1: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { color: colors.muted, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  poster: { width: 44, height: 66, borderRadius: radius.sm },
  title: { flex: 1, color: colors.text, fontWeight: "600" },
});
