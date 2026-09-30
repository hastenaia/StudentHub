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

export interface GoogleAccountView {
  linked: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
}