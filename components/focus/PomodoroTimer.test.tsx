import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PomodoroTimer } from "./PomodoroTimer";
import { focusClientService } from "@/services/focusClient.service";

const toast = vi.fn();
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ toast, notify: vi.fn() }) }));
vi.mock("@/services/focusClient.service", () => ({
  focusClientService: { completePomodoro: vi.fn() },
}));

const NOW = new Date("2026-09-30T12:00:00Z");

/** In-memory Storage; jsdom's localStorage isn't available under every Node version. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  toast.mockClear();
  // A slow save: the timer keeps ticking (every 250ms) while this is in flight.
  vi.mocked(focusClientService.completePomodoro).mockReset().mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve({ success: true, xp: null }), 1000))
  );
  // A 25-minute focus session restored from storage that finished 5 minutes ago.
  localStorage.setItem(
    "studenthub:PomodoroTimer:v1",
    JSON.stringify({
      focusMinutes: 25,
      breakMinutes: 5,
      preset: "25/5",
      mode: "focus",
      remaining: 0,
      isRunning: true,
      isPaused: false,
      startAt: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
      pausedRemaining: null,
      taskId: null,
      courseId: null,
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PomodoroTimer completion", () => {
  it("saves a finished focus session once, even while the save request is slow", async () => {
    render(<PomodoroTimer />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(focusClientService.completePomodoro).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls.filter(([t]) => t.title === "Focus session saved")).toHaveLength(1);
  });

  it("still completes the following break and focus session once each", async () => {
    const titles = () => toast.mock.calls.map(([t]) => t.title);
    render(<PomodoroTimer />);
    // Separate act() calls so React re-renders (and restarts the tick) between phases.
    const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    await advance(3000); // restored focus session completes
    await advance(5 * 60 * 1000 + 1000); // 5-min break
    await advance(25 * 60 * 1000 + 3000); // next 25-min focus + slow save

    expect(titles().filter((t) => t === "Break complete")).toHaveLength(1);
    expect(focusClientService.completePomodoro).toHaveBeenCalledTimes(2);
    expect(titles().filter((t) => t === "Focus session saved")).toHaveLength(2);
  });
});
