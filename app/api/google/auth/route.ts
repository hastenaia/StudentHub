import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/services/google.service";

/**
 * Starts the Google OAuth consent flow. Stores the PKCE verifier + state in
 * short-lived HttpOnly cookies so the callback can validate the redirect and
 * exchange the code server-side (tokens never hit the browser).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { url, state, codeVerifier } = buildGoogleAuthUrl();

  const response = NextResponse.redirect(url);
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 600, // 10 minutes — consent screens expire entries quickly
    path: "/",
  });
  response.cookies.set("google_oauth_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 600,
    path: "/",
  });

  return response;
}