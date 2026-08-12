import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  it("returns the provided relative path", () => {
    expect(safeRedirect("/dashboard/settings")).toBe("/dashboard/settings");
  });

  it("falls back for null/undefined", () => {
    expect(safeRedirect(null)).toBe("/dashboard");
    expect(safeRedirect(undefined)).toBe("/dashboard");
  });

  it("rejects absolute external URLs", () => {
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect("http://evil.com")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
  });

  it("rejects non-slash prefixes", () => {
    expect(safeRedirect("dashboard")).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(safeRedirect(null, "/login")).toBe("/login");
  });
});