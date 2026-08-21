"use client";

import * as React from "react";
import type { WellnessEntry, WeeklyMoodPoint, WorkloadInfo } from "@/types/wellness";
import { MoodCheckIn } from "@/components/wellness/MoodCheckIn";
import { WeeklyMoodChart } from "@/components/wellness/WeeklyMoodChart";
import { WorkloadCard } from "@/components/wellness/WorkloadCard";
import { WellnessHistory } from "@/components/wellness/WellnessHistory";

interface Props {
  initialToday: WellnessEntry | null;
  initialHistory: WellnessEntry[];
  initialWeekly: WeeklyMoodPoint[];
  initialWorkload: WorkloadInfo;
}

export function WellnessView({ initialToday, initialHistory, initialWeekly, initialWorkload }: Props) {
  const [todayEntry, setTodayEntry] = React.useState<WellnessEntry | null>(initialToday);
  const [history, setHistory] = React.useState<WellnessEntry[]>(initialHistory);
  const [weeklyMood, setWeeklyMood] = React.useState<WeeklyMoodPoint[]>(initialWeekly);

  const handleSaved = (entry: WellnessEntry) => {
    setTodayEntry(entry);
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.entryDate !== entry.entryDate);
      return [entry, ...filtered].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 30);
    });
    setWeeklyMood((prev) => prev.map((p) => (p.date === entry.entryDate ? { ...p, mood: entry.mood } : p)));
  };

  const handleDeleted = () => {
    if (!todayEntry) return;
    const date = todayEntry.entryDate;
    setTodayEntry(null);
    setHistory((prev) => prev.filter((e) => e.entryDate !== date));
    setWeeklyMood((prev) => prev.map((p) => (p.date === date ? { ...p, mood: null } : p)));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MoodCheckIn todayEntry={todayEntry} onSaved={handleSaved} onDeleted={handleDeleted} />
        <WeeklyMoodChart data={weeklyMood} />
      </div>

      <WorkloadCard workload={initialWorkload} />

      <WellnessHistory history={history} />
    </div>
  );
}
