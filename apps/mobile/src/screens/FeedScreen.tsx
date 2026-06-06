import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { apiFetch } from "../api";
import { Eyebrow, H1, s } from "../components/AppUi";
import { UserAvatar } from "../components/UserAvatar";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { statusLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme";

type Act = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  user: { displayName: string; id?: string; avatarUrl?: string | null };
  createdAt: string;
};

export function FeedScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList, params?: object) => void };
}) {
  const { locale, t } = useLocale();
  const { colors: c } = useThemeColors();
  const [items, setItems] = useState<Act[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Act[]; nextCursor: string | null }>("/feed")
      .then((r) => {
        setItems(r.items);
        setNextCursor(r.nextCursor);
      })
      .catch(() => setErr(t("feed.signIn")));
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch<{ items: Act[]; nextCursor: string | null }>(
        `/feed?cursor=${encodeURIComponent(nextCursor)}`,
      );
      setItems((prev) => [...prev, ...r.items]);
      setNextCursor(r.nextCursor);
    } catch {
      setNextCursor(null);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  function workTitle(payload?: Record<string, unknown>) {
    return String(payload?.title ?? `#${payload?.tmdbId ?? "?"}`);
  }

  function activityLabel(item: Act) {
    const payload = item.payload ?? {};
    switch (item.type) {
      case "FOLLOW":
        return t("activity.follow");
      case "RATED":
        return t("activity.rated", {
          title: workTitle(payload),
          rating: String(payload.rating ?? "?"),
        });
      case "REVIEWED":
        return t("activity.reviewed", { title: workTitle(payload) });
      case "LIST_ADDED":
        return t("activity.listAdded", { title: workTitle(payload) });
      case "STATUS_CHANGED":
        return t("activity.statusChanged", {
          title: workTitle(payload),
          status: statusLabel(locale, String(payload.status ?? "")).toLowerCase(),
        });
      default:
        return item.type.toLowerCase().replace(/_/g, " ");
    }
  }

  function openActivity(item: Act) {
    const payload = item.payload ?? {};
    if (typeof payload.tmdbId === "number") {
      navigation.navigate("Title", {
        type: payload.mediaType === "TV" ? "tv" : "movie",
        id: payload.tmdbId,
        title: workTitle(payload),
      });
    } else if (item.user.id) {
      navigation.navigate("Profile", { userId: item.user.id });
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>{t("feed.social").toUpperCase()}</Eyebrow>
        <H1>{t("feed.title")}</H1>
        <Text style={s.sub}>{t("feed.subtitle")}</Text>
      </View>
      {err && <Text style={[s.err, { marginLeft: spacing.lg }]}>{err}</Text>}
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        data={items}
        keyExtractor={(i) => i.id}
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMore()}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => openActivity(item)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => {
                  if (item.user.id) navigation.navigate("Profile", { userId: item.user.id });
                }}
              >
                <UserAvatar name={item.user.displayName} avatarUrl={item.user.avatarUrl} size={32} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sub} numberOfLines={1}>
                  <Text style={{ fontWeight: "700", color: c.text }}>{item.user.displayName}</Text>
                  {" · "}
                  {new Date(item.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </Text>
                <Text style={{ color: c.text, marginTop: 4 }}>{activityLabel(item)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          loadingMore ? (
            <Text style={[s.sub, { textAlign: "center", marginTop: 8 }]}>
              {t("common.loading")}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !err ? <Text style={s.sub}>{t("feed.emptyFollow")}</Text> : null
        }
      />
    </SafeAreaView>
  );
}
