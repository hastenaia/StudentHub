"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { AICachedResult } from "@/types/study";
import { aiCacheRowsToView } from "@/lib/aiCacheView";

/** Matches `HISTORY_LIMIT` in services/aiCache.service.ts. */
const HISTORY_LIMIT = 50;

/** Read and deletion for stored AI answers. RLS restricts every query to the caller's own rows. */
export const aiCacheClientService = {
  async listHistory(): Promise<ApiResult<AICachedResult[]>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_cache")
      .select("id, action, label, data, created_at")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) return fail(error.message);
    return ok(undefined, aiCacheRowsToView(data));
  },

  async deleteEntry(id: string): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("ai_cache").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok("Saved answer deleted.");
  },

  async clearAll(): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.from("ai_cache").delete().neq("id", "");
    if (error) return fail(error.message);
    return ok("All saved answers deleted.");
  },
};
