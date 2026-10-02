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
  assignment: "#F59E0B",
  exam: "#DC2626",
  study_session: "#14B8A6",
  personal: "#10B981",
  other: "#6B7280",
};

export const EVENT_TYPE_ON_COLOR: Record<ScheduleEventType, string> = {
  class: "#FFFFFF",
  assignment: "#1F1300",
  exam: "#FFFFFF",
  study_session: "#04231F",
  personal: "#022C20",
  other: "#FFFFFF",
};

export function isScheduleEventType(value: unknown): value is ScheduleEventType {
  return typeof value === "string" && SCHEDULE_EVENT_TYPES.includes(value as ScheduleEventType);
}

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
