"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch, getAccessToken } from "@/lib/api";
import { useLocale } from "../components/AppProviders";

type Partner = { id: string; displayName: string; unreadCount?: number };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  recipientId: string;
};
type Me = { id: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MessagesPage() {
  const { locale, t } = useLocale();
  const [me, setMe] = useState<Me | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [available, setAvailable] = useState<Partner[]>([]);
  const [choosing, setChoosing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setMe(null));
    apiFetch<Partner[]>("/messages/partners")
      .then((rows) => {
        setPartners(rows);
        const requested = new URLSearchParams(window.location.search).get("userId");
        const initial = rows.find((row) => row.id === requested) ?? rows[0];
        if (initial) setSelected(initial);
      })
      .catch(() => setErr(t("messages.signIn")));
  }, [t]);

  async function openChooser() {
    const rows = await apiFetch<Partner[]>("/messages/available");
    setAvailable(rows);
    setChoosing(true);
  }

  function startConversation(partner: Partner) {
    setPartners((rows) => rows.some((row) => row.id === partner.id) ? rows : [partner, ...rows]);
    setSelected(partner);
    setChoosing(false);
  }

  useEffect(() => {
    if (!selected) return;
    apiFetch<Message[]>(`/messages/${selected.id}`)
      .then((rows) => {
        setMessages(rows);
        setActionError(null);
      })
      .catch(() => {
        setMessages([]);
        setActionError("Cette discussion nécessite un abonnement mutuel.");
      });
  }, [selected]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
    const socket: Socket = io(`${apiBase.replace(/\/v1$/, "")}/realtime`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("message:new", (message: Message) => {
      if (selected && (message.senderId === selected.id || message.recipientId === selected.id)) {
        setMessages((rows) => rows.some((row) => row.id === message.id) ? rows : [...rows, message]);
      }
      void apiFetch<Partner[]>("/messages/partners").then(setPartners).catch(() => undefined);
    });
    return () => {
      socket.disconnect();
    };
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!selected || !body.trim()) return;
    try {
      await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({ recipientId: selected.id, body: body.trim() }),
      });
      setBody("");
      setActionError(null);
      const rows = await apiFetch<Message[]>(`/messages/${selected.id}`);
      setMessages(rows);
    } catch {
      setActionError("Message non envoyé. Vérifiez que vous vous suivez mutuellement.");
    }
  }

  if (err) {
    return (
      <section className="glass rounded-2xl p-6 text-center">
        <h1 className="text-display text-2xl font-semibold text-white">{t("nav.login")}</h1>
        <p className="mt-2 text-kino-muted">{err}</p>
        <Link href="/login" className="btn-primary mt-5 !py-2 text-sm">
          {t("nav.login")}
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="glass h-fit rounded-2xl p-3 md:sticky md:top-24">
        <div className="flex items-center justify-between px-2 pb-2">
          <h1 className="text-display text-lg font-semibold text-white">{t("messages.title")}</h1>
          <button type="button" aria-label="Nouvelle discussion" className="chip text-lg" onClick={() => void openChooser()}>+</button>
        </div>
        {choosing && (
          <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="px-2 pb-2 text-xs text-kino-muted">Nouvelle discussion</p>
            {available.map((partner) => (
              <button key={partner.id} type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => startConversation(partner)}>
                {partner.displayName}
              </button>
            ))}
            {available.length === 0 && <p className="px-2 py-2 text-xs text-kino-muted">Aucun abonnement mutuel sans discussion.</p>}
          </div>
        )}
        <ul className="space-y-1">
          {partners.map((p) => (
            <li key={p.id}>
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  selected?.id === p.id
                    ? "bg-gradient-to-r from-kino/20 to-transparent text-white"
                    : "text-kino-muted hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setSelected(p)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-xs font-bold text-white">
                  {initials(p.displayName)}
                </span>
                <span className="truncate text-sm font-medium">
                  {p.displayName}
                </span>
                {!!p.unreadCount && (
                  <span className="ml-auto rounded-full bg-kino-hot px-2 py-0.5 text-[10px] font-bold text-white">
                    {p.unreadCount}
                  </span>
                )}
              </button>
            </li>
          ))}
          {partners.length === 0 && (
            <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-kino-muted">
              {t("messages.noPartners")}
            </li>
          )}
        </ul>
      </aside>
      <section className="glass flex min-h-[520px] flex-col rounded-2xl lg:h-[70vh]">
        <header className="flex items-center gap-3 border-b border-white/10 p-4">
          {selected ? (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-kino to-kino-hot text-xs font-bold text-white">
                {initials(selected.displayName)}
              </span>
              <h2 className="text-display text-lg font-semibold text-white">
                {selected.displayName}
              </h2>
            </>
          ) : (
            <h2 className="text-display text-lg font-semibold text-white">
              {t("messages.selectConversation")}
            </h2>
          )}
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {actionError && <p className="rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError}</p>}
          {messages.map((m) => {
            const mine = me?.id === m.senderId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? "bg-gradient-to-r from-kino to-kino-hot text-white shadow-kino"
                      : "border border-white/10 bg-white/5 text-white"
                  }`}
                >
                  <p>{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? "text-white/75" : "text-kino-muted"}`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString(
                      locale === "fr" ? "fr-FR" : "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          {selected && messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center">
              <p className="max-w-xs text-sm text-kino-muted">{t("messages.empty")}</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {selected && (
          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <input
              className="flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={t("messages.placeholder")}
            />
            <button
              className="rounded-full bg-gradient-to-r from-kino to-kino-hot px-5 py-2 text-sm font-semibold text-white shadow-kino"
              onClick={send}
            >
              {t("common.send")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
