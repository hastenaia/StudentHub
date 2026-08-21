export type MoodValue = 1 | 2 | 3 | 4 | 5;

export const MOOD_LABELS: Record<MoodValue, string> = {
  1: "Very Low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Very Good",
};

export const MOOD_EMOJI: Record<MoodValue, string> = {
  1: "😔",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😊",
};

export const MOOD_COLORS: Record<MoodValue, string> = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-orange-100 text-orange-700 border-orange-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  4: "bg-emerald-100 text-emerald-700 border-emerald-200",
  5: "bg-sky-100 text-sky-700 border-sky-200",
};

export interface WellnessEntry {
  id: string;
  entryDate: string; // YYYY-MM-DD
  mood: MoodValue;
  journal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyMoodPoint {
  date: string; // YYYY-MM-DD
  mood: MoodValue | null;
  label: string; // Mon, Tue...
}

export interface WorkloadInfo {
  focusMinutesToday: number;
  focusSessionsToday: number;
  completedTasksToday: number;
  studySessionsToday: number;
  upcomingDeadlinesCount: number;
  suggestion: string;
}
