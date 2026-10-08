import { describe, expect, it } from "vitest";
import {
  formatMinutesShort,
  getOverviewSummary,
  isAnalyticsTab,
  type AnalyticsOverviewInput,
} from "./analyticsSummary";

const base: AnalyticsOverviewInput = {
  tasks: { completed: 3, total: 4, completionRate: 75 },
  focus: { weeklyMinutes: 125, weeklySessions: 5 },
  study: { notesCreated: 2, quizzesCompleted: 1, studySessions: 3 },
  wellness: { avgMood: 4.2, checkIns: 5 },
  insights: ["a", "b", "c", "d"],
};

describe("formatMinutesShort", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutesShort(45)).toBe("45m");
    expect(formatMinutesShort(60)).toBe("1h");
    expect(formatMinutesShort(125)).toBe("2h 5m");
  });
});

describe("getOverviewSummary", () => {
  it("builds 4 KPIs from existing data", () => {
    const summary = getOverviewSummary(base);
    expect(summary.kpis).toHaveLength(4);
    expect(summary.kpis[0]).toMatchObject({ id: "completion", value: "75%" });
    expect(summary.kpis[1]).toMatchObject({ id: "focus", value: "2h 5m" });
    expect(summary.kpis[2]).toMatchObject({ id: "study", value: "6" });
    expect(summary.kpis[3]).toMatchObject({ id: "mood", value: "4.2/5" });
  });

  it("splits top vs remaining insights (2 + rest)", () => {
    const summary = getOverviewSummary(base);
    expect(summary.topInsights).toEqual(["a", "b"]);
    expect(summary.remainingInsights).toEqual(["c", "d"]);
    expect(summary.totalInsights).toBe(4);
  });

  it("handles empty data gracefully", () => {
    const summary = getOverviewSummary({
      tasks: { completed: 0, total: 0, completionRate: 0 },
      focus: { weeklyMinutes: 0, weeklySessions: 0 },
      study: { notesCreated: 0, quizzesCompleted: 0, studySessions: 0 },
      wellness: { avgMood: null, checkIns: 0 },
      insights: [],
    });
    expect(summary.kpis[0].sub).toBe("No tasks yet");
    expect(summary.kpis[3].value).toBe("—");
    expect(summary.topInsights).toEqual([]);
    expect(summary.totalInsights).toBe(0);
  });
});

describe("isAnalyticsTab", () => {
  it("validates tab ids", () => {
    expect(isAnalyticsTab("overview")).toBe(true);
    expect(isAnalyticsTab("wellness")).toBe(true);
    expect(isAnalyticsTab("nope")).toBe(false);
    expect(isAnalyticsTab(undefined)).toBe(false);
  });
});
