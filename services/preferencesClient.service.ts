"use client";

import { createClient } from "@/lib/supabase/client";
import { fail, ok, type ApiResult } from "@/types/api";
import type { Theme } from "@/lib/theme";

export const preferencesClientService = {
  async saveTheme(theme: Theme): Promise<ApiResult> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Not signed in");

    const { error } = await supabase
      .from("profiles")
      .update({ theme })
      .eq("id", user.id);
    if (error) return fail(error.message);
    return ok();
  },
};