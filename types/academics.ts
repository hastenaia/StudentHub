/**
 * View models for the Academic Dashboard. These are the shapes the UI
 * consumes — assembled server-side from the Supabase cache by the academics
 * service, never straight from Google API responses.
 */

export interface DashboardCourse {
  id: string;
  name: string;
  section: string | null;
  room: string | null;
  teacherName: string | null;
  color: string | null;
  source: "classroom" | "manual";
  creditHours: number;
  /** Assignments due soon, pre-sorted ascending by due_at. */
  upcomingAssignments: DashboardAssignment[];
}

export interface DashboardAssignment {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueAt: string | null;
  description: string | null;
  submitted: boolean;
}

export interface DashboardAnnouncement {
  id: string;
  text: string;
  courseName: string;
  creatorName: string | null;
  publishTime: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  location: string | null;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
}

export interface DashboardData {
  /** True when a Google account is linked and tokens are usable. */
  googleLinked: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
  /** True when the cache is older than the staleness threshold. */
  stale: boolean;
  courses: DashboardCourse[];
  /** Global list of soonest deadlines (across all courses), sorted ascending. */
  upcoming: DashboardAssignment[];
  announcements: DashboardAnnouncement[];
  calendarEvents: CalendarEvent[];
}

export interface GoogleAccountView {
  linked: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
}