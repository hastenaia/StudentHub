"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plug, Unplug } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { academicsClientService } from "@/services/academicsClient.service";
import { useToast } from "@/hooks/useToast";
import { SyncNowButton } from "@/components/dashboard/SyncNowButton";
import { formatRelativeSync } from "@/utils/date";
import type { GoogleAccountView } from "@/types/academics";

interface GoogleConnectionCardProps {
  account: GoogleAccountView;
}

/**
 * Google connection management shown in Settings: connect when unlinked,
 * otherwise shows the linked account, last sync time and a Disconnect button.
 * Disconnect is destructive and removes the cached Google data.
 */
export function GoogleConnectionCard({ account }: GoogleConnectionCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const onDisconnect = async () => {
    setBusy(true);
    const result = await academicsClientService.disconnectGoogle();
    toast({
      title: result.success ? "Disconnected" : "Something went wrong",
      description: result.message,
      variant: result.success ? "success" : "error",
    });
    setBusy(false);
    router.refresh();
  };

  if (!account.linked) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Link your Google account to power the academic dashboard. We only ever request
          read-only access to Calendar and Classroom.
        </p>
        <div>
          <Link href="/api/google/auth" className={buttonVariants()}>
            <Plug className="h-4 w-4" /> Connect Google
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-dark">{account.email}</p>
          <p className="text-xs text-gray-500">
            {formatRelativeSync(account.lastSyncedAt)}
            {account.needsReconnect && " · needs your attention"}
          </p>
          {account.needsReconnect && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Access was revoked or expired. Reconnect below to keep syncing.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SyncNowButton />
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisconnect}
            isLoading={busy}
            disabled={busy}
          >
            {!busy && <Unplug className="h-4 w-4" />}
            Disconnect
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Sync pulls your latest Google data on demand. Disconnecting removes your cached
        classrooms and calendar events but keeps your StudentHub account.
      </p>
    </div>
  );
}