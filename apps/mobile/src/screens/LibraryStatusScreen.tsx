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
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "LibraryStatus">;

type LibraryRow = {
  tmdbId: number;
  mediaType: string;
  status: string;
  title: string;
  posterPath: string | null;
};

export function LibraryStatusScreen({ route, navigation }: Props) {
  const { status, title } = route.params;
  const { t } = useLocale();
  const { colors } = useThemeColors();
  const [rows, setRows] = useState<LibraryRow[]>([]);

  useEffect(() => {
    apiFetch<LibraryRow[]>(`/library/me?status=${status}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [status]);

  function openTitle(row: LibraryRow) {
    navigation.navigate("Title", {
      type: row.mediaType === "TV" ? "tv" : "movie",
      id: row.tmdbId,
      title: row.title,
    });
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.tmdbId)}
        numColumns={3}
        contentContainerStyle={{ padding: spacing.md, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        ListEmptyComponent={
          <Text style={{ color: colors.muted, textAlign: "center", padding: spacing.lg }}>
            {t("common.loading")}
          </Text>
        }
        renderItem={({ item }) => {
          const poster: PosterItem = {
            id: item.tmdbId,
            media_type: item.mediaType === "TV" ? "tv" : "movie",
            title: item.title,
            poster_path: item.posterPath ?? undefined,
          };
          return (
            <View style={{ flex: 1 / 3, maxWidth: "33%" }}>
              <PosterCard item={poster} onPress={() => openTitle(item)} width={110} />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
});
