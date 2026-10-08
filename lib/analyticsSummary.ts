// Pure overview derivations for the Analytics tabbed view.
// Kept in lib/ so it stays testable without Supabase or React.

export interface AnalyticsOverviewInput {
  tasks: { completed: number; total: number; completionRate: number };
  focus: { weeklyMinutes: number; weeklySessions: number };
  study: {
    notesCreated: number;
    quizzesCompleted: number;
    studySessions: number;
  };
  wellness: { avgMood: number | null; checkIns: number };
  insights: string[];
}

export interface OverviewKpi {
  id: "completion" | "focus" | "study" | "mood";
  label: string;
  value: string;
  sub: string;
}

export interface OverviewSummary {
  kpis: OverviewKpi[];
  topInsights: string[];
  remainingInsights: string[];
  totalInsights: number;
}

export function formatMinutesShort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const TOP_INSIGHT_COUNT = 2;

export function getOverviewSummary(input: AnalyticsOverviewInput): OverviewSummary {
  const studyActivity =
    input.study.notesCreated + input.study.quizzesCompleted + input.study.studySessions;
  const kpis: OverviewKpi[] = [
    {
      id: "completion",
      label: "Task completion",
      value: `${input.tasks.completionRate}%`,
      sub:
        input.tasks.total === 0
          ? "No tasks yet"
          : `${input.tasks.completed} of ${input.tasks.total} done`,
    },
    {
      id: "focus",
      label: "Focus this week",
      value: formatMinutesShort(input.focus.weeklyMinutes),
      sub: `${input.focus.weeklySessions} session${input.focus.weeklySessions === 1 ? "" : "s"}`,
    },
    {
      id: "study",
      label: "Study activity",
      value: `${studyActivity}`,
      sub: `${input.study.notesCreated} notes • ${input.study.quizzesCompleted} quizzes • ${input.study.studySessions} sessions`,
    },
    {
      id: "mood",
      label: "Avg mood",
      value: input.wellness.avgMood === null ? "—" : `${input.wellness.avgMood}/5`,
      sub:
        input.wellness.checkIns === 0
          ? "No check-ins yet"
          : `${input.wellness.checkIns} check-in${input.wellness.checkIns === 1 ? "" : "s"}`,
    },
  ];
  return {
    kpis,
    topInsights: input.insights.slice(0, TOP_INSIGHT_COUNT),
    remainingInsights: input.insights.slice(TOP_INSIGHT_COUNT),
    totalInsights: input.insights.length,
  };
}

export const ANALYTICS_TABS = [
  "overview",
  "tasks",
  "focus",
  "study",
  "productivity",
  "wellness",
] as const;

export type AnalyticsTabId = (typeof ANALYTICS_TABS)[number];

export function isAnalyticsTab(value: unknown): value is AnalyticsTabId {
  return (
    typeof value === "string" && (ANALYTICS_TABS as readonly string[]).includes(value)
  );
}
