import { Image, Text, View } from "react-native";
import { useThemeColors } from "../context/ThemeContext";

export function UserAvatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const { colors } = useThemeColors();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={round} />;
  }
  const initials = (name ?? "??")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        round,
        {
          backgroundColor: colors.kino,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: Math.max(10, size / 3) }}>
        {initials}
      </Text>
    </View>
  );
}
