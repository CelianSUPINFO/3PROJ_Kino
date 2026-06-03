const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

function readableError(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[]; error?: string };
    const message = Array.isArray(parsed.message)
      ? parsed.message.join(" ")
      : parsed.message;
    return message || parsed.error || fallback;
  } catch {
    return raw || fallback;
  }
}

function getTokens() {
  if (typeof window === "undefined") return { access: null as string | null, refresh: null as string | null };
  return {
    access: localStorage.getItem("kino_access"),
    refresh: localStorage.getItem("kino_refresh"),
  };
}

export function getAccessToken() {
  return getTokens().access;
}

export function getRefreshToken() {
  return getTokens().refresh;
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("kino_access", access);
  localStorage.setItem("kino_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("kino_access");
  localStorage.removeItem("kino_refresh");
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
    const { access } = getTokens();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  let res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401 && init.auth !== false) {
    const { refresh } = getTokens();
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
        setTokens(data.accessToken, data.refreshToken);
        headers.set("Authorization", `Bearer ${data.accessToken}`);
        res = await fetch(`${base}${path}`, { ...init, headers });
      } else {
        clearTokens();
      }
    }
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(readableError(err, res.statusText || "La requête a échoué."));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearTokens();
  }
}
