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
type SearchResult = PosterItem & { overview?: string };
type HomePayload = {
  trending?: { movies: SearchResult[]; tv: SearchResult[] };
  latestRatings?: {
    id: string;
    rating: number;
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    title: string;
    user: { id: string; displayName: string; avatarUrl?: string | null };
  }[];
  recentWatched?: {
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    status: string;
    title: string;
  }[];
  categories?: {
    id: string;
    label: string;
    items: SearchResult[];
    type: "movie" | "tv";
  }[];
};

type EngagementPayload = {
  streakDays: number;
  weekly: {
    reviews: number;
    completed: number;
    targetReviews: number;
    targetCompleted: number;
  };
};

export function HomeScreen({
  navigation,
}: {
  navigation: {
    navigate: (name: keyof RootStackParamList, params?: object) => void;
  };
}) {
  const insets = useSafeAreaInsets();
  const { locale, t } = useLocale();
  const { colors: c } = useThemeColors();
  const [home, setHome] = useState<HomePayload | null>(null);
  const [engagement, setEngagement] = useState<EngagementPayload | null>(null);
  const [authed, setAuthed] = useState(false);
  const [meNav, setMeNav] = useState<{
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    role?: string;
  } | null>(null);

  async function reload() {
    try {
      const h = await apiFetch<HomePayload>(`/home?language=${locale === "fr" ? "fr-FR" : "en-US"}`, { auth: true });
      setHome(h);
    } catch {
      try {
        const h = await apiFetch<HomePayload>(`/home?language=${locale === "fr" ? "fr-FR" : "en-US"}`, { auth: false });
        setHome(h);
      } catch {
        setHome(null);
      }
    }
    try {
      const e = await apiFetch<EngagementPayload>("/engagement/summary", {
        auth: true,
      });
      setEngagement(e);
      setAuthed(true);
      const me = await apiFetch<{
        id: string;
        displayName: string;
        avatarUrl?: string | null;
        role?: string;
      }>("/users/me");
      setMeNav(me);
    } catch {
      setEngagement(null);
      setAuthed(false);
      setMeNav(null);
    }
  }

  useEffect(() => {
    reload();
  }, [locale]);

  const featured = home?.trending?.movies?.[0] ?? home?.trending?.tv?.[0];

  function openTitle(item: SearchResult, fallbackType: "movie" | "tv") {
    navigation.navigate("Title", {
      type: item.media_type === "tv" ? "tv" : fallbackType,
      id: item.id,
      title: item.title ?? item.name ?? "Untitled",
    });
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.ink }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.topBar, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
          <Logo />
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {meNav?.role === "ADMIN" && (
              <TouchableOpacity
                onPress={() => navigation.navigate("Admin")}
                style={[s.iconBtn, s.adminIconBtn]}
                accessibilityLabel={t("nav.admin")}
              >
                <Text style={{ color: colors.kinoHot, fontSize: 16, fontWeight: "800" }}>A</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate("Menu")}
              style={s.iconBtn}
            >
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Search")}
              style={s.iconBtn}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>⌕</Text>
            </TouchableOpacity>
            {authed && meNav ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Profile", { userId: meNav.id })
                }
                style={s.avatarBtn}
              >
                {meNav.avatarUrl?.startsWith("http") ? (
                  <Image source={{ uri: meNav.avatarUrl }} style={s.avatarImg} />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                    {meNav.displayName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                style={s.iconBtn}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {featured ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={s.hero}
            onPress={() =>
              openTitle(featured, featured.media_type === "tv" ? "tv" : "movie")
            }
          >
            {featured.poster_path ? (
              <ImageBackground
                source={{
                  uri: `https://image.tmdb.org/t/p/w780${featured.poster_path}`,
                }}
                resizeMode="cover"
                style={{ flex: 1, justifyContent: "flex-end" }}
              >
                <View style={s.heroOverlay} />
                <View style={s.heroContent}>
                  <Eyebrow>{t("hero.featured").toUpperCase()}</Eyebrow>
                  <Text numberOfLines={2} style={s.heroTitle}>
                    {featured.title ?? featured.name}
                  </Text>
                  {typeof featured.vote_average === "number" && (
                    <Text style={s.heroScore}>
                      ★ {featured.vote_average.toFixed(1)}
                    </Text>
                  )}
                  {featured.overview ? (
                    <Text
                      numberOfLines={3}
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18, marginTop: 6 }}
                    >
                      {featured.overview}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <PrimaryButton
                      label={t("hero.details")}
                      onPress={() =>
                        openTitle(
                          featured,
                          featured.media_type === "tv" ? "tv" : "movie",
                        )
                      }
                    />
                    <GhostButton
                      label={t("hero.tonight")}
                      onPress={() => navigation.navigate("Tonight")}
                    />
                  </View>
                </View>
              </ImageBackground>
            ) : (
              <View style={s.heroContent}>
                <Eyebrow>{t("hero.featured").toUpperCase()}</Eyebrow>
                <Text style={s.heroTitle}>
                  {featured.title ?? featured.name}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[s.hero, { backgroundColor: colors.panel }]} />
        )}

        {engagement && (
          <View style={s.engagementRow}>
            <View style={[s.engBadge, { backgroundColor: "#ff7a1a" }]}>
              <Text style={s.engValue}>{engagement.streakDays}</Text>
              <Text style={s.engLabel}>{t("engagement.streak")}</Text>
              <Text style={s.engDescription}>{t("engagement.streakDescription")}</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: colors.kino }]}>
              <Text style={s.engValue}>
                {engagement.weekly.reviews}/{engagement.weekly.targetReviews}
              </Text>
              <Text style={s.engLabel}>{t("engagement.reviewsWeek")}</Text>
              <Text style={s.engDescription}>{t("engagement.reviewsDescription")}</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: "#6b5bff" }]}>
              <Text style={s.engValue}>
                {engagement.weekly.completed}/
                {engagement.weekly.targetCompleted}
              </Text>
              <Text style={s.engLabel}>{t("engagement.completedWeek")}</Text>
              <Text style={s.engDescription}>{t("engagement.completedDescription")}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Tonight")}
          style={s.tonightBanner}
        >
          <View style={s.tonightGlow} />
          <Eyebrow>{t("home.ctaBadge").toUpperCase()}</Eyebrow>
          <Text style={s.tonightTitle}>{t("home.ctaTitle")}</Text>
          <Text style={s.tonightSub}>{t("home.ctaBody")}</Text>
          <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
            <PrimaryButton
              label={t("home.ctaTonight")}
              onPress={() => navigation.navigate("Tonight")}
            />
          </View>
        </TouchableOpacity>

        {home?.trending?.movies && home.trending.movies.length > 0 && (
          <Section
            title={t("home.trendingMovies")}
            action={{
              label: t("nav.search"),
              onPress: () => navigation.navigate("Search"),
            }}
          >
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              data={home.trending.movies.slice(0, 14)}
              keyExtractor={(m) => `mv-${m.id}`}
              renderItem={({ item }) => (
                <PosterCard
                  item={item}
                  onPress={() => openTitle(item, "movie")}
                />
              )}
            />
          </Section>
        )}

        {home?.trending?.tv && home.trending.tv.length > 0 && (
          <Section title={t("home.trendingTv")}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={home.trending.tv.slice(0, 14)}
              keyExtractor={(m) => `tv-${m.id}`}
              renderItem={({ item }) => (
                <PosterCard item={item} onPress={() => openTitle(item, "tv")} />
              )}
            />
          </Section>
        )}

        {home?.categories?.map((cat) => (
          <Section key={cat.id} title={categoryLabel(locale, cat.id)}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cat.items.slice(0, 14)}
              keyExtractor={(m) => `${cat.id}-${m.id}`}
              renderItem={({ item }) => (
                <PosterCard
                  item={item}
                  onPress={() => openTitle(item, cat.type)}
                />
              )}
            />
          </Section>
        ))}

        {home?.latestRatings && home.latestRatings.length > 0 && (
          <Section title={t("home.latestRatings")}>
            <View style={s.card}>
              {home.latestRatings.slice(0, 5).map((r) => (
                <Pressable key={r.id} style={s.ratingRow} onPress={() => navigation.navigate("Profile", { userId: r.user.id })}>
                  {r.user.avatarUrl ? (
                    <Image source={{ uri: r.user.avatarUrl }} style={[s.avatar, { backgroundColor: "transparent" }]} />
                  ) : (
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>
                        {(r.user.displayName ?? "??").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
                    {r.user.displayName}
                    {" · "}
                    <Text style={{ color: colors.kinoHot }}>{r.title}</Text>
                    {" · ★ "}
                    {r.rating}/5
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


