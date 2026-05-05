"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, clearTokens } from "@/lib/api";
import { browseHref, MOVIE_GENRES, TV_GENRES } from "@/lib/genres";
import { genreLabel } from "@/lib/i18n";
import { useApp } from "./AppProviders";
import { NavDropdown, NavLink } from "./NavDropdown";

type Suggestion = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

type MeNav = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Nav() {
  const { locale, t } = useApp();
  const [isAuthed, setIsAuthed] = useState(false);
  const [me, setMe] = useState<MeNav | null>(null);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("kino_access");
    setIsAuthed(hasToken);
    if (!hasToken) {
      setMe(null);
      return;
    }
    apiFetch<MeNav>("/users/me")
      .then(setMe)
      .catch(() => {
        clearTokens();
        setIsAuthed(false);
        setMe(null);
      });
  }, [pathname]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ results: Suggestion[] }>(
        `/media/search?q=${encodeURIComponent(q)}&page=1`,
        { auth: false },
      )
        .then((r) => setSuggestions((r.results ?? []).slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const movieItems = MOVIE_GENRES.map((g) => ({
    label: g.slug === "all" ? t("nav.all") : genreLabel(locale, g.slug),
    href: browseHref("movie", g.id || undefined),
  }));

  const tvItems = TV_GENRES.map((g) => ({
    label: g.slug === "all" ? t("nav.all") : genreLabel(locale, g.slug),
    href: browseHref("tv", g.id || undefined),
  }));

  const meItems = [
    { label: t("nav.feed"), href: "/feed" },
    { label: t("nav.library"), href: "/library" },
    { label: t("nav.notifications"), href: "/notifications" },
    { label: t("nav.messages"), href: "/messages" },
    ...(me?.role === "ADMIN" ? [{ label: t("nav.admin"), href: "/admin" }] : []),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  function goSearch() {
    if (!q.trim()) return;
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  }

  function logout() {
    clearTokens();
    setIsAuthed(false);
    setMe(null);
    setMobileOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-2 z-40 px-2 sm:top-3 sm:px-4 md:top-4 md:px-6">
      <div className="mx-auto max-w-7xl overflow-visible rounded-2xl border border-white/10 bg-kino-panel/75 shadow-card backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-visible px-2 py-2 sm:gap-3 sm:px-3 md:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 pl-0.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-kino to-kino-hot text-white shadow-kino sm:h-9 sm:w-9">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.8 20 12 16.4 6.2 20l1.6-6.8L3 9l6.4-.7L12 2z" />
              </svg>
            </span>
            <span className="text-display hidden text-lg font-bold tracking-tight text-white min-[420px]:inline sm:text-xl">
              kino
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-visible lg:flex lg:gap-1">
            <NavLink href="/" label={t("nav.home")} active={isActive("/") && pathname === "/"} />
            <NavLink href="/ce-soir" label={t("nav.tonight")} active={isActive("/ce-soir")} />
            <NavDropdown
              label={t("nav.movies")}
              items={movieItems}
              active={pathname?.startsWith("/browse/movie")}
            />
            <NavDropdown
              label={t("nav.series")}
              items={tvItems}
              active={pathname?.startsWith("/browse/tv")}
            />
            {isAuthed && (
              <NavDropdown
                label={t("nav.me")}
                items={meItems}
                active={
                  !!pathname?.match(/^\/(feed|library|notifications|messages|admin)/)
                }
              />
            )}
          </nav>

          <div
            ref={searchRef}
            className="relative ml-auto hidden min-w-0 max-w-xs flex-1 xl:block xl:max-w-sm"
          >
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="w-full rounded-full border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-kino/60 focus:outline-none"
              placeholder={t("nav.searchPlaceholder")}
              value={q}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") goSearch();
              }}
            />
            {searchOpen && suggestions.length > 0 && (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-kino-panel/95 p-2 shadow-card backdrop-blur-xl">
                {suggestions.map((s) => {
                  const type = s.media_type === "tv" ? "tv" : "movie";
                  const title = s.title ?? s.name ?? t("common.untitled");
                  const year = (s.release_date ?? s.first_air_date ?? "").slice(0, 4);
                  return (
                    <Link
                      key={`${type}-${s.id}`}
                      href={`/title/${type}/${s.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white transition hover:bg-white/10"
                      onClick={() => {
                        setQ("");
                        setSuggestions([]);
                        setSearchOpen(false);
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
                          {type === "tv" ? t("nav.series") : t("nav.movies")}
                          {year && ` · ${year}`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white xl:hidden"
            aria-label={t("nav.search")}
          >
            <SearchIcon />
          </Link>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {!isAuthed ? (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white hover:bg-white/5"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-kino to-kino-hot px-3 py-1.5 text-sm font-semibold text-white shadow-kino hover:brightness-110"
                >
                  {t("nav.register")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/settings"
                  className="hidden rounded-full px-2 py-1.5 text-sm text-kino-muted hover:text-white lg:inline"
                >
                  {t("nav.settings")}
                </Link>
                {me && (
                  <Link
                    href={`/u/${me.id}`}
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 ring-2 ring-transparent transition hover:ring-kino/50"
                    title={me.displayName}
                  >
                    {me.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={me.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {initials(me.displayName)}
                      </span>
                    )}
                  </Link>
                )}
                <button
                  type="button"
                  className="hidden rounded-full border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/10 lg:inline"
                  onClick={logout}
                >
                  {t("nav.logout")}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white lg:hidden"
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
          <div className="border-t border-white/10 p-3 lg:hidden">
            <div className="mb-3 xl:hidden">
              <input
                className="w-full rounded-full border border-white/10 bg-black/30 py-2 px-4 text-sm text-white placeholder:text-white/40"
                placeholder={t("nav.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goSearch();
                }}
              />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                <MobileSection title={t("nav.home")} href="/" />
                <MobileSection title={t("nav.tonight")} href="/ce-soir" />
                {isAuthed && (
                  <>
                    <MobileSection title={t("nav.feed")} href="/feed" />
                    <MobileSection title={t("nav.library")} href="/library" />
                  </>
                )}
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <MobileGroup title={t("nav.movies")} items={movieItems.slice(0, 8)} />
                <MobileGroup title={t("nav.series")} items={tvItems.slice(0, 8)} />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
              {!isAuthed ? (
                <>
                  <Link href="/login" className="flex-1 rounded-full border border-white/15 py-2 text-center text-sm text-white">
                    {t("nav.login")}
                  </Link>
                  <Link href="/register" className="flex-1 rounded-full bg-gradient-to-r from-kino to-kino-hot py-2 text-center text-sm font-semibold text-white">
                    {t("nav.register")}
                  </Link>
                </>
              ) : (
                <>
                  {me && (
                    <Link
                      href={`/u/${me.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 py-2 text-sm text-white"
                    >
                      {me.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={me.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kino/30 text-[10px] font-bold">
                          {initials(me.displayName)}
                        </span>
                      )}
                      {me.displayName}
                    </Link>
                  )}
                  <Link href="/settings" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white">
                    {t("nav.settings")}
                  </Link>
                  <button
                    type="button"
                    className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10"
                    onClick={logout}
                  >
                    {t("nav.logout")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function MobileSection({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg px-2 py-2 font-medium text-white hover:bg-white/5">
      {title}
    </Link>
  );
}

function MobileGroup({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-kino-hot">
        {title}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-kino-muted hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
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

