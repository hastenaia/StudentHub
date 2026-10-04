import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleNotConfiguredMessage, isGoogleConfigured } from "@/lib/google/config";
import { syncGoogleData } from "@/services/google.service";
import { shouldAutoSync } from "@/lib/google/autoSync";

/**
 * On-demand cache refresh. The dashboard reads from Supabase; this endpoint is
 * the only thing that talks to Google for the signed-in user. Kept as a plain
 * POST JSON endpoint (rather than a Server Action) so the Sync button is a
 * trivial fetch call.
 *
 * Body `{ auto: true }` (sent once per tab session by `AutoSync`) makes the
 * sync conditional: it's skipped without calling Google when there is no
 * usable link or the cache was refreshed recently (`lib/google/autoSync.ts`).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { success: false, message: googleNotConfiguredMessage() },
      { status: 503 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const auto = typeof body === "object" && body !== null && (body as { auto?: unknown }).auto === true;
  if (auto) {
    const { data: account } = await supabase
      .from("google_accounts")
      .select("last_synced_at, needs_reconnect")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!shouldAutoSync(account, Date.now())) {
      return NextResponse.json({ success: true, message: "skipped", data: { skipped: true } });
    }
  }

  const result = await syncGoogleData(user.id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
