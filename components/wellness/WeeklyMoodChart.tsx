import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOOD_EMOJI, MOOD_LABELS, type WeeklyMoodPoint } from "@/types/wellness";

interface Props { data: WeeklyMoodPoint[] }

export function WeeklyMoodChart({ data }: Props) {
  const hasAny = data.some((d) => d.mood !== null);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-brand-royal" /> Weekly Mood
        </CardTitle>
        <CardDescription>Your last 7 days — private reflection, not a diagnosis.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gray">
              <span className="text-lg">📊</span>
            </div>
            <p className="text-sm text-gray-500">No mood data this week</p>
            <p className="text-xs text-gray-400">Complete a daily check-in to see your trend.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-1">
              {data.map((point) => {
                const height = point.mood ? (point.mood / 5) * 100 : 8;
                const isToday = point.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full justify-center" style={{ height: "80px" }}>
                      <div className="flex w-full max-w-[48px] flex-col items-center justify-end">
                        {point.mood ? (
                          <div
                            className={`w-full rounded-t-md border transition-all ${point.mood <= 2 ? "bg-red-100 border-red-200" : point.mood === 3 ? "bg-yellow-100 border-yellow-200" : point.mood === 4 ? "bg-emerald-100 border-emerald-200" : "bg-sky-100 border-sky-200"}`}
                            style={{ height: `${height}%`, minHeight: "18px" }}
                            title={`${point.label}: ${point.mood} — ${point.mood ? MOOD_LABELS[point.mood] : ""}`}
                          >
                            <div className="flex h-full items-center justify-center text-[11px]">{MOOD_EMOJI[point.mood]}</div>
                          </div>
                        ) : (
                          <div className="flex h-2 w-full max-w-[48px] items-center justify-center rounded bg-gray-100">
                            <span className="text-[10px] text-gray-400">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs ${isToday ? "font-semibold text-brand-royal" : "text-gray-500"}`}>{point.label}</span>
                    <span className="text-[11px] text-gray-400">{point.mood ?? "—"}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
              <span>1 = Very Low</span>
              <span>5 = Very Good</span>
            </div>
            <p className="text-center text-xs text-gray-400">Mood is personal. Spikes and dips are normal — look for gentle patterns over time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
