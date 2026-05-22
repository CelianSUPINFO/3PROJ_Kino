import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../api";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Admin">;

type ReportRow = {
  id: string;
  reason: string;
  status: string;
  reviewId: string;
  review: { body: string; userId: string };
  reporter: { displayName: string };
};

type ReviewRow = {
  id: string;
  body: string;
  featured: boolean;
  user: { displayName: string };
  rating: number;
};

type AdminStats = {
  totals: {
    users: number;
    activeUsers: number;
    reviews: number;
    reportsOpen: number;
    averageReviewsPerUser: number;
  };
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  bannedUntil?: string | null;
  _count: { reviewsWritten: number; followers: number };
};

export function AdminScreen({}: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  async function load() {
    const me = await apiFetch<{ role: string }>("/users/me");
    setRole(me.role);
    if (me.role === "ADMIN") {
      const [rep, rev, nextStats, nextUsers] = await Promise.all([
        apiFetch<ReportRow[]>("/admin/reports"),
        apiFetch<ReviewRow[]>("/admin/reviews"),
        apiFetch<AdminStats>("/admin/stats"),
        apiFetch<AdminUser[]>("/admin/users"),
      ]);
      setReports(rep);
      setReviews(rev);
      setStats(nextStats);
      setUsers(nextUsers);
    }
  }

  useEffect(() => {
    load().catch(() => setRole(null));
  }, []);

  if (role !== "ADMIN") {
    return (
      <SafeAreaView style={s.screen}>
        <Text style={s.err}>Accès administrateur requis.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={s.eyebrow}>MODÉRATION</Text>
        <Text style={s.h1}>Administration</Text>
        {msg && <Text style={s.msg}>{msg}</Text>}
        {stats && (
          <View style={s.metrics}>
            <Metric label="Utilisateurs" value={stats.totals.users} />
            <Metric label="Actifs (5 min)" value={stats.totals.activeUsers} />
            <Metric label="Critiques" value={stats.totals.reviews} />
            <Metric label="Signalements" value={stats.totals.reportsOpen} />
          </View>
        )}
        <Text style={s.section}>Signalements</Text>
        {reports.map((r) => (
          <View key={r.id} style={s.card}>
            <Text style={s.sub}>
              {r.status} · par {r.reporter.displayName}
            </Text>
            <Text style={s.body}>{r.reason}</Text>
            <Text style={s.quote}>&ldquo;{r.review.body}&rdquo;</Text>
            <View style={s.row}>
              <Pressable
                style={s.chip}
                onPress={async () => {
                  await apiFetch(`/admin/reports/${r.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "RESOLVED" }),
                  });
                  load();
                }}
              >
                <Text style={s.chipText}>Résolu</Text>
              </Pressable>
              <Pressable
                style={s.chip}
                onPress={async () => {
                  await apiFetch(`/admin/reviews/${r.reviewId}`, {
                    method: "DELETE",
                  });
                  setMsg("Critique supprimée.");
                  load();
                }}
              >
                <Text style={[s.chipText, { color: "#f87171" }]}>Supprimer</Text>
              </Pressable>
              <Pressable
                style={s.chip}
                onPress={async () => {
                  await apiFetch(`/admin/users/${r.review.userId}/ban`, {
                    method: "POST",
                    body: JSON.stringify({ until: null }),
                  });
                  setMsg("Utilisateur banni.");
                }}
              >
                <Text style={[s.chipText, { color: "#f87171" }]}>Bannir</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Text style={[s.section, { marginTop: spacing.lg }]}>Coups de cœur</Text>
        {reviews.slice(0, 20).map((rev) => (
          <View key={rev.id} style={s.card}>
            <Text style={s.sub}>
              {rev.user.displayName} · {rev.rating}/5
              {rev.featured ? " · ★ Coup de cœur" : ""}
            </Text>
            <Text style={s.body} numberOfLines={2}>
              {rev.body}
            </Text>
            <Pressable
              style={s.chip}
              onPress={async () => {
                await apiFetch(`/reviews/admin/${rev.id}/featured`, {
                  method: "POST",
                  body: JSON.stringify({ featured: !rev.featured }),
                });
                load();
              }}
            >
              <Text style={s.chipText}>
                {rev.featured ? "Retirer le coup de cœur" : "Mettre en avant"}
              </Text>
            </Pressable>
          </View>
        ))}
        <Text style={[s.section, { marginTop: spacing.lg }]}>Comptes</Text>
        {users.map((user) => (
          <View key={user.id} style={s.card}>
            <Text style={s.body}>{user.displayName}</Text>
            <Text style={s.sub}>{user.email} · {user.role} · {user._count.reviewsWritten} critiques</Text>
            <View style={s.row}>
              <Pressable style={s.chip} onPress={async () => {
                await apiFetch(`/admin/users/${user.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ role: user.role === "ADMIN" ? "USER" : "ADMIN" }),
                });
                await load();
              }}>
                <Text style={s.chipText}>{user.role === "ADMIN" ? "Retirer admin" : "Rendre admin"}</Text>
              </Pressable>
              <Pressable style={s.chip} onPress={async () => {
                await apiFetch(`/admin/users/${user.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ bannedUntil: user.bannedUntil ? null : "2099-01-01T00:00:00.000Z" }),
                });
                await load();
              }}>
                <Text style={[s.chipText, { color: "#fca5a5" }]}>{user.bannedUntil ? "Réactiver" : "Suspendre"}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.kinoHot,
  },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  section: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.panel,
  },
  sub: { color: colors.muted, fontSize: 12 },
  body: { color: colors.text, marginTop: 6 },
  quote: { color: colors.muted, fontStyle: "italic", marginTop: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: 11 },
  err: { color: "#f87171", padding: spacing.lg },
  msg: { color: colors.kinoHot, marginVertical: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  metric: { width: "48%", borderWidth: 1, borderColor: colors.border, padding: 10, backgroundColor: colors.panel },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  metricLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase" },
});

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}
