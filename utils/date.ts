/**
 * Date/time formatting helpers for the dashboard UI. All are pure and
 * timezone-agnostic wrappers around Intl so they stay SSR-safe — they're only
 * called during server-side rendering of Server Components, never from event
 * handlers, which avoids the classic hydration mismatch.
 */

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Human due-date label: "Today", "Tomorrow", "Yesterday", otherwise a date.
 * Date-only comparisons use local midnight so day boundaries behave naturally.
 */
export function formatDueLabel(iso: string | null): string {
  if (!iso) return "No due date";
  const due = new Date(iso).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((due - today) / day);

  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "Due yesterday";
  return `Due ${formatDate(iso)}`;
}

export function formatRelativeSync(iso: string | null): string {
  if (!iso) return "Never synced";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Synced just now";
  if (seconds < 3600) return `Synced ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `Synced ${Math.floor(seconds / 3600)}h ago`;
  return `Synced ${Math.floor(seconds / 86400)}d ago`;
}

/** Shortened relative timestamp for feed items ("2h ago", "Aug 12"). */
export function formatRelativeDateTime(iso: string | null): string {
  if (!iso) return "";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(iso);
}

/** True when the given timestamp is in the past (used for overdue styling). */
export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}