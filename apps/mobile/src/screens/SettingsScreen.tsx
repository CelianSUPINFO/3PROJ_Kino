import { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, Share, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, clearTokens, getAccessToken, getApiRoot, logoutSession } from "../api";
import { Chip, Eyebrow, GhostButton, H1, Label, PrimaryButton, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { unregisterPushNotifications } from "../pushNotifications";
const WEB_URL = "https://kino-web-ten.vercel.app";

type Me = {
  displayName: string;
  bio: string;
  website?: string | null;
  theme: string;
  locale: string;
  notifyPush: boolean;
  notifyEmail: boolean;
  role?: string;
};

export function SettingsScreen({
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
        notifyEmail: me.notifyEmail,
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
      await Share.share({
        title: "kino-export.json",
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      setStatus(t("settings.exportFailed"));
    }
  }

  async function exportCsv() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${getApiRoot()}/v1/users/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("csv export failed");
      const text = await res.text();
      await Share.share({ title: "kino-export.csv", message: text });
    } catch {
      setStatus(t("settings.exportFailed"));
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
            <Label>{t("settings.notifications")}</Label>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Switch
                value={me.notifyPush}
                onValueChange={(v) => setMe({ ...me, notifyPush: v })}
                trackColor={{ true: colors.kino }}
              />
              <Text style={[s.sub, { flex: 1 }]}>{t("settings.notifyPush")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Switch
                value={me.notifyEmail}
                onValueChange={(v) => setMe({ ...me, notifyEmail: v })}
                trackColor={{ true: colors.kino }}
              />
              <Text style={[s.sub, { flex: 1 }]}>{t("settings.notifyEmail")}</Text>
            </View>
            <View style={{ height: 12 }} />
            <PrimaryButton label={t("common.save")} onPress={save} />
            {me.role === "ADMIN" && (
              <>
                <View style={{ height: 8 }} />
                <GhostButton
                  label={t("admin.panel")}
                  onPress={() =>
                    (navigation as { navigate: (n: string) => void }).navigate(
                      "Admin",
                    )
                  }
                />
              </>
            )}
            <View style={{ height: 8 }} />
            <GhostButton label={t("settings.exportJson")} onPress={exportJson} />
            <View style={{ height: 8 }} />
            <GhostButton label={t("settings.exportCsv")} onPress={exportCsv} />
            <View style={{ height: 8 }} />
            <GhostButton label={t("nav.logout")} onPress={logout} />
            <View style={{ height: 18 }} />
            <Label>{t("settings.legal").toUpperCase()}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <Chip label={t("settings.legal")} onPress={() => Linking.openURL(`${WEB_URL}/legal`)} />
              <Chip label={t("settings.privacyPolicy")} onPress={() => Linking.openURL(`${WEB_URL}/privacy`)} />
              <Chip label={t("settings.terms")} onPress={() => Linking.openURL(`${WEB_URL}/terms`)} />
            </View>
            <View style={{ height: 10 }} />
            <Text style={[s.label, { color: colors.danger }]}>ZONE SENSIBLE</Text>
            <TouchableOpacity onPress={deleteAccount} style={[s.btnGhost, { borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontWeight: "700" }}>{t("settings.deleteAccount")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


