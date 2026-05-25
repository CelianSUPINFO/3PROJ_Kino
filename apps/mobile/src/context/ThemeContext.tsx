import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { colors as darkColors } from "../theme";
import { lightColors } from "../hooks/useAppTheme";
import { apiFetch } from "../api";

export type AppPalette = typeof darkColors;

const ThemeCtx = createContext<{
  colors: AppPalette;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => Promise<void>;
}>({
  colors: darkColors,
  theme: "dark",
  setTheme: async () => {},
});

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    AsyncStorage.getItem("kino_theme").then((v) => {
      if (v === "light" || v === "dark") setThemeState(v);
    });
    apiFetch<{ theme?: string }>("/users/me")
      .then((me) => {
        if (me.theme === "light" || me.theme === "dark") {
          setThemeState(me.theme);
          AsyncStorage.setItem("kino_theme", me.theme);
        }
      })
      .catch(() => undefined);
  }, []);

  const setTheme = useCallback(async (t: "light" | "dark") => {
    setThemeState(t);
    await AsyncStorage.setItem("kino_theme", t);
  }, []);

  const colors = useMemo(
    () => (theme === "light" ? { ...darkColors, ...lightColors } : darkColors),
    [theme],
  );

  return (
    <ThemeCtx.Provider value={{ colors, theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useThemeColors() {
  return useContext(ThemeCtx);
}
