import type { Database } from "@/types/database.types";
import type { CourseOption, Note, NoteDraft } from "@/types/study";
import { normalizeCategory } from "@/lib/noteCategories";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"];

/** Map a raw notes row (DB snake_case) to the UI view model; course names resolve only with a `courseMap`. */
export function noteRowToView(row: NoteRow, courseMap: Map<string, Pick<CourseOption, "name" | "color">> = new Map()): Note {
  const course = courseMap.get(row.course_id ?? "");
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    favorite: row.favorite ?? false,
    tags: row.tags ?? [],
    category: row.category,
    courseId: row.course_id,
    courseName: course?.name ?? null,
    courseColor: course?.color ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Column values shared by insert and update. On update an omitted `category` stays undefined, which leaves the stored value alone. */
export function noteDraftToColumns(draft: NoteDraft) {
  return {
    title: draft.title.trim(),
    content: draft.content?.trim() || null,
    course_id: draft.courseId || null,
    favorite: draft.favorite,
    tags: draft.tags ?? [],
    category: draft.category === undefined ? undefined : normalizeCategory(draft.category),
  } satisfies NoteUpdate;
}

/** Storage paths in the user's folder that are old enough and referenced by no attachment row. */
export function findOrphanPdfs(
  userId: string,
  objects: { id: string | null; name: string; created_at: string | null }[],
  referenced: Set<string>,
  cutoff: number
): string[] {
  return objects
    .filter((o) => o.id && Date.parse(o.created_at ?? "") < cutoff)
    .map((o) => `${userId}/${o.name}`)
    .filter((p) => !referenced.has(p));
}
