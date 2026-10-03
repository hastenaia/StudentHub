// Best-effort read/write of persisted AI answers (table `ai_cache`).
// A cache problem must never break a generation, so every failure is logged and swallowed.
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import type { AIAction } from "@/lib/aiRequests";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** The stored answer for `key`, or null when there is none (or the cache is unreachable). */
export async function readAiCache(
  supabase: ServerClient,
  userId: string,
  key: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from("ai_cache")
      .select("data")
      .eq("user_id", userId)
      .eq("cache_key", key)
      .maybeSingle();
    if (error) {
      if (process.env.NODE_ENV === "development") console.warn("[ai-cache] read failed:", error.message);
      return null;
    }
    const stored = (data as { data?: Json } | null)?.data;
    return stored && typeof stored === "object" ? (stored as Record<string, unknown>) : null;
  } catch (err) {
    if (process.env.NODE_ENV === "development")
      console.warn("[ai-cache] read threw:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Stores the answer for `key`, replacing any earlier one for the same question so a regeneration
 * overwrites rather than duplicates. `created_at` is left untouched, keeping history order stable.
 */
export async function writeAiCache(
  supabase: ServerClient,
  userId: string,
  key: string,
  action: AIAction,
  label: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_cache").upsert(
      { user_id: userId, cache_key: key, action, label, data: data as unknown as Json },
      { onConflict: "user_id,cache_key" }
    );
    if (error && process.env.NODE_ENV === "development") console.warn("[ai-cache] write failed:", error.message);
  } catch (err) {
    if (process.env.NODE_ENV === "development")
      console.warn("[ai-cache] write threw:", err instanceof Error ? err.message : err);
  }
}
