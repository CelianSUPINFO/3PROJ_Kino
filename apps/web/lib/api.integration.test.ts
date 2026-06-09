import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
Object.defineProperty(globalThis, "window", { value: globalThis });

describe("web API integration layer", () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("sends access tokens and parses API data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = await import("./api");
    api.setTokens("access", "refresh");
    await expect(api.apiFetch("/library/me")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer access");
  });

  it("refreshes an expired session and retries the request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new", refreshToken: "new-refresh" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = await import("./api");
    api.setTokens("old", "refresh");
    await expect(api.apiFetch("/notifications")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(api.getAccessToken()).toBe("new");
  });
});
