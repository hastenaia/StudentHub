import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleData } from "@/services/google.service";

/**
 * On-demand cache refresh. The dashboard reads from Supabase; this endpoint is
 * the only thing that talks to Google for the signed-in user. Kept as a plain
 * POST JSON endpoint (rather than a Server Action) so the Sync button is a
 * trivial fetch call.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }

  const result = await syncGoogleData(user.id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}