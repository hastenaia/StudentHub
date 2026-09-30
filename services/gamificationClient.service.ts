"use client";

import { createClient } from "@/lib/supabase/client";
import { parseAwardResult } from "@/lib/gamification";
import type { AwardResult } from "@/types/gamification";

/**
 * Client-side XP awards. Points are computed by the server RPCs from the
 * referenced row, so callers only pass ids. Awards are best-effort: a failure
 * resolves to null and never fails the action being rewarded.
 */

function toAward({ data, error }: { data: unknown; error: unknown }): AwardResult | null {
  return error ? null : parseAwardResult(data);
}

export const gamificationClientService = {
  async awardTask(taskId: string): Promise<AwardResult | null> {
    return toAward(await createClient().rpc("award_task_xp", { p_task_id: taskId }));
  },

  async awardFocus(sessionId: string): Promise<AwardResult | null> {
    return toAward(await createClient().rpc("award_focus_xp", { p_session_id: sessionId }));
  },

  async awardJournal(entryDate: string): Promise<AwardResult | null> {
    return toAward(await createClient().rpc("award_journal_xp", { p_entry_date: entryDate }));
  },
};
