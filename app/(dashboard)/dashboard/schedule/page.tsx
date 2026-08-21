import { CalendarDays, Clock, MapPin, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatDate, formatDueLabel, isOverdue } from "@/utils/date";

export const metadata = { title: "Schedule — StudentHub" };

interface TimelineItem {
  dateKey: string;
  dateLabel: string;
  sortTime: number;
  kind: "event" | "assignment";
  id: string;
  title: string;
  subtitle: string | null;
  timeLabel: string;
  location: string | null;
  isOverdue?: boolean;
}

function toDateKey(iso: string | null): string {
  if (!iso) return "No date";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateLabel(iso: string | null): string {
  if (!iso) return "No date";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso);
}

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-gray-500">You need to be signed in to view this page.</p>;
  }

  const [eventsRes, assignmentsRes, coursesRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_at", { ascending: true })
      .limit(50),
    supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(50),
    supabase.from("courses").select("id, name").eq("user_id", user.id).eq("archived", false),
  ]);

  const eventRows = eventsRes.data ?? [];
  const assignmentRows = assignmentsRes.data ?? [];
  const courseNameById = new Map((coursesRes.data ?? []).map((c) => [c.id, c.name]));

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const items: TimelineItem[] = [];

  for (const e of eventRows) {
    const start = e.start_at;
    items.push({
      dateKey: toDateKey(start),
      dateLabel: toDateLabel(start),
      sortTime: start ? new Date(start).getTime() : Number.MAX_SAFE_INTEGER,
      kind: "event",
      id: `event-${e.id}`,
      title: e.summary,
      subtitle: e.description ? e.description.slice(0, 120) : null,
      timeLabel: e.all_day ? "All day" : formatTime(start),
      location: e.location,
    });
  }

  for (const a of assignmentRows) {
    const dueAt = a.due_at;
    if (!dueAt) continue;
    // Include overdue and upcoming — past items beyond 7 days are less useful but keep for context
    const dueTime = new Date(dueAt).getTime();
    if (dueTime < now - 7 * 24 * 60 * 60 * 1000) continue;
    items.push({
      dateKey: toDateKey(dueAt),
      dateLabel: toDateLabel(dueAt),
      sortTime: dueTime,
      kind: "assignment",
      id: `assignment-${a.id}`,
      title: a.title,
      subtitle: courseNameById.get(a.course_id) ?? null,
      timeLabel: formatDueLabel(dueAt),
      location: null,
      isOverdue: isOverdue(dueAt) && !a.submitted,
    });
  }

  items.sort((a, b) => a.sortTime - b.sortTime);

  // Group by date
  const grouped = new Map<string, { label: string; items: TimelineItem[] }>();
  for (const item of items) {
    const existing = grouped.get(item.dateKey);
    if (existing) existing.items.push(item);
    else grouped.set(item.dateKey, { label: item.dateLabel, items: [item] });
  }

  const groups = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 14);

  const totalEvents = eventRows.length;
  const totalAssignments = assignmentRows.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">Schedule</h2>
        <p className="mt-1 text-sm text-gray-500">
          {items.length === 0
            ? "Your calendar events and assignment deadlines will appear here."
            : `${totalEvents} calendar event${totalEvents === 1 ? "" : "s"} · ${totalAssignments} assignment${totalAssignments === 1 ? "" : "s"} with due dates`}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-royal/10">
              <CalendarDays className="h-6 w-6 text-brand-royal" />
            </div>
            <p className="text-sm font-medium text-brand-dark">No upcoming items</p>
            <p className="max-w-sm text-sm text-gray-500">
              Connect Google Calendar and Classroom from Settings, or sync from the dashboard to
              populate your schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([dateKey, group]) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-brand-royal" />
                  {group.label}
                  <span className="text-xs font-normal text-gray-400">
                    {group.items[0]?.sortTime
                      ? new Date(group.items[0].sortTime).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${
                        item.isOverdue
                          ? "border-amber-200 bg-amber-50/60"
                          : "border-gray-100 bg-brand-gray/30"
                      }`}
                    >
                      <div
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          item.kind === "event"
                            ? "bg-brand-royal/10 text-brand-royal"
                            : item.isOverdue
                              ? "bg-amber-100 text-amber-700"
                              : "bg-white text-brand-royal border border-gray-100"
                        }`}
                      >
                        {item.kind === "event" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
                        )}
                        {item.location && (
                          <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                            <MapPin className="h-3 w-3" /> {item.location}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-xs font-medium ${item.isOverdue ? "text-amber-700" : "text-gray-500"}`}
                        >
                          {item.timeLabel}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {item.kind === "event" ? "Calendar" : "Assignment"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
