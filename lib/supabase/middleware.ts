import { createServerCookieClient } from "@/lib/supabase/factory";
import { NextResponse, type NextRequest } from "next/server";
import { rescueAuthLink, sessionRedirect, type GateRedirect } from "@/lib/authGate";

/** Same-origin redirect built from the request URL, keeping its other query params. */
function redirectTo(request: NextRequest, { pathname, params }: GateRedirect) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

/** Request gate: rescues stray auth links, refreshes the session, then applies lib/authGate's rules. */
export async function updateSession(request: NextRequest) {
  const rescue = rescueAuthLink(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (rescue) return redirectTo(request, rescue);

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

  const redirect = sessionRedirect(request.nextUrl.pathname, user);
  return redirect ? redirectTo(request, redirect) : supabaseResponse;
}
