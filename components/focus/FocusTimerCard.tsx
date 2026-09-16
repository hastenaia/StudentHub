"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, SkipForward, Timer, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { focusClientService, type LogSessionInput } from "@/services/focusClient.service";
import {
  DEFAULT_DURATIONS,
  formatCountdown,
  nextPhase,
  phaseDurationMinutes,
  phaseLabel,
  validateDurations,
  type FocusPhase,
  type PomodoroDurations,
} from "@/lib/focus";
import type { FocusCourseOption, FocusTaskOption } from "@/services/focus.service";
import { cn } from "@/utils/cn";
import { PomodoroPresets } from "./PomodoroPresets";

interface FocusTimerCardProps {
  courses: FocusCourseOption[];
  openTasks: FocusTaskOption[];
}

/**
 * Persisted timer shape — legacy key `studenthub:focus-timer-v1` is reused
 * (integrated, not a new key). Older payloads without `durations` are
 * migrated to DEFAULT_DURATIONS on rehydrate.
 *
 * All fields are validated on load; corrupt shapes are discarded to avoid
 * NaN `totalSeconds` and broken SVG progress.
 */
interface PersistedTimer {
  /** Schema version for future migrations. */
  v?: number;
  phase: FocusPhase;
  running: boolean;
  /** Epoch ms deadline while running; null while paused. */
  endAtMs: number | null;
  remainingSeconds: number;
  completedFocusCount: number;
  courseId: string | null;
  taskId: string | null;
  /** Configurable durations — validated via validateDurations. */
  durations: PomodoroDurations;
  /** Pending failed log for Retry — kept across reloads until retried or dismissed. */
  pendingRetry?: LogSessionInput | null;
}

const STORAGE_KEY = "studenthub:focus-timer-v1";
/** Tick interval — 1s is enough; 500ms was overkill. Uses deadline math so tab throttling is safe. */
const TICK_MS = 1000;

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

/**
 * Initial state factory — takes explicit durations so callers can inject
 * validated values (e.g. from localStorage or parent preset).
 */
function initialState(durations: PomodoroDurations = DEFAULT_DURATIONS): PersistedTimer {
  return {
    v: 2,
    phase: "focus",
    running: false,
    endAtMs: null,
    // Derive initial countdown from durations, not hard-coded constants.
    remainingSeconds: phaseDurationMinutes("focus", durations) * 60,
    completedFocusCount: 0,
    courseId: null,
    taskId: null,
    durations,
    pendingRetry: null,
  };
}

/**
 * Pomodoro timer with localStorage persistence so a refresh or navigation
 * doesn't lose the running session. Completing a focus phase logs a study
 * session; breaks auto-start, returning to focus requires pressing play.
 *
 * Enhancements vs legacy:
 * - Configurable focus/break/longBreak via PomodoroPresets (auto-pauses when editing while running).
 * - Legacy-integrated storage with migration + Zod validation (validateDurations).
 * - Failure handling: logSession fail keeps remaining=0, running=false and exposes Retry.
 * - Guards: isCompletingRef prevents double-log, Math.ceil for stable 25:00 display,
 *   visibilitychange pauses tick, storage event syncs multi-tab.
 */
export function FocusTimerCard({ courses, openTasks }: FocusTimerCardProps) {
  const { toast } = useToast();
  // Start with default durations — will be reconciled on rehydrate.
  const [timer, setTimer] = React.useState<PersistedTimer>(() => initialState(DEFAULT_DURATIONS));
  const [hydrated, setHydrated] = React.useState(false);
  // Guard against double-completePhase from rapid rehydrate+tick or double-click.
  // Ref for synchronous guard inside async callbacks, state for render (refs can't be read during render).
  const completingRef = React.useRef(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const timerRef = React.useRef(timer);
  React.useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Keep a ref to durations for stable tick without re-creating interval on duration change.
  const durations = timer.durations;
  const totalSeconds = React.useMemo(() => phaseDurationMinutes(timer.phase, durations) * 60, [timer.phase, durations]);

  /** Persist helper — shows toast on quota/SecurityError instead of silent swallow. */
  const persist = React.useCallback(
    (next: PersistedTimer) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        // Provide user feedback instead of silent loss (edge case: private mode, quota).
        const msg = e instanceof DOMException && e.name === "QuotaExceededError" ? "Storage full — timer will work but won't survive reload." : "Storage unavailable — timer works in-memory.";
        toast({ title: "Storage warning", description: msg, variant: "warning" });
      }
    },
    [toast]
  );

  const update = React.useCallback(
    (patch: Partial<PersistedTimer> | ((prev: PersistedTimer) => PersistedTimer)) => {
      setTimer((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        // Ensure persisted payload always has validated durations and version.
        const validated = validateDurations(next.durations) ?? DEFAULT_DURATIONS;
        const withVersion: PersistedTimer = { ...next, durations: validated, v: 2 };
        persist(withVersion);
        return withVersion;
      });
    },
    [persist]
  );

  /** Retry helper for failed logSession — re-attempts the pending payload. */
  const retryPending = React.useCallback(async () => {
    const pending = timerRef.current.pendingRetry;
    if (!pending) return;
    if (completingRef.current) return;
    completingRef.current = true;
    setIsCompleting(true);
    try {
      const result = await focusClientService.logSession(pending);
      if (result.success) {
        toast({ title: "Retried successfully", description: "Session logged.", variant: "success" });
        update({ pendingRetry: null });
      } else {
        toast({ title: "Retry failed", description: result.message, variant: "error" });
      }
    } finally {
      completingRef.current = false;
      setIsCompleting(false);
    }
  }, [toast, update]);

  /**
   * Log a finished session and advance the phase machine.
   * - Validates duration before network call.
   * - On failure: keep remaining=0, running=false, store pendingRetry, DO NOT advance phase.
   * - On success: advance via nextPhase, clear pendingRetry, auto-start breaks.
   */
  const completePhase = React.useCallback(
    async (state: PersistedTimer, nowMs: number): Promise<PersistedTimer> => {
      // Prevent re-entry from tick+rehydrate race.
      if (completingRef.current) return state;
      completingRef.current = true;
      setIsCompleting(true);
      try {
        // Use validated durations for this phase.
        const d = validateDurations(state.durations) ?? DEFAULT_DURATIONS;
        const durationSeconds = phaseDurationMinutes(state.phase, d) * 60;

        // Edge: ensure finite positive duration before logging (DB check >0).
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
          toast({ title: "Invalid phase duration", description: "Check Pomodoro presets.", variant: "error" });
          return { ...state, remainingSeconds: 0, running: false, endAtMs: null };
        }

        const endedAt = new Date(nowMs);
        const startedAt = new Date(nowMs - durationSeconds * 1000);

        const payload: LogSessionInput = {
          courseId: state.phase === "focus" ? state.courseId : null,
          taskId: state.phase === "focus" ? state.taskId : null,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSeconds,
          kind: state.phase === "focus" ? "focus" : "break",
        };

        const result = await focusClientService.logSession(payload);

        if (!result.success) {
          // Failure strategy (per clarification): keep remaining=0, running=false, expose Retry.
          toast({
            title: state.phase === "focus" ? "Focus saved failed" : "Break log failed",
            description: `${result.message} — tap Retry.`,
            variant: "error",
          });
          return {
            ...state,
            remainingSeconds: 0,
            running: false,
            endAtMs: null,
            pendingRetry: payload,
            durations: d,
          };
        }

        toast({
          title: state.phase === "focus" ? "Focus session complete 🎉" : "Break over",
          description: `${phaseLabel(state.phase)} · ${durationSeconds / 60} min logged`,
          variant: "success",
        });

        const completedFocusCount = state.phase === "focus" ? state.completedFocusCount + 1 : state.completedFocusCount;
        const next = nextPhase(state.phase, completedFocusCount);

        return {
          ...state,
          phase: next,
          completedFocusCount,
          remainingSeconds: phaseDurationMinutes(next, d) * 60,
          endAtMs: null,
          // Breaks roll on automatically; starting focus again is deliberate.
          running: next !== "focus",
          pendingRetry: null,
          durations: d,
        };
      } finally {
        completingRef.current = false;
        setIsCompleting(false);
      }
    },
    [toast]
  );

  // Rehydrate once on mount, deferred off the effect body. Handles migration,
  // validation, storage errors, and a phase that finished while away.
  React.useEffect(() => {
    const rehydrate = () => {
      let savedRaw: string | null = null;
      try {
        savedRaw = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // SecurityError in private Safari — fall through to default.
        savedRaw = null;
      }

      let saved: PersistedTimer | null = null;
      let corrupted = false;
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw) as PersistedTimer;
          // Validate shape: phase must be known, remainingSeconds finite, durations valid.
          const validPhase = parsed.phase === "focus" || parsed.phase === "break" || parsed.phase === "long_break";
          const validRemaining = Number.isFinite(parsed.remainingSeconds) && parsed.remainingSeconds >= 0 && parsed.remainingSeconds <= 7200;
          const validatedDurations = validateDurations(parsed.durations);
          if (!validPhase || !validRemaining) {
            corrupted = true;
          } else {
            saved = {
              ...parsed,
              durations: validatedDurations ?? DEFAULT_DURATIONS,
              v: 2,
              // Ensure pendingRetry is valid shape if present.
              pendingRetry: parsed.pendingRetry ?? null,
            };
          }
        } catch {
          corrupted = true;
        }
      }

      if (corrupted) {
        // Corrupt payload — discard and warn, instead of rendering NaN circle.
        toast({ title: "Timer reset", description: "Corrupt saved timer — starting fresh.", variant: "warning" });
        setTimer(initialState(DEFAULT_DURATIONS));
        setHydrated(true);
        return;
      }

      if (!saved) {
        setTimer(initialState(DEFAULT_DURATIONS));
        setHydrated(true);
        return;
      }

      // Handle case where timer was running and finished while away.
      if (saved.running && saved.endAtMs != null) {
        // Use Math.ceil for stable display (avoids flicker 25:00→24:59 early).
        const left = Math.ceil((saved.endAtMs - Date.now()) / 1000);
        if (left > 0) {
          setTimer({ ...saved, remainingSeconds: left });
          setHydrated(true);
          return;
        }
        // Finished while away — log it, then continue from the next phase.
        // Guard: if pendingRetry already exists, don't auto-log another cycle.
        if (saved.pendingRetry) {
          setTimer({ ...saved, running: false, endAtMs: null, remainingSeconds: 0 });
          setHydrated(true);
          return;
        }
        void completePhase({ ...saved, running: false }, saved.endAtMs).then((next) => {
          setTimer(next);
          persist(next);
          setHydrated(true);
        });
        return;
      }

      // Paused or idle — restore as-is, ensure not marked running.
      setTimer({ ...saved, running: false, endAtMs: null });
      setHydrated(true);
    };

    const timeout = window.setTimeout(rehydrate, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-tab sync: if another tab writes the same key, rehydrate.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        if (!e.newValue) return;
        const parsed = JSON.parse(e.newValue) as PersistedTimer;
        const validated = validateDurations(parsed.durations) ?? DEFAULT_DURATIONS;
        const validPhase = parsed.phase === "focus" || parsed.phase === "break" || parsed.phase === "long_break";
        if (!validPhase) return;
        // Don't overwrite a currently running deadline with stale paused state from another tab.
        if (timerRef.current.running && !parsed.running) return;
        setTimer((prev) => (prev.running ? prev : { ...parsed, durations: validated }));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Tick loop: derive remaining time from the persisted deadline so the
  // countdown stays accurate across tab throttling. Pauses when document hidden.
  React.useEffect(() => {
    if (!timer.running || timer.endAtMs == null) return;

    let interval: number | null = null;
    let hidden = document.hidden;

    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden && interval) {
        window.clearInterval(interval);
        interval = null;
      } else if (!hidden && !interval) {
        // Resume tick immediately on becoming visible.
        tick();
        interval = window.setInterval(tick, TICK_MS);
      }
    };

    const finish = async () => {
      if (completingRef.current) return;
      const endAtMs = timerRef.current.endAtMs ?? Date.now();
      const next = await completePhase({ ...timerRef.current, running: false }, endAtMs);
      setTimer(next);
      persist(next);
    };

    const tick = () => {
      const current = timerRef.current;
      if (!current.running || current.endAtMs == null) return;
      // Use ceil for user-facing stability; round caused 0.5s jitter.
      const left = Math.ceil((current.endAtMs - Date.now()) / 1000);
      if (left > 0) {
        // Performance: bail out if unchanged to avoid re-render.
        setTimer((prev) => (prev.remainingSeconds === left ? prev : { ...prev, remainingSeconds: left }));
      } else {
        void finish();
      }
    };

    // Immediate tick then interval.
    tick();
    interval = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (interval) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.running, timer.endAtMs]);

  const onStartPause = () => {
    // Guard rapid clicks and not-hydrated.
    if (!hydrated || isCompleting) return;
    if (timer.pendingRetry) {
      toast({ title: "Retry needed", description: "Please retry the failed log before starting.", variant: "warning" });
      return;
    }
    if (timer.running) {
      // Pause: freeze remaining from deadline.
      update({
        running: false,
        remainingSeconds: Math.max(0, Math.ceil(((timer.endAtMs ?? Date.now()) - Date.now()) / 1000)),
        endAtMs: null,
      });
    } else {
      // Start: set deadline from remainingSeconds.
      // Edge: if remaining is 0 (after failure), reset to full phase duration.
      const remaining = timer.remainingSeconds > 0 ? timer.remainingSeconds : phaseDurationMinutes(timer.phase, durations) * 60;
      update({ running: true, endAtMs: Date.now() + remaining * 1000, remainingSeconds: remaining });
    }
  };

  const onReset = () => {
    if (!hydrated || isCompleting) return;
    // Reset clears pending retry as well (user explicitly abandons).
    update({
      running: false,
      endAtMs: null,
      remainingSeconds: phaseDurationMinutes(timer.phase, durations) * 60,
      pendingRetry: null,
    });
  };

  const onSkip = () => {
    if (!hydrated || isCompleting) return;
    // Skip abandons current phase without logging — intentional.
    update((prev) => {
      const next = nextPhase(prev.phase, prev.completedFocusCount);
      const d = validateDurations(prev.durations) ?? DEFAULT_DURATIONS;
      return {
        ...prev,
        phase: next,
        remainingSeconds: phaseDurationMinutes(next, d) * 60,
        running: false,
        endAtMs: null,
        pendingRetry: null,
      };
    });
  };

  const onSwitchPhase = (phase: FocusPhase) => {
    if (timer.running || phase === timer.phase || !hydrated || isCompleting) return;
    const d = validateDurations(durations) ?? DEFAULT_DURATIONS;
    update({ phase, remainingSeconds: phaseDurationMinutes(phase, d) * 60, endAtMs: null, pendingRetry: null });
  };

  /**
   * Handle preset duration changes.
   * - If running, auto-pause (per clarification 2) — required UX.
   * - If paused and remaining equals old total (at phase start), adjust remaining to new total.
   * - Otherwise keep current remaining so mid-phase edits don't jump the countdown.
   */
  const handleDurationsChange = (nextDurations: PomodoroDurations) => {
    const validated = validateDurations(nextDurations) ?? DEFAULT_DURATIONS;
    const wasRunning = timerRef.current.running;
    // Auto-pause if running — compute left then apply new durations.
    if (wasRunning) {
      const left = Math.max(0, Math.ceil(((timerRef.current.endAtMs ?? Date.now()) - Date.now()) / 1000));
      const oldPhase = timerRef.current.phase;
      const oldTotal = phaseDurationMinutes(oldPhase, timerRef.current.durations) * 60;
      const shouldAdjust = left === oldTotal || timerRef.current.remainingSeconds === oldTotal;
      const newTotal = phaseDurationMinutes(oldPhase, validated) * 60;
      update({
        running: false,
        endAtMs: null,
        remainingSeconds: shouldAdjust ? newTotal : left,
        durations: validated,
        pendingRetry: null,
      });
      toast({ title: "Paused to apply", description: `New durations: ${validated.focus}/${validated.break}/${validated.longBreak} min`, variant: "default" });
      return;
    }

    // Paused: decide if remaining should snap to new total (at phase start) or stay.
    setTimer((prev) => {
      const oldTotal = phaseDurationMinutes(prev.phase, prev.durations) * 60;
      const newTotal = phaseDurationMinutes(prev.phase, validated) * 60;
      const shouldAdjust = prev.remainingSeconds === oldTotal;
      const next: PersistedTimer = {
        ...prev,
        durations: validated,
        remainingSeconds: shouldAdjust ? newTotal : prev.remainingSeconds,
        v: 2,
      };
      persist(next);
      return next;
    });
  };

  // Performance: memoize progress calc to avoid re-render churn.
  const progress = totalSeconds > 0 ? timer.remainingSeconds / totalSeconds : 0;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;

  // Duration auto-pause disables preset while completing to avoid race.
  const presetsDisabled = !hydrated || isCompleting || !!timer.pendingRetry;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-brand-royal" /> Focus timer
          {/* Phase label with accent — kept from original */}
          <span className={cn("ml-auto text-sm font-medium", PHASE_ACCENT[timer.phase])}>
            {phaseLabel(timer.phase)}
            {timer.completedFocusCount > 0 && (
              <span className="ml-2 text-xs text-gray-400">{timer.completedFocusCount} done today-ish</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* Configurable presets — integrated into timer (legacy storage, auto-pause). */}
        <div className="w-full max-w-md">
          <PomodoroPresets durations={durations} onDurationsChange={handleDurationsChange} disabled={presetsDisabled} />
        </div>

        {/* Pending retry banner — error handling for logSession fail (remaining=0, running=false). */}
        {timer.pendingRetry && (
          <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="flex-1 text-red-800">Failed to log {timer.pendingRetry.kind} session — tap Retry.</span>
            <Button size="sm" variant="outline" onClick={retryPending} disabled={isCompleting}>
              <RotateCw className="h-4 w-4" /> Retry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update({ pendingRetry: null })}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Phase tabs — accessible with aria and disabled while running/completing */}
        <div className="flex gap-1 rounded-full bg-brand-gray p-1" role="tablist" aria-label="Pomodoro phase">
          {(["focus", "break", "long_break"] as FocusPhase[]).map((phase) => (
            <button
              key={phase}
              type="button"
              role="tab"
              aria-selected={timer.phase === phase}
              onClick={() => onSwitchPhase(phase)}
              disabled={timer.running || !hydrated || isCompleting || !!timer.pendingRetry}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                timer.phase === phase ? "bg-white text-brand-royal shadow-sm" : "text-gray-500 hover:text-brand-dark"
              )}
            >
              {phaseLabel(phase)}
            </button>
          ))}
        </div>

        {/* Circular progress — accessible progressbar */}
        <div className="relative h-56 w-56">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full -rotate-90"
            role="progressbar"
            aria-valuenow={timer.remainingSeconds}
            aria-valuemin={0}
            aria-valuemax={totalSeconds}
            aria-label={`${phaseLabel(timer.phase)} — ${formatCountdown(timer.remainingSeconds)} remaining`}
          >
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
            {/* Live countdown — aria-live for screen readers */}
            <span className="text-4xl font-bold tabular-nums text-brand-dark" aria-live="polite" aria-atomic="true">
              {formatCountdown(timer.remainingSeconds)}
            </span>
            <span className="mt-1 text-xs text-gray-400">{hydrated && timer.running ? "in progress" : hydrated ? "ready" : "…"}</span>
            {timer.pendingRetry && <span className="mt-1 text-xs font-medium text-red-600">needs retry</span>}
          </div>
        </div>

        {/* Controls — guarded against rapid clicks and pendingRetry */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={onStartPause}
            disabled={!hydrated || isCompleting || !!timer.pendingRetry}
            aria-label={timer.running ? "Pause timer" : "Start timer"}
            aria-busy={isCompleting}
          >
            {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {timer.running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="lg" onClick={onReset} disabled={!hydrated || isCompleting} aria-label="Reset timer">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkip} disabled={!hydrated || isCompleting} aria-label="Skip phase">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
        </div>

        {/* Course / task selectors — only for focus phase, preserved from original */}
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
                disabled={isCompleting}
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
                disabled={isCompleting}
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
