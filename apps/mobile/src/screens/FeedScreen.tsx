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
type Act = {
  id: string;
  type: string;
  user: { displayName: string; id?: string };
  createdAt: string;
};

export function FeedScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList, params?: object) => void };
}) {
  const [items, setItems] = useState<Act[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Act[] }>("/feed")
      .then((r) => setItems(r.items))
      .catch(() => setErr("Connectez-vous pour voir le fil."));
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>FIL D'ACTUALITE</Eyebrow>
        <H1>Activite</H1>
      </View>
      {err && <Text style={[s.err, { marginLeft: spacing.lg }]}>{err}</Text>}
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={s.card}
            onPress={() => {
              if (item.user.id) {
                navigation.navigate("Profile", { userId: item.user.id });
              }
            }}
          >
            <Text style={s.sub}>
              {item.user.displayName} Â· {new Date(item.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>
              {item.type.toLowerCase().replace(/_/g, " ")}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !err ? (
            <Text style={s.sub}>Suivez des membres pour voir leur activite.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}


