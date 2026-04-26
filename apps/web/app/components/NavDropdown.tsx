"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Item = { label: string; href: string };

export function NavDropdown({
  label,
  items,
  active,
}: {
  label: string;
  items: Item[];
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !ref.current) return;

    const updatePosition = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 176),
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const menu =
    open && menuPos && mounted ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.minWidth,
          zIndex: 9999,
        }}
        className="overflow-hidden rounded-xl border border-white/10 bg-kino-panel/95 py-1 shadow-card backdrop-blur-xl"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block truncate px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex max-w-[9rem] items-center gap-1 truncate rounded-full px-2.5 py-1.5 text-sm font-medium transition lg:max-w-none lg:px-3 ${
          active
            ? "bg-white/10 text-white"
            : "text-kino-muted hover:bg-white/5 hover:text-white"
        }`}
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {mounted && menu && createPortal(menu, document.body)}
    </div>
  );
}

export function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-2.5 py-1.5 text-sm font-medium transition lg:px-3 ${
        active
          ? "bg-white/10 text-white"
          : "text-kino-muted hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
