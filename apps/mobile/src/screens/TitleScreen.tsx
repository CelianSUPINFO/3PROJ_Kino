import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
import { UserAvatar } from "../components/UserAvatar";
import { useLocale } from "../context/LocaleContext";
import { statusLabel } from "../lib/i18n";
import { useThemeColors } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Title">;

type Review = {
  id: string;
  rating: number;
  body: string;
  spoiler: boolean;
  featured?: boolean;
  userId: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
  _count?: { likes: number; comments: number };
};

type Comment = {
  id: string;
  body: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
  replies: Comment[];
};

type ListRow = { id: string; name: string };

const STATUS_COLORS = {
  WATCHLIST: { borderColor: "#38bdf8", backgroundColor: "rgba(56,189,248,0.16)", color: "#bae6fd" },
  IN_PROGRESS: { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.16)", color: "#fde68a" },
  COMPLETED: { borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.16)", color: "#a7f3d0" },
  DROPPED: { borderColor: "#fb7185", backgroundColor: "rgba(251,113,133,0.16)", color: "#fecdd3" },
} as const;

export function TitleScreen({ route, navigation }: Props) {
  const { colors } = useThemeColors();
  const { locale, t } = useLocale();
  const s = makeStyles(colors);
  const { type, id, title } = route.params;
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({});
  const [showReport, setShowReport] = useState<Record<string, boolean>>({});
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const mediaType = type === "tv" ? "TV" : "MOVIE";

  async function loadReviews() {
    const rows = await apiFetch<Review[]>(`/reviews/work/${type}/${id}`, {
      auth: false,
    });
    setReviews(rows);
  }

  useEffect(() => {
    apiFetch<{ data: Record<string, unknown> }>(`/media/${type}/${id}?language=${locale === "fr" ? "fr-FR" : "en-US"}`, {
      auth: false,
    })
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null));
    loadReviews().catch(() => setReviews([]));
    apiFetch<ListRow[]>("/library/lists/mine")
      .then(setLists)
      .catch(() => setLists([]));
    apiFetch<{ id: string; role: string }>("/users/me")
      .then((u) => {
        setMeId(u.id);
        setMeRole(u.role);
      })
      .catch(() => {
        setMeId(null);
        setMeRole(null);
      });
    apiFetch<{ tmdbId: number; mediaType: string; status: string }[]>("/library/me")
      .then((rows) => setSelectedStatus(rows.find((row) => row.tmdbId === id && row.mediaType === mediaType)?.status ?? null))
      .catch(() => setSelectedStatus(null));
  }, [type, id, locale]);

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
      setSelectedStatus(status);
      setMsg("Bibliothèque mise à jour.");
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

  async function postComment(reviewId: string, parentId?: string) {
    const inputKey = parentId ?? reviewId;
    const text = commentDraft[inputKey]?.trim();
    if (!text) return;
    try {
      await apiFetch(`/reviews/${reviewId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text, parentId }),
      });
      setCommentDraft((p) => ({ ...p, [inputKey]: "" }));
      await loadCommentsFor(reviewId);
      await loadReviews();
    } catch {
      setMsg("Connexion requise pour commenter.");
    }
  }

  async function deleteComment(reviewId: string, commentId: string) {
    try {
      await apiFetch(`/reviews/comments/${commentId}`, { method: "DELETE" });
      await Promise.all([loadCommentsFor(reviewId), loadReviews()]);
      setMsg("Commentaire supprimé.");
    } catch {
      setMsg("Impossible de supprimer ce commentaire.");
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
  const releaseDate = ((detail?.release_date ?? detail?.first_air_date) as string | undefined) ?? "";
  const runtime = (detail?.runtime as number | undefined) ?? ((detail?.episode_run_time as number[] | undefined)?.[0]);
  const genres = ((detail?.genres as { name: string }[] | undefined) ?? []).map((genre) => genre.name);
  const cast = (((detail?.credits as { cast?: { name: string }[] } | undefined)?.cast) ?? []).slice(0, 8);
  const crew = ((detail?.credits as { crew?: { id: number; name: string; job?: string }[] } | undefined)?.crew) ?? [];
  const directors = crew.filter((person) => person.job === "Director");
  const writers = crew.filter((person) => ["Screenplay", "Writer", "Story"].includes(person.job ?? "")).filter((person, index, rows) => rows.findIndex((row) => row.id === person.id) === index).slice(0, 4);
  const creators = ((detail?.created_by as { name: string }[] | undefined) ?? []).slice(0, 4);
  const countries = ((detail?.production_countries as { name: string }[] | undefined) ?? []).map((country) => country.name);
  const tagline = detail?.tagline as string | undefined;
  const status = detail?.status as string | undefined;
  const seasons = detail?.number_of_seasons as number | undefined;
  const episodes = detail?.number_of_episodes as number | undefined;
  const voteAverage = detail?.vote_average as number | undefined;
  const voteCount = detail?.vote_count as number | undefined;
  const kinoAverage =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: 220, backgroundColor: colors.panel }}>
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
          <View style={s.meta}>
            {releaseDate ? <Text style={s.metaText}>{releaseDate.slice(0, 4)}</Text> : null}
            {runtime ? <Text style={s.metaText}>{runtime} min</Text> : null}
            {genres.map((genre) => <Text key={genre} style={s.metaText}>{genre}</Text>)}
          </View>
          {tagline ? <Text style={s.tagline}>"{tagline}"</Text> : null}
          {overview ? <Text style={s.sub}>{overview}</Text> : null}
          <Text style={s.section}>Informations</Text>
          <View style={s.facts}>
            {(type === "tv" ? creators : directors).length > 0 && <Fact styles={s} label={type === "tv" ? "Création" : "Réalisation"} value={(type === "tv" ? creators : directors).map((person) => person.name).join(", ")} />}
            {writers.length > 0 && <Fact styles={s} label="Scénario" value={writers.map((person) => person.name).join(", ")} />}
            {releaseDate ? <Fact styles={s} label="Sortie" value={releaseDate} /> : null}
            {countries.length > 0 && <Fact styles={s} label="Pays" value={countries.join(", ")} />}
            {status ? <Fact styles={s} label="Statut" value={status} /> : null}
            {seasons ? <Fact styles={s} label="Saisons" value={String(seasons)} /> : null}
            {episodes ? <Fact styles={s} label="Épisodes" value={String(episodes)} /> : null}
            {voteAverage ? <Fact styles={s} label="Note TMDB" value={`${voteAverage.toFixed(1)}/10 · ${voteCount ?? 0} votes`} /> : null}
            <Fact
              styles={s}
              label={t("title.kinoAverage")}
              value={
                kinoAverage !== null
                  ? `★ ${kinoAverage.toFixed(1)}/5 · ${reviews.length}`
                  : t("title.noKinoRatings")
              }
            />
          </View>
          {cast.length > 0 && (
            <>
              <Text style={s.section}>Distribution</Text>
              <Text style={s.sub}>{cast.map((person) => person.name).join(" · ")}</Text>
            </>
          )}
          <View style={s.actions}>
            {(
              [
                ["WATCHLIST", "À voir"],
                ["IN_PROGRESS", "En cours"],
                ["COMPLETED", "Terminé"],
                ["DROPPED", "Abandonné"],
              ] as const
            ).map(([st, label]) => (
              <Pressable key={st} style={[s.chip, STATUS_COLORS[st], selectedStatus === st && s.chipActive]} onPress={() => setStatus(st)}>
                <Text style={[s.chipText, { color: STATUS_COLORS[st].color }, selectedStatus === st && s.chipActiveText]}>{statusLabel(locale, st === "WATCHLIST" ? "TO_WATCH" : st)}</Text>
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
          <Pressable style={[s.btn, !body.trim() && { opacity: 0.5 }]} disabled={!body.trim()} onPress={publish}>
            <Text style={s.btnText}>{myReview ? "Mettre à jour" : "Publier"}</Text>
          </Pressable>
          {myReview && (
            <Pressable style={[s.btn, s.btnDanger]} onPress={deleteMine}>
              <Text style={s.btnText}>Supprimer ma critique</Text>
            </Pressable>
          )}
          {msg && <Text style={s.msg}>{msg}</Text>}
          <Text style={[s.section, { marginTop: spacing.lg }]}>
            Communauté
            {kinoAverage !== null ? ` · ★ ${kinoAverage.toFixed(1)}/5` : ""}
          </Text>
          {reviews.map((r) => (
            <View key={r.id} style={s.card}>
              <Pressable
                onPress={() => navigation.navigate("Profile", { userId: r.user.id })}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <UserAvatar name={r.user.displayName} avatarUrl={r.user.avatarUrl} size={28} />
                <Text style={[s.author, { flex: 1 }]}>
                  {r.user.displayName} · {r.rating}/5
                  {r.featured ? (
                    <Text style={{ color: colors.gold }}> {t("admin.featuredBadge")}</Text>
                  ) : null}
                </Text>
              </Pressable>
              {r.spoiler && !revealedSpoilers[r.id] ? (
                <Pressable
                  style={[s.chip, { alignSelf: "flex-start", marginTop: 8, borderColor: colors.gold }]}
                  onPress={() => setRevealedSpoilers((p) => ({ ...p, [r.id]: true }))}
                >
                  <Text style={[s.chipText, { color: colors.gold }]}>
                    ⚠ {t("review.spoiler")} · {t("review.showSpoiler")}
                  </Text>
                </Pressable>
              ) : (
                <>
                  {r.spoiler && (
                    <Pressable
                      style={{ alignSelf: "flex-start", marginTop: 6 }}
                      onPress={() => setRevealedSpoilers((p) => ({ ...p, [r.id]: false }))}
                    >
                      <Text style={{ color: colors.gold, fontSize: 11 }}>
                        {t("review.hideSpoiler")}
                      </Text>
                    </Pressable>
                  )}
                  <FormattedText text={r.body} style={s.body} />
                </>
              )}
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
                    <CommentThread
                      key={c.id}
                      comment={c}
                      reviewId={r.id}
                      meId={meId}
                      meRole={meRole}
                      drafts={commentDraft}
                      setDrafts={setCommentDraft}
                      onReply={postComment}
                      onDelete={deleteComment}
                      styles={s}
                      colors={colors}
                    />
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

const makeStyles = (colors: ReturnType<typeof useThemeColors>["colors"]) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text },
  tagline: { color: colors.kinoHot, fontStyle: "italic", fontSize: 16, lineHeight: 22, marginTop: 12 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metaText: { color: colors.text, backgroundColor: colors.panel, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { flexBasis: "47%", flexGrow: 1, minWidth: 140, backgroundColor: colors.panel, borderRadius: radius.md, padding: 10 },
  factLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  factValue: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 4 },
  sub: { color: colors.muted, lineHeight: 20, marginTop: 8 },
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
  chipActive: { borderColor: colors.kino, backgroundColor: "rgba(255,46,126,0.18)" },
  chipActiveText: { color: colors.kinoHot, fontWeight: "700" },
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
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  commentThread: { marginTop: 8 },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  replies: { marginLeft: 14, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.kino },
  deleteComment: { color: "#fca5a5", fontSize: 11, marginTop: 8 },
});

function Fact({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function CommentThread({
  comment,
  reviewId,
  meId,
  meRole,
  drafts,
  setDrafts,
  onReply,
  onDelete,
  styles,
  colors,
}: {
  comment: Comment;
  reviewId: string;
  meId: string | null;
  meRole: string | null;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  onReply: (reviewId: string, parentId?: string) => Promise<void>;
  onDelete: (reviewId: string, commentId: string) => Promise<void>;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useThemeColors>["colors"];
}) {
  return (
    <View style={styles.commentThread}>
      <View style={styles.commentRow}>
        <UserAvatar
          name={comment.user.displayName}
          avatarUrl={comment.user.avatarUrl}
          size={22}
        />
        <Text style={[styles.sub, { flex: 1, marginTop: 0 }]}>
          <Text style={{ fontWeight: "700", color: colors.text }}>
            {comment.user.displayName}:
          </Text>{" "}
          {comment.body}
        </Text>
        {(meId === comment.user.id || meRole === "ADMIN") && (
          <Pressable onPress={() => onDelete(reviewId, comment.id)}>
            <Text style={styles.deleteComment}>Supprimer</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.replyRow}>
        <TextInput
          style={[styles.replyInput, { borderColor: colors.border, color: colors.text }]}
          placeholder="Répondre..."
          placeholderTextColor={colors.muted}
          value={drafts[comment.id] ?? ""}
          onChangeText={(text) =>
            setDrafts((previous) => ({ ...previous, [comment.id]: text }))
          }
        />
        <Pressable style={styles.chip} onPress={() => onReply(reviewId, comment.id)}>
          <Text style={styles.chipText}>Envoyer</Text>
        </Pressable>
      </View>
      {comment.replies.length > 0 && (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              reviewId={reviewId}
              meId={meId}
              meRole={meRole}
              drafts={drafts}
              setDrafts={setDrafts}
              onReply={onReply}
              onDelete={onDelete}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}
