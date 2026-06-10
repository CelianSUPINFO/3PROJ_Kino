import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import { apiFetch, setTokens } from "../api";
import { Eyebrow, H1, Label, PrimaryButton, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { registerPushNotifications } from "../pushNotifications";
import { runGoogleOAuth } from "../auth/googleOAuth";

export function LoginScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList) => void };
}) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
        await registerPushNotifications().catch(() => undefined);
        navigation.navigate("Home");
      }
    });
    return () => sub.remove();
  }, [navigation]);

  async function googleLogin() {
    setLoading(true);
    setErr(null);
    setInfo(null);
    try {
      await runGoogleOAuth(navigation);
    } catch {
      setErr(t("auth.googleFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    setInfo(null);
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
      await registerPushNotifications().catch(() => undefined);
      navigation.navigate("Home");
    } catch {
      setErr(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    setErr(null);
    setInfo(null);
    if (!email.trim()) {
      setErr(t("auth.enterEmailFirst"));
      return;
    }
    try {
      await apiFetch("/auth/password/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
        auth: false,
      });
      setInfo(t("auth.resetSent"));
    } catch {
      setErr(t("auth.resetFailed"));
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        <Eyebrow>{t("auth.welcomeBack").toUpperCase()}</Eyebrow>
        <H1>{t("auth.loginTitle")}</H1>
        <Text style={[s.sub, { marginBottom: spacing.lg }]}>
          {t("auth.loginSubtitle")}
        </Text>
        <Label>{t("common.email")}</Label>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Label>{t("common.password")}</Label>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("auth.forgotPassword")}
          onPress={requestPasswordReset}
          style={{ alignSelf: "flex-end", paddingVertical: 6 }}
        >
          <Text style={{ color: colors.kinoHot, fontSize: 13, fontWeight: "600" }}>
            {t("auth.forgotPassword")}
          </Text>
        </TouchableOpacity>
        {err && <Text style={s.err}>{err}</Text>}
        {info && <Text style={{ color: colors.gold, marginBottom: 8 }}>{info}</Text>}
        <View style={{ marginTop: 8 }}>
          {loading ? (
            <ActivityIndicator color={colors.kino} />
          ) : (
            <>
              <PrimaryButton label={t("auth.loginTitle")} onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label={t("auth.google")} onPress={googleLogin} />
            </>
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.lg }}>
          <Text style={s.sub}>{t("auth.newToKino")}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("auth.createAccount")}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={{ color: colors.kinoHot, fontSize: 13, fontWeight: "700" }}>
              {t("auth.createAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
