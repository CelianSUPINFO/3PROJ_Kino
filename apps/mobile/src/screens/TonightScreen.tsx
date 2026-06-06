import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, ImageBackground, PanResponder, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiFetch } from "../api";
import { Chip, Eyebrow, H1, PrimaryButton, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
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

export function TonightScreen({
  navigation,
}: {
  navigation: {
    navigate: (name: "Title", params: RootStackParamList["Title"]) => void;
  };
}) {
  const { locale } = useLocale();
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
    [index, items.length],
  );

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Eyebrow>{locale === "fr" ? "CE SOIR ?" : "TONIGHT?"}</Eyebrow>
        <H1>{locale === "fr" ? "À garder ou passer" : "Smash or Pass"}</H1>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Chip
            label={locale === "fr" ? "Films" : "Movies"}
            active={type === "movie"}
            onPress={() => setType("movie")}
          />
          <Chip
            label={locale === "fr" ? "Séries" : "TV shows"}
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
            <Text style={s.h1}>{locale === "fr" ? "Vous avez tout parcouru" : "You're all caught up"}</Text>
            <Text style={s.sub}>
              {locale === "fr" ? "Changez de catégorie ou actualisez les suggestions." : "Switch category or refresh to see fresh picks."}
            </Text>
            <View style={{ height: 12 }} />
            <PrimaryButton label={locale === "fr" ? "Actualiser" : "Refresh picks"} onPress={load} />
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
              {locale === "fr" ? "Détails" : "Details"} →
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


