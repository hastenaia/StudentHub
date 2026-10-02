import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const saveTheme = vi.fn().mockResolvedValue({ success: true });

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "Ada Lovelace", email: "ada@example.com" }, logout: vi.fn() }),
}));

vi.mock("@/services/preferencesClient.service", () => ({
  preferencesClientService: { saveTheme: (theme: string) => saveTheme(theme) },
}));

/** In-memory Storage; jsdom's localStorage isn't available under every Node version. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  saveTheme.mockClear();
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("light", "dark");
});

const renderNavbar = (initialTheme?: "light" | "dark" | "system") =>
  render(<Navbar onMenuClick={vi.fn()} initialTheme={initialTheme} />);

describe("Navbar theme toggle", () => {
  it("renders a theme control alongside the notification bell", () => {
    renderNavbar();
    expect(screen.getByLabelText("Notifications")).toBeTruthy();
    expect(screen.getByLabelText("Switch to dark mode")).toBeTruthy();
  });

  it("applies and persists dark, then returns to light", () => {
    renderNavbar();
    const toggle = screen.getByLabelText("Switch to dark mode");

    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(saveTheme).toHaveBeenCalledWith("dark");

    const backToLight = screen.getByLabelText("Switch to light mode");
    fireEvent.click(backToLight);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(saveTheme).toHaveBeenCalledWith("light");
  });

  it("honours a theme chosen on another device", () => {
    renderNavbar("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByLabelText("Switch to light mode")).toBeTruthy();
  });

  it("lets an explicit choice override a stored system preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    renderNavbar();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(screen.getByLabelText("Switch to dark mode"));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});