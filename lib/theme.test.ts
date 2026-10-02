import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  applyThemeToRoot,
  isTheme,
  nextTheme,
  readStoredTheme,
  resolveTheme,
} from "./theme";

const fakeStorage = (value: string | null) => ({
  getItem: () => value,
});

const fakeRoot = () => {
  const tokens: string[] = [];
  const style = { colorScheme: "" };
  return {
    tokens,
    style,
    classList: {
      add: (...t: string[]) => {
        tokens.push(...t);
      },
      remove: (...t: string[]) => {
        for (const token of t) {
          const i = tokens.indexOf(token);
          if (i >= 0) tokens.splice(i, 1);
        }
      },
    },
  };
};

describe("resolveTheme", () => {
  it("passes explicit themes through untouched", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the OS preference for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("nextTheme", () => {
  it("always yields an explicit theme, never system", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("isTheme", () => {
  it("accepts the three known values and rejects everything else", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("readStoredTheme", () => {
  it("returns the stored value when valid", () => {
    expect(readStoredTheme(fakeStorage("dark"))).toBe("dark");
  });

  it("falls back to system when missing, invalid, or storage throws", () => {
    expect(readStoredTheme(fakeStorage(null))).toBe(DEFAULT_THEME);
    expect(readStoredTheme(fakeStorage("chartreuse"))).toBe(DEFAULT_THEME);
    expect(readStoredTheme(undefined)).toBe(DEFAULT_THEME);
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error("blocked");
        },
      })
    ).toBe(DEFAULT_THEME);
  });
});

describe("applyThemeToRoot", () => {
  it("adds the resolved class and syncs color-scheme", () => {
    const root = fakeRoot();
    applyThemeToRoot(root, "dark");
    expect(root.tokens).toEqual(["dark"]);
    expect(root.style.colorScheme).toBe("dark");
  });

  it("replaces a previous theme instead of stacking both", () => {
    const root = fakeRoot();
    applyThemeToRoot(root, "dark");
    applyThemeToRoot(root, "light");
    expect(root.tokens).toEqual(["light"]);
    expect(root.style.colorScheme).toBe("light");
  });
});

describe("THEME_BOOTSTRAP_SCRIPT", () => {
  it("references the shared storage key and both class names", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_BOOTSTRAP_SCRIPT).toContain('classList.add(r)');
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme: dark");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("catch");
  });
});