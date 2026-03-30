import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch, clearTokens, setTokens } from "./src/api";
import { PosterCard, type PosterItem } from "./src/components/PosterCard";
import { colors, radius, spacing, typography } from "./src/theme";

type SearchResult = PosterItem;

type StackParamList = {
  Home: undefined;
  Tonight: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  Title: { type: "movie" | "tv"; id: number; title: string };
  Feed: undefined;
  Library: undefined;
  Messages: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.ink,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    primary: colors.kino,
    notification: colors.kinoHot,
  },
};

// ------------ Shared UI atoms ------------

function Logo() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={logoStyles.square}>
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>★</Text>
      </View>
      <Text style={logoStyles.word}>kino</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  square: {
    width: 32,
    height: 32,
    backgroundColor: colors.kino,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  word: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
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
      <Text style={[s.chipText, active ? s.chipTextActive : null]}>{label}</Text>
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

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
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
    user: { displayName: string };
  }[];
  recentWatched?: { tmdbId: number; mediaType: "MOVIE" | "TV"; status: string }[];
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
  navigation: { navigate: (name: keyof StackParamList, params?: object) => void };
}) {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [engagement, setEngagement] = useState<EngagementPayload | null>(null);
  const [authed, setAuthed] = useState(false);

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
      const e = await apiFetch<EngagementPayload>("/engagement/summary", { auth: true });
      setEngagement(e);
      setAuthed(true);
    } catch {
      setEngagement(null);
      setAuthed(false);
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
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Logo />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Search")}
              style={s.iconBtn}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>⌕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(authed ? "Notifications" : "Login")}
              style={s.iconBtn}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>
                {authed ? "!" : "→"}
              </Text>
            </TouchableOpacity>
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
                  <Eyebrow>À L'AFFICHE</Eyebrow>
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
                      label="Détails"
                      onPress={() =>
                        openTitle(
                          featured,
                          featured.media_type === "tv" ? "tv" : "movie",
                        )
                      }
                    />
                    <GhostButton
                      label="Ce soir ?"
                      onPress={() => navigation.navigate("Tonight")}
                    />
                  </View>
                </View>
              </ImageBackground>
            ) : (
              <View style={s.heroContent}>
                <Eyebrow>FEATURED TONIGHT</Eyebrow>
                <Text style={s.heroTitle}>{featured.title ?? featured.name}</Text>
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
              <Text style={s.engLabel}>day streak</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: colors.kino }]}>
              <Text style={s.engValue}>
                {engagement.weekly.reviews}/{engagement.weekly.targetReviews}
              </Text>
              <Text style={s.engLabel}>reviews</Text>
            </View>
            <View style={[s.engBadge, { backgroundColor: "#6b5bff" }]}>
              <Text style={s.engValue}>
                {engagement.weekly.completed}/{engagement.weekly.targetCompleted}
              </Text>
              <Text style={s.engLabel}>completed</Text>
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
          <Eyebrow>NOT SURE WHAT TO WATCH?</Eyebrow>
          <Text style={s.tonightTitle}>Let Kino pick your night.</Text>
          <Text style={s.tonightSub}>
            Swipe through curated picks. Smash to keep, pass to skip.
          </Text>
          <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
            <PrimaryButton
              label="Start swiping"
              onPress={() => navigation.navigate("Tonight")}
            />
          </View>
        </TouchableOpacity>

        {home?.trending?.movies && home.trending.movies.length > 0 && (
          <Section
            title="Trending movies"
            action={{ label: "Search", onPress: () => navigation.navigate("Search") }}
          >
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              data={home.trending.movies.slice(0, 14)}
              keyExtractor={(m) => `mv-${m.id}`}
              renderItem={({ item }) => (
                <PosterCard item={item} onPress={() => openTitle(item, "movie")} />
              )}
            />
          </Section>
        )}

        {home?.trending?.tv && home.trending.tv.length > 0 && (
          <Section title="Trending series">
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
          <Section key={cat.id} title={cat.label}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cat.items.slice(0, 14)}
              keyExtractor={(m) => `${cat.id}-${m.id}`}
              renderItem={({ item }) => (
                <PosterCard item={item} onPress={() => openTitle(item, cat.type)} />
              )}
            />
          </Section>
        ))}

        {home?.latestRatings && home.latestRatings.length > 0 && (
          <Section title="Latest ratings">
            <View style={s.card}>
              {home.latestRatings.slice(0, 5).map((r) => (
                <View key={r.id} style={s.ratingRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {(r.user.displayName ?? "??").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, flex: 1 }}>
                    {r.user.displayName}
                  </Text>
                  <Text style={{ color: colors.gold, fontWeight: "700" }}>
                    ★ {r.rating}/5
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Account actions */}
        <Section title="Your account">
          <View style={{ gap: 8 }}>
            {!authed && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Log in"
                    onPress={() => navigation.navigate("Login")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <GhostButton
                    label="Sign up"
                    onPress={() => navigation.navigate("Register")}
                  />
                </View>
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Feed" onPress={() => navigation.navigate("Feed")} />
              <Chip label="Library" onPress={() => navigation.navigate("Library")} />
              <Chip label="Messages" onPress={() => navigation.navigate("Messages")} />
              <Chip
                label="Notifications"
                onPress={() => navigation.navigate("Notifications")}
              />
              <Chip label="Settings" onPress={() => navigation.navigate("Settings")} />
            </View>
          </View>
        </Section>
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
    navigate: (name: "Title", params: StackParamList["Title"]) => void;
  };
}) {
  const [items, setItems] = useState<TonightResult[]>([]);
  const [index, setIndex] = useState(0);
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [status, setStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "danger" } | null>(
    null,
  );
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
            msg: saved ? "Ajouté à votre profil" : "Connectez-vous pour mémoriser ce choix",
            tone: saved ? "success" : "danger",
          }
        : { msg: saved ? "Passé, choix enregistré" : "Passé en mode invité", tone: "danger" },
    );
    setTimeout(() => setToast(null), 1400);
  }

  function resolveSwipe(direction: "right" | "left") {
    Animated.timing(pan, {
      toValue: { x: direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, y: 0 },
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
          <Chip label="TV shows" active={type === "tv"} onPress={() => setType("tv")} />
        </View>
        {status && <Text style={[s.sub, { marginTop: 8 }]}>{status}</Text>}
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
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
            <Text style={s.sub}>Switch category or refresh to see fresh picks.</Text>
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
                  { left: 20, borderColor: colors.danger, opacity: passOpacity },
                ]}
              >
                <Text style={[s.swipeBadgeText, { color: colors.danger }]}>PASS</Text>
              </Animated.View>
              <Animated.View
                style={[
                  s.swipeBadge,
                  { right: 20, borderColor: colors.success, opacity: smashOpacity },
                ]}
              >
                <Text style={[s.swipeBadgeText, { color: colors.success }]}>SMASH</Text>
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
            <Text style={{ color: colors.danger, fontSize: 24, fontWeight: "700" }}>
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
            <Text style={{ color: colors.text, fontWeight: "600" }}>Details →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.roundBtn, { backgroundColor: colors.kino, borderColor: colors.kino }]}
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
          <Text style={{ color: colors.text, fontWeight: "600" }}>{toast.msg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function TonightCard({ item, stacked }: { item: TonightResult; stacked?: boolean }) {
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {item.genreNames.slice(0, 3).map((g) => (
                  <View key={g} style={s.miniChip}>
                    <Text style={s.miniChipText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[s.h1, { fontSize: 28 }]}>{item.title}</Text>
            <Text style={{ color: colors.gold, fontWeight: "700", marginTop: 4 }}>
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
        <View style={{ flex: 1, justifyContent: "flex-end", padding: spacing.lg }}>
          <Text style={[s.h1, { fontSize: 28 }]}>{item.title}</Text>
          <Text style={{ color: colors.gold }}>★ {item.score.toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

// ------------ Auth ------------

function LoginScreen({
  navigation,
}: {
  navigation: { navigate: (name: "Home") => void };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            <PrimaryButton label="Log in" onPress={submit} />
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

  async function submit() {
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
          <PrimaryButton label="Create account" onPress={submit} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

// ------------ Search ------------

function SearchScreen({
  navigation,
}: {
  navigation: { navigate: (name: "Title", params: StackParamList["Title"]) => void };
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<"all" | "movie" | "tv">("all");
  const [year, setYear] = useState("");
  const [minVote, setMinVote] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(targetPage = 1, append = false) {
    setLoading(true);
    try {
      const path =
        !q.trim() && type !== "all"
          ? `/media/discover/${type}?page=${targetPage}${year ? `&year=${year}` : ""}${minVote ? `&minVote=${minVote}` : ""}`
          : `/media/search?q=${encodeURIComponent(q)}&page=${targetPage}${type !== "all" ? `&type=${type}` : ""}${year ? `&year=${year}` : ""}${minVote ? `&minVote=${minVote}` : ""}`;
      const data = await apiFetch<{
        results: SearchResult[];
        total_pages?: number;
      }>(path, { auth: false });
      const incoming = data.results ?? [];
      setResults((prev) => (append ? [...prev, ...incoming] : incoming));
      setPage(targetPage);
      setTotalPages(Math.max(1, data.total_pages ?? 1));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loading || page >= totalPages) return;
    await run(page + 1, true);
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Eyebrow>EXPLORE</Eyebrow>
        <H1>Search</H1>
      </View>
      <View style={{ padding: spacing.lg, gap: 10 }}>
        <TextInput
          placeholder="Movies, shows..."
          placeholderTextColor={colors.muted}
          style={s.input}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => {
            void run();
          }}
          returnKeyType="search"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Chip label="All" active={type === "all"} onPress={() => setType("all")} />
          <Chip
            label="Movies"
            active={type === "movie"}
            onPress={() => setType("movie")}
          />
          <Chip label="TV" active={type === "tv"} onPress={() => setType("tv")} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            placeholder="Year"
            placeholderTextColor={colors.muted}
            style={[s.input, { flex: 1 }]}
            keyboardType="number-pad"
            value={year}
            onChangeText={(v) => setYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
          />
          <TextInput
            placeholder="Min rating"
            placeholderTextColor={colors.muted}
            style={[s.input, { flex: 1 }]}
            keyboardType="decimal-pad"
            value={minVote}
            onChangeText={setMinVote}
          />
        </View>
        <PrimaryButton
          label="Search"
          onPress={() => {
            void run();
          }}
        />
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        data={results}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        keyExtractor={(item) => `${item.media_type}-${item.id}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.7}
        ListFooterComponent={
          loading ? <ActivityIndicator color={colors.kino} style={{ marginTop: 16 }} /> : null
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 / 2 }}>
            <PosterCard
              item={item}
              fullWidth
              onPress={() =>
                navigation.navigate("Title", {
                  type: item.media_type === "tv" ? "tv" : "movie",
                  id: item.id,
                  title: item.title ?? item.name ?? "Untitled",
                })
              }
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ------------ Title ------------

type MobileReview = {
  id: string;
  rating: number;
  body: string;
  user: { displayName: string };
  _count?: { likes: number; comments: number };
};

function TitleScreen({ route }: { route: { params: StackParamList["Title"] } }) {
  const { type, id, title } = route.params;
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reviews, setReviews] = useState<MobileReview[]>([]);

  useEffect(() => {
    apiFetch<{ data: Record<string, unknown> }>(`/media/${type}/${id}`, {
      auth: false,
    })
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null));
    apiFetch<MobileReview[]>(`/reviews/work/${type}/${id}`, { auth: false })
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [type, id]);

  async function setStatus(
    status: "WATCHLIST" | "IN_PROGRESS" | "COMPLETED" | "DROPPED",
  ) {
    try {
      await apiFetch("/library/status", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: id,
          mediaType: type === "tv" ? "TV" : "MOVIE",
          status,
        }),
      });
      setMsg(`Status: ${status.toLowerCase().replace(/_/g, " ")}`);
    } catch {
      setMsg("Sign in required");
    }
  }

  async function publish() {
    try {
      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: id,
          mediaType: type === "tv" ? "TV" : "MOVIE",
          rating,
          body,
          spoiler: false,
        }),
      });
      setMsg("Review posted");
      setBody("");
      const rows = await apiFetch<MobileReview[]>(`/reviews/work/${type}/${id}`, {
        auth: false,
      });
      setReviews(rows);
    } catch {
      setMsg("Unable to publish");
    }
  }

  const backdrop = detail?.backdrop_path as string | undefined;
  const poster = detail?.poster_path as string | undefined;
  const overview = (detail?.overview as string) ?? "";
  const voteAvg = (detail?.vote_average as number) ?? 0;

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 200, backgroundColor: colors.panel }}>
          {backdrop && (
            <ImageBackground
              source={{ uri: `https://image.tmdb.org/t/p/w780${backdrop}` }}
              resizeMode="cover"
              style={{ flex: 1 }}
            >
              <View style={s.heroOverlay} />
            </ImageBackground>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 12, padding: spacing.lg }}>
          {poster && (
            <View style={{ width: 100, aspectRatio: 2 / 3, borderRadius: radius.md, overflow: "hidden", marginTop: -60, borderWidth: 1, borderColor: colors.border }}>
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w342${poster}` }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Eyebrow>{type === "tv" ? "TV SHOW" : "MOVIE"}</Eyebrow>
            <H1>{title}</H1>
            {voteAvg > 0 && (
              <Text style={{ color: colors.gold, fontWeight: "700" }}>
                ★ {voteAvg.toFixed(1)}
              </Text>
            )}
          </View>
        </View>
        {overview ? (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.text, lineHeight: 20 }}>{overview}</Text>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={s.sectionTitle}>Quick actions</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg }}>
            <Chip label="Watchlist" onPress={() => setStatus("WATCHLIST")} />
            <Chip label="In progress" onPress={() => setStatus("IN_PROGRESS")} />
            <Chip label="Completed" onPress={() => setStatus("COMPLETED")} />
            <Chip label="Dropped" onPress={() => setStatus("DROPPED")} />
          </View>
          <Text style={s.sectionTitle}>Your review</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: spacing.md }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text
                  style={{
                    fontSize: 28,
                    color: n <= rating ? colors.gold : "rgba(255,255,255,0.2)",
                  }}
                >
                  ★
                </Text>
              </Pressable>
            ))}
            <Text style={[s.sub, { alignSelf: "center", marginLeft: 8 }]}>
              {rating}/5
            </Text>
          </View>
          <TextInput
            placeholder="Share your thoughts..."
            placeholderTextColor={colors.muted}
            style={[s.input, { height: 100, textAlignVertical: "top" }]}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <PrimaryButton label="Post review" onPress={publish} />
          {msg && <Text style={[s.sub, { marginTop: 8 }]}>{msg}</Text>}
        </View>
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Text style={s.sectionTitle}>Avis de la communauté</Text>
          {reviews.length === 0 ? (
            <Text style={s.sub}>Aucun avis pour le moment.</Text>
          ) : (
            reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={[s.card, { marginBottom: 10 }]}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {r.user.displayName} · {r.rating}/5
                </Text>
                {r.body ? (
                  <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 19 }}>
                    {r.body}
                  </Text>
                ) : null}
                <Text style={[s.sub, { fontSize: 11, marginTop: 6 }]}>
                  {r._count?.likes ?? 0} j'aime · {r._count?.comments ?? 0} commentaires
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------ Feed ------------

type Act = {
  id: string;
  type: string;
  user: { displayName: string };
  createdAt: string;
};

function FeedScreen() {
  const [items, setItems] = useState<Act[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Act[] }>("/feed")
      .then((data) => setItems(data.items))
      .catch(() => setErr("Sign in to view your feed."));
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>SOCIAL</Eyebrow>
        <H1>Activity feed</H1>
      </View>
      {err && <Text style={[s.err, { marginLeft: spacing.lg }]}>{err}</Text>}
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.sub}>
              {item.user.displayName} · {new Date(item.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>
              {item.type.toLowerCase().replace(/_/g, " ")}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ------------ Library ------------

type LibraryStatusRow = { tmdbId: number; mediaType: string; status: string };

function LibraryScreen() {
  const [rows, setRows] = useState<LibraryStatusRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<LibraryStatusRow[]>("/library/me");
      setRows(data);
      setMsg(null);
    } catch {
      setMsg("Sign in required");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>YOUR LIBRARY</Eyebrow>
        <H1>My library</H1>
      </View>
      {msg && <Text style={[s.err, { marginLeft: spacing.lg }]}>{msg}</Text>}
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        data={rows}
        keyExtractor={(r) => `${r.mediaType}-${r.tmdbId}`}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              title #{item.tmdbId}
            </Text>
            <Text style={s.sub}>
              {item.mediaType} · {item.status.toLowerCase().replace(/_/g, " ")}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ------------ Messages ------------

type Partner = { id: string; displayName: string };
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
      body: JSON.stringify({ recipientId: selectedId, body }),
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
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 8 }}
        data={partners}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Chip
            label={item.displayName}
            active={selectedId === item.id}
            onPress={() => setSelectedId(item.id)}
          />
        )}
      />
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 8 }}
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
};

function SettingsScreen({
  navigation,
}: {
  navigation: { navigate: (name: "Home") => void };
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setStatus("Sign in required"));
  }, []);

  async function save() {
    if (!me) return;
    const updated = await apiFetch<Me>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(me),
    });
    setMe(updated);
    setStatus("Profile saved");
  }

  async function logout() {
    await clearTokens();
    setMe(null);
    setStatus("Déconnexion effectuée.");
    navigation.navigate("Home");
  }

  async function exportJson() {
    try {
      const data = await apiFetch("/users/export");
      const text = JSON.stringify(data);
      setStatus(`Export ready (${text.length} chars)`);
    } catch {
      setStatus("Export failed");
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Eyebrow>VOTRE COMPTE</Eyebrow>
        <H1>{me ? `Bonjour, ${me.displayName}` : "Paramètres"}</H1>
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
            <Label>Thème</Label>
            <TextInput
              style={s.input}
              placeholder="light / dark"
              placeholderTextColor={colors.muted}
              value={me.theme}
              onChangeText={(v) => setMe({ ...me, theme: v })}
            />
            <Label>Langue</Label>
            <TextInput
              style={s.input}
              placeholder="en / fr"
              placeholderTextColor={colors.muted}
              value={me.locale}
              onChangeText={(v) => setMe({ ...me, locale: v })}
            />
            <PrimaryButton label="Enregistrer" onPress={save} />
            <View style={{ height: 8 }} />
            <GhostButton label="Export RGPD (JSON)" onPress={exportJson} />
            <View style={{ height: 8 }} />
            <GhostButton label="Déconnexion" onPress={logout} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------ Notifications ------------

type Notif = { id: string; type: string; read: boolean; createdAt: string };

function NotificationsScreen() {
  const [items, setItems] = useState<Notif[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await apiFetch<Notif[]>("/notifications");
      setItems(rows);
      setStatus(null);
    } catch {
      setStatus("Sign in required");
    }
  }

  async function readOne(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>ALERTES</Eyebrow>
        <H1>Notifications</H1>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Chip label="Actualiser" onPress={load} />
          <Chip label="Tout lire" onPress={readAll} />
        </View>
      </View>
      {status && <Text style={[s.err, { marginLeft: spacing.lg }]}>{status}</Text>}
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 8 }}
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => readOne(item.id)}
            style={[
              s.card,
              item.read ? null : { borderColor: colors.kino },
            ]}
          >
            <Text
              style={{
                color: item.read ? colors.muted : colors.text,
                fontWeight: "600",
              }}
            >
              {item.type.toLowerCase().replace(/_/g, " ")}
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

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.ink },
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
          options={{ title: "Tonight?" }}
        />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log in" }} />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Sign up" }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Explore" }} />
        <Stack.Screen
          name="Title"
          component={TitleScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen name="Feed" component={FeedScreen} options={{ title: "Feed" }} />
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: "Library" }}
        />
        <Stack.Screen
          name="Messages"
          component={MessagesScreen}
          options={{ title: "Messages" }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: "Alerts" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
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
  chipActive: { borderColor: colors.kino, backgroundColor: "rgba(255,46,126,0.2)" },
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
