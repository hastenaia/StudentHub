export interface MoodEntry {
  id: string;
  date: string;
  score: number;
  journal: string;
}

export const mockMoodEntries: MoodEntry[] = [
  { id: "m1", date: "2026-08-19", score: 4, journal: "Good flow today, finished titration report. Feeling confident." },
  { id: "m2", date: "2026-08-18", score: 2, journal: "Overwhelmed — 3 deadlines this week. Didn't sleep well." },
  { id: "m3", date: "2026-08-17", score: 5, journal: "Great study group session! History essay outline done." },
];

export const WELLNESS_TIPS = [
  "Try a 5-minute breathing exercise: inhale 4s, hold 4s, exhale 6s.",
  "Take a walk outside — 10 minutes of daylight resets focus.",
  "Pomodoro break idea: stretch, hydrate, look 20ft away for 20s.",
];
