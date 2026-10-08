import { googleFetch } from "@/lib/google/tokens";
import type {
  GoogleAnnouncement,
  GoogleCourse,
  GoogleCourseWork,
  GoogleListResponse,
  GoogleStudentSubmission,
  GoogleTeacher,
} from "@/types/google";

/**
 * Thin clients for the Google Classroom API. Each function handles pagination
 * (pageToken loop) so the sync service can stay focused on merging data.
 * All calls require a fresh access token and are server-only.
 */

const CLASSROOM_ROOT = "https://classroom.googleapis.com/v1";

/** Generic pageToken loop; `key` is the JSON field that holds the items. */
async function paginate<T>(
  accessToken: string,
  url: string,
  key: string
): Promise<T[]> {
  const items: T[] = [];
  let nextPageToken: string | undefined;

  do {
    const separator = url.includes("?") ? "&" : "?";
    const pageUrl = nextPageToken
      ? `${url}${separator}${new URLSearchParams({ pageToken: nextPageToken })}`
      : url;

    const page = await googleFetch<GoogleListResponse<T>>(pageUrl, accessToken);
    const pageItems = (page[key] ?? []) as T[];
    items.push(...pageItems);
    nextPageToken = typeof page.nextPageToken === "string" ? page.nextPageToken : undefined;
  } while (nextPageToken);

  return items;
}

/** Enrolled courses that are currently active (excludes archived drafts). */
export function listCourses(accessToken: string): Promise<GoogleCourse[]> {
  return paginate<GoogleCourse>(
    accessToken,
    `${CLASSROOM_ROOT}/courses?courseStates=ACTIVE`,
    "courses"
  );
}

/** Teachers of a course (names need classroom.rosters.readonly). */
export function listTeachers(accessToken: string, courseId: string): Promise<GoogleTeacher[]> {
  return paginate<GoogleTeacher>(accessToken, `${CLASSROOM_ROOT}/courses/${courseId}/teachers`, "teachers");
}

/** All published/draft "courseWork" items for a course. */
export function listCourseWork(
  accessToken: string,
  courseId: string
): Promise<GoogleCourseWork[]> {
  return paginate<GoogleCourseWork>(
    accessToken,
    `${CLASSROOM_ROOT}/courses/${courseId}/courseWork`,
    "courseWork"
  );
}

/**
 * The student's own submissions for every courseWork item in a course, in one
 * paginated call (`courseWork/-`). Covered by `classroom.coursework.me.readonly`.
 */
export function listMySubmissions(
  accessToken: string,
  courseId: string
): Promise<GoogleStudentSubmission[]> {
  return paginate<GoogleStudentSubmission>(
    accessToken,
    `${CLASSROOM_ROOT}/courses/${courseId}/courseWork/-/studentSubmissions`,
    "studentSubmissions"
  );
}

/** Announcements published to a course's stream. */
export function listAnnouncements(
  accessToken: string,
  courseId: string
): Promise<GoogleAnnouncement[]> {
  return paginate<GoogleAnnouncement>(
    accessToken,
    `${CLASSROOM_ROOT}/courses/${courseId}/announcements`,
    "announcements"
  );
}