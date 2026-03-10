"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, clearTokens } from "@/lib/api";

type Suggestion = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

const primary = [
  { href: "/", label: "Accueil" },
  { href: "/ce-soir", label: "Ce soir ?" },
  { href: "/search", label: "Recherche" },
];

const authed = [
  { href: "/feed", label: "Fil" },
  { href: "/library", label: "Bibliothèque" },
  { href: "/notifications", label: "Notifications" },
  { href: "/messages", label: "Messages" },
];

export function Nav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("kino_access");
    setIsAuthed(hasToken);
    if (!hasToken) {
      setIsAdmin(false);
      return;
    }
    apiFetch<{ role?: string }>("/users/me")
      .then((me) => setIsAdmin(me.role === "ADMIN"))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<{ results: Suggestion[] }>(
        `/media/search?q=${encodeURIComponent(q)}&page=1`,
        { auth: false },
      )
        .then((r) => setSuggestions((r.results ?? []).slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const allLinks = isAuthed
    ? [...primary, ...authed, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])]
    : primary;

  return (
    <header className="sticky top-3 z-40 px-3 md:top-4 md:px-6">
      <div
        ref={rootRef}
        className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-white/10 bg-kino-panel/70 px-3 py-2.5 shadow-card backdrop-blur-xl md:gap-6 md:px-4"
      >
        <Link href="/" className="flex items-center gap-2 pl-1 pr-1">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-kino to-kino-hot text-white shadow-kino">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.8 20 12 16.4 6.2 20l1.6-6.8L3 9l6.4-.7L12 2z" />
            </svg>
          </span>
          <span className="text-display text-xl font-bold tracking-tight text-white">
            kino
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {allLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-white/10 text-white"
                  : "text-kino-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto hidden min-w-0 flex-1 max-w-md md:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            className="w-full rounded-full border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
            placeholder="Rechercher films, séries..."
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim().length > 0) {
                window.location.href = `/search?q=${encodeURIComponent(q)}`;
              }
            }}
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-kino-panel/95 p-2 shadow-card backdrop-blur-xl">
              {suggestions.map((s) => {
                const type = s.media_type === "tv" ? "tv" : "movie";
                const title = s.title ?? s.name ?? "Untitled";
                const year = (s.release_date ?? s.first_air_date ?? "").slice(0, 4);
                return (
                  <Link
                    key={`${type}-${s.id}`}
                    href={`/title/${type}/${s.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white transition hover:bg-white/10"
                    onClick={() => {
                      setQ("");
                      setSuggestions([]);
                      setOpen(false);
                    }}
                  >
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-white/10">
                      {s.poster_path && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://image.tmdb.org/t/p/w92${s.poster_path}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{title}</p>
                      <p className="text-xs text-white/50">
                        {type === "tv" ? "Série" : "Film"} {year && `· ${year}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {!isAuthed ? (
            <>
              <Link href="/login" className="rounded-full px-4 py-1.5 text-sm font-medium text-white hover:bg-white/5">
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-kino to-kino-hot px-4 py-1.5 text-sm font-semibold text-white shadow-kino hover:brightness-110"
              >
                Inscription
              </Link>
            </>
          ) : (
            <>
              <Link href="/settings" className="rounded-full px-3 py-1.5 text-sm text-kino-muted hover:text-white">
                Paramètres
              </Link>
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                onClick={() => {
                  clearTokens();
                  setIsAuthed(false);
                  window.location.href = "/";
                }}
              >
                Déconnexion
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="card-animate mx-auto mt-2 max-w-7xl space-y-3 rounded-2xl border border-white/10 bg-kino-panel/95 p-4 shadow-card backdrop-blur-xl md:hidden">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="w-full rounded-full border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
              placeholder="Rechercher..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim().length > 0) {
                  window.location.href = `/search?q=${encodeURIComponent(q)}`;
                }
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  isActive(l.href)
                    ? "bg-white/10 text-white"
                    : "text-kino-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            {!isAuthed ? (
              <>
                <Link href="/login" className="flex-1 rounded-full border border-white/15 px-3 py-2 text-center text-sm text-white">
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-full bg-gradient-to-r from-kino to-kino-hot px-3 py-2 text-center text-sm font-semibold text-white shadow-kino"
                >
                  Inscription
                </Link>
              </>
            ) : (
              <>
                <Link href="/settings" className="flex-1 rounded-full border border-white/15 px-3 py-2 text-center text-sm text-white">
                  Paramètres
                </Link>
                <button
                  type="button"
                  className="flex-1 rounded-full border border-white/15 px-3 py-2 text-center text-sm text-white"
                  onClick={() => {
                    clearTokens();
                    setIsAuthed(false);
                    window.location.href = "/";
                  }}
                >
                  Déconnexion
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
