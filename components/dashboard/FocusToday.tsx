import { Flame, Timer, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { minutes: number; sessions: number; streak: number }

export function FocusToday({ minutes, sessions, streak }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-emerald-600" /> Focus Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-emerald-50 px-3 py-4">
            <p className="text-2xl font-bold text-emerald-700">{minutes}</p>
            <p className="text-xs font-medium text-emerald-700/70">minutes</p>
            <p className="mt-1 text-[11px] text-gray-500">focus today</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-4">
            <p className="text-2xl font-bold text-sky-700">{sessions}</p>
            <p className="text-xs font-medium text-sky-700/70">sessions</p>
            <p className="mt-1 text-[11px] text-gray-500">completed</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-4">
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-700">{streak}</span>
            </div>
            <p className="text-xs font-medium text-amber-700/70">day streak</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-500">
              <Trophy className="h-3 w-3" /> keep going
            </p>
          </div>
        </div>
        {minutes === 0 && sessions === 0 && (
          <p className="mt-3 text-center text-xs text-gray-400">Start a focus session to build your streak.</p>
        )}
      </CardContent>
    </Card>
  );
}
