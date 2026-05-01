import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch, clearTokens, setTokens } from "./src/api";
import { PosterCard, type PosterItem } from "./src/components/PosterCard";
import { colors, radius, spacing, typography } from "./src/theme";

type StackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  Library: undefined;
};

const Stack = createNativeStackNavigator<StackParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.ink,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    primary: colors.kino,
    notification: colors.kinoHot,
  },
};

function H1({ children }: { children: string }) {
  return <Text style={s.h1}>{children}</Text>;
}

function Eyebrow({ children }: { children: string }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

function PrimaryButton({
  label,
  onPress,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "ghost";
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[tone === "primary" ? s.btnPrimary : s.btnGhost]}
    >
      <Text style={tone === "primary" ? s.btnPrimaryText : s.btnGhostText}>{label}</Text>
    </TouchableOpacity>
  );
}

function HomeScreen({ navigation }: { navigation: any }) {
  const [trending, setTrending] = useState<PosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ trending?: { movies?: PosterItem[] } }>("/home", {
        auth: false,
      });
      setTrending(res.trending?.movies ?? []);
    } catch {
      setTrending([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkAuth() {
    try {
      await apiFetch("/users/me");
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => {
    load();
    checkAuth();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>PARCOURS</Eyebrow>
        <H1>Kino mobile</H1>
        <Text style={s.sub}>
          Explorez des titres, connectez-vous, puis retrouvez votre bibliothèque.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Explorer" onPress={() => navigation.navigate("Search")} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={authed ? "Bibliothèque" : "Se connecter"}
              onPress={() => navigation.navigate(authed ? "Library" : "Login")}
              tone="ghost"
            />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <Text style={s.sectionTitle}>À l'affiche</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.kino} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          data={trending.slice(0, 20)}
          keyExtractor={(item) => `${item.media_type ?? "movie"}-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <PosterCard item={item} onPress={() => navigation.navigate("Search")} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      await setTokens(res.accessToken, res.refreshToken);
      navigation.reset({ index: 0, routes: [{ name: "Library" }] });
    } catch {
      setErr("Identifiants invalides");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>AUTH</Eyebrow>
        <H1>Connexion</H1>
        <Text style={s.sub}>Accédez à votre bibliothèque et vos actions.</Text>
      </View>
      <View style={{ padding: spacing.lg }}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor={colors.muted}
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err && <Text style={s.err}>{err}</Text>}
        {loading ? (
          <ActivityIndicator color={colors.kino} />
        ) : (
          <PrimaryButton label="Se connecter" onPress={submit} />
        )}
        <View style={{ height: 10 }} />
        <PrimaryButton
          label="Créer un compte"
          tone="ghost"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
    </SafeAreaView>
  );
}

function RegisterScreen({ navigation }: { navigation: any }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          body: JSON.stringify({ displayName, email, password }),
          auth: false,
        },
      );
      await setTokens(res.accessToken, res.refreshToken);
      navigation.reset({ index: 0, routes: [{ name: "Library" }] });
    } catch {
      setErr("Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>AUTH</Eyebrow>
        <H1>Inscription</H1>
      </View>
      <View style={{ padding: spacing.lg }}>
        <TextInput
          placeholder="Pseudo"
          placeholderTextColor={colors.muted}
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor={colors.muted}
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {err && <Text style={s.err}>{err}</Text>}
        {loading ? (
          <ActivityIndicator color={colors.kino} />
        ) : (
          <PrimaryButton label="Créer le compte" onPress={submit} />
        )}
      </View>
    </SafeAreaView>
  );
}

function SearchScreen({ navigation }: { navigation: any }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PosterItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await apiFetch<{ results: PosterItem[] }>(
        `/media/search?q=${encodeURIComponent(q.trim())}`,
        { auth: false },
      );
      setItems(res.results ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length]);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>BROWSING</Eyebrow>
        <H1>Recherche</H1>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <TextInput
            placeholder="Films, séries..."
            placeholderTextColor={colors.muted}
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => void run()}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={() => void run()} style={s.iconBtn}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>⌕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.kino} size="large" />
        </View>
      ) : empty ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={s.sub}>Lance une recherche pour afficher des résultats.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          data={items}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          keyExtractor={(item) => `${item.media_type ?? "all"}-${item.id}`}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <PosterCard item={item} fullWidth onPress={() => navigation.navigate("Login")} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

type LibraryItem = { tmdbId: number; mediaType: string; status: string };

function LibraryScreen({ navigation }: { navigation: any }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const rows = await apiFetch<LibraryItem[]>("/library/me");
      setItems(rows ?? []);
    } catch {
      setItems([]);
      setErr("Connexion requise pour voir la bibliothèque.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await clearTokens();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg }}>
        <Eyebrow>LIBRARY</Eyebrow>
        <H1>Ma bibliothèque</H1>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Rafraîchir" tone="ghost" onPress={() => void load()} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Déconnexion" tone="ghost" onPress={() => void logout()} />
          </View>
        </View>
        {err && <Text style={[s.err, { marginTop: 10 }]}>{err}</Text>}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.kino} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 10 }}
          data={items}
          keyExtractor={(r) => `${r.mediaType}-${r.tmdbId}`}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>#{item.tmdbId}</Text>
              <Text style={s.sub}>
                {item.mediaType} · {item.status.toLowerCase().replace(/_/g, " ")}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={s.sub}>
              {err ? "Connecte-toi pour remplir ta bibliothèque." : "Aucun élément pour le moment."}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Connexion" }} />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Inscription" }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Recherche" }} />
        <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Bibliothèque" }} />
      </Stack.Navigator>
    </NavigationContainer>
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
  h1: { ...typography.h1, color: colors.text, marginTop: 4 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  err: { color: "#f87171" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelSoft,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.text,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  btnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.kino,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { color: colors.text, fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.panelSoft,
  },
});

