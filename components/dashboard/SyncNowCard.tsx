import { AlertTriangle } from "lucide-react";
import { SyncNowButton } from "./SyncNowButton";
import { formatRelativeSync } from "@/utils/date";

interface SyncNowCardProps {
  stale: boolean;
  lastSyncedAt: string | null;
}

/**
 * Non-blocking banner offering a manual refresh. When the cache is stale we
 * explain why and invite a re-sync; a gentle "synced 2h ago" appears otherwise.
 */
export function SyncNowCard({ stale, lastSyncedAt }: SyncNowCardProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
        stale ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-brand-gray/50"
      }`}
    >
      <p className="text-sm text-gray-600">
        {stale && (
          <span className="mr-2 inline-flex items-center gap-1 font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
        )}
        {stale
          ? "Your school data is over 12 hours old. Sync to see the latest."
          : formatRelativeSync(lastSyncedAt)}
      </p>
      <SyncNowButton />
    </div>
  );
}