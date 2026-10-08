"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Heart,
  LayoutDashboard,
  ListTodo,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsFocus } from "@/components/analytics/AnalyticsFocus";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";
import { AnalyticsProductivity } from "@/components/analytics/AnalyticsProductivity";
import { AnalyticsStudy } from "@/components/analytics/AnalyticsStudy";
import { AnalyticsTasks } from "@/components/analytics/AnalyticsTasks";
import { AnalyticsWellness } from "@/components/analytics/AnalyticsWellness";
import { BarChart, LineDots } from "@/components/analytics/BarChart";
import { getOverviewSummary, type AnalyticsTabId } from "@/lib/analyticsSummary";
import type { AnalyticsData } from "@/services/analytics.service";

interface AnalyticsViewProps {
  data: AnalyticsData;
  initialTab: AnalyticsTabId;
}

const TABS: { id: AnalyticsTabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "productivity", label: "Productivity", icon: TrendingUp },
  { id: "wellness", label: "Wellness", icon: Heart },
];

const KPI_ICONS: Record<string, LucideIcon> = {
  completion: CheckCircle2,
  focus: Timer,
  study: BookOpen,
  mood: Heart,
};

function OverviewPanel({ data, onExplore }: { data: AnalyticsData; onExplore: (tab: AnalyticsTabId) => void }) {
  const summary = React.useMemo(() => getOverviewSummary(data), [data]);
  const [expanded, setExpanded] = React.useState(false);
  const visibleInsights = expanded ? data.insights : summary.topInsights;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.id] ?? CheckCircle2;
          return (
            <Card key={kpi.id}>
              <CardContent className="px-4 py-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs font-medium text-gray-500">
                  <Icon className="h-3.5 w-3.5" /> {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">{kpi.value}</p>
                <p className="mt-1 truncate text-xs text-gray-500" title={kpi.sub}>
                  {kpi.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visibleInsights.length > 0 ? (
        <AnalyticsInsights insights={visibleInsights} />
      ) : (
        <Card>
          <CardContent className="px-4 py-4 text-center text-sm text-gray-500">
            Not enough activity yet — complete a task or start a focus session to see insights.
          </CardContent>
        </Card>
      )}
      {summary.remainingInsights.length > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            {expanded ? "Show fewer insights" : `Show all ${summary.totalInsights} insights`}
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">Explore details</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {TABS.filter((t) => t.id !== "overview").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onExplore(t.id)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-brand-dark shadow-sm transition-colors hover:bg-gray-50"
            >
              <t.icon className="h-4 w-4 text-brand-royal" /> {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tabbed shell: one calm Overview plus one focused section at a time. All charts kept, relocated per tab. */
export function AnalyticsView({ data, initialTab }: AnalyticsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = React.useState<AnalyticsTabId>(initialTab);
  const tablistRef = React.useRef<HTMLDivElement>(null);

  const selectTab = React.useCallback(
    (next: AnalyticsTabId) => {
      setTab(next);
      router.replace(`${pathname}?tab=${next}`, { scroll: false });
    },
    [pathname, router]
  );

  const onTablistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.id === tab);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(idx + delta + TABS.length) % TABS.length];
    selectTab(next.id);
    const btn = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab="${next.id}"]`
    );
    btn?.focus();
  };

  return (
    <div className="space-y-4">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Analytics sections"
        onKeyDown={onTablistKeyDown}
        className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-transparent px-1 py-1"
      >
        <div className="flex min-w-max gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:min-w-0 sm:flex-wrap">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                data-tab={t.id}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-royal text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <OverviewPanel data={data} onExplore={selectTab} />}

        {tab === "tasks" && (
          <div className="space-y-4">
            <AnalyticsTasks data={data.tasks} />
            <BarChart
              title="Task velocity"
              description="Tasks completed per day"
              data={data.productivity.taskTrend.map((d) => ({ label: d.label, value: d.count }))}
              color="bg-emerald-500"
              valueLabel=""
              emptyText="No tasks completed this week — tick one off in Tasks."
            />
          </div>
        )}

        {tab === "focus" && (
          <div className="space-y-4">
            <AnalyticsFocus data={data.focus} />
            <BarChart
              title="Focus session hours"
              description="Minutes per day — last 7 days"
              data={data.focus.dailyTrend.map((d) => ({ label: d.label, value: d.minutes }))}
              color="bg-brand-royal"
              valueLabel="m"
              emptyText="No focus sessions this week — start a Pomodoro on the Focus page."
            />
            {data.focus.weeklyTrend.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.focus.weeklyTrend.map((w) => (
                  <div key={w.week} className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs text-gray-500">{w.week}</p>
                    <p className="text-lg font-semibold text-brand-dark">{w.minutes}m</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-1.5 bg-brand-royal"
                        style={{ width: `${Math.min(100, (w.minutes / 180) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "study" && <AnalyticsStudy data={data.study} />}

        {tab === "productivity" && <AnalyticsProductivity data={data.productivity} />}

        {tab === "wellness" && (
          <div className="space-y-4">
            <AnalyticsWellness data={data.wellness} />
            <LineDots
              data={data.wellness.moodTrend.map((d) => ({ label: d.label, value: d.mood ?? 0 }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
