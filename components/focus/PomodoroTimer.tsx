/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/exhaustive-deps */
"use client";

import * as React from "react";
import { Play, Pause, RotateCcw, SkipForward, Settings, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { focusClientService } from "@/services/focusClient.service";
import type { Task } from "@/types/tasks";

type Preset = "25/5" | "50/10" | "custom";
type Mode = "focus" | "break";

interface PomodoroTimerProps {
  initialTask?: Task | null;
  tasks?: Task[];
}

const STORAGE_KEY = "studenthub:PomodoroTimer:v1";

interface PersistedState {
  focusMinutes: number;
  breakMinutes: number;
  preset: Preset;
  mode: Mode;
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  startAt: string | null;
  pausedRemaining: number | null;
  taskId: string | null;
  courseId: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer({ initialTask, tasks = [] }: PomodoroTimerProps) {
  const { toast } = useToast();

  const [preset, setPreset] = React.useState<Preset>("25/5");
  const [customFocus, setCustomFocus] = React.useState("25");
  const [customBreak, setCustomBreak] = React.useState("5");
  const [focusMinutes, setFocusMinutes] = React.useState(25);
  const [breakMinutes, setBreakMinutes] = React.useState(5);

  const [mode, setMode] = React.useState<Mode>("focus");
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [startAt, setStartAt] = React.useState<string | null>(null);
  const [pausedRemaining, setPausedRemaining] = React.useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(initialTask?.id ?? null);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(initialTask?.courseId ?? null);

  const selectedTask = React.useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? initialTask ?? null, [tasks, selectedTaskId, initialTask]);

  // Initialize from preset
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (preset === "25/5") {
      setFocusMinutes(25);
      setBreakMinutes(5);
      if (!isRunning) setRemaining(25 * 60);
    } else if (preset === "50/10") {
      setFocusMinutes(50);
      setBreakMinutes(10);
      if (!isRunning) setRemaining(50 * 60);
    }
  }, [preset, isRunning]);

  // Custom preset handling
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (preset === "custom") {
      const f = parseInt(customFocus, 10);
      const b = parseInt(customBreak, 10);
      if (!isNaN(f) && f > 0 && f <= 180) {
        setFocusMinutes(f);
        if (!isRunning && mode === "focus") setRemaining(f * 60);
      }
      if (!isNaN(b) && b > 0 && b <= 60) {
        setBreakMinutes(b);
        if (!isRunning && mode === "break") setRemaining(b * 60);
      }
    }
  }, [customFocus, customBreak, preset, isRunning, mode]);

  // Load persisted state on mount (refresh handling)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: PersistedState = JSON.parse(raw);
      const age = saved.startAt ? Date.now() - new Date(saved.startAt).getTime() : Infinity;
      if (age > 4 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setFocusMinutes(saved.focusMinutes);
      setBreakMinutes(saved.breakMinutes);
      setPreset(saved.preset);
      setMode(saved.mode);
      setIsRunning(saved.isRunning);
      setIsPaused(saved.isPaused);
      setStartAt(saved.startAt);
      setPausedRemaining(saved.pausedRemaining);
      setSelectedTaskId(saved.taskId);
      setSelectedCourseId(saved.courseId);
      if (saved.isRunning && !saved.isPaused && saved.startAt) {
        const elapsed = Math.floor((Date.now() - new Date(saved.startAt).getTime()) / 1000);
        const total = saved.mode === "focus" ? saved.focusMinutes * 60 : saved.breakMinutes * 60;
        const rem = Math.max(0, total - elapsed);
        if (saved.pausedRemaining !== null) {
          setRemaining(saved.pausedRemaining);
        } else {
          setRemaining(rem);
        }
      } else if (saved.pausedRemaining !== null) {
        setRemaining(saved.pausedRemaining);
      } else {
        setRemaining(saved.remaining);
      }
      if (saved.taskId) setSelectedTaskId(saved.taskId);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state
  React.useEffect(() => {
    const state: PersistedState = {
      focusMinutes,
      breakMinutes,
      preset,
      mode,
      remaining,
      isRunning,
      isPaused,
      startAt,
      pausedRemaining,
      taskId: selectedTaskId,
      courseId: selectedCourseId,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [focusMinutes, breakMinutes, preset, mode, remaining, isRunning, isPaused, startAt, pausedRemaining, selectedTaskId, selectedCourseId]);

  const handleComplete = React.useCallback(async () => {
    const wasFocus = mode === "focus";
    const completedDuration = wasFocus ? focusMinutes : breakMinutes;
    const startedAt = startAt ?? new Date(Date.now() - completedDuration * 60 * 1000).toISOString();
    const endedAt = new Date().toISOString();

    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = wasFocus ? 880 : 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}

    if (wasFocus) {
      const res = await focusClientService.completePomodoro(
        completedDuration,
        startedAt,
        endedAt,
        selectedTaskId,
        selectedCourseId ?? selectedTask?.courseId ?? null
      );
      if (res.success) {
        toast({ title: "Focus session saved", description: `${completedDuration} min • ${selectedTask ? selectedTask.title : "No task"}`, variant: "success" });
      } else {
        toast({ title: "Could not save session", description: res.message, variant: "error" });
      }
      setMode("break");
      setRemaining(breakMinutes * 60);
      setStartAt(new Date().toISOString());
      setIsRunning(true);
      setIsPaused(false);
      setPausedRemaining(null);
    } else {
      toast({ title: "Break complete", description: "Ready for next focus?", variant: "success" });
      setMode("focus");
      setRemaining(focusMinutes * 60);
      setStartAt(new Date().toISOString());
      setIsRunning(true);
      setIsPaused(false);
      setPausedRemaining(null);
    }

    try {
      if (navigator.vibrate) navigator.vibrate(wasFocus ? [100, 50, 100] : 50);
    } catch {}
  }, [mode, focusMinutes, breakMinutes, startAt, selectedTaskId, selectedCourseId, selectedTask, toast]);

  // Timer tick — Date-based to handle tab switching
  React.useEffect(() => {
    if (!isRunning || isPaused || !startAt) return;

    const tick = () => {
      const startMs = new Date(startAt).getTime();
      const total = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60;
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const rem = Math.max(0, total - elapsed);
      setRemaining(rem);

      if (rem <= 0) {
        handleComplete();
      }
    };

    const id = window.setInterval(tick, 250);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isRunning, isPaused, startAt, mode, focusMinutes, breakMinutes, handleComplete]);

  const handleStart = () => {
    if (isRunning && !isPaused) return;
    if (isPaused && pausedRemaining !== null) {
      const total = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60;
      const elapsed = total - pausedRemaining;
      const newStart = new Date(Date.now() - elapsed * 1000).toISOString();
      setStartAt(newStart);
      setIsPaused(false);
      setIsRunning(true);
      setPausedRemaining(null);
    } else {
      setStartAt(new Date().toISOString());
      setIsRunning(true);
      setIsPaused(false);
      setPausedRemaining(null);
      if (mode === "focus" && remaining !== focusMinutes * 60) {
        setRemaining(focusMinutes * 60);
      } else if (mode === "break" && remaining !== breakMinutes * 60) {
        setRemaining(breakMinutes * 60);
      }
    }
  };

  const handlePause = () => {
    if (!isRunning || isPaused) return;
    setIsPaused(true);
    setPausedRemaining(remaining);
  };

  const handleResume = () => {
    handleStart();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setStartAt(null);
    setPausedRemaining(null);
    setRemaining(mode === "focus" ? focusMinutes * 60 : breakMinutes * 60);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleSkip = () => {
    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    setMode(nextMode);
    setRemaining(nextMode === "focus" ? focusMinutes * 60 : breakMinutes * 60);
    setStartAt(new Date().toISOString());
    setIsPaused(false);
    setIsRunning(true);
    setPausedRemaining(null);
    toast({ title: `Skipped to ${nextMode}`, variant: "success" });
  };

  const handlePresetChange = (p: Preset) => {
    if (isRunning) return;
    setPreset(p);
  };

  const progress = mode === "focus" ? (1 - remaining / (focusMinutes * 60)) * 100 : (1 - remaining / (breakMinutes * 60)) * 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-brand-royal" /> Focus Timer
          <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${mode === "focus" ? "bg-brand-royal text-white" : "bg-emerald-100 text-emerald-700"}`}>
            {mode === "focus" ? "Focus" : "Break"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Preset:</span>
          <Button
            variant={preset === "25/5" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("25/5")}
            disabled={isRunning}
            className="h-8"
          >
            25/5
          </Button>
          <Button
            variant={preset === "50/10" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("50/10")}
            disabled={isRunning}
            className="h-8"
          >
            50/10
          </Button>
          <Button
            variant={preset === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("custom")}
            disabled={isRunning}
            className="h-8 gap-1"
          >
            <Settings className="h-3.5 w-3.5" /> Custom
          </Button>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">Focus</Label>
              <Input type="number" min={1} max={180} value={customFocus} onChange={(e) => setCustomFocus(e.target.value)} className="h-8 w-16" disabled={isRunning} />
              <span className="text-xs text-gray-500">min</span>
              <Label className="text-xs">Break</Label>
              <Input type="number" min={1} max={60} value={customBreak} onChange={(e) => setCustomBreak(e.target.value)} className="h-8 w-16" disabled={isRunning} />
              <span className="text-xs text-gray-500">min</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Focus task (optional)</Label>
            <Select
              value={selectedTaskId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setSelectedTaskId(id);
                const t = tasks.find((x) => x.id === id);
                if (t?.courseId) setSelectedCourseId(t.courseId);
              }}
            >
              <option value="">No task — general focus</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.courseName ? `• ${t.courseName}` : ""} ({t.status})
                </option>
              ))}
            </Select>
          </div>
          {selectedTask && (
            <div className="rounded-md bg-brand-gray/40 px-3 py-2 text-xs text-gray-600">
              Focusing: <span className="font-medium text-brand-dark">{selectedTask.title}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-gray-100 bg-white shadow-inner">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={mode === "focus" ? "#0033A0" : "#10b981"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.827} 282.7`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums text-brand-dark">{formatTime(remaining)}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">{mode === "focus" ? `${focusMinutes} min focus` : `${breakMinutes} min break`}</p>
              {isPaused && <p className="text-xs text-amber-600">Paused</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} size="lg" className="gap-2">
                <Play className="h-4 w-4" /> Start
              </Button>
            ) : isPaused ? (
              <Button onClick={handleResume} size="lg" className="gap-2">
                <Play className="h-4 w-4" /> Resume
              </Button>
            ) : (
              <Button onClick={handlePause} variant="outline" size="lg" className="gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            <Button onClick={handleReset} variant="outline" size="lg" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleSkip} variant="ghost" size="lg" className="gap-2">
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400">
            {isRunning ? (mode === "focus" ? "Focus session running — stay on task" : "Break — breathe and recharge") : "Ready to focus? Choose a task and press Start"}
            <br />
            <span className="text-[11px]">Refresh or switch tabs — timer continues via wall clock.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
