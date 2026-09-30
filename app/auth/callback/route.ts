import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError, verifyOtpAndRedirect } from "@/lib/supabase/authRedirect";
import { safeRedirect } from "@/utils/safeRedirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeRedirect(searchParams.get("next"));

  // Supabase may redirect back with an error (expired/invalid link).
  // Forward it to the target page so it can show a friendly message.
  const providerError = searchParams.get("error");
  if (providerError && !code && !tokenHash) {
    return redirectWithError(origin, next, providerError, searchParams.get("error_description") ?? searchParams.get("message"));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return redirectWithError(origin, next, "auth-callback-failed");
  }

  // OTP-style links (?token_hash=...&type=recovery) sent by Supabase.
  if (tokenHash && type) return verifyOtpAndRedirect(origin, next, tokenHash, type);

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
