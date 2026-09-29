// Pure date helpers shared by the server/client services.

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Period starts used by focus/analytics stats: today, the last 7 days (today inclusive), this calendar month. */
export function reportingWindows(now: Date = new Date()) {
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { todayStart, weekStart, monthStart };
}

/** UTC calendar date `YYYY-MM-DD` (matches the `started_at`/`entry_date` slices stored in Supabase). */
export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Consecutive days with activity ending today (today inclusive); 0 if nothing today. `dates` are ISO strings. */
export function computeStreak(dates: string[], today: Date = new Date()): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((s) => s.slice(0, 10)));
  let streak = 0;
  let cursor = toDateStr(today);
  while (days.has(cursor)) {
    streak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = toDateStr(d);
  }
  return streak;
}
