import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/utils/safeRedirect";

// Shared by the Supabase auth-link routes (/auth/callback and /auth/confirm).
// `next` is re-sanitized here so safety never depends on callers remembering to.

/** Redirects to `next` with `?error=` (and optional `error_description`) so the page can explain. */
export function redirectWithError(origin: string, next: string, error: string, description?: string | null) {
  const failureUrl = new URL(`${origin}${safeRedirect(next)}`);
  failureUrl.searchParams.set("error", error);
  if (description) failureUrl.searchParams.set("error_description", description);
  return NextResponse.redirect(failureUrl);
}

/** Verifies an OTP-style link (`?token_hash=&type=`) and redirects to `next`, or back with the error. */
export async function verifyOtpAndRedirect(origin: string, next: string, tokenHash: string, type: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "recovery" });
  // ponytail: `next` re-sanitized here (defense in depth); only relative `/...` passes.
  const safeNext = safeRedirect(next);
  if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  return redirectWithError(origin, safeNext, "auth-callback-failed", error.message);
}
