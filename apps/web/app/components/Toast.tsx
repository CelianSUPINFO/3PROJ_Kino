"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onClose,
  tone = "default",
}: {
  message: string | null;
  onClose: () => void;
  tone?: "default" | "success" | "danger";
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : tone === "danger"
      ? "border-red-400/40 bg-red-500/15 text-red-100"
      : "border-white/20 bg-kino-panel/90 text-white";

  return (
    <div
      className={`card-animate fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm font-medium shadow-card backdrop-blur-xl ${toneClass}`}
    >
      {message}
    </div>
  );
}
