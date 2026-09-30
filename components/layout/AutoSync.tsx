"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { AUTO_SYNC_SESSION_KEY } from "@/lib/google/autoSync";
import type { ApiResult } from "@/types/api";

/**
 * Pulls fresh Google Classroom/Calendar data once per tab session after
 * sign-in. The server decides whether a sync is actually due (no link,
 * needs reconnect, or synced in the last few minutes → skipped), so this
 * stays silent unless something was synced or went wrong.
 */
export function AutoSync() {
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTO_SYNC_SESSION_KEY)) return;
      sessionStorage.setItem(AUTO_SYNC_SESSION_KEY, "1");
    } catch {
      // Storage unavailable: still try — the server-side minimum age prevents repeat Google calls.
    }

    void (async () => {
      try {
        const res = await fetch("/api/dashboard/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto: true }),
        });
        const result: ApiResult<{ skipped?: boolean }> = await res.json();
        if (result.success && result.data?.skipped) return;
        if (result.success) {
          toast({ title: "Google Classroom synced", variant: "success" });
          router.refresh();
        } else {
          toast({ title: "Google sync failed", description: result.message, variant: "error" });
          router.refresh(); // surfaces the reconnect banner if the link broke
        }
      } catch {
        // Offline / navigation away — the manual "Sync now" button remains available.
      }
    })();
  }, [router, toast]);

  return null;
}
