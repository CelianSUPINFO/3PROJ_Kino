import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { colors as darkColors } from "../theme";

const THEME_KEY = "kino_theme";

export const lightColors = {
  ink: "#f8f5fa",
  surface: "#f2ecf4",
  panel: "#ffffff",
  panelSoft: "rgba(0,0,0,0.035)",
  text: "#1a1020",
  muted: "#6b5f75",
  border: "rgba(0,0,0,0.22)",
  kino: "#ff2e7e",
  kinoHot: "#c21263",
  kinoDark: "#a90f54",
  gold: "#c9a227",
};

export type AppColors = typeof darkColors;

export function useAppTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "light" || v === "dark") setThemeState(v);
    });
  }, []);

  const setTheme = useCallback(async (t: "light" | "dark") => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  const palette: AppColors = theme === "light" ? { ...darkColors, ...lightColors } : darkColors;

  return { theme, setTheme, colors: palette };
}
