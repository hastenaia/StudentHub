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
  /** Current scaled grade points on the configured scale (null until graded). */
  gradePoints: number | null;
  /** 0..1 fraction of total points earned across graded + possible work. */
  progress: number | null;
  /** Per-course grade goal (0-100); null falls back to the default target. */
  targetPct: number | null;
  /** Weighted points (creditHours * gradePoints), used by the GPA rollup. */
  weightedPoints: number | null;
  /** Assignments due soon, pre-sorted ascending by due_at. */
  upcomingAssignments: DashboardAssignment[];
}

export interface DashboardAssignment {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueAt: string | null;
  maxPoints: number | null;
  grade: number | null;
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
  /** GPA summary computed from courses + settings. */
  gpa: GpaViewModel;
  courses: DashboardCourse[];
  /** Global list of soonest deadlines (across all courses), sorted ascending. */
  upcoming: DashboardAssignment[];
  announcements: DashboardAnnouncement[];
  calendarEvents: CalendarEvent[];
  targetGpa: number;
  /** The user's configured grading scale (for letter-grade display). */
  gradeScale: Record<string, number>;
}

export interface GpaViewModel {
  gpa: number | null;
  completedCredits: number;
  totalCredits: number;
  gradedCourseCount: number;
  courseCount: number;
  /** Average still needed on remaining graded work to reach targetGpa. */
  neededAverage: number | null;
  /** True when the target is no longer achievable with the entered scale. */
  targetUnreachable: boolean;
}

export interface AcademicSettingsView {
  targetGpa: number;
  gradeScale: Record<string, number>;
}

export interface GoogleAccountView {
  linked: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
}