import type { GoogleTeacher } from "@/types/google";

/** Display name of a course's teacher: the owner if listed, else the first named teacher. Never an ID. */
export function teacherNameFor(ownerId: string | undefined, teachers: GoogleTeacher[]): string | null {
  const name = (t?: GoogleTeacher) => t?.profile?.name?.fullName?.trim() || null;
  return name(teachers.find((t) => t.userId === ownerId)) ?? teachers.map(name).find(Boolean) ?? null;
}
