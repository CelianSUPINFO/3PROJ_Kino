import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, ImageBackground, PanResponder, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, clearTokens, getApiRoot, logoutSession, setTokens } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { Chip, Eyebrow, GhostButton, H1, Label, Logo, PrimaryButton, Section, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { categoryLabel, notificationLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { registerPushNotifications, unregisterPushNotifications } from "../pushNotifications";
type Notif = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload?: { followerId?: string; senderId?: string; tmdbId?: number; mediaType?: "MOVIE" | "TV"; reviewId?: string };
};

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const { colors: c } = useThemeColors();
  const { locale, t } = useLocale();
  const [items, setItems] = useState<Notif[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await apiFetch<Notif[]>("/notifications");
      setItems(rows);
      setStatus(null);
    } catch {
      setStatus(t("common.signInRequired"));
    }
  }

  async function readOne(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function openNotification(item: Notif) {
    await readOne(item.id);
    if (item.type === "NEW_FOLLOWER" && item.payload?.followerId) {
      navigation.navigate("Profile", { userId: item.payload.followerId });
    } else if (item.type === "NEW_MESSAGE" && item.payload?.senderId) {
      navigation.navigate("Messages", { userId: item.payload.senderId });
    } else if (
      (item.type === "REVIEW_LIKED" || item.type === "REVIEW_COMMENT") &&
      item.payload?.tmdbId
    ) {
      navigation.navigate("Title", {
        type: item.payload.mediaType === "TV" ? "tv" : "movie",
        id: item.payload.tmdbId,
        title: "",
      });
    } else if (item.type === "RECOMMENDATION") {
      navigation.navigate("Tonight");
    }
  }

  async function readAll() {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.ink }]}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>{t("notifications.alerts").toUpperCase()}</Eyebrow>
        <H1>{t("notifications.title")}</H1>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Chip label={t("common.retry")} onPress={load} />
          <Chip label={t("notifications.markAll")} onPress={readAll} />
        </View>
      </View>
      {status && (
        <Text style={[s.err, { marginLeft: spacing.lg }]}>{status}</Text>
      )}
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 40,
          gap: 8,
        }}
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={notificationLabel(locale, item.type)}
            accessibilityHint={locale === "fr" ? "Ouvre le contenu associÃ©" : "Opens related content"}
            onPress={() => openNotification(item)}
            style={[s.card, item.read ? null : { borderColor: c.kino }]}
          >
            <Text
              style={{
                color: item.read ? c.muted : c.text,
                fontWeight: "600",
              }}
            >
              {notificationLabel(locale, item.type) ??
                item.type.toLowerCase().replace(/_/g, " ")}
            </Text>
            <Text style={[s.sub, { fontSize: 11 }]}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}


