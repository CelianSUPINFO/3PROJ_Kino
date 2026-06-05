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
export function RegisterScreen({
  navigation,
}: {
  navigation: { navigate: (name: "Home") => void };
}) {
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
      setErr("Sign-up failed");
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
      setErr("Connexion Google annulee ou echouee.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg, flex: 1 }}>
        <Eyebrow>JOIN KINO</Eyebrow>
        <H1>Create your account</H1>
        <Text style={[s.sub, { marginBottom: spacing.lg }]}>
          Password: 8+ chars with upper, lower and a number.
        </Text>
        <Label>Display name</Label>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
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
              <PrimaryButton label="Create account" onPress={submit} />
              <View style={{ height: 10 }} />
              <PrimaryButton label="Continuer avec Google" onPress={googleSignup} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

