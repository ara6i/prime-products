"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { CustomerDashboardTheme } from "../types";

const THEME_STORAGE_KEY = "primestyle-customer-dashboard-theme";
const THEME_CHANGE_EVENT = "primestyle-customer-dashboard-theme-change";

function readStoredTheme(): CustomerDashboardTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function subscribeToTheme(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function getServerThemeSnapshot(): CustomerDashboardTheme {
  return "light";
}

function writeStoredTheme(theme: CustomerDashboardTheme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useCustomerDashboardTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, readStoredTheme, getServerThemeSnapshot);

  const toggleTheme = useCallback(() => {
    writeStoredTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  return useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );
}
