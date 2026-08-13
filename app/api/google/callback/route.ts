import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeGoogleAccount, syncGoogleData } from "@/services/google.service";

/**
 * Google redirects back here after consent. Validates the state cookie (CSRF
 * protection), exchanges the code for tokens using the stored PKCE verifier,
 * persists the encrypted tokens, then triggers an initial sync so the
 * dashboard is populated immediately.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (googleError) return redirect("/dashboard?google=auth_denied");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  const codeVerifier = cookieStore.get("google_oauth_verifier")?.value;
  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_verifier");

  if (!code || !state || !codeVerifier || state !== savedState) {
    // Mismatched or missing state → likely a forged/expired callback.
    return redirect("/dashboard?google=state_mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const result = await storeGoogleAccount(user.id, code, codeVerifier);
  if (!result.success) return redirect("/dashboard?google=error");

  // Best-effort initial sync; failures surface on the dashboard as a banner.
  await syncGoogleData(user.id);

  return redirect("/dashboard?google=linked");
}