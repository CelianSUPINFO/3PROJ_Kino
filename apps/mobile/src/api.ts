import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const base =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  "https://kino-api-9ipb.onrender.com/v1";

const ACCESS = "kino_access";
const REFRESH = "kino_refresh";
let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export function getApiRoot() {
  return base.replace(/\/v1\/?$/, "");
}

export async function setTokens(access: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, access),
    SecureStore.setItemAsync(REFRESH, refresh),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS),
    SecureStore.deleteItemAsync(REFRESH),
    AsyncStorage.multiRemove([ACCESS, REFRESH]),
  ]);
}

export async function logoutSession() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
  try {
    if (refreshToken) {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearTokens();
  }
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = await SecureStore.getItemAsync(REFRESH);
    if (!refresh) return null;
    const response = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    }
    const currentRefresh = await SecureStore.getItemAsync(REFRESH);
    const currentAccess = await SecureStore.getItemAsync(ACCESS);
    if (currentRefresh !== refresh && currentAccess) return currentAccess;
    await clearTokens();
    return null;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData) headers.set("Content-Type", "application/json");
  if (init.auth !== false) {
    const access = await SecureStore.getItemAsync(ACCESS);
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401 && init.auth !== false) {
    const access = await refreshAccessToken();
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
      res = await fetch(`${base}${path}`, { ...init, headers });
    }
  }
  if (!res.ok) {
    const err = await res.text();
    try {
      const parsed = JSON.parse(err) as { message?: string | string[]; error?: string };
      const message = Array.isArray(parsed.message) ? parsed.message.join(" ") : parsed.message;
      throw new Error(message || parsed.error || res.statusText);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(err || res.statusText);
      throw error;
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
