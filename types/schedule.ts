export type ScheduleEventType = "class" | "assignment" | "exam" | "study_session" | "personal" | "other";

export const SCHEDULE_EVENT_TYPES: ScheduleEventType[] = [
  "class",
  "assignment",
  "exam",
  "study_session",
  "personal",
  "other",
];

export const EVENT_TYPE_LABEL: Record<ScheduleEventType, string> = {
  class: "Class",
  assignment: "Assignment",
  exam: "Exam",
  study_session: "Study Session",
  personal: "Personal",
  other: "Other",
};

export const EVENT_TYPE_COLOR: Record<ScheduleEventType, string> = {
  class: "#0033A0",
  assignment: "#0EA5E9",
  exam: "#EF4444",
  study_session: "#10B981",
  personal: "#8B5CF6",
  other: "#6B7280",
};

export interface ScheduleEvent {
  id: string;
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  title: string;
  description: string | null;
  location: string | null;
  eventType: ScheduleEventType;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string | null;
  source: "user" | "google";
  googleEventId?: string | null;
}

export interface ScheduleDraft {
  title: string;
  description: string | null;
  location: string | null;
  eventType: ScheduleEventType;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string | null;
  courseId: string | null;
}

export interface ScheduleCourseOption {
  id: string;
  name: string;
  color: string | null;
}

export type CalendarView = "month" | "week" | "day" | "agenda";
