import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

type FavoriteFilm = {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title?: string;
  posterPath?: string | null;
};

type Profile = {
  id: string;
  displayName: string;
  bio: string;
  website?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  favoriteFilms?: FavoriteFilm[];
};

type PublicUser = { id: string; displayName: string; avatarUrl?: string | null };
type ProfileReview = {
  id: string;
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title: string;
  posterPath?: string | null;
  rating: number;
  body: string;
  spoiler: boolean;
  _count: { likes: number; comments: number };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { t } = useLocale();
  const { colors } = useThemeColors();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<PublicUser[]>([]);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [pickQ, setPickQ] = useState("");
  const [pickType, setPickType] = useState<"movie" | "tv">("movie");
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [pickResults, setPickResults] = useState<
    { id: number; title?: string; name?: string; poster_path?: string; media_type?: string }[]
  >([]);

  const load = useCallback(async () => {
    try {
      const [p, fol, fing, reviewRows, me] = await Promise.all([
        apiFetch<Profile>(`/users/${userId}`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${userId}/followers`, { auth: false }),
        apiFetch<PublicUser[]>(`/users/${userId}/following`, { auth: false }),
        apiFetch<ProfileReview[]>(`/users/${userId}/reviews`, { auth: false }),
        apiFetch<{ id: string }>("/users/me").catch(() => null),
      ]);
      setProfile(p);
      setDraft(p);
      setFollowers(fol);
      setFollowing(fing);
      setReviews(reviewRows);
      setMeId(me?.id ?? null);
      setMsg(null);
    } catch {
      setProfile(null);
      setMsg(t("profile.unavailable"));
    }
  }, [userId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const path = pickQ.trim().length >= 2
        ? `/media/search?q=${encodeURIComponent(pickQ)}&page=1&type=${pickType}`
        : `/media/discover/${pickType}?page=1&sort=popularity.desc`;
      apiFetch<{ results: typeof pickResults }>(path, { auth: false })
        .then((r) => setPickResults(r.results?.slice(0, 6) ?? []))
        .catch(() => setPickResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [pickQ, pickType]);

  const isOwn = meId === profile?.id;
  const isFollowing = meId ? followers.some((u) => u.id === meId) : false;
  const favorites = profile?.favoriteFilms ?? [];
  const favoriteMovies = favorites.filter((item) => item.mediaType === "MOVIE");
  const favoriteSeries = favorites.filter((item) => item.mediaType === "TV");
  const mutualFollow = !!meId && isFollowing && following.some((user) => user.id === meId);

  async function toggleFollow() {
    if (!profile || !meId) {
      setMsg(t("nav.login"));
      return;
    }
    try {
      await apiFetch(`/users/${profile.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      await load();
      setMsg(isFollowing ? "Abonnement retiré." : "Abonnement ajouté.");
    } catch {
      setMsg(t("common.retry"));
    }
  }

  async function saveProfile() {
    if (!draft) return;
    try {
      const updated = await apiFetch<Profile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: draft.displayName,
          bio: draft.bio,
          website: draft.website ?? "",
          avatarUrl: draft.avatarUrl ?? "",
          bannerUrl: draft.bannerUrl ?? "",
          favoriteFilms: draft.favoriteFilms ?? [],
        }),
      });
      setProfile(updated);
      setDraft(updated);
      setEditing(false);
      setMsg(t("common.save"));
    } catch {
      setMsg(t("common.retry"));
    }
  }

  async function pickProfileImage(kind: "avatar" | "banner") {
    if (!draft) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMsg(t("common.retry"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: kind === "avatar" ? [1, 1] : [16, 6],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setUploading(kind);
    setMsg(null);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: `${kind}.${ext}`,
        type: mime,
      } as unknown as Blob);
      const uploaded = await apiFetch<{ url: string; user: Profile }>(
        `/users/me/images/${kind}`,
        {
          method: "POST",
          body: form,
        },
      );
      const next = { ...draft, ...uploaded.user };
      setDraft(next);
      setProfile(next);
      setMsg(t("common.save"));
    } catch {
      setMsg(t("common.retry"));
    } finally {
      setUploading(null);
    }
  }

  function addFavorite(item: (typeof pickResults)[0]) {
    if (!draft) return;
    const list = [...(draft.favoriteFilms ?? [])];
    const mediaType = pickType === "tv" ? "TV" : "MOVIE";
    if (list.filter((f) => f.mediaType === mediaType).length >= 5) return;
    if (list.some((f) => f.tmdbId === item.id && f.mediaType === mediaType)) return;
    list.push({
      tmdbId: item.id,
      mediaType,
      title: item.title ?? item.name,
      posterPath: item.poster_path ?? null,
    });
    setDraft({ ...draft, favoriteFilms: list });
    setPickQ("");
    setPickResults([]);
  }

  function removeFavorite(tmdbId: number, mediaType: FavoriteFilm["mediaType"]) {
    if (!draft) return;
    setDraft({
      ...draft,
      favoriteFilms: (draft.favoriteFilms ?? []).filter((f) => f.tmdbId !== tmdbId || f.mediaType !== mediaType),
    });
  }

  if (!profile) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
        <Text style={[s.err, { color: colors.muted }]}>{msg ?? t("common.loading")}</Text>
      </SafeAreaView>
    );
  }

  const bannerUri = profile.bannerUrl?.startsWith("http") ? profile.bannerUrl : null;
  const avatarUri = profile.avatarUrl?.startsWith("http") ? profile.avatarUrl : null;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={bannerUri ? s.bannerWrap : s.bannerWrapEmpty}>
          {bannerUri ? (
            <ImageBackground source={{ uri: bannerUri }} style={s.banner} resizeMode="cover">
              <View style={s.bannerOverlay} />
            </ImageBackground>
          ) : (
            <View style={[s.banner, { backgroundColor: colors.panel }]} />
          )}
        </View>

        <View style={s.body}>
          <View style={s.avatarRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback, { backgroundColor: colors.kino }]}>
                <Text style={s.avatarText}>{initials(profile.displayName)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[s.h1, { color: colors.text }]}>{profile.displayName}</Text>
              <Text style={[s.sub, { color: colors.muted }]}>{t("profile.member")}</Text>
            </View>
          </View>

          {profile.bio ? (
            <Text style={[s.bio, { color: colors.text }]}>{profile.bio}</Text>
          ) : null}
          {profile.website ? (
            <Text style={[s.link, { color: colors.kinoHot }]}>{profile.website}</Text>
          ) : null}

          {isOwn && !editing && (
            <Pressable
              style={[s.btn, s.actionButton, { backgroundColor: colors.kino }]}
              onPress={() => setEditing(true)}
            >
              <Text style={s.btnText}>{t("profile.edit")}</Text>
            </Pressable>
          )}
          {!isOwn && meId && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {mutualFollow && (
                <Pressable style={[s.btnGhost, s.actionButton, { borderColor: colors.border }]} onPress={() => navigation.navigate("Messages", { userId: profile.id })}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Message</Text>
                </Pressable>
              )}
              <Pressable style={[s.btn, s.actionButton, { backgroundColor: colors.kino }]} onPress={toggleFollow}>
                <Text style={s.btnText}>{isFollowing ? t("profile.unfollow") : t("profile.follow")}</Text>
              </Pressable>
            </View>
          )}
          {msg && <Text style={[s.feedback, { color: colors.muted, borderColor: colors.border }]}>{msg}</Text>}

          {editing && draft && (
            <View style={[s.editBox, { borderColor: colors.border, backgroundColor: colors.panel }]}>
              <Text style={[s.section, { color: colors.text }]}>{t("profile.edit")}</Text>
              <Field
                label={t("profile.bio")}
                value={draft.bio ?? ""}
                onChange={(v) => setDraft({ ...draft, bio: v })}
                colors={colors}
                multiline
              />
              <ImageUploadRow
                label={t("profile.avatar")}
                uri={draft.avatarUrl}
                busy={uploading === "avatar"}
                colors={colors}
                onPress={() => pickProfileImage("avatar")}
              />
              <ImageUploadRow
                label={t("profile.banner")}
                uri={draft.bannerUrl}
                busy={uploading === "banner"}
                colors={colors}
                onPress={() => pickProfileImage("banner")}
              />
              <Field
                label={t("profile.website")}
                value={draft.website ?? ""}
                onChange={(v) => setDraft({ ...draft, website: v })}
                colors={colors}
              />
              <Text style={[s.section, { color: colors.text }]}>{t("profile.favorites")}</Text>
              <Text style={[s.sub, { color: colors.muted }]}>5 films et 5 séries maximum.</Text>
              <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
                <Pressable style={pickType === "movie" ? [s.btn, { backgroundColor: colors.kino }] : [s.btnGhost, { borderColor: colors.border }]} onPress={() => setPickType("movie")}><Text style={pickType === "movie" ? s.btnText : { color: colors.text }}>Films</Text></Pressable>
                <Pressable style={pickType === "tv" ? [s.btn, { backgroundColor: colors.kino }] : [s.btnGhost, { borderColor: colors.border }]} onPress={() => setPickType("tv")}><Text style={pickType === "tv" ? s.btnText : { color: colors.text }}>Séries</Text></Pressable>
              </View>
              <TextInput
                value={pickQ}
                onChangeText={setPickQ}
                placeholder={t("profile.favoriteSearch")}
                placeholderTextColor={colors.muted}
                style={[s.input, { borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[s.sub, { color: colors.muted }]}>
                    {(draft.favoriteFilms ?? []).filter((item) => item.mediaType === (pickType === "tv" ? "TV" : "MOVIE")).length}/5
              </Text>
              {pickResults.map((item) => (
                <Pressable key={item.id} onPress={() => addFavorite(item)} style={[s.pickRow, { borderColor: colors.border }]}>
                  {item.poster_path ? (
                    <Image source={{ uri: `https://image.tmdb.org/t/p/w92${item.poster_path}` }} style={s.pickPoster} />
                  ) : null}
                  <Text style={{ color: colors.kinoHot, flex: 1 }}>{item.title ?? item.name}</Text>
                  <Text style={{ color: colors.text, fontSize: 18 }}>+</Text>
                </Pressable>
              ))}
              <FlatList
                horizontal
                data={draft.favoriteFilms ?? []}
                keyExtractor={(f) => `${f.mediaType}-${f.tmdbId}`}
                renderItem={({ item }) => (
                  <Pressable onPress={() => removeFavorite(item.tmdbId, item.mediaType)} style={s.favCard}>
                    {item.posterPath ? (
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w185${item.posterPath}` }}
                        style={s.favPoster}
                      />
                    ) : (
                      <View style={[s.favPoster, { backgroundColor: colors.border }]} />
                    )}
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, maxWidth: 72 }}>
                      {item.title}
                    </Text>
                  </Pressable>
                )}
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
                <Pressable
                  style={[s.btn, { flex: 1, backgroundColor: colors.kino }]}
                  onPress={saveProfile}
                >
                  <Text style={s.btnText}>{t("common.save")}</Text>
                </Pressable>
                <Pressable
                  style={[s.btnGhost, { flex: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setDraft(profile);
                    setEditing(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "700" }}>{t("common.cancel")}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!editing && favorites.length > 0 && (
            <>
              <Text style={[s.section, { color: colors.text }]}>Films préférés</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {favoriteMovies.map((f) => (
                  <Pressable
                    key={f.tmdbId}
                    style={s.favCard}
                    onPress={() =>
                      navigation.navigate("Title", {
                        type: f.mediaType === "TV" ? "tv" : "movie",
                        id: f.tmdbId,
                        title: f.title ?? "…",
                      })
                    }
                  >
                    {f.posterPath ? (
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w185${f.posterPath}` }}
                        style={s.favPoster}
                      />
                    ) : (
                      <View style={[s.favPoster, { backgroundColor: colors.border }]} />
                    )}
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, maxWidth: 72 }}>
                      {f.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[s.section, { color: colors.text, marginTop: spacing.lg }]}>Séries préférées</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {favoriteSeries.map((f) => (
                  <Pressable key={`TV-${f.tmdbId}`} style={s.favCard} onPress={() => navigation.navigate("Title", { type: "tv", id: f.tmdbId, title: f.title ?? "Série" })}>
                    {f.posterPath ? <Image source={{ uri: `https://image.tmdb.org/t/p/w185${f.posterPath}` }} style={s.favPoster} /> : <View style={[s.favPoster, { backgroundColor: colors.border }]} />}
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, maxWidth: 72 }}>{f.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {!editing && (
            <>
              <Text style={[s.section, { color: colors.text, marginTop: spacing.lg }]}>
                {t("profile.reviews")} ({reviews.length})
              </Text>
              {reviews.map((review) => (
                <Pressable
                  key={review.id}
                  style={[s.reviewCard, { borderColor: colors.border, backgroundColor: colors.panel }]}
                  onPress={() => navigation.navigate("Title", {
                    type: review.mediaType === "TV" ? "tv" : "movie",
                    id: review.tmdbId,
                    title: review.title,
                  })}
                >
                  {review.posterPath ? (
                    <Image source={{ uri: `https://image.tmdb.org/t/p/w185${review.posterPath}` }} style={s.reviewPoster} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{review.title}</Text>
                    <Text style={{ color: colors.gold, marginTop: 3 }}>{"★".repeat(review.rating)} {review.rating}/5</Text>
                    {review.spoiler && !revealedSpoilers.has(review.id) ? (
                      <Pressable style={[s.btnGhost, { borderColor: colors.border, marginTop: 6, alignSelf: "flex-start" }]} onPress={() => setRevealedSpoilers((current) => new Set(current).add(review.id))}>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>Spoiler</Text>
                      </Pressable>
                    ) : <Text style={{ color: colors.muted, marginTop: 5 }} numberOfLines={4}>{review.body}</Text>}
                    <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
                      {review._count.likes} J'aime · {review._count.comments} commentaires
                    </Text>
                  </View>
                </Pressable>
              ))}
              {reviews.length === 0 && <Text style={[s.sub, { color: colors.muted }]}>{t("profile.noReviews")}</Text>}
            </>
          )}

          <Text style={[s.section, { color: colors.text, marginTop: spacing.lg }]}>
            {t("profile.followers")} ({followers.length})
          </Text>
          {followers.map((u) => (
            <Pressable key={u.id} onPress={() => navigation.push("Profile", { userId: u.id })}>
              <Text style={[s.link, { color: colors.kinoHot }]}>{u.displayName}</Text>
            </Pressable>
          ))}
          <Text style={[s.section, { color: colors.text }]}>
            {t("profile.following")} ({following.length})
          </Text>
          {following.map((u) => (
            <Pressable key={u.id} onPress={() => navigation.push("Profile", { userId: u.id })}>
              <Text style={[s.link, { color: colors.kinoHot }]}>{u.displayName}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ImageUploadRow({
  label,
  uri,
  busy,
  colors,
  onPress,
}: {
  label: string;
  uri?: string | null;
  busy: boolean;
  colors: { text: string; muted: string; border: string; panel: string; kino: string };
  onPress: () => void;
}) {
  const actionLabel = label.toLowerCase().includes("banni")
    ? "Choisir une bannière"
    : "Choisir une photo";
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {uri ? (
          <Image source={{ uri }} style={s.uploadPreview} />
        ) : (
          <View style={[s.uploadPreview, { backgroundColor: colors.panel, borderColor: colors.border }]} />
        )}
        <Pressable
          onPress={onPress}
          disabled={busy}
          style={[s.uploadButton, { borderColor: colors.border, backgroundColor: colors.kino }]}
        >
          <Text style={s.btnText}>{busy ? "Envoi..." : actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: { text: string; muted: string; border: string };
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[
          s.input,
          multiline && { minHeight: 72, textAlignVertical: "top" },
          { borderColor: colors.border, color: colors.text },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  bannerWrap: { height: 140 },
  bannerWrapEmpty: { height: 72 },
  banner: { flex: 1 },
  bannerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.35)" },
  body: { padding: spacing.lg, marginTop: -36 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "#fff" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  h1: { fontSize: 24, fontWeight: "800" },
  sub: { marginTop: 4, lineHeight: 20 },
  bio: { marginTop: spacing.md, lineHeight: 22 },
  link: { marginTop: 4 },
  err: { padding: spacing.lg },
  section: { fontWeight: "700", marginTop: spacing.md, marginBottom: 8 },
  btn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  btnGhost: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  actionButton: { minWidth: 118, paddingHorizontal: 18 },
  feedback: { marginTop: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  editBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  pickRow: { paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1 },
  pickPoster: { width: 36, height: 54, borderRadius: 5 },
  favCard: { marginRight: 10, width: 72 },
  favPoster: { width: 72, height: 108, borderRadius: 8, marginBottom: 4 },
  uploadPreview: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1 },
  uploadButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  reviewCard: { flexDirection: "row", gap: 12, padding: 12, borderWidth: 1, borderRadius: radius.md, marginBottom: 10 },
  reviewPoster: { width: 64, height: 96, borderRadius: 8 },
});
