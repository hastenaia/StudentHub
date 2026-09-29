import { createClient } from "@/lib/supabase/server";
import type { GoogleAccountView } from "@/types/academics";

/**
 * Server-side view assembly for the Academic Dashboard. Reads the Supabase
 * cache (never Google). Cheap, deterministic and safe to call from a Server
 * Component on every page load.
 */

export async function getGoogleAccountView(userId: string): Promise<GoogleAccountView> {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("google_accounts")
    .select("email, last_synced_at, needs_reconnect")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) return { linked: false, email: null, lastSyncedAt: null, needsReconnect: false };
  return {
    linked: true,
    email: account.email,
    lastSyncedAt: account.last_synced_at,
    needsReconnect: account.needs_reconnect,
  };
}
