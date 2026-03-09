import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius } from "../theme";

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
  const label = item.title ?? item.name ?? "Untitled";
  const uri = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, fullWidth ? { width: "100%" } : { width }]}
    >
      <View style={[styles.posterWrap, fullWidth ? { aspectRatio: 2 / 3 } : null]}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>No poster</Text>
          </View>
        )}
        {typeof item.vote_average === "number" && item.vote_average > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>★ {item.vote_average.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.gradient} />
      </View>
      <Text numberOfLines={2} style={styles.label}>
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
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  poster: { width: "100%", height: "100%" },
  posterPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    backgroundColor: "rgba(10,7,16,0.75)",
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
  badgeText: { color: colors.gold, fontSize: 10, fontWeight: "700" },
  label: {
    color: colors.text,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },
});
