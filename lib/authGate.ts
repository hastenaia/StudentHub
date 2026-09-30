import { getRequiredRoles, hasRole, roleFromUser } from "@/lib/rbac";

// Pure redirect decisions for the request gate (proxy.ts → lib/supabase/middleware.ts).
// Kept free of Next/Supabase so every rule is unit-tested; middleware.ts only applies them.

/** Same-origin redirect: new pathname plus query params to set (other params are kept). */
export type GateRedirect = { pathname: string; params?: Record<string, string> };

/** The slice of a Supabase user the gate reads. Roles come from app_metadata only (see lib/rbac). */
export type GateUser = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/change-password",
  "/api/health",
];

const AUTH_LINK_ROUTES = new Set(["/auth/callback", "/auth/confirm", "/reset-password"]);

/**
 * Supabase falls back to the Site URL ("/") when the redirectTo allow-list or email template isn't
 * configured. Rescue `?code=` / `?token_hash=` links landing anywhere else by forwarding them to
 * /auth/callback, which exchanges the code and sends recovery flows to /reset-password.
 * Runs before the session is read.
 */
export function rescueAuthLink(pathname: string, params: URLSearchParams): GateRedirect | null {
  // Auth routes handle their own params; API routes own theirs too (e.g. /api/google/callback's OAuth code).
  if (AUTH_LINK_ROUTES.has(pathname) || pathname.startsWith("/api/")) return null;
  const hasAuthToken = params.has("code") || params.has("token_hash");
  // Supabase reports failed/expired links as `?error=` on the Site URL only. Matching `error` anywhere
  // else loops: /auth/callback fails → /login?error=… → rescued back to /auth/callback → …
  const hasSiteUrlError = pathname === "/" && params.has("error");
  if (!hasAuthToken && !hasSiteUrlError) return null;
  return { pathname: "/auth/callback", params: params.get("next") ? undefined : { next: "/reset-password" } };
}

type Rule = (path: string, user: GateUser | null) => GateRedirect | null;

const requireSignIn: Rule = (path, user) =>
  !user && !PUBLIC_ROUTES.some((route) => path.startsWith(route)) ? { pathname: "/login", params: { redirectTo: path } } : null;

const skipSignInPages: Rule = (path, user) => (user && (path === "/login" || path === "/") ? { pathname: "/dashboard" } : null);

/** First-login users must set a password first; recovery links land on /reset-password, so leave those alone. */
const forcePasswordChange: Rule = (path, user) =>
  user?.user_metadata?.must_change_password === true && path !== "/change-password" && path !== "/reset-password"
    ? { pathname: "/change-password" }
    : null;

/** Route-level RBAC (e.g. staff-only areas). */
const enforceRoles: Rule = (path, user) => {
  const required = getRequiredRoles(path);
  if (!user || !required) return null;
  const role = roleFromUser(user);
  return required.some((r) => hasRole(role, r)) ? null : { pathname: "/dashboard" };
};

const RULES: Rule[] = [requireSignIn, skipSignInPages, forcePasswordChange, enforceRoles];

/** First matching rule's redirect once the session is known, or null to let the request through. */
export function sessionRedirect(path: string, user: GateUser | null): GateRedirect | null {
  for (const rule of RULES) {
    const redirect = rule(path, user);
    if (redirect) return redirect;
  }
  return null;
}
