"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch, getAccessToken } from "@/lib/api";
import { useLocale } from "../components/AppProviders";
import { notificationLabel } from "@/lib/i18n";

type N = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
};

const ICONS: Record<string, string> = {
  NEW_FOLLOWER: "👤",
  REVIEW_LIKED: "♥",
  REVIEW_COMMENT: "💬",
  NEW_MESSAGE: "✉",
  RECOMMENDATION: "✨",
};

export default function NotificationsPage() {
  const { locale, t } = useLocale();
  const [items, setItems] = useState<N[]>([]);

  useEffect(() => {
    apiFetch<N[]>("/notifications")
      .then(setItems)
      .catch(() => setItems([]));
    const token = getAccessToken();
    if (!token) return;
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
    const origin = apiBase.replace(/\/v1$/, "");
    const socket: Socket = io(`${origin}/realtime`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("notification:new", (notification: N) => {
      setItems((prev) => [notification, ...prev]);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-kino-hot">
            {t("notifications.alerts")}
          </p>
          <h1 className="text-display text-4xl font-bold text-white">
            {t("notifications.title")}
          </h1>
          <p className="mt-1 text-kino-muted">
            {unread > 0
              ? t("notifications.unread", { count: unread })
              : t("notifications.caughtUp")}
          </p>
        </div>
        <button
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          onClick={markAllRead}
        >
          {t("notifications.markAll")}
        </button>
      </header>
      <ul className="space-y-2">
        {items.map((n, idx) => (
          <li
            key={n.id}
            className={`card-animate flex items-start gap-3 rounded-2xl border p-4 transition ${
              n.read
                ? "border-white/5 bg-white/[0.02] text-kino-muted"
                : "border-kino/40 bg-gradient-to-r from-kino/10 to-transparent text-white"
            }`}
            style={{ animationDelay: `${Math.min(idx * 25, 200)}ms` }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg text-kino-hot">
              {ICONS[n.type] ?? "•"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {notificationLabel(locale, n.type)}
              </p>
              <p className="text-xs text-kino-muted">
                {new Date(n.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
              </p>
            </div>
            {!n.read && (
              <button className="chip" onClick={() => markRead(n.id)}>
                {t("notifications.markRead")}
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="glass rounded-2xl p-6 text-center text-kino-muted">
            {t("notifications.empty")}
          </li>
        )}
      </ul>
    </div>
  );
}
