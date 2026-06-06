import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { radius } from "../theme";

export type PosterItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
};

export function PosterCard({
  item,
  onPress,
  width = 130,
  fullWidth = false,
}: {
  item: PosterItem;
  onPress: () => void;
  width?: number;
  fullWidth?: boolean;
}) {
  const { colors } = useThemeColors();
  const { t } = useLocale();
  const label = item.title ?? item.name ?? t("common.untitled");
  const uri = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, fullWidth ? { width: "100%" } : { width }]}
    >
      <View style={[styles.posterWrap, { borderColor: colors.border, backgroundColor: colors.panel }, fullWidth ? { aspectRatio: 2 / 3 } : null]}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>No poster</Text>
          </View>
        )}
        {typeof item.vote_average === "number" && item.vote_average > 0 && (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>★ {item.vote_average.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  posterWrap: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
  },
  poster: { width: "100%", height: "100%" },
  posterPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },
});
