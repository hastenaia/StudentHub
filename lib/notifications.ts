export type NotificationKind = "announcement" | "deadline" | "overdue";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string | null;
  href: string;
  at: string | null;
}

export interface AnnouncementInput {
  id: string;
  text: string;
  courseName?: string | null;
  publishTime?: string | null;
}

export interface DeadlineInput {
  id: string;
  title: string;
  courseName?: string | null;
  dueAt?: string | null;
  kind: "task" | "assignment";
}

export interface OverdueInput {
  id: string;
  title: string;
  courseName?: string | null;
  dueAt?: string | null;
}

const MAX_ITEMS = 8;

function timeValue(at: string | null | undefined): number {
  if (!at) return 0;
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? 0 : ms;
}

export function toNotificationItems(
  announcements: AnnouncementInput[],
  deadlines: DeadlineInput[],
  overdue: OverdueInput[]
): NotificationItem[] {
  const items: NotificationItem[] = [
    ...overdue.map((t) => ({
      id: `overdue-${t.id}`,
      kind: "overdue" as const,
      title: t.title,
      subtitle: t.dueAt ? `Overdue${t.courseName ? ` • ${t.courseName}` : ""}` : (t.courseName ?? null),
      href: "/dashboard/tasks",
      at: t.dueAt ?? null,
    })),
    ...deadlines.map((d) => ({
      id: `deadline-${d.kind}-${d.id}`,
      kind: "deadline" as const,
      title: d.title,
      subtitle: d.courseName ?? null,
      href: d.kind === "task" ? "/dashboard/tasks" : "/dashboard",
      at: d.dueAt ?? null,
    })),
    ...announcements.map((a) => ({
      id: `announcement-${a.id}`,
      kind: "announcement" as const,
      title: a.text.length > 80 ? `${a.text.slice(0, 80)}…` : a.text,
      subtitle: a.courseName ?? null,
      href: "/dashboard",
      at: a.publishTime ?? null,
    })),
  ];

  return items
    .sort((a, b) => {
      // Overdue first, then by recency (newest first for announcements, soonest first for deadlines
      // is handled by callers pre-sorting; here overdue wins, otherwise newest timestamp wins).
      if (a.kind === "overdue" && b.kind !== "overdue") return -1;
      if (b.kind === "overdue" && a.kind !== "overdue") return 1;
      return timeValue(b.at) - timeValue(a.at);
    })
    .slice(0, MAX_ITEMS);
}

export function hasUnread(items: NotificationItem[] | null | undefined): boolean {
  return !!items && items.length > 0;
}
