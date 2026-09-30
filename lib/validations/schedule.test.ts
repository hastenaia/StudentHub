import { describe, expect, it } from "vitest";
import { EMPTY_SCHEDULE_FORM, scheduleDraftToForm, scheduleEventSchema, scheduleFormToDraft } from "@/lib/validations/schedule";
import { toLocalInputValue } from "@/lib/validations/tasks";

const base = {
  title: "Lecture",
  description: "",
  location: "",
  eventType: "class",
  startAt: "2026-09-15T09:00",
  endAt: "2026-09-15T10:00",
  allDay: false,
  color: "",
  courseId: "",
};
const parse = (over: Record<string, unknown> = {}) => scheduleEventSchema.safeParse({ ...base, ...over });

describe("scheduleEventSchema", () => {
  it("accepts a valid event, with or without a course", () => {
    expect(parse().success).toBe(true);
    expect(parse({ courseId: null }).success).toBe(true);
    expect(parse({ courseId: "c1" }).success).toBe(true);
  });

  it("requires a title, start and end", () => {
    expect(parse({ title: "  " }).success).toBe(false);
    expect(parse({ startAt: "" }).success).toBe(false);
    expect(parse({ endAt: "" }).success).toBe(false);
  });

  it("rejects unknown event types", () => {
    expect(parse({ eventType: "party" }).success).toBe(false);
  });

  it("requires the end to be after the start, reported on endAt", () => {
    const same = parse({ endAt: base.startAt });
    expect(same.success).toBe(false);
    if (!same.success) expect(same.error.issues[0].path).toEqual(["endAt"]);
    expect(parse({ endAt: "2026-09-15T08:00" }).success).toBe(false);
  });

  it("enforces length limits", () => {
    expect(parse({ title: "x".repeat(121) }).success).toBe(false);
    expect(parse({ description: "x".repeat(501) }).success).toBe(false);
    expect(parse({ location: "x".repeat(101) }).success).toBe(false);
  });
});

describe("schedule form mapping", () => {
  const draft = {
    title: "Lecture",
    description: null,
    location: "Room 1",
    eventType: "class" as const,
    startAt: "2026-09-15T09:00:00.000Z",
    endAt: "2026-09-15T10:00:00.000Z",
    allDay: false,
    color: null,
    courseId: null,
  };

  it("maps a draft to form values, blanking nulls", () => {
    expect(scheduleDraftToForm(draft)).toEqual({
      title: "Lecture",
      description: "",
      location: "Room 1",
      eventType: "class",
      startAt: toLocalInputValue(draft.startAt),
      endAt: toLocalInputValue(draft.endAt),
      allDay: false,
      color: "",
      courseId: "",
    });
  });

  it("starts a new event empty, or at 09:00–10:00 local on a default date", () => {
    expect(scheduleDraftToForm(null)).toBe(EMPTY_SCHEDULE_FORM);
    const form = scheduleDraftToForm(null, "2026-09-20T15:30:00");
    expect(form.startAt).toBe("2026-09-20T09:00");
    expect(form.endAt).toBe("2026-09-20T10:00");
  });

  it("maps form values back to a draft, trimming and nulling blanks", () => {
    const back = scheduleFormToDraft({ ...scheduleDraftToForm(draft), title: " Lecture ", location: "  ", color: " red ", courseId: "c1" });
    expect(back).toEqual({ ...draft, location: null, color: "red", courseId: "c1" });
  });

  it("maps an empty draft end-to-end", () => {
    expect(scheduleDraftToForm({ ...draft, startAt: "", endAt: "" })).toMatchObject({ startAt: "", endAt: "" });
  });
});
