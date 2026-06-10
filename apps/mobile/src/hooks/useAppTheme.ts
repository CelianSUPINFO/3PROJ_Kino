import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { colors as darkColors } from "../theme";

const THEME_KEY = "kino_theme";

export const lightColors = {
  ink: "#f8f4f9",
  surface: "#eee7f1",
  panel: "#ffffff",
  panelSoft: "rgba(68,42,76,0.07)",
  text: "#211426",
  muted: "#66586f",
  border: "rgba(54,35,62,0.24)",
  kino: "#c21263",
  kinoHot: "#a90f54",
  kinoDark: "#841040",
  gold: "#8a6500",
  danger: "#b4233f",
  success: "#087554",
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
