import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { MOVIE_GENRES, TV_GENRES } from "../lib/genres";
import { genreLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Browse">;

export function BrowseScreen({ route, navigation }: Props) {
  const { type, genreId } = route.params;
  const { locale, t } = useLocale();
  const { colors } = useThemeColors();
  const [items, setItems] = useState<PosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  const genres = [...(type === "movie" ? MOVIE_GENRES : TV_GENRES)];
  const title = type === "movie" ? t("browse.movies") : t("browse.series");

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: "1", sort: "popularity.desc" });
    if (genreId) qs.set("genre", genreId);
    apiFetch<{ results: PosterItem[] }>(`/media/discover/${type}?${qs.toString()}`, {
      auth: false,
    })
      .then((r) => setItems(r.results ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, genreId]);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[s.h1, { color: colors.text }]}>{title}</Text>
        <FlatList
          horizontal
          data={genres}
          keyExtractor={(g) => g.slug}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: spacing.sm }}
          renderItem={({ item: g }) => {
            const active = (genreId ?? "") === g.id;
            return (
              <Pressable
                onPress={() =>
                  navigation.setParams({ type, genreId: g.id || undefined })
                }
                style={[
                  s.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.kino : colors.panel,
                  },
                ]}
              >
                <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                  {g.slug === "all" ? t("nav.all") : genreLabel(locale, g.slug)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
      {loading ? (
        <Text style={{ color: colors.muted, textAlign: "center" }}>{t("common.loading")}</Text>
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, gap: 8 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / 3, maxWidth: "33%" }}>
              <PosterCard
                item={item}
                width={110}
                onPress={() =>
                  navigation.navigate("Title", {
                    type: item.media_type === "tv" ? "tv" : type,
                    id: item.id,
                    title: item.title ?? item.name ?? "…",
                  })
                }
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  h1: { fontSize: 24, fontWeight: "800" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
