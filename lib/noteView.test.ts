import { describe, expect, it } from "vitest";
import { findOrphanPdfs, noteDraftToColumns, noteRowToView } from "./noteView";
import type { Database } from "@/types/database.types";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

const row = (over: Partial<NoteRow> = {}): NoteRow =>
  ({
    id: "n1",
    user_id: "u1",
    title: "Cells",
    content: "body",
    favorite: true,
    tags: ["bio"],
    category: "Exams",
    course_id: "c1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
    ...over,
  }) as NoteRow;

describe("noteRowToView", () => {
  it("maps columns and resolves the course", () => {
    expect(noteRowToView(row(), new Map([["c1", { name: "Biology", color: "#0a0" }]]))).toEqual({
      id: "n1",
      title: "Cells",
      content: "body",
      favorite: true,
      tags: ["bio"],
      category: "Exams",
      courseId: "c1",
      courseName: "Biology",
      courseColor: "#0a0",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-02T00:00:00Z",
    });
  });

  it("defaults missing values and leaves unknown or absent courses unnamed", () => {
    const loose = row({ favorite: null as unknown as boolean, tags: null as unknown as string[], course_id: null });
    expect(noteRowToView(loose)).toMatchObject({ favorite: false, tags: [], courseId: null, courseName: null, courseColor: null });
    expect(noteRowToView(row())).toMatchObject({ courseId: "c1", courseName: null });
  });
});

describe("noteDraftToColumns", () => {
  it("trims text, nulls blanks and normalizes the category", () => {
    expect(noteDraftToColumns({ title: " T ", content: "  ", courseId: "", tags: undefined, favorite: true, category: "  a   b " })).toEqual({
      title: "T",
      content: null,
      course_id: null,
      favorite: true,
      tags: [],
      category: "a b",
    });
  });

  it("keeps an omitted category undefined so updates leave it alone", () => {
    const cols = noteDraftToColumns({ title: "T", content: "x", courseId: "c1", tags: ["a"] });
    expect(cols).toMatchObject({ content: "x", course_id: "c1", tags: ["a"], category: undefined, favorite: undefined });
    expect(noteDraftToColumns({ title: "T", content: null, category: null }).category).toBeNull();
  });
});

describe("findOrphanPdfs", () => {
  const cutoff = Date.parse("2026-09-10T00:00:00Z");
  const obj = (name: string, created_at: string | null, id: string | null = name) => ({ id, name, created_at });

  it("returns old, unreferenced files in the user's folder", () => {
    const objects = [
      obj("old.pdf", "2026-09-01T00:00:00Z"),
      obj("linked.pdf", "2026-09-01T00:00:00Z"),
      obj("new.pdf", "2026-09-11T00:00:00Z"),
      obj("folder", null, null),
      obj("undated.pdf", null),
    ];
    expect(findOrphanPdfs("u1", objects, new Set(["u1/linked.pdf"]), cutoff)).toEqual(["u1/old.pdf"]);
  });
});
