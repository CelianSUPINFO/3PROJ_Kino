import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

const PUSH_TOKEN = "kino_expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications() {
  if (!Device.isDevice || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted"
    ? current
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Kino",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId.startsWith("00000000")) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiFetch("/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
  await AsyncStorage.setItem(PUSH_TOKEN, token);
}

export async function unregisterPushNotifications() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN);
  if (!token || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
  try {
    await apiFetch("/notifications/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN);
  }
}
