"use client";

import * as React from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyThemeToRoot,
  isTheme,
  nextTheme,
  prefersDarkScheme,
  resolveTheme,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";
import { preferencesClientService } from "@/services/preferencesClient.service";

type Listener = (theme: Theme) => void;

const listeners = new Set<Listener>();

function notify(theme: Theme) {
  for (const listener of listeners) listener(theme);
}

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemScheme(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getPrefersDark = () => prefersDarkScheme();
const getPrefersDarkOnServer = () => false;

function subscribeToNothing() {
  return () => {};
}

const getHydrated = () => true;
const getHydratedOnServer = () => false;

function usePrefersDark() {
  return React.useSyncExternalStore(
    subscribeToSystemScheme,
    getPrefersDark,
    getPrefersDarkOnServer
  );
}

function useHydrated() {
  return React.useSyncExternalStore(subscribeToNothing, getHydrated, getHydratedOnServer);
}

function storedTheme(fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    return fallback;
  }
  return fallback;
}

export function useTheme(initialTheme: Theme = DEFAULT_THEME) {
  const [theme, setThemeState] = React.useState<Theme>(() => storedTheme(initialTheme));
  const prefersDark = usePrefersDark();
  const hydrated = useHydrated();

  const resolved: ResolvedTheme = resolveTheme(theme, prefersDark);

  React.useEffect(() => {
    if (!hydrated) return;
    applyThemeToRoot(document.documentElement, resolved);
  }, [resolved, hydrated]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !isTheme(event.newValue)) return;
      setThemeState(event.newValue);
    };
    const onLocal = (next: Theme) => setThemeState(next);
    window.addEventListener("storage", onStorage);
    listeners.add(onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      listeners.delete(onLocal);
    };
  }, []);

  const commit = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Theme still applies for this session even when storage is blocked.
    }
    notify(next);
    void preferencesClientService.saveTheme(next);
  }, []);

  const setTheme = React.useCallback((next: Theme) => commit(next), [commit]);

  const toggle = React.useCallback(() => commit(nextTheme(resolved)), [commit, resolved]);

  return { theme, resolved, mounted: hydrated, setTheme, toggle };
}