import { createServerCookieClient } from "@/lib/supabase/factory";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredRoles, hasRole, roleFromUser } from "@/lib/rbac";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/auth/callback", "/change-password"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerCookieClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      );
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser().
  // A simple mistake here can cause hard-to-debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route));

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === "/login" || path === "/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Force a password change before letting first-time users into the app.
  const mustChangePassword = user?.user_metadata?.must_change_password === true;
  if (user && mustChangePassword && path !== "/change-password") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/change-password";
    return NextResponse.redirect(redirectUrl);
  }

  // Route-level RBAC guard (e.g. staff-only areas).
  const requiredRoles = getRequiredRoles(path);
  if (user && requiredRoles) {
    const role = roleFromUser(user);
    const allowed = requiredRoles.some((r) => hasRole(role, r));
    if (!allowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
