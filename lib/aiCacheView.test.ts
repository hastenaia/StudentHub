import { describe, expect, it } from "vitest";
import { aiCacheAgeLabel, aiCacheRowToView, aiCacheRowsToView } from "./aiCacheView";
import type { Database } from "@/types/database.types";

type AiCacheRow = Database["public"]["Tables"]["ai_cache"]["Row"];

const row = (over: Partial<AiCacheRow> = {}): AiCacheRow => ({
  id: "c1",
  user_id: "u1",
  cache_key: "k1",
  action: "summarize",
  label: "Biology",
  data: { summary: "cell division" },
  created_at: "2026-10-01T12:00:00.000Z",
  updated_at: "2026-10-01T12:00:00.000Z",
  ...over,
});

describe("aiCacheRowToView", () => {
  it("maps snake_case columns to the view model", () => {
    expect(aiCacheRowToView(row())).toEqual({
      id: "c1",
      action: "summarize",
      label: "Biology",
      data: { summary: "cell division" },
      createdAt: "2026-10-01T12:00:00.000Z",
    });
  });

  it("drops rows whose action is no longer known", () => {
    expect(aiCacheRowToView(row({ action: "wellness-tip" }))).toBeNull();
  });
});

describe("aiCacheRowsToView", () => {
  it("keeps valid rows and skips unknown actions", () => {
    const view = aiCacheRowsToView([row(), row({ id: "c2", action: "nonsense" }), row({ id: "c3", action: "quiz" })]);
    expect(view.map((v) => v.id)).toEqual(["c1", "c3"]);
  });
});

describe("aiCacheAgeLabel", () => {
  const at = (iso: string) => new Date(iso).getTime();

  it("reads just now under a minute", () => {
    expect(aiCacheAgeLabel("2026-10-01T12:00:00.000Z", at("2026-10-01T12:00:30.000Z"))).toBe("just now");
  });

  it("uses minutes, hours, then days", () => {
    expect(aiCacheAgeLabel("2026-10-01T12:00:00.000Z", at("2026-10-01T12:05:00.000Z"))).toBe("5m ago");
    expect(aiCacheAgeLabel("2026-10-01T12:00:00.000Z", at("2026-10-01T15:30:00.000Z"))).toBe("3h ago");
    expect(aiCacheAgeLabel("2026-10-01T12:00:00.000Z", at("2026-10-04T12:00:00.000Z"))).toBe("3d ago");
  });

  it("falls back to a date beyond a week", () => {
    const label = aiCacheAgeLabel("2026-09-01T12:00:00.000Z", at("2026-10-01T12:00:00.000Z"));
    expect(label).not.toContain("ago");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns empty for an unparseable timestamp", () => {
    expect(aiCacheAgeLabel("not-a-date", Date.now())).toBe("");
  });
});
