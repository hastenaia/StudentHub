import { Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOOD_EMOJI } from "@/types/wellness";

interface Props {
  data: { avgMood: number | null; moodTrend: { date: string; label: string; mood: number | null }[]; checkIns: number };
}

export function AnalyticsWellness({ data }: Props) {
  const max = 5;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-rose-500" /> Wellness
        </CardTitle>
        <CardDescription>
          {data.checkIns === 0 ? "No check-ins yet" : `Avg mood ${data.avgMood}/5 • ${data.checkIns} check-ins`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-20 items-end gap-1">
          {data.moodTrend.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full justify-center" style={{ height: "64px" }}>
                {d.mood !== null ? (
                  <div
                    className="flex w-full max-w-10 items-center justify-center rounded-t border text-[11px] transition-all"
                    style={{
                      height: `${(d.mood / max) * 64}px`,
                      minHeight: "18px",
                      backgroundColor: d.mood <= 2 ? "#fee2e2" : d.mood === 3 ? "#fef9c3" : d.mood === 4 ? "#dcfce7" : "#e0f2fe",
                      borderColor: d.mood <= 2 ? "#fecaca" : d.mood === 3 ? "#fde68a" : d.mood === 4 ? "#bbf7d0" : "#bae6fd",
                    }}
                    title={`${d.label}: ${d.mood}`}
                  >
                    {MOOD_EMOJI[d.mood as 1 | 2 | 3 | 4 | 5]}
                  </div>
                ) : (
                  <div className="flex h-2 w-full max-w-10 items-center justify-center rounded bg-gray-100">
                    <span className="text-[10px] text-gray-400">—</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-500">{d.label}</span>
              <span className="text-[10px] font-medium text-gray-600">{d.mood ?? "—"}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Mood trend (1 Very Low → 5 Very Good)
          </span>
          <span>{data.checkIns} entries</span>
        </div>
        <p className="text-center text-xs text-gray-400">Wellness is for reflection, not diagnosis.</p>
      </CardContent>
    </Card>
  );
}
