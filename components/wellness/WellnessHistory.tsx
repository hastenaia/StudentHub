import { History, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOOD_EMOJI, MOOD_LABELS, MOOD_COLORS, type WellnessEntry } from "@/types/wellness";

interface Props { history: WellnessEntry[] }

export function WellnessHistory({ history }: Props) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-brand-royal" /> History
          </CardTitle>
          <CardDescription>Your past reflections — private to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No history yet</p>
            <p className="text-xs text-gray-400">Your check-ins will appear here once you start tracking.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-brand-royal" /> History
        </CardTitle>
        <CardDescription>Last {history.length} entries — tap to see your journal.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex gap-3 rounded-lg border border-gray-100 bg-white p-3">
              <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border text-xs font-medium ${MOOD_COLORS[entry.mood]}`}>
                <span className="text-base leading-none">{MOOD_EMOJI[entry.mood]}</span>
                <span className="text-[10px] leading-none">{entry.mood}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-brand-dark">{new Date(entry.entryDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</p>
                  <span className="rounded bg-brand-gray px-1.5 py-0.5 text-xs text-gray-600">{MOOD_LABELS[entry.mood]}</span>
                </div>
                {entry.journal ? (
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{entry.journal}</p>
                ) : (
                  <p className="mt-1 text-xs italic text-gray-400">No journal entry</p>
                )}
                <p className="mt-1 text-[11px] text-gray-400">Updated {new Date(entry.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">Wellness data is private and for reflection only — not a medical record.</p>
      </CardContent>
    </Card>
  );
}
