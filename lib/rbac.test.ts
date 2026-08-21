import { describe, expect, it } from "vitest";
import { getRequiredRoles, hasRole } from "./rbac";

describe("hasRole", () => {
  it("grants equal and higher roles", () => {
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("admin", "teacher")).toBe(true);
    expect(hasRole("teacher", "teacher")).toBe(true);
    expect(hasRole("teacher", "student")).toBe(true);
  });

  it("denies lower roles", () => {
    expect(hasRole("student", "teacher")).toBe(false);
    expect(hasRole("teacher", "admin")).toBe(false);
  });
});

describe("getRequiredRoles", () => {
  it("returns null for open routes", () => {
    expect(getRequiredRoles("/dashboard")).toBeNull();
    expect(getRequiredRoles("/dashboard/courses")).toBeNull();
    expect(getRequiredRoles("/dashboard/students")).toBeNull();
  });
});
