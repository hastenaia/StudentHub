/**
 * Sync-on-sign-in rule. The dashboard shell fires one `{ auto: true }` sync per
 * browser tab session; the route asks this whether it's worth calling Google.
 * The minimum age keeps reloads, new tabs and the post-connect sync from
 * re-hitting Google's quota.
 */
export const AUTO_SYNC_MIN_AGE_MS = 10 * 60 * 1000;

export interface AutoSyncAccount {
  needs_reconnect: boolean;
  last_synced_at: string | null;
}

export function shouldAutoSync(account: AutoSyncAccount | null, now: number, minAgeMs = AUTO_SYNC_MIN_AGE_MS): boolean {
  if (!account || account.needs_reconnect) return false;
  if (!account.last_synced_at) return true;
  const last = Date.parse(account.last_synced_at);
  return Number.isNaN(last) || now - last >= minAgeMs;
}

/** sessionStorage flag: this tab already attempted its sign-in sync. Cleared on logout. */
export const AUTO_SYNC_SESSION_KEY = "studenthub:autosync";
