import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const base =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  "http://127.0.0.1:4000/v1";

const ACCESS = "kino_access";
const REFRESH = "kino_refresh";

export function getApiRoot() {
  return base.replace(/\/v1\/?$/, "");
}

export async function setTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [ACCESS, access],
    [REFRESH, refresh],
  ]);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS, REFRESH]);
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
    const access = await AsyncStorage.getItem(ACCESS);
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401 && init.auth !== false) {
    const refresh = await AsyncStorage.getItem(REFRESH);
    if (refresh) {
      const r2 = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r2.ok) {
        const data = (await r2.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        await setTokens(data.accessToken, data.refreshToken);
        headers.set("Authorization", `Bearer ${data.accessToken}`);
        res = await fetch(`${base}${path}`, { ...init, headers });
      }
    }
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
