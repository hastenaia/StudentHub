import { describe, expect, it } from "vitest";
import {
  taskFormToDraft,
  taskFormSchema,
  toLocalInputValue,
} from "@/lib/validations/tasks";

const base = {
  title: "Finish essay",
  description: "",
  status: "todo",
  priority: "high",
  tags: "",
  dueAt: "",
  estimateMinutes: "",
  recurrenceFreq: "none",
  recurrenceInterval: "1",
  recurUntil: "",
  courseId: "",
};

function parse(over: Partial<typeof base> = {}) {
  return taskFormSchema.safeParse({ ...base, ...over });
}

describe("taskFormSchema", () => {
  it("requires a title", () => {
    expect(parse({ title: "" }).success).toBe(false);
    expect(parse({ title: "  " }).success).toBe(false);
    expect(parse().success).toBe(true);
  });

  it("validates the effort estimate", () => {
    expect(parse({ estimateMinutes: "abc" }).success).toBe(false);
    expect(parse({ estimateMinutes: "0" }).success).toBe(false);
    expect(parse({ estimateMinutes: "25" }).success).toBe(true);
    expect(parse({ estimateMinutes: "" }).success).toBe(true);
  });

  it("validates the recurrence interval", () => {
    expect(parse({ recurrenceInterval: "0" }).success).toBe(false);
    expect(parse({ recurrenceInterval: "32" }).success).toBe(false);
    expect(parse({ recurrenceInterval: "2" }).success).toBe(true);
  });

  it("rejects unknown statuses and priorities", () => {
    expect(parse({ status: "someday" }).success).toBe(false);
    expect(parse({ priority: "critical" }).success).toBe(false);
  });
});

describe("taskFormToDraft", () => {
  it("splits and trims the tag input", () => {
    const draft = taskFormToDraft(parse({ tags: "  school, essay , " }).data!);
    expect(draft.tags).toEqual(["school", "essay"]);
  });

  it("converts empty inputs to nulls", () => {
    const draft = taskFormToDraft(parse().data!);
    expect(draft.dueAt).toBeNull();
    expect(draft.estimateMinutes).toBeNull();
    expect(draft.recurrenceFreq).toBeNull();
    expect(draft.courseId).toBeNull();
    expect(draft.recurUntil).toBeNull();
  });

  it("converts date strings to ISO and recurrence 'none' to null", () => {
    const draft = taskFormToDraft(
      parse({ dueAt: "2026-08-20T14:30", recurUntil: "2026-09-01", courseId: "c1" }).data!
    );
    // The input is parsed as local time, so compare round-trips rather than a
    // fixed UTC string (the CI/runner timezone varies).
    expect(new Date(draft.dueAt!).getTime()).toBe(new Date("2026-08-20T14:30").getTime());
    expect(new Date(draft.recurUntil!).getTime()).toBe(new Date("2026-09-01").getTime());
    expect(draft.courseId).toBe("c1");
  });

  it("keeps a chosen recurrence frequency", () => {
    const draft = taskFormToDraft(parse({ recurrenceFreq: "weekly" }).data!);
    expect(draft.recurrenceFreq).toBe("weekly");
    expect(draft.recurrenceInterval).toBe(1);
  });
});

describe("toLocalInputValue", () => {
  it("produces a datetime-local value that round-trips to the same instant", () => {
    const iso = "2026-08-20T14:30:00.000Z";
    const value = toLocalInputValue(iso);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(value).getTime()).toBe(new Date(iso).getTime());
  });
});
