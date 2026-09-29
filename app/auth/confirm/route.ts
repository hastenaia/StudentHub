import { NextResponse } from "next/server";
import { verifyOtpAndRedirect } from "@/lib/supabase/authRedirect";
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

  if (tokenHash && type) return verifyOtpAndRedirect(origin, next, tokenHash, type);

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
