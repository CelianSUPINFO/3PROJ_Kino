import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../api";
import { type I18nKey, type Locale, t as translate } from "../lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "fr",
  setLocale: async () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    AsyncStorage.getItem("kino_locale").then((v) => {
      if (v === "fr" || v === "en") setLocaleState(v);
    });
    apiFetch<{ locale?: string }>("/users/me")
      .then((me) => {
        if (me.locale === "fr" || me.locale === "en") {
          setLocaleState(me.locale);
          AsyncStorage.setItem("kino_locale", me.locale);
        }
      })
      .catch(() => undefined);
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    await AsyncStorage.setItem("kino_locale", l);
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
