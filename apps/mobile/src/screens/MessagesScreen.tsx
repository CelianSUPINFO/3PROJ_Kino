import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, ImageBackground, PanResponder, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, clearTokens, getAccessToken, getApiRoot, logoutSession, setTokens } from "../api";
import { PosterCard, type PosterItem } from "../components/PosterCard";
import { Chip, Eyebrow, GhostButton, H1, Label, Logo, PrimaryButton, Section, s } from "../components/AppUi";
import { useLocale } from "../context/LocaleContext";
import { useThemeColors } from "../context/ThemeContext";
import { categoryLabel, notificationLabel } from "../lib/i18n";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { registerPushNotifications, unregisterPushNotifications } from "../pushNotifications";
type Partner = { id: string; displayName: string; unreadCount?: number };
type Msg = { id: string; body: string; createdAt: string; senderId?: string; recipientId?: string; readAt?: string | null };

export function MessagesScreen({ route }: { route: { params?: { userId?: string } } }) {
  const { t, locale } = useLocale();
  const { colors: c } = useThemeColors();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [available, setAvailable] = useState<Partner[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<{ id: string }>("/users/me").then((me) => setMeId(me.id)).catch(() => undefined);
    apiFetch<Partner[]>("/messages/partners")
      .then((rows) => {
        setPartners(rows);
        setSelectedId(route.params?.userId ?? rows[0]?.id ?? null);
      })
      .catch(() => setMsg(t("common.signInRequired")));
  }, [route.params?.userId]);

  async function openChooser() {
    const rows = await apiFetch<Partner[]>("/messages/available");
    setAvailable(rows);
    setChoosing(true);
  }

  function startConversation(partner: Partner) {
    setPartners((rows) => rows.some((row) => row.id === partner.id) ? rows : [partner, ...rows]);
    setSelectedId(partner.id);
    setChoosing(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    apiFetch<Msg[]>(`/messages/${selectedId}`)
      .then((rows) => {
        setMessages(rows);
        setMsg(null);
      })
      .catch(() => {
        setMessages([]);
        setMsg("Cette discussion nÃ©cessite un abonnement mutuel.");
      });
  }, [selectedId]);

  useEffect(() => {
    let socket: Socket | undefined;
    void getAccessToken().then((token) => {
      if (!token) return;
      socket = io(`${getApiRoot()}/realtime`, {
        auth: { token },
        transports: ["websocket"],
      });
      socket.on("message:new", (message: Msg & { recipientId?: string }) => {
        if (selectedId && (message.senderId === selectedId || message.recipientId === selectedId)) {
          setMessages((rows) => rows.some((row) => row.id === message.id) ? rows : [...rows, message]);
        }
        void apiFetch<Partner[]>("/messages/partners").then(setPartners).catch(() => undefined);
      });
      socket.on("message:deleted", ({ id }: { id: string }) => {
        setMessages((rows) => rows.filter((row) => row.id !== id));
      });
      socket.on("message:read", ({ readerId }: { readerId: string }) => {
        if (readerId === selectedId) {
          setMessages((rows) => rows.map((row) => row.senderId === meId ? { ...row, readAt: new Date().toISOString() } : row));
        }
      });
      socket.on("message:typing", ({ senderId, active }: { senderId: string; active: boolean }) => {
        if (senderId === selectedId) setTyping(active);
      });
      socket.on("notification:new", (notification: { type?: string; payload?: { senderId?: string } }) => {
        if (notification.type !== "NEW_MESSAGE") return;
        if (selectedId === notification.payload?.senderId) {
          void apiFetch<Msg[]>(`/messages/${selectedId}`).then(setMessages).catch(() => undefined);
        }
        void apiFetch<Partner[]>("/messages/partners").then(setPartners).catch(() => undefined);
      });
    });
    return () => {
      socket?.disconnect();
    };
  }, [selectedId, meId]);

  function updateBody(value: string) {
    setBody(value);
    if (!selectedId) return;
    void apiFetch(`/messages/${selectedId}/typing`, {
      method: "POST",
      body: JSON.stringify({ active: value.length > 0 }),
    }).catch(() => undefined);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void apiFetch(`/messages/${selectedId}/typing`, {
        method: "POST",
        body: JSON.stringify({ active: false }),
      }).catch(() => undefined);
    }, 1200);
  }

  function messageActions(item: Msg) {
    const mine = item.senderId === meId;
    Alert.alert(
      mine ? (locale === "fr" ? "Votre message" : "Your message") : (locale === "fr" ? "Message reÃ§u" : "Received message"),
      item.body,
      mine
        ? [
            { text: t("common.cancel"), style: "cancel" },
            { text: locale === "fr" ? "Supprimer" : "Delete", style: "destructive", onPress: () => void apiFetch(`/messages/${item.id}`, { method: "DELETE" }).then(() => setMessages((rows) => rows.filter((row) => row.id !== item.id))) },
          ]
        : [
            { text: t("common.cancel"), style: "cancel" },
            { text: locale === "fr" ? "Signaler" : "Report", onPress: () => void apiFetch(`/messages/${item.id}/report`, { method: "POST", body: JSON.stringify({ reason: "Message signalÃ© depuis l'application" }) }) },
            { text: locale === "fr" ? "Bloquer l'utilisateur" : "Block user", style: "destructive", onPress: () => selectedId && void apiFetch(`/users/${selectedId}/block`, { method: "POST" }).then(() => setSelectedId(null)) },
          ],
    );
  }

  async function send() {
    if (!selectedId || !body.trim()) return;
    try {
      await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({ recipientId: selectedId, body: body.trim() }),
      });
      setBody("");
      setMsg(null);
      const rows = await apiFetch<Msg[]>(`/messages/${selectedId}`);
      setMessages(rows);
    } catch {
      setMsg("Message non envoyÃ©. VÃ©rifiez que vous vous suivez mutuellement.");
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={{ padding: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View><Eyebrow>{t("messages.title").toUpperCase()}</Eyebrow><H1>{t("messages.title")}</H1></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={locale === "fr" ? "Nouvelle discussion" : "New conversation"} onPress={openChooser} style={s.btnPrimary}>
          <Text style={s.btnPrimaryText}>{locale === "fr" ? "Nouveau" : "New"}</Text>
        </TouchableOpacity>
      </View>
      {choosing && (
        <View style={[s.card, { marginHorizontal: spacing.lg, marginBottom: 8 }]}>
          <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 6 }}>Nouvelle discussion</Text>
          {available.map((partner) => (
            <TouchableOpacity key={partner.id} onPress={() => startConversation(partner)} style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.kinoHot }}>{partner.displayName}</Text>
            </TouchableOpacity>
          ))}
          {available.length === 0 && <Text style={s.sub}>Aucun abonnement mutuel sans discussion.</Text>}
        </View>
      )}
      {msg && <Text style={[s.err, { marginLeft: spacing.lg }]}>{msg}</Text>}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 8,
        }}
        data={partners}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Chip
            label={
              item.unreadCount
                ? `${item.displayName} (${item.unreadCount})`
                : item.displayName
            }
            active={selectedId === item.id}
            onPress={() => setSelectedId(item.id)}
          />
        )}
      />
      <FlatList
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 120,
          gap: 8,
        }}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => {
          const mine = item.senderId === meId;
          const date = new Date(item.createdAt);
          const previous = index > 0 ? new Date(messages[index - 1].createdAt) : null;
          const newDay = !previous || previous.toDateString() !== date.toDateString();
          return <View>
            {newDay && <Text style={[s.sub, { textAlign: "center", marginVertical: 10 }]}>{date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { weekday: "short", day: "numeric", month: "short" })}</Text>}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityHint={locale === "fr" ? "Appui long pour plus d'actions" : "Long press for more actions"}
              activeOpacity={0.85}
              onLongPress={() => messageActions(item)}
              style={[s.card, { maxWidth: "82%", alignSelf: mine ? "flex-end" : "flex-start", backgroundColor: mine ? c.kinoDark : c.panel }]}
            >
              <Text style={{ color: c.text }}>{item.body}</Text>
              <Text style={[s.sub, { fontSize: 10, marginTop: 4, color: mine ? "#fff" : c.muted }]}>
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine ? ` Â· ${item.readAt ? (locale === "fr" ? "Lu" : "Read") : (locale === "fr" ? "EnvoyÃ©" : "Sent")}` : ""}
              </Text>
            </TouchableOpacity>
          </View>;
        }}
      />
      {typing && <Text style={[s.sub, { marginHorizontal: spacing.lg, marginBottom: 4 }]}>{locale === "fr" ? "Ã‰crit actuellementâ€¦" : "Typingâ€¦"}</Text>}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.ink,
        }}
      >
        <TextInput
          placeholder={t("messages.placeholder")}
          placeholderTextColor={c.muted}
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          value={body}
          onChangeText={updateBody}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("common.send")} onPress={send} style={s.btnPrimary}>
          <Text style={s.btnPrimaryText}>{t("common.send")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


