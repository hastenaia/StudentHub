"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { focusClientService } from "@/services/focusClient.service";
import {
  formatCountdown,
  nextPhase,
  phaseDurationMinutes,
  phaseLabel,
  type FocusPhase,
} from "@/lib/focus";
import type { FocusCourseOption, FocusTaskOption } from "@/services/focus.service";
import { cn } from "@/utils/cn";

interface FocusTimerCardProps {
  courses: FocusCourseOption[];
  openTasks: FocusTaskOption[];
}

interface PersistedTimer {
  phase: FocusPhase;
  running: boolean;
  /** Epoch ms deadline while running; null while paused. */
  endAtMs: number | null;
  remainingSeconds: number;
  completedFocusCount: number;
  courseId: string | null;
  taskId: string | null;
}

const STORAGE_KEY = "studenthub:focus-timer-v1";
const TICK_MS = 500;

const PHASE_ACCENT: Record<FocusPhase, string> = {
  focus: "text-brand-royal",
  break: "text-emerald-600",
  long_break: "text-amber-600",
};

const PHASE_STROKE: Record<FocusPhase, string> = {
  focus: "stroke-brand-royal",
  break: "stroke-emerald-500",
  long_break: "stroke-amber-500",
};

function initialState(): PersistedTimer {
  return {
    phase: "focus",
    running: false,
    endAtMs: null,
    remainingSeconds: phaseDurationMinutes("focus") * 60,
    completedFocusCount: 0,
    courseId: null,
    taskId: null,
  };
}

/**
 * Pomodoro timer with localStorage persistence so a refresh or navigation
 * doesn't lose the running session. Completing a focus phase logs a study
 * session; breaks auto-start, returning to focus requires pressing play.
 */
export function FocusTimerCard({ courses, openTasks }: FocusTimerCardProps) {
  const { toast } = useToast();
  const [timer, setTimer] = React.useState<PersistedTimer>(initialState);
  const [hydrated, setHydrated] = React.useState(false);
  const timerRef = React.useRef(timer);
  React.useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const totalSeconds = phaseDurationMinutes(timer.phase) * 60;

  const persist = React.useCallback((next: PersistedTimer) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode etc.) — timer still works in-memory.
    }
  }, []);

  const update = React.useCallback(
    (patch: Partial<PersistedTimer> | ((prev: PersistedTimer) => PersistedTimer)) => {
      setTimer((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  /** Log a finished session and advance the phase machine. */
  const completePhase = React.useCallback(
    async (state: PersistedTimer, nowMs: number): Promise<PersistedTimer> => {
      const durationSeconds = phaseDurationMinutes(state.phase) * 60;
      const endedAt = new Date(nowMs);
      const startedAt = new Date(nowMs - durationSeconds * 1000);

      const result = await focusClientService.logSession({
        courseId: state.phase === "focus" ? state.courseId : null,
        taskId: state.phase === "focus" ? state.taskId : null,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds,
        kind: state.phase === "focus" ? "focus" : "break",
      });

      toast({
        title: state.phase === "focus" ? "Focus session complete 🎉" : "Break over",
        description: result.success
          ? `${phaseLabel(state.phase)} · ${durationSeconds / 60} min logged`
          : result.message,
        variant: result.success ? "success" : "error",
      });

      const completedFocusCount =
        state.phase === "focus" ? state.completedFocusCount + 1 : state.completedFocusCount;
      const next = nextPhase(state.phase, completedFocusCount);

      return {
        ...state,
        phase: next,
        completedFocusCount,
        remainingSeconds: phaseDurationMinutes(next) * 60,
        endAtMs: null,
        // Breaks roll on automatically; starting focus again is deliberate.
        running: next !== "focus",
      };
    },
    [toast]
  );

  // Rehydrate once on mount, deferred off the effect body. A phase that
  // finished while away is logged late.
  React.useEffect(() => {
    const rehydrate = () => {
      let saved: PersistedTimer | null = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) saved = JSON.parse(raw) as PersistedTimer;
      } catch {
        saved = null;
      }

      if (!saved) {
        setHydrated(true);
        return;
      }

      if (saved.running && saved.endAtMs != null) {
        const left = Math.round((saved.endAtMs - Date.now()) / 1000);
        if (left > 0) {
          setTimer({ ...saved, remainingSeconds: left });
          setHydrated(true);
          return;
        }
        // Finished while away — log it, then continue from the next phase.
        void completePhase({ ...saved, running: false }, saved.endAtMs).then((next) => {
          setTimer(next);
          setHydrated(true);
        });
        return;
      }

      setTimer({ ...saved, running: false, endAtMs: null });
      setHydrated(true);
    };

    const timeout = window.setTimeout(rehydrate, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick loop: derive remaining time from the persisted deadline so the
  // countdown stays accurate across tab throttling.
  React.useEffect(() => {
    if (!timer.running || timer.endAtMs == null) return;

    const finish = async () => {
      const endAtMs = timerRef.current.endAtMs ?? Date.now();
      const next = await completePhase({ ...timerRef.current, running: false }, endAtMs);
      setTimer(next);
      persist(next);
    };

    const tick = () => {
      const current = timerRef.current;
      if (!current.running || current.endAtMs == null) return;
      const left = Math.round((current.endAtMs - Date.now()) / 1000);
      if (left > 0) {
        setTimer((prev) => (prev.remainingSeconds === left ? prev : { ...prev, remainingSeconds: left }));
      } else {
        void finish();
      }
    };

    tick();
    const interval = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.running, timer.endAtMs]);

  const onStartPause = () => {
    if (timer.running) {
      update({
        running: false,
        remainingSeconds: Math.max(0, Math.round(((timer.endAtMs ?? Date.now()) - Date.now()) / 1000)),
        endAtMs: null,
      });
    } else {
      update({ running: true, endAtMs: Date.now() + timer.remainingSeconds * 1000 });
    }
  };

  const onReset = () => {
    update({
      running: false,
      endAtMs: null,
      remainingSeconds: phaseDurationMinutes(timer.phase) * 60,
    });
  };

  const onSkip = () => {
    update((prev) => {
      const next = nextPhase(prev.phase, prev.completedFocusCount);
      return {
        ...prev,
        phase: next,
        remainingSeconds: phaseDurationMinutes(next) * 60,
        running: false,
        endAtMs: null,
      };
    });
  };

  const onSwitchPhase = (phase: FocusPhase) => {
    if (timer.running || phase === timer.phase) return;
    update({ phase, remainingSeconds: phaseDurationMinutes(phase) * 60, endAtMs: null });
  };

  const progress = totalSeconds > 0 ? timer.remainingSeconds / totalSeconds : 0;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-brand-royal" /> Focus timer
          <span className={cn("ml-auto text-sm font-medium", PHASE_ACCENT[timer.phase])}>
            {phaseLabel(timer.phase)}
            {timer.completedFocusCount > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                {timer.completedFocusCount} done today-ish
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="flex gap-1 rounded-full bg-brand-gray p-1">
          {(["focus", "break", "long_break"] as FocusPhase[]).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => onSwitchPhase(phase)}
              disabled={timer.running || !hydrated}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                timer.phase === phase
                  ? "bg-white text-brand-royal shadow-sm"
                  : "text-gray-500 hover:text-brand-dark"
              )}
            >
              {phaseLabel(phase)}
            </button>
          ))}
        </div>

        <div className="relative h-56 w-56">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={radius} className="fill-none stroke-gray-100" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              className={cn("fill-none transition-[stroke-dashoffset] duration-500", PHASE_STROKE[timer.phase])}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums text-brand-dark">
              {formatCountdown(timer.remainingSeconds)}
            </span>
            <span className="mt-1 text-xs text-gray-400">
              {hydrated && timer.running ? "in progress" : hydrated ? "ready" : "…"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="lg" onClick={onStartPause} disabled={!hydrated}>
            {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {timer.running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="lg" onClick={onReset} disabled={!hydrated}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkip} disabled={!hydrated}>
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
        </div>

        {timer.phase === "focus" && (
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="focus-course" className="mb-1 block text-xs font-medium text-gray-500">
                Studying for (optional)
              </label>
              <Select
                id="focus-course"
                value={timer.courseId ?? ""}
                onChange={(e) => update({ courseId: e.target.value || null })}
              >
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="focus-task" className="mb-1 block text-xs font-medium text-gray-500">
                Working on (optional)
              </label>
              <Select
                id="focus-task"
                value={timer.taskId ?? ""}
                onChange={(e) => update({ taskId: e.target.value || null })}
              >
                <option value="">No task</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
