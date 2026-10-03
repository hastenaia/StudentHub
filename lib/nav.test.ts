import { describe, expect, it } from "vitest";
import { getNavTitle, isNavActive } from "./nav";

describe("isNavActive", () => {
  it("matches Dashboard exactly", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/dashboard/courses", "/dashboard")).toBe(false);
  });

  it("matches sections and their sub-routes", () => {
    expect(isNavActive("/dashboard/schedule", "/dashboard/schedule")).toBe(true);
    expect(isNavActive("/dashboard/courses/123", "/dashboard/courses")).toBe(true);
    expect(isNavActive("/dashboard/tasks", "/dashboard/courses")).toBe(false);
  });

  it("returns false without a pathname", () => {
    expect(isNavActive(null, "/dashboard")).toBe(false);
    expect(isNavActive(undefined, "/dashboard/schedule")).toBe(false);
  });
});

describe("getNavTitle", () => {
  it("reflects the opened sidebar section", () => {
    expect(getNavTitle("/dashboard")).toBe("Dashboard");
    expect(getNavTitle("/dashboard/schedule")).toBe("Schedule");
    expect(getNavTitle("/dashboard/courses/123")).toBe("Courses");
  });

  it("falls back to Dashboard for unknown or missing routes", () => {
    expect(getNavTitle("/unknown")).toBe("Dashboard");
    expect(getNavTitle(null)).toBe("Dashboard");
  });
});
