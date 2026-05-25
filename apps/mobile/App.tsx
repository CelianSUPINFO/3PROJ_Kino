import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, clearTokens, getApiRoot, logoutSession, setTokens } from "./src/api";
import { PosterCard, type PosterItem } from "./src/components/PosterCard";
import type { RootStackParamList } from "./src/navigation/types";
import { AdminScreen } from "./src/screens/AdminScreen";
import { BrowseScreen } from "./src/screens/BrowseScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { LibraryStatusScreen } from "./src/screens/LibraryStatusScreen";
import { ListDetailScreen } from "./src/screens/ListDetailScreen";
import { MenuScreen } from "./src/screens/MenuScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { TitleScreen } from "./src/screens/TitleScreen";
import { LocaleProvider, useLocale } from "./src/context/LocaleContext";
import { categoryLabel, notificationLabel } from "./src/lib/i18n";
import { ThemeContextProvider, useThemeColors } from "./src/context/ThemeContext";
import { colors, radius, spacing, typography } from "./src/theme";
import { registerPushNotifications, unregisterPushNotifications } from "./src/pushNotifications";

WebBrowser.maybeCompleteAuthSession();

type SearchResult = PosterItem;

const Stack = createNativeStackNavigator<RootStackParamList>();

function useNavTheme() {
  const { colors: c, theme } = useThemeColors();
  return {
    ...DefaultTheme,
    dark: theme === "dark",
    colors: {
      ...DefaultTheme.colors,
      background: c.ink,
      card: c.panel,
      text: c.text,
      border: c.border,
      primary: c.kino,
      notification: c.kinoHot,
    },
  };
}

// ------------ Shared UI atoms ------------

function Logo() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image source={require("./assets/icon.png")} style={logoStyles.square} />
      <Text style={logoStyles.word}>kino</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  square: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  word: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});

function Eyebrow({ children }: { children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

function H1({ children }: { children: string }) {
  return <Text style={s.h1}>{children}</Text>;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.chip, active ? s.chipActive : null]}
    >
      <Text style={[s.chipText, active ? s.chipTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[s.btnPrimary, disabled ? { opacity: 0.6 } : null]}
    >
      <Text style={s.btnPrimaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.btnGhost}>
      <Text style={s.btnGhostText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={s.sectionAction}>{action.label} →</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ------------ Home ------------

type HomePayload = {
  trending?: { movies: SearchResult[]; tv: SearchResult[] };
  latestRatings?: {
    id: string;
    rating: number;
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    title: string;
    user: { displayName: string };
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

function HomeScreen({
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
      const h = await apiFetch<HomePayload>("/home", { auth: true });
      setHome(h);
    } catch {
      try {
        const h = await apiFetch<HomePayload>("/home", { auth: false });
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
  }, []);

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

        {/* Hero */}
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

        {/* Engagement */}
        {engagement && (
          <View style={s.engagementRow}>
            <View style={[s.engBadge, { backgroundColor: "#ff7a1a" }]}>
              <Text style={s.engValue}>{engagement.streakDays}</Text>
              <Text style={s.engLabel}>{t("engagement.days")}</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: colors.kino }]}>
              <Text style={s.engValue}>
                {engagement.weekly.reviews}/{engagement.weekly.targetReviews}
              </Text>
              <Text style={s.engLabel}>{t("engagement.reviewsWeek")}</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: "#6b5bff" }]}>
              <Text style={s.engValue}>
                {engagement.weekly.completed}/
                {engagement.weekly.targetCompleted}
              </Text>
              <Text style={s.engLabel}>{t("engagement.completedWeek")}</Text>
            </View>
          </View>
        )}

        {/* Tonight CTA */}
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
                <View key={r.id} style={s.ratingRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {(r.user.displayName ?? "??").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
                    {r.user.displayName}
                    {" · "}
                    <Text style={{ color: colors.kinoHot }}>{r.title}</Text>
                    {" · ★ "}
                    {r.rating}/5
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ------------ Tonight ------------

type TonightResult = {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  score: number;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string;
  genreNames?: string[];
};

const SCREEN_WIDTH = Dimensions.get("window").width;

function TonightScreen({
  navigation,
}: {
  navigation: {
    navigate: (name: "Title", params: RootStackParamList["Title"]) => void;
  };
}) {
  const [items, setItems] = useState<TonightResult[]>([]);
  const [index, setIndex] = useState(0);
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [status, setStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    tone: "success" | "danger";
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const pan = useRef(new Animated.ValueXY()).current;
  const rotation = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-12deg", "0deg", "12deg"],
  });
  const smashOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{
        personalized: boolean;
        results: TonightResult[];
      }>(`/reco/tonight?type=${type}&limit=20`);
      setItems(res.results ?? []);
      setIndex(0);
      setStatus(
        res.personalized
          ? "Suggestions personnalisées."
          : "Mode découverte : notez plus d'œuvres pour personnaliser.",
      );
    } catch {
      setStatus("Connectez-vous pour enregistrer vos choix.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  const current = items[index];
  const next = items[index + 1];

  async function swipe(choice: "SMASH" | "PASS") {
    if (!current) return;
    let saved = false;
    try {
      await apiFetch("/reco/swipe", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: current.id,
          type: current.mediaType,
          choice,
        }),
      });
      saved = true;
    } catch {
      saved = false;
    }
    setToast(
      choice === "SMASH"
        ? {
            msg: saved
              ? "Ajouté à votre profil"
              : "Connectez-vous pour mémoriser ce choix",
            tone: saved ? "success" : "danger",
          }
        : {
            msg: saved ? "Passé, choix enregistré" : "Passé en mode invité",
            tone: "danger",
          },
    );
    setTimeout(() => setToast(null), 1400);
  }

  function resolveSwipe(direction: "right" | "left") {
    Animated.timing(pan, {
      toValue: {
        x: direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
        y: 0,
      },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      setIndex((i) => i + 1);
      pan.setValue({ x: 0, y: 0 });
      swipe(direction === "right" ? "SMASH" : "PASS");
    });
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_e, g) => {
          if (g.dx > SCREEN_WIDTH * 0.3) {
            resolveSwipe("right");
          } else if (g.dx < -SCREEN_WIDTH * 0.3) {
            resolveSwipe("left");
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, items.length],
  );

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Eyebrow>TONIGHT?</Eyebrow>
        <H1>Smash or Pass</H1>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Chip
            label="Movies"
            active={type === "movie"}
            onPress={() => setType("movie")}
          />
          <Chip
            label="TV shows"
            active={type === "tv"}
            onPress={() => setType("tv")}
          />
        </View>
        {status && <Text style={[s.sub, { marginTop: 8 }]}>{status}</Text>}
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        }}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={colors.kino} size="large" />
          </View>
        ) : !current ? (
          <View style={s.emptyCard}>
            <Text style={s.h1}>You&apos;re all caught up</Text>
            <Text style={s.sub}>
              Switch category or refresh to see fresh picks.
            </Text>
            <View style={{ height: 12 }} />
            <PrimaryButton label="Refresh picks" onPress={load} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {next && <TonightCard item={next} stacked />}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { rotate: rotation },
                  ],
                },
              ]}
            >
              <TonightCard item={current} />
              <Animated.View
                style={[
                  s.swipeBadge,
                  {
                    left: 20,
                    borderColor: colors.danger,
                    opacity: passOpacity,
                  },
                ]}
              >
                <Text style={[s.swipeBadgeText, { color: colors.danger }]}>
                  PASS
                </Text>
              </Animated.View>
              <Animated.View
                style={[
                  s.swipeBadge,
                  {
                    right: 20,
                    borderColor: colors.success,
                    opacity: smashOpacity,
                  },
                ]}
              >
                <Text style={[s.swipeBadgeText, { color: colors.success }]}>
                  SMASH
                </Text>
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </View>

      {current && (
        <View style={s.tonightActions}>
          <TouchableOpacity
            style={[s.roundBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
            onPress={() => resolveSwipe("left")}
          >
            <Text
              style={{ color: colors.danger, fontSize: 24, fontWeight: "700" }}
            >
              ✕
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.detailsPill}
            onPress={() =>
              navigation.navigate("Title", {
                type: current.mediaType,
                id: current.id,
                title: current.title,
              })
            }
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              Details →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.roundBtn,
              { backgroundColor: colors.kino, borderColor: colors.kino },
            ]}
            onPress={() => resolveSwipe("right")}
          >
            <Text style={{ color: "#fff", fontSize: 22 }}>★</Text>
          </TouchableOpacity>
        </View>
      )}

      {toast && (
        <View
          style={[
            s.toast,
            {
              borderColor:
                toast.tone === "success" ? colors.success : colors.danger,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {toast.msg}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function TonightCard({
  item,
  stacked,
}: {
  item: TonightResult;
  stacked?: boolean;
}) {
  const uri = item.backdropPath
    ? `https://image.tmdb.org/t/p/w780${item.backdropPath}`
    : item.posterPath
      ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
      : null;
  return (
    <View
      style={[
        s.swipeCard,
        stacked ? { transform: [{ scale: 0.94 }, { translateY: 12 }] } : null,
      ]}
    >
      {uri ? (
        <ImageBackground
          source={{ uri }}
          resizeMode="cover"
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={s.swipeOverlay} />
          <View style={{ padding: spacing.lg }}>
            {item.genreNames && item.genreNames.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                {item.genreNames.slice(0, 3).map((g) => (
                  <View key={g} style={s.miniChip}>
                    <Text style={s.miniChipText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[s.h1, { fontSize: 28 }]}>{item.title}</Text>
            <Text
              style={{ color: colors.gold, fontWeight: "700", marginTop: 4 }}
            >
              ★ {item.score.toFixed(1)} / 10
            </Text>
            {item.overview ? (
              <Text numberOfLines={3} style={[s.sub, { marginTop: 8 }]}>
                {item.overview}
              </Text>
            ) : null}
          </View>
        </ImageBackground>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "flex-end", padding: spacing.lg }}
        >
          <Text style={[s.h1, { fontSize: 28 }]}>{item.title}</Text>
          <Text style={{ color: colors.gold }}>★ {item.score.toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

// ------------ Auth ------------

async function runGoogleOAuth(
  navigation: { navigate: (name: "Home") => void },
) {
  const redirect = Linking.createURL("oauth");
  const result = await WebBrowser.openAuthSessionAsync(
    `${getApiRoot()}/v1/auth/google?mobile=1`,
    redirect,
  );
  if (result.type !== "success" || !result.url) {
    throw new Error("google oauth cancelled");
  }
  const parsed = Linking.parse(result.url);
  const access =
    typeof parsed.queryParams?.access === "string"
      ? parsed.queryParams.access
      : null;
  const refresh =
    typeof parsed.queryParams?.refresh === "string"
      ? parsed.queryParams.refresh
      : null;
  if (!access || !refresh) {
    throw new Error("google oauth missing tokens");
  }
  await setTokens(access, refresh);
  navigation.navigate("Home");
}

function LoginScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList) => void };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = Linking.addEventListener("url", async (event) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path !== "oauth") return;
      const access =
        typeof parsed.queryParams?.access === "string"
          ? parsed.queryParams.access
          : null;
      const refresh =
        typeof parsed.queryParams?.refresh === "string"
          ? parsed.queryParams.refresh
          : null;
      if (access && refresh) {
        await setTokens(access, refresh);
        navigation.navigate("Home");
      }
    });
    return () => sub.remove();
  }, [navigation]);

  async function googleLogin() {
    setLoading(true);
    setErr(null);
    try {
      await runGoogleOAuth(navigation);
    } catch {
      setErr("Connexion Google annulee ou echouee.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
          auth: false,
        },
      );
      await setTokens(res.accessToken, res.refreshToken);
      navigation.navigate("Home");
    } catch {
      setErr("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg, flex: 1 }}>
        <Eyebrow>WELCOME BACK</Eyebrow>
        <H1>Log in</H1>
        <Text style={[s.sub, { marginBottom: spacing.lg }]}>
          Continue your cinematic journey.
        </Text>
        <Label>Email</Label>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Label>Password</Label>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err && <Text style={s.err}>{err}</Text>}
        <View style={{ marginTop: 8 }}>
          {loading ? (
            <ActivityIndicator color={colors.kino} />
          ) : (
            <>
              <PrimaryButton label="Log in" onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label="Continuer avec Google" onPress={googleLogin} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function RegisterScreen({
  navigation,
}: {
  navigation: { navigate: (name: "Home") => void };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password, displayName }),
          auth: false,
        },
      );
      await setTokens(res.accessToken, res.refreshToken);
      navigation.navigate("Home");
    } catch {
      setErr("Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignup() {
    setLoading(true);
    setErr(null);
    try {
      await runGoogleOAuth(navigation);
    } catch {
      setErr("Connexion Google annulee ou echouee.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg, flex: 1 }}>
        <Eyebrow>JOIN KINO</Eyebrow>
        <H1>Create your account</H1>
        <Text style={[s.sub, { marginBottom: spacing.lg }]}>
          Password: 8+ chars with upper, lower and a number.
        </Text>
        <Label>Display name</Label>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Label>Email</Label>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Label>Password</Label>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {err && <Text style={s.err}>{err}</Text>}
        <View style={{ marginTop: 8 }}>
          {loading ? (
            <ActivityIndicator color={colors.kino} />
          ) : (
            <>
              <PrimaryButton label="Create account" onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label="Continuer avec Google" onPress={googleSignup} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}


// ------------ Feed ------------

type Act = {
  id: string;
  type: string;
  user: { displayName: string; id?: string };
  createdAt: string;
};

function FeedScreen({
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
              {item.user.displayName} · {new Date(item.createdAt).toLocaleString()}
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

// ------------ Messages ------------

type Partner = { id: string; displayName: string; unreadCount?: number };
type Msg = { id: string; body: string; createdAt: string; senderId?: string };

function MessagesScreen() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Partner[]>("/messages/partners")
      .then((rows) => {
        setPartners(rows);
        if (rows[0]) setSelectedId(rows[0].id);
      })
      .catch(() => setMsg("Sign in required"));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    apiFetch<Msg[]>(`/messages/${selectedId}`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [selectedId]);

  async function send() {
    if (!selectedId || !body.trim()) return;
    await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ recipientId: selectedId, body: body.trim() }),
    });
    setBody("");
    const rows = await apiFetch<Msg[]>(`/messages/${selectedId}`);
    setMessages(rows);
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>CHAT</Eyebrow>
        <H1>Messages</H1>
      </View>
      {msg && <Text style={[s.err, { marginLeft: spacing.lg }]}>{msg}</Text>}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 8,
        }}
        data={partners}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Chip
            label={
              item.unreadCount
                ? `${item.displayName} (${item.unreadCount})`
                : item.displayName
            }
            active={selectedId === item.id}
            onPress={() => setSelectedId(item.id)}
          />
        )}
      />
      <FlatList
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 120,
          gap: 8,
        }}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={{ color: colors.text }}>{item.body}</Text>
            <Text style={[s.sub, { fontSize: 10, marginTop: 4 }]}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.ink,
        }}
      >
        <TextInput
          placeholder="Type a message..."
          placeholderTextColor={colors.muted}
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          value={body}
          onChangeText={setBody}
        />
        <TouchableOpacity onPress={send} style={s.btnPrimary}>
          <Text style={s.btnPrimaryText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ------------ Settings ------------

type Me = {
  displayName: string;
  bio: string;
  website?: string | null;
  theme: string;
  locale: string;
  notifyPush: boolean;
  role?: string;
};

function SettingsScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList) => void };
}) {
  const { colors: c, setTheme: applyTheme } = useThemeColors();
  const { setLocale, t } = useLocale();
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setStatus(t("settings.signIn")));
  }, []);

  async function save() {
    if (!me) return;
    const updated = await apiFetch<Me>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        displayName: me.displayName,
        bio: me.bio,
        website: me.website ?? "",
        theme: me.theme,
        locale: me.locale,
        notifyPush: me.notifyPush,
      }),
    });
    setMe(updated);
    await AsyncStorage.setItem("kino_theme", updated.theme);
    if (updated.theme === "light" || updated.theme === "dark") {
      await applyTheme(updated.theme);
    }
    if (updated.locale === "fr" || updated.locale === "en") {
      await setLocale(updated.locale);
    }
    setStatus(t("common.save"));
  }

  async function logout() {
    await unregisterPushNotifications();
    await logoutSession();
    setMe(null);
    setStatus("Deconnexion effectuee.");
    navigation.navigate("Home");
  }

  async function exportJson() {
    try {
      const data = await apiFetch("/users/export");
      const text = JSON.stringify(data);
      setStatus(`Export RGPD pret (${text.length} caracteres)`);
    } catch {
      setStatus("Export impossible");
    }
  }

  async function deleteAccount() {
    Alert.alert(
      "Supprimer le compte",
      "Cette action supprime definitivement votre compte Kino.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch("/users/me", { method: "DELETE" });
              await clearTokens();
              setMe(null);
              setStatus("Compte supprimé.");
              navigation.navigate("Home");
            } catch {
              setStatus("Suppression impossible");
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.ink }]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <Eyebrow>{t("common.yourAccount").toUpperCase()}</Eyebrow>
        <H1>{me ? t("common.hello", { name: me.displayName }) : t("settings.title")}</H1>
        {status && <Text style={[s.sub, { marginBottom: 8 }]}>{status}</Text>}
        {me && (
          <>
            <Label>Pseudo</Label>
            <TextInput
              style={s.input}
              placeholder="Display name"
              placeholderTextColor={colors.muted}
              value={me.displayName}
              onChangeText={(v) => setMe({ ...me, displayName: v })}
            />
            <Label>Bio</Label>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Bio"
              placeholderTextColor={colors.muted}
              value={me.bio ?? ""}
              onChangeText={(v) => setMe({ ...me, bio: v })}
              multiline
            />
            <Label>Site web</Label>
            <TextInput
              style={s.input}
              placeholder="Website"
              placeholderTextColor={colors.muted}
              value={me.website ?? ""}
              onChangeText={(v) => setMe({ ...me, website: v })}
            />
            <Label>{t("settings.theme")}</Label>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <Chip
                label={t("settings.themeDark")}
                active={me.theme === "dark"}
                onPress={() => setMe({ ...me, theme: "dark" })}
              />
              <Chip
                label={t("settings.themeLight")}
                active={me.theme === "light"}
                onPress={() => setMe({ ...me, theme: "light" })}
              />
            </View>
            <Label>{t("settings.language")}</Label>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <Chip
                label={t("settings.langFr")}
                active={me.locale === "fr"}
                onPress={() => setMe({ ...me, locale: "fr" })}
              />
              <Chip
                label={t("settings.langEn")}
                active={me.locale === "en"}
                onPress={() => setMe({ ...me, locale: "en" })}
              />
            </View>
            <Label>{t("settings.notifyPush")}</Label>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Switch
                value={me.notifyPush}
                onValueChange={(v) => setMe({ ...me, notifyPush: v })}
                trackColor={{ true: colors.kino }}
              />
              <Text style={s.sub}>Alertes instantanees dans l'app</Text>
            </View>
            {me.role === "ADMIN" && (
              <>
                <View style={{ height: 8 }} />
                <PrimaryButton
                  label={t("admin.panel")}
                  onPress={() =>
                    (navigation as { navigate: (n: string) => void }).navigate(
                      "Admin",
                    )
                  }
                />
              </>
            )}
            <PrimaryButton label={t("common.save")} onPress={save} />
            <View style={{ height: 8 }} />
            <GhostButton label="Export RGPD (JSON)" onPress={exportJson} />
            <View style={{ height: 8 }} />
            <GhostButton label={t("settings.deleteAccount")} onPress={deleteAccount} />
            <View style={{ height: 8 }} />
            <GhostButton label={t("nav.logout")} onPress={logout} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------ Notifications ------------

type Notif = { id: string; type: string; read: boolean; createdAt: string };

const notificationLabels: Record<string, string> = {
  NEW_FOLLOWER: "Nouvel abonne",
  REVIEW_LIKED: "Nouvelle mention J'aime",
  REVIEW_COMMENT: "Nouveau commentaire",
  NEW_MESSAGE: "Nouveau message",
  RECOMMENDATION: "Nouvelle recommandation",
};

function NotificationsScreen() {
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
          <Chip label="Actualiser" onPress={load} />
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
            onPress={() => readOne(item.id)}
            style={[s.card, item.read ? null : { borderColor: colors.kino }]}
          >
            <Text
              style={{
                color: item.read ? colors.muted : colors.text,
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

// ------------ Root App ------------

function AppNavigator() {
  const navTheme = useNavTheme();
  const { theme, colors: c } = useThemeColors();
  const { t } = useLocale();
  useEffect(() => {
    apiFetch("/users/me")
      .then(() => registerPushNotifications())
      .catch(() => undefined);
  }, []);
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: c.ink },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: c.ink },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Tonight"
          component={TonightScreen}
          options={{ title: t("tonight.title") }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: t("nav.login") }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: t("nav.register") }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: t("search.title") }}
        />
        <Stack.Screen
          name="Title"
          component={TitleScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ title: t("nav.feed") }}
        />
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: t("nav.library") }}
        />
        <Stack.Screen
          name="Messages"
          component={MessagesScreen}
          options={{ title: t("nav.messages") }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: t("notifications.alerts") }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t("nav.settings") }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: t("profile.member") }}
        />
        <Stack.Screen
          name="ListDetail"
          component={ListDetailScreen}
          options={({ route }) => ({ title: route.params.listName })}
        />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ title: "Menu" }}
        />
        <Stack.Screen
          name="Browse"
          component={BrowseScreen}
          options={({ route }) => ({
            title: route.params.type === "movie" ? "Films" : "Séries",
          })}
        />
        <Stack.Screen
          name="LibraryStatus"
          component={LibraryStatusScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: "Admin" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  adminIconBtn: {
    borderColor: colors.kino,
    backgroundColor: "rgba(255,46,126,0.12)",
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.kino,
    overflow: "hidden",
  },
  avatarImg: { width: 38, height: 38 },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { ...typography.h1, color: colors.text, marginTop: 4 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  err: { color: "#f87171", marginBottom: 8 },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionAction: { color: colors.kinoHot, fontSize: 13, fontWeight: "600" },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 10,
    backgroundColor: colors.panelSoft,
  },

  hero: {
    height: 280,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,7,16,0.55)",
  },
  heroContent: { padding: spacing.lg },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  heroScore: { color: colors.gold, fontWeight: "700", marginTop: 6 },

  engagementRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  engBadge: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  engValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  engLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2,
  },

  tonightBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "#22142c",
    borderWidth: 1,
    borderColor: "rgba(255,46,126,0.4)",
    overflow: "hidden",
  },
  tonightGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    backgroundColor: colors.kino,
    opacity: 0.2,
    borderRadius: 999,
  },
  tonightTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  tonightSub: { color: colors.muted, marginTop: 4 },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.kino,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 11 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
  },
  chipActive: {
    borderColor: colors.kino,
    backgroundColor: "rgba(255,46,126,0.2)",
  },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.text },

  btnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.kino,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnGhost: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { color: colors.text, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  swipeCard: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,7,16,0.4)",
  },
  swipeBadge: {
    position: "absolute",
    top: 30,
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: "-8deg" }],
  },
  swipeBadgeText: { fontSize: 22, fontWeight: "800", letterSpacing: 2 },

  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  miniChipText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  emptyCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelSoft,
  },

  tonightActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingVertical: spacing.lg,
  },
  roundBtn: {
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
  },

  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.panel,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeContextProvider>
        <LocaleProvider>
          <AppNavigator />
        </LocaleProvider>
      </ThemeContextProvider>
    </SafeAreaProvider>
  );
}
