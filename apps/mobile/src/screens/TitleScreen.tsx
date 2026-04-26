import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../api";
import { FormattedText } from "../components/FormattedText";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Title">;

type Review = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  userId: string;
  user: { id: string; displayName: string };
  _count?: { likes: number; comments: number };
};

type Comment = {
  id: string;
  body: string;
  user: { displayName: string };
};

type ListRow = { id: string; name: string };

export function TitleScreen({ route, navigation }: Props) {
  const { type, id, title } = route.params;
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({});
  const [showReport, setShowReport] = useState<Record<string, boolean>>({});

  const mediaType = type === "tv" ? "TV" : "MOVIE";

  async function loadReviews() {
    const rows = await apiFetch<Review[]>(`/reviews/work/${type}/${id}`, {
      auth: false,
    });
    setReviews(rows);
  }

  useEffect(() => {
    apiFetch<{ data: Record<string, unknown> }>(`/media/${type}/${id}`, {
      auth: false,
    })
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null));
    loadReviews().catch(() => setReviews([]));
    apiFetch<ListRow[]>("/library/lists/mine")
      .then(setLists)
      .catch(() => setLists([]));
    apiFetch<{ id: string }>("/users/me")
      .then((u) => setMeId(u.id))
      .catch(() => setMeId(null));
  }, [type, id]);

  const myReview = meId ? reviews.find((r) => r.userId === meId) : undefined;

  useEffect(() => {
    if (myReview) {
      setBody(myReview.body);
      setRating(myReview.rating);
      setSpoiler(myReview.spoiler);
    }
  }, [myReview?.id]);

  async function setStatus(
    status: "WATCHLIST" | "IN_PROGRESS" | "COMPLETED" | "DROPPED",
  ) {
    try {
      await apiFetch("/library/status", {
        method: "POST",
        body: JSON.stringify({ tmdbId: id, mediaType, status }),
      });
      setMsg(`Statut : ${status}`);
    } catch {
      setMsg("Connexion requise.");
    }
  }

  async function publish() {
    try {
      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: id,
          mediaType,
          rating,
          body,
          spoiler,
        }),
      });
      setMsg(myReview ? "Critique mise à jour." : "Critique publiée.");
      await loadReviews();
    } catch {
      setMsg("Impossible de publier.");
    }
  }

  async function deleteMine() {
    if (!myReview) return;
    await apiFetch(`/reviews/${myReview.id}`, { method: "DELETE" });
    setBody("");
    setMsg("Critique supprimée.");
    await loadReviews();
  }

  async function toggleLike(reviewId: string) {
    try {
      await apiFetch(`/reviews/${reviewId}/like`, { method: "POST" });
      await loadReviews();
    } catch {
      setMsg("Connexion requise pour aimer.");
    }
  }

  async function loadCommentsFor(reviewId: string) {
    const rows = await apiFetch<Comment[]>(`/reviews/${reviewId}/comments`, {
      auth: false,
    });
    setComments((p) => ({ ...p, [reviewId]: rows }));
  }

  async function postComment(reviewId: string) {
    const text = commentDraft[reviewId]?.trim();
    if (!text) return;
    try {
      await apiFetch(`/reviews/${reviewId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setCommentDraft((p) => ({ ...p, [reviewId]: "" }));
      await loadCommentsFor(reviewId);
      await loadReviews();
    } catch {
      setMsg("Connexion requise pour commenter.");
    }
  }

  async function report(reviewId: string) {
    const reason = reportDraft[reviewId]?.trim();
    if (!reason) return;
    try {
      await apiFetch(`/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setShowReport((p) => ({ ...p, [reviewId]: false }));
      setMsg("Signalement envoyé.");
    } catch {
      setMsg("Connexion requise.");
    }
  }

  async function addToList(listId: string) {
    try {
      await apiFetch(`/library/lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify({ tmdbId: id, mediaType }),
      });
      setMsg("Ajouté à la liste.");
    } catch {
      setMsg("Impossible d'ajouter.");
    }
  }

  const backdrop = detail?.backdrop_path as string | undefined;
  const poster = detail?.poster_path as string | undefined;
  const overview = (detail?.overview as string) ?? "";

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: 180, backgroundColor: colors.panel }}>
          {backdrop && (
            <ImageBackground
              source={{ uri: `https://image.tmdb.org/t/p/w780${backdrop}` }}
              style={{ flex: 1 }}
            >
              <View style={s.overlay} />
            </ImageBackground>
          )}
        </View>
        <View style={{ padding: spacing.lg }}>
          <Text style={s.eyebrow}>{type === "tv" ? "SÉRIE" : "FILM"}</Text>
          <Text style={s.h1}>{title}</Text>
          {overview ? <Text style={s.sub}>{overview}</Text> : null}
          <View style={s.actions}>
            {(
              [
                ["WATCHLIST", "À voir"],
                ["IN_PROGRESS", "En cours"],
                ["COMPLETED", "Terminé"],
                ["DROPPED", "Abandonné"],
              ] as const
            ).map(([st, label]) => (
              <Pressable key={st} style={s.chip} onPress={() => setStatus(st)}>
                <Text style={s.chipText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {lists.length > 0 && (
            <>
              <Text style={s.section}>Ajouter à une liste</Text>
              <View style={s.actions}>
                {lists.map((l) => (
                  <Pressable key={l.id} style={s.chip} onPress={() => addToList(l.id)}>
                    <Text style={s.chipText}>+ {l.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <Text style={s.section}>Votre critique</Text>
          <Text style={s.hint}>
            Formatage : **gras**, *italique*. Saut de ligne supporté.
          </Text>
          <View style={{ flexDirection: "row", gap: 4, marginVertical: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text style={{ fontSize: 26, color: n <= rating ? colors.gold : colors.muted }}>
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={s.input}
            multiline
            placeholder="Votre avis..."
            placeholderTextColor={colors.muted}
            value={body}
            onChangeText={setBody}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}>
            <Switch value={spoiler} onValueChange={setSpoiler} trackColor={{ true: colors.kino }} />
            <Text style={s.sub}>Contient des spoilers</Text>
          </View>
          <Pressable style={s.btn} onPress={publish}>
            <Text style={s.btnText}>{myReview ? "Mettre à jour" : "Publier"}</Text>
          </Pressable>
          {myReview && (
            <Pressable style={[s.btn, s.btnDanger]} onPress={deleteMine}>
              <Text style={s.btnText}>Supprimer ma critique</Text>
            </Pressable>
          )}
          {msg && <Text style={s.msg}>{msg}</Text>}
          <Text style={[s.section, { marginTop: spacing.lg }]}>Communauté</Text>
          {reviews.map((r) => (
            <View key={r.id} style={s.card}>
              <Pressable
                onPress={() => navigation.navigate("Profile", { userId: r.user.id })}
              >
                <Text style={s.author}>
                  {r.user.displayName} · {r.rating}/5
                </Text>
              </Pressable>
              <FormattedText text={r.body} style={s.body} spoiler={r.spoiler} />
              <View style={s.actions}>
                <Pressable style={s.chip} onPress={() => toggleLike(r.id)}>
                  <Text style={s.chipText}>J'aime ({r._count?.likes ?? 0})</Text>
                </Pressable>
                <Pressable style={s.chip} onPress={() => loadCommentsFor(r.id)}>
                  <Text style={s.chipText}>
                    Commentaires ({r._count?.comments ?? 0})
                  </Text>
                </Pressable>
                {meId && r.userId !== meId && (
                  <Pressable
                    style={s.chip}
                    onPress={() =>
                      setShowReport((p) => ({ ...p, [r.id]: !p[r.id] }))
                    }
                  >
                    <Text style={s.chipText}>Signaler</Text>
                  </Pressable>
                )}
              </View>
              {showReport[r.id] && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    style={s.input}
                    placeholder="Raison du signalement"
                    placeholderTextColor={colors.muted}
                    value={reportDraft[r.id] ?? ""}
                    onChangeText={(t) =>
                      setReportDraft((p) => ({ ...p, [r.id]: t }))
                    }
                  />
                  <Pressable style={s.btn} onPress={() => report(r.id)}>
                    <Text style={s.btnText}>Envoyer</Text>
                  </Pressable>
                </View>
              )}
              {comments[r.id] && (
                <View style={{ marginTop: 8 }}>
                  {comments[r.id].map((c) => (
                    <Text key={c.id} style={s.sub}>
                      <Text style={{ fontWeight: "700", color: colors.text }}>
                        {c.user.displayName}:
                      </Text>{" "}
                      {c.body}
                    </Text>
                  ))}
                  <TextInput
                    style={[s.input, { marginTop: 8 }]}
                    placeholder="Commenter..."
                    placeholderTextColor={colors.muted}
                    value={commentDraft[r.id] ?? ""}
                    onChangeText={(t) =>
                      setCommentDraft((p) => ({ ...p, [r.id]: t }))
                    }
                  />
                  <Pressable style={s.chip} onPress={() => postComment(r.id)}>
                    <Text style={s.chipText}>Envoyer</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
          {reviews.length === 0 && (
            <Text style={s.sub}>Aucune critique pour le moment.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text },
  sub: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  section: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: spacing.md,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.panel,
    minHeight: 90,
    textAlignVertical: "top",
  },
  btn: {
    backgroundColor: colors.kino,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnDanger: { backgroundColor: "#b91c1c" },
  btnText: { color: "#fff", fontWeight: "700" },
  msg: { color: colors.kinoHot, marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.panel,
  },
  author: { color: colors.text, fontWeight: "700" },
  body: { color: colors.muted, marginTop: 6, lineHeight: 20 },
});
