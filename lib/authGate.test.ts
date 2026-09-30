import { describe, expect, it } from "vitest";
import { rescueAuthLink, sessionRedirect, type GateUser } from "./authGate";

const q = (s: string) => new URLSearchParams(s);

describe("rescueAuthLink", () => {
  it("forwards stray code / token_hash links to /auth/callback with a default next", () => {
    expect(rescueAuthLink("/", q("code=abc"))).toEqual({ pathname: "/auth/callback", params: { next: "/reset-password" } });
    expect(rescueAuthLink("/dashboard", q("token_hash=t&type=recovery"))).toEqual({
      pathname: "/auth/callback",
      params: { next: "/reset-password" },
    });
  });

  it("keeps an existing next", () => {
    expect(rescueAuthLink("/", q("code=abc&next=/dashboard"))).toEqual({ pathname: "/auth/callback", params: undefined });
  });

  it("rescues ?error= only on the Site URL (no /login?error loop)", () => {
    expect(rescueAuthLink("/", q("error=access_denied"))).not.toBeNull();
    expect(rescueAuthLink("/login", q("error=auth-callback-failed"))).toBeNull();
    expect(rescueAuthLink("/dashboard", q("error=x"))).toBeNull();
  });

  it("never touches auth routes or API routes (Google OAuth callback owns its ?code=)", () => {
    for (const path of ["/auth/callback", "/auth/confirm", "/reset-password", "/api/google/callback", "/api/anything"]) {
      expect(rescueAuthLink(path, q("code=abc"))).toBeNull();
    }
  });

  it("ignores ordinary requests", () => {
    expect(rescueAuthLink("/dashboard", q("tab=notes"))).toBeNull();
  });
});

describe("sessionRedirect", () => {
  const student: GateUser = { app_metadata: { role: "student" }, user_metadata: {} };

  it("sends signed-out users on private pages to /login with redirectTo", () => {
    expect(sessionRedirect("/dashboard/tasks", null)).toEqual({ pathname: "/login", params: { redirectTo: "/dashboard/tasks" } });
    expect(sessionRedirect("/", null)).toEqual({ pathname: "/login", params: { redirectTo: "/" } });
  });

  it("lets signed-out users reach public routes", () => {
    for (const path of ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/auth/confirm", "/change-password", "/api/health"]) {
      expect(sessionRedirect(path, null)).toBeNull();
    }
  });

  it("sends signed-in users away from /login and / to the dashboard", () => {
    expect(sessionRedirect("/login", student)).toEqual({ pathname: "/dashboard" });
    expect(sessionRedirect("/", student)).toEqual({ pathname: "/dashboard" });
    expect(sessionRedirect("/dashboard", student)).toBeNull();
  });

  it("forces a password change for first-login users, except on the change/reset pages", () => {
    const firstLogin: GateUser = { ...student, user_metadata: { must_change_password: true } };
    expect(sessionRedirect("/dashboard", firstLogin)).toEqual({ pathname: "/change-password" });
    expect(sessionRedirect("/change-password", firstLogin)).toBeNull();
    expect(sessionRedirect("/reset-password", firstLogin)).toBeNull();
    // Only a literal `true` counts.
    expect(sessionRedirect("/dashboard", { ...student, user_metadata: { must_change_password: "true" } })).toBeNull();
  });

  it("checks /login before the password-change rule", () => {
    const firstLogin: GateUser = { ...student, user_metadata: { must_change_password: true } };
    expect(sessionRedirect("/login", firstLogin)).toEqual({ pathname: "/dashboard" });
  });
});
