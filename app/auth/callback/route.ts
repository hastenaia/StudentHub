import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const providerErrorDescription =
    searchParams.get("error_description") ?? searchParams.get("message");
  if (providerError && !code && !tokenHash) {
    const failureUrl = new URL(`${origin}${next}`);
    failureUrl.searchParams.set("error", providerError);
    if (providerErrorDescription) {
      failureUrl.searchParams.set("error_description", providerErrorDescription);
    }
    return NextResponse.redirect(failureUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const failureUrl = new URL(`${origin}${next}`);
    failureUrl.searchParams.set("error", "auth-callback-failed");
    return NextResponse.redirect(failureUrl);
  }

  // OTP-style links (?token_hash=...&type=recovery) sent by Supabase.
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const failureUrl = new URL(`${origin}${next}`);
    failureUrl.searchParams.set("error", "auth-callback-failed");
    if (error.message) {
      failureUrl.searchParams.set("error_description", error.message);
    }
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
