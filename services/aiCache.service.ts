import { createClient } from "@/lib/supabase/server";
import type { AICachedResult } from "@/types/study";
import { aiCacheRowsToView } from "@/lib/aiCacheView";

/** How many stored answers the AI tab's history list shows. */
const HISTORY_LIMIT = 50;

/** The user's stored AI answers, newest first. Never throws — the tab degrades to no history. */
export async function getAiCacheData(userId: string): Promise<{ cachedResults: AICachedResult[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_cache")
    .select("id, action, label, data, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[ai-cache] history read failed:", error.message);
    return { cachedResults: [] };
  }
  return { cachedResults: aiCacheRowsToView(data) };
}
