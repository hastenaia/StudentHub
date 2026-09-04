import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/utils/safeRedirect";

/**
 * Supabase-recommended `/auth/confirm` endpoint for OTP links
 * (`?token_hash=...&type=...&next=...`). Kept as a thin alias of
 * `/auth/callback` so email templates pointing at either path work.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeRedirect(searchParams.get("next"), "/reset-password");

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
