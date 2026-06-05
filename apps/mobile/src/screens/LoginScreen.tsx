import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, ImageBackground, PanResponder, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, clearTokens, getApiRoot, logoutSession, setTokens } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { Chip, Eyebrow, GhostButton, H1, Label, Logo, PrimaryButton, Section, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { categoryLabel, notificationLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { registerPushNotifications, unregisterPushNotifications } from "../pushNotifications";
import { runGoogleOAuth } from "../auth/googleOAuth";
export function LoginScreen({
  navigation,
}: {
  navigation: { navigate: (name: keyof RootStackParamList) => void };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
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
    try {
      await runGoogleOAuth(navigation);
    } catch {
      setErr("Connexion Google annulee ou echouee.");
    } finally {
      setLoading(false);
    }
  }

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
      await registerPushNotifications().catch(() => undefined);
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
          placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
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
            <>
              <PrimaryButton label="Log in" onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label="Continuer avec Google" onPress={googleLogin} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

