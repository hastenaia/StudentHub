import { describe, expect, it } from "vitest";
import { inferEventType } from "./eventTypeInference";

describe("inferEventType", () => {
  it("detects exams, assignments and classes", () => {
    expect(inferEventType("Midterm — Organic Chemistry").type).toBe("exam");
    expect(inferEventType("Problem Set 7 Due").type).toBe("assignment");
    expect(inferEventType("Advanced Calculus Lecture").type).toBe("class");
  });

  it("detects personal and study events", () => {
    expect(inferEventType("Dentist Appointment").type).toBe("personal");
    expect(inferEventType("Gym").type).toBe("personal");
    expect(inferEventType("Study Group").type).toBe("study_session");
  });

  it("is case insensitive and tolerates punctuation", () => {
    expect(inferEventType("FINAL EXAM").type).toBe("exam");
    expect(inferEventType("homework, due friday").type).toBe("assignment");
  });

  it("matches on word boundaries only", () => {
    expect(inferEventType("Classic Music Recital").type).toBe("other");
    expect(inferEventType("Reclassify forms").type).toBe("other");
  });

  it("applies precedence so specific beats generic", () => {
    expect(inferEventType("Lab Report due").type).toBe("assignment");
    expect(inferEventType("Midterm Review Session").type).toBe("exam");
    expect(inferEventType("Practice Exam").type).toBe("exam");
  });

  it("reads the description when the title is inconclusive", () => {
    expect(inferEventType("Untitled block", "final exam at 9am").type).toBe("exam");
  });

  it("falls back to other when nothing matches", () => {
    expect(inferEventType("CS Sprint Demo")).toEqual({ type: "other", matched: null });
    expect(inferEventType("").type).toBe("other");
    expect(inferEventType("   ").type).toBe("other");
  });

  it("reports which keyword matched", () => {
    expect(inferEventType("Midterm — Organic Chemistry")).toEqual({
      type: "exam",
      matched: "midterm",
    });
  });
});
