"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";
import { type I18nKey, type Locale, t as translate } from "@/lib/i18n";

type Theme = "light" | "dark";

type AppContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const AppContext = createContext<AppContextValue>({
  theme: "dark",
  setTheme: () => {},
  locale: "fr",
  setLocale: () => {},
  t: (key) => key,
});

export function useApp() {
  return useContext(AppContext);
}

export function useLocale() {
  const { locale, setLocale, t } = useApp();
  return { locale, setLocale, t };
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const storedTheme = localStorage.getItem("kino_theme") as Theme | null;
    const storedLocale = localStorage.getItem("kino_locale") as Locale | null;
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
      document.documentElement.classList.toggle("light", storedTheme === "light");
    } else {
      document.documentElement.classList.remove("light");
    }
    if (storedLocale === "fr" || storedLocale === "en") {
      setLocaleState(storedLocale);
      document.documentElement.lang = storedLocale;
    } else {
      document.documentElement.lang = "fr";
    }
    if (localStorage.getItem("kino_access")) {
      apiFetch<{ theme?: string; locale?: string }>("/users/me")
        .then((me) => {
          if (me.theme === "light" || me.theme === "dark") {
            setThemeState(me.theme);
            localStorage.setItem("kino_theme", me.theme);
            document.documentElement.classList.toggle("light", me.theme === "light");
          }
          if (me.locale === "fr" || me.locale === "en") {
            setLocaleState(me.locale);
            localStorage.setItem("kino_locale", me.locale);
            document.documentElement.lang = me.locale;
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("kino_theme", t);
    document.documentElement.classList.toggle("light", t === "light");
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("kino_locale", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ theme, setTheme, locale, setLocale, t }),
    [theme, setTheme, locale, setLocale, t],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
