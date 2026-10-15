"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FocusStats } from "@/components/focus/FocusStats";
import { PomodoroTimer } from "@/components/focus/PomodoroTimer";
import type { Task } from "@/types/tasks";

interface FocusDashboardProps {
  stats: {
    todayMinutes: number;
    todaySessions: number;
    weeklyMinutes: number;
    weeklySessions: number;
    monthlyMinutes: number;
    monthlySessions: number;
    streak: number;
    totalMinutes?: number;
    totalSessions?: number;
  };
  initialTask?: Task | null;
  tasks?: Task[];
}

/** Owns the live numbers so the stat cards follow the running timer instead of waiting for a page reload. */
export function FocusDashboard({ stats, initialTask, tasks }: FocusDashboardProps) {
  const router = useRouter();
  const [liveMinutes, setLiveMinutes] = React.useState(0);
  const [recorded, setRecorded] = React.useState({ minutes: 0, sessions: 0 });

  // Fresh server numbers already include sessions recorded here, so drop the local delta when they change.
  const serverKey = `${stats.todayMinutes}:${stats.todaySessions}:${stats.weeklyMinutes}:${stats.monthlyMinutes}`;
  const [prevKey, setPrevKey] = React.useState(serverKey);
  if (serverKey !== prevKey) {
    setPrevKey(serverKey);
    setRecorded({ minutes: 0, sessions: 0 });
  }

  const handleProgress = React.useCallback((seconds: number) => setLiveMinutes(Math.floor(seconds / 60)), []);
  const handleComplete = React.useCallback((minutes: number) => {
    setRecorded((r) => ({ minutes: r.minutes + minutes, sessions: r.sessions + 1 }));
  }, []);
  const handleSaveResult = React.useCallback(
    (minutes: number, ok: boolean) => {
      if (ok) router.refresh();
      else setRecorded((r) => ({ minutes: r.minutes - minutes, sessions: r.sessions - 1 }));
    },
    [router]
  );

  const extra = recorded.minutes + liveMinutes;

  return (
    <>
      <FocusStats
        {...stats}
        todayMinutes={stats.todayMinutes + extra}
        todaySessions={stats.todaySessions + recorded.sessions}
        weeklyMinutes={stats.weeklyMinutes + extra}
        weeklySessions={stats.weeklySessions + recorded.sessions}
        monthlyMinutes={stats.monthlyMinutes + extra}
        monthlySessions={stats.monthlySessions + recorded.sessions}
      />
      <PomodoroTimer
        initialTask={initialTask}
        tasks={tasks}
        onFocusProgress={handleProgress}
        onSessionComplete={handleComplete}
        onSessionSaved={handleSaveResult}
      />
    </>
  );
}
