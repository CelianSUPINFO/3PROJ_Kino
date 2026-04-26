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
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { MOVIE_GENRES, TV_GENRES } from "../lib/genres";
import { genreLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;

export function MenuScreen({ navigation }: Props) {
  const { locale, t } = useLocale();
  const { colors } = useThemeColors();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ id: string; role?: string }>("/users/me")
      .then((me) => {
        setAuthed(true);
        setMeId(me.id);
        setIsAdmin(me.role === "ADMIN");
      })
      .catch(() => {
        setAuthed(false);
        setMeId(null);
        setIsAdmin(false);
      });
  }, []);

  function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    const open = expanded === id;
    return (
      <View style={[s.block, { borderColor: colors.border }]}>
        <Pressable
          onPress={() => setExpanded(open ? null : id)}
          style={s.blockHead}
        >
          <Text style={[s.blockTitle, { color: colors.text }]}>{label}</Text>
          <Text style={{ color: colors.muted }}>{open ? "−" : "+"}</Text>
        </Pressable>
        {open && <View style={s.blockBody}>{children}</View>}
      </View>
    );
  }

  function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={s.linkRow}>
        <Text style={{ color: colors.kinoHot, fontWeight: "600" }}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.ink }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={[s.h1, { color: colors.text }]}>kino</Text>

        <LinkRow label={t("nav.home")} onPress={() => navigation.navigate("Home")} />
        <LinkRow label={t("nav.tonight")} onPress={() => navigation.navigate("Tonight")} />

        <Section id="movies" label={t("nav.movies")}>
          {MOVIE_GENRES.map((g) => (
            <LinkRow
              key={g.slug}
              label={g.slug === "all" ? t("nav.all") : genreLabel(locale, g.slug)}
              onPress={() =>
                navigation.navigate("Browse", {
                  type: "movie",
                  genreId: g.id || undefined,
                })
              }
            />
          ))}
        </Section>

        <Section id="series" label={t("nav.series")}>
          {TV_GENRES.map((g) => (
            <LinkRow
              key={g.slug}
              label={g.slug === "all" ? t("nav.all") : genreLabel(locale, g.slug)}
              onPress={() =>
                navigation.navigate("Browse", {
                  type: "tv",
                  genreId: g.id || undefined,
                })
              }
            />
          ))}
        </Section>

        <Section id="me" label={t("nav.me")}>
          <LinkRow
            label={t("nav.feed")}
            onPress={() => navigation.navigate(authed ? "Feed" : "Login")}
          />
          <LinkRow
            label={t("nav.library")}
            onPress={() => navigation.navigate(authed ? "Library" : "Login")}
          />
          <LinkRow
            label={t("nav.notifications")}
            onPress={() => navigation.navigate(authed ? "Notifications" : "Login")}
          />
          <LinkRow
            label={t("nav.messages")}
            onPress={() => navigation.navigate(authed ? "Messages" : "Login")}
          />
          {meId && (
            <LinkRow
              label={t("profile.edit")}
              onPress={() => navigation.navigate("Profile", { userId: meId })}
            />
          )}
        </Section>

        <LinkRow label={t("nav.search")} onPress={() => navigation.navigate("Search")} />
        <LinkRow
          label={t("nav.settings")}
          onPress={() => navigation.navigate(authed ? "Settings" : "Login")}
        />
        {isAdmin && (
          <LinkRow label={t("nav.admin")} onPress={() => navigation.navigate("Admin")} />
        )}
        {!authed && (
          <>
            <LinkRow label={t("nav.login")} onPress={() => navigation.navigate("Login")} />
            <LinkRow label={t("nav.register")} onPress={() => navigation.navigate("Register")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  h1: { fontSize: 28, fontWeight: "800", marginBottom: spacing.lg },
  block: { marginTop: spacing.sm, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  blockTitle: { fontSize: 16, fontWeight: "700" },
  blockBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  linkRow: { paddingVertical: 10 },
});
