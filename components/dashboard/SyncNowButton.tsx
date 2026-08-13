"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import type { ApiResult } from "@/types/api";

/**
 * "Sync now" button. Calls the server-side sync endpoint, then refreshes the
 * server-rendered dashboard so the fresh cache is displayed. Disabled while a
 * sync is in flight to avoid slamming Google's quota.
 */
export function SyncNowButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [syncing, setSyncing] = React.useState(false);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/dashboard/sync", { method: "POST" });
      const result: ApiResult = await res.json();

      toast({
        title: result.success ? "Data synced" : "Sync failed",
        description: result.message,
        variant: result.success ? "success" : "error",
      });
      // Re-render the server component tree for fresh cache data.
      router.refresh();
    } catch {
      toast({ title: "Sync failed", description: "Could not reach the server.", variant: "error" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onSync}
      isLoading={syncing}
      disabled={syncing}
    >
      {!syncing && <RefreshCw className="h-4 w-4" />}
      Sync now
    </Button>
  );
}