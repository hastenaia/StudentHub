/**
 * Narrow, typed views of the Google APIs we consume. Each interface mirrors
 * only the fields StudentHub reads, keeping the sync layer robust against
 * Google adding/removing fields we don't care about.
 */

export interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
  room?: string;
  ownerId?: string;
  descriptionHeading?: string;
  alternateLink?: string;
  courseState: "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED" | string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
}

/** A Classroom assignment ("courseWork") as seen by a student. */
export interface GoogleCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state: "PUBLISHED" | "DRAFT" | string;
  alternateLink?: string;
  dueDate?: GoogleDate | null; // need {@link createDateTime} to combine with dueTime
  dueTime?: GoogleTimeOfDay | null;
  maxPoints?: number;
  workType?: string;
  creationTime?: string;
  updateTime?: string;
}

/** The student's own submission, which carries the assigned grade. */
export interface GoogleStudentSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state: "NEW" | "CREATED" | "TURNED_IN" | "RETURNED" | "RECLAIMED_BY_STUDENT" | string;
  assignedGrade?: number | null;
  late?: boolean;
  creationTime?: string;
  updateTime?: string;
}

export interface GoogleAnnouncement {
  id: string;
  courseId: string;
  text: string;
  creatorUserId?: string;
  creator?: { userId?: string; name?: string };
  assigneeMode?: string;
  state: "PUBLISHED" | "DRAFT" | string;
  creationTime?: string;
  updateTime?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  /** RFC 3339 for timed events; absent for all-day events. */
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  transparency?: "opaque" | "transparent" | undefined;
  status?: "confirmed" | "tentative" | "cancelled" | string;
  eventType?: string;
}

/** Google's partial-date shape (used by Classroom dueDate/dueTime). */
export interface GoogleDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface GoogleTimeOfDay {
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
}

/** Paginated envelope shared by the Classroom list endpoints. */
export interface GoogleListResponse<T> {
  [itemsKey: string]: T[] | string | undefined;
  nextPageToken?: string;
}

/** Response from https://www.googleapis.com/oauth2/v3/userinfo. */
export interface GoogleUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

/** Token exchange / refresh payload from Google's token endpoint. */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
].join(" ");