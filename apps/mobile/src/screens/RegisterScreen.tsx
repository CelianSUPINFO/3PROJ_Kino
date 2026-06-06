import { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiFetch, setTokens } from "../api";
import { Eyebrow, H1, Label, PrimaryButton, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { registerPushNotifications } from "../pushNotifications";
import { runGoogleOAuth } from "../auth/googleOAuth";

export function RegisterScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList) => void };
}) {
  const { t } = useLocale();
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
      await registerPushNotifications().catch(() => undefined);
      navigation.navigate("Home");
    } catch {
      setErr(t("auth.registerFailed"));
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
      setErr(t("auth.googleFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg, flex: 1 }}>
        <Eyebrow>{t("auth.registerEyebrow").toUpperCase()}</Eyebrow>
        <H1>{t("auth.registerTitle")}</H1>
        <Text style={[s.sub, { marginBottom: spacing.lg }]}>
          {t("auth.registerPasswordHint")}
        </Text>
        <Label>{t("auth.displayName")}</Label>
        <TextInput
          placeholder={t("auth.displayName")}
          placeholderTextColor={colors.muted}
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
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
              <PrimaryButton label={t("auth.createAccount")} onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label={t("auth.google")} onPress={googleSignup} />
            </>
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.lg }}>
          <Text style={s.sub}>{t("auth.hasAccount")}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("auth.signInLink")}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={{ color: colors.kinoHot, fontSize: 13, fontWeight: "700" }}>
              {t("auth.signInLink")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
