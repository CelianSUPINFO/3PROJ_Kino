import { Ionicons } from "@expo/vector-icons";
import { DefaultTheme, NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ComponentType, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "./src/api";
import { PrimaryButton, GhostButton, s } from "./src/components/AppUi";
import { LocaleProvider, useLocale } from "./src/context/LocaleContext";
import {
  ThemeContextProvider,
  useThemeColors,
} from "./src/context/ThemeContext";
import type { RootStackParamList } from "./src/navigation/types";
import { registerPushNotifications } from "./src/pushNotifications";
import { AdminScreen } from "./src/screens/AdminScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { BrowseScreen } from "./src/screens/BrowseScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { LibraryStatusScreen } from "./src/screens/LibraryStatusScreen";
import { ListDetailScreen } from "./src/screens/ListDetailScreen";
import { MenuScreen } from "./src/screens/MenuScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TitleScreen } from "./src/screens/TitleScreen";
import { TonightScreen } from "./src/screens/TonightScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function useNavTheme() {
  const { colors, theme } = useThemeColors();
  return {
    ...DefaultTheme,
    dark: theme === "dark",
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
}

function ProfileTab({ navigation }: { navigation: any }) {
  const { colors } = useThemeColors();
  const { t } = useLocale();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setChecking(true);
      apiFetch<{ id: string }>("/users/me")
        .then((me) => {
          if (!cancelled) setUserId(me.id);
        })
        .catch(() => {
          if (!cancelled) setUserId(null);
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (checking && !userId) {
    return (
      <SafeAreaView
        style={[
          s.screen,
          {
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator color={colors.kino} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>
          {t("common.loading")}
        </Text>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView
        style={[
          s.screen,
          {
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          {t("common.signInRequired")}
        </Text>
        <View style={{ marginTop: 20, width: 240, gap: 10 }}>
          <PrimaryButton label={t("nav.login")} onPress={() => navigation.navigate("Login")} />
          <GhostButton label={t("auth.createAccount")} onPress={() => navigation.navigate("Register")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ProfileScreen
      route={
        {
          key: "profile-tab",
          name: "Profile",
          params: { userId },
        } as never
      }
      navigation={navigation}
    />
  );
}

function useUnreadNotifications() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      apiFetch<{ read: boolean }[]>("/notifications")
        .then((rows) => {
          if (!cancelled) setUnread(rows.filter((n) => !n.read).length);
        })
        .catch(() => {
          if (!cancelled) setUnread(0);
        });
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return unread;
}

function MainTabs() {
  const { colors } = useThemeColors();
  const { t } = useLocale();
  const unread = useUnreadNotifications();
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    HomeTab: "home-outline",
    SearchTab: "search-outline",
    LibraryTab: "library-outline",
    NotificationsTab: "notifications-outline",
    ProfileTab: "person-outline",
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.kinoHot,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: t("nav.home") }}
      />
      <Tabs.Screen
        name="SearchTab"
        component={SearchScreen as ComponentType<any>}
        options={{ title: t("nav.search") }}
      />
      <Tabs.Screen
        name="LibraryTab"
        component={LibraryScreen as ComponentType<any>}
        options={{ title: t("nav.library") }}
      />
      <Tabs.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: t("nav.notifications"),
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444", color: "#fff", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={ProfileTab}
        options={{ title: t("nav.me") }}
      />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  const navTheme = useNavTheme();
  const { theme, colors } = useThemeColors();
  const { t } = useLocale();
  useEffect(() => {
    apiFetch("/users/me")
      .then(() => registerPushNotifications())
      .catch(() => undefined);
  }, []);
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Tonight" component={TonightScreen} options={{ title: t("tonight.title") }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: t("nav.login") }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t("nav.register") }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: t("search.title") }} />
        <Stack.Screen name="Title" component={TitleScreen} options={({ route }) => ({ title: route.params.title })} />
        <Stack.Screen name="Feed" component={FeedScreen} options={{ title: t("nav.feed") }} />
        <Stack.Screen name="Library" component={LibraryScreen} options={{ title: t("nav.library") }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: t("nav.messages") }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t("notifications.alerts") }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("nav.settings") }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("profile.member") }} />
        <Stack.Screen name="ListDetail" component={ListDetailScreen} options={({ route }) => ({ title: route.params.listName })} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: "Menu" }} />
        <Stack.Screen name="Browse" component={BrowseScreen} options={({ route }) => ({ title: route.params.type === "movie" ? "Films" : "Séries" })} />
        <Stack.Screen name="LibraryStatus" component={LibraryStatusScreen} options={({ route }) => ({ title: route.params.title })} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: "Admin" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeContextProvider>
        <LocaleProvider>
          <AppNavigator />
        </LocaleProvider>
      </ThemeContextProvider>
    </SafeAreaProvider>
  );
}
