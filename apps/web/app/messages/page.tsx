"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Partner = { id: string; displayName: string };
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
  const [me, setMe] = useState<Me | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Me>("/users/me")
      .then(setMe)
      .catch(() => setMe(null));
    apiFetch<Partner[]>("/messages/partners")
      .then((rows) => {
        setPartners(rows);
        if (rows.length > 0) setSelected(rows[0]);
      })
      .catch(() => setErr("Sign in required for messaging."));
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiFetch<Message[]>(`/messages/${selected.id}`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!selected || !body.trim()) return;
    await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ recipientId: selected.id, body }),
    });
    setBody("");
    const rows = await apiFetch<Message[]>(`/messages/${selected.id}`);
    setMessages(rows);
  }

  if (err) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-kino-muted">{err}</div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <aside className="glass h-fit rounded-2xl p-3 md:sticky md:top-24">
        <h1 className="text-display px-2 pb-2 text-lg font-semibold text-white">
          Conversations
        </h1>
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
                <span className="truncate text-sm font-medium">{p.displayName}</span>
              </button>
            </li>
          ))}
          {partners.length === 0 && (
            <li className="px-2 text-sm text-kino-muted">
              No chat partners yet (mutual follow required).
            </li>
          )}
        </ul>
      </aside>
      <section className="glass flex h-[70vh] flex-col rounded-2xl">
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
              Select a conversation
            </h2>
          )}
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
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
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/75" : "text-kino-muted"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {selected && messages.length === 0 && (
            <p className="text-center text-sm text-kino-muted">
              No messages yet. Say hi.
            </p>
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
              placeholder="Type a message..."
            />
            <button
              className="rounded-full bg-gradient-to-r from-kino to-kino-hot px-5 py-2 text-sm font-semibold text-white shadow-kino"
              onClick={send}
            >
              Send
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
