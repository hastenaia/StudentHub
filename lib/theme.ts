export type Theme = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "studenthub:theme";

export const DEFAULT_THEME: Theme = "system";

const THEMES: readonly Theme[] = ["light", "dark", "system"];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.includes(value as Theme);
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function nextTheme(current: ResolvedTheme): Theme {
  return current === "dark" ? "light" : "dark";
}

type ThemeStorage = Pick<globalThis.Storage, "getItem">;

export function readStoredTheme(storage: ThemeStorage | null | undefined): Theme {
  if (!storage) return DEFAULT_THEME;
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

type ThemeRoot = {
  classList: { add: (...tokens: string[]) => void; remove: (...tokens: string[]) => void };
  style: { colorScheme: string };
};

export function applyThemeToRoot(root: ThemeRoot, resolved: ResolvedTheme): void {
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function prefersDarkScheme(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var s=window.localStorage.getItem(k);
var t=(s==="light"||s==="dark"||s==="system")?s:"system";
var d=t==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches):(t==="dark");
var r=d?"dark":"light";
var e=document.documentElement;
e.classList.remove("light","dark");
e.classList.add(r);
e.style.colorScheme=r;
}catch(_){}})();`;