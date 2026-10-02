// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aiCacheKey, aiCacheLabel } from "./cacheKey";

describe("aiCacheKey", () => {
  it("is stable for the same action and inputs", () => {
    expect(aiCacheKey("explain", { concept: "osmosis", courseId: null })).toBe(aiCacheKey("explain", { concept: "osmosis", courseId: null }));
  });

  it("ignores object key order, so reordering inputs is not a new question", () => {
    expect(aiCacheKey("quiz", { content: "notes", count: 5 })).toBe(aiCacheKey("quiz", { count: 5, content: "notes" }));
  });

  it("ignores undefined values, matching an omitted field", () => {
    expect(aiCacheKey("plan", { topic: "thermo", courseName: null })).toBe(aiCacheKey("plan", { topic: "thermo", courseName: null, durationDays: undefined }));
  });

  it("changes when any input changes", () => {
    const base = aiCacheKey("summarize", { content: "a long note", title: "Biology" });
    expect(aiCacheKey("summarize", { content: "a long note!", title: "Biology" })).not.toBe(base);
    expect(aiCacheKey("summarize", { content: "a long note", title: "Chemistry" })).not.toBe(base);
    expect(aiCacheKey("flashcards", { content: "a long note", title: "Biology" })).not.toBe(base);
  });

  it("is a 64-character hex digest", () => {
    expect(aiCacheKey("explain", { concept: "x" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("orders nested objects too, and distinguishes arrays by order", () => {
    expect(aiCacheKey("quiz", { tags: { b: 1, a: 2 } })).toBe(aiCacheKey("quiz", { tags: { a: 2, b: 1 } }));
    expect(aiCacheKey("quiz", { steps: ["a", "b"] })).not.toBe(aiCacheKey("quiz", { steps: ["b", "a"] }));
  });
});

describe("aiCacheLabel", () => {
  it("collapses whitespace and keeps short text intact", () => {
    expect(aiCacheLabel("explain", "  Bayes   theorem ")).toBe("Bayes theorem");
  });

  it("truncates long text to a single-line label", () => {
    const label = aiCacheLabel("plan", "x".repeat(200));
    expect(label).toHaveLength(80);
    expect(label.endsWith("…")).toBe(true);
  });

  it("falls back to the action name when there is no text", () => {
    expect(aiCacheLabel("summarize", "   ")).toBe("summarize");
  });
});
