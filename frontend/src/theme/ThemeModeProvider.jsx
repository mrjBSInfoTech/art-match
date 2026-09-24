import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { lightTheme, darkTheme } from "./customTheme";

const ThemeModeContext = createContext(null);

export const THEME_STORAGE_KEY = "artmatch-ui-theme";

export function getInitialThemeMode(storageKey = THEME_STORAGE_KEY) {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedMode = localStorage.getItem(storageKey);
  if (savedMode === "light" || savedMode === "dark") {
    return savedMode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeModeProvider({ children, storageKey = THEME_STORAGE_KEY }) {
  const [mode, setMode] = useState(() => getInitialThemeMode(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  const theme = useMemo(
    () => (mode === "dark" ? darkTheme : lightTheme),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, theme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }

  return context;
}
