"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { WellnessEntry } from "@/types/wellness";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const wellnessClientService = {
  async upsertEntry(mood: number, journal: string | null): Promise<ApiResult<WellnessEntry>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    if (mood < 1 || mood > 5) return fail("Mood must be between 1 and 5.");

    const entryDate = toDateStr(new Date());
    const payload = {
      user_id: user.id,
      entry_date: entryDate,
      mood,
      journal: journal?.trim() || null,
    };

    const { data, error } = await supabase
      .from("wellness_entries")
      .upsert(payload, { onConflict: "user_id,entry_date" })
      .select()
      .single();

    if (error) return fail(error.message);
    const entry: WellnessEntry = {
      id: (data as { id: string }).id,
      entryDate: (data as { entry_date: string }).entry_date,
      mood: (data as { mood: number }).mood as WellnessEntry["mood"],
      journal: (data as { journal: string | null }).journal,
      createdAt: (data as { created_at: string }).created_at,
      updatedAt: (data as { updated_at: string }).updated_at,
    };
    return ok("Wellness entry saved.", entry);
  },

  async deleteEntry(entryDate: string): Promise<ApiResult> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail("You must be signed in.");
    const { error } = await supabase.from("wellness_entries").delete().eq("user_id", user.id).eq("entry_date", entryDate);
    if (error) return fail(error.message);
    return ok("Entry deleted.");
  },
};
