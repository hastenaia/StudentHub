"use client";

import { Clock, CalendarDays, Flame, Trophy, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FocusStatsProps {
  todayMinutes: number;
  todaySessions: number;
  weeklyMinutes: number;
  weeklySessions: number;
  monthlyMinutes: number;
  monthlySessions: number;
  streak: number;
  totalMinutes?: number;
  totalSessions?: number;
}

export function FocusStats({
  todayMinutes,
  todaySessions,
  weeklyMinutes,
  weeklySessions,
  monthlyMinutes,
  monthlySessions,
  streak,
}: FocusStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Clock className="h-4 w-4 text-emerald-600" /> Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-brand-dark">{todayMinutes} <span className="text-sm font-normal text-gray-500">min</span></p>
          <p className="text-xs text-gray-500">{todaySessions} session{todaySessions !== 1 ? "s" : ""}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (todayMinutes / 120) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-400">Goal: 120 min</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <CalendarDays className="h-4 w-4 text-sky-600" /> This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-brand-dark">{weeklyMinutes} <span className="text-sm font-normal text-gray-500">min</span></p>
          <p className="text-xs text-gray-500">{weeklySessions} session{weeklySessions !== 1 ? "s" : ""}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Timer className="h-3 w-3" /> Last 7 days
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <CalendarDays className="h-4 w-4 text-purple-600" /> This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-brand-dark">{monthlyMinutes} <span className="text-sm font-normal text-gray-500">min</span></p>
          <p className="text-xs text-gray-500">{monthlySessions} session{monthlySessions !== 1 ? "s" : ""}</p>
          <p className="mt-1 text-xs text-gray-400">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <Flame className="h-4 w-4 text-amber-600" /> Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-amber-700">{streak}</p>
            <p className="text-sm text-amber-700/70">day{streak !== 1 ? "s" : ""}</p>
            <Trophy className="ml-auto h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-1 text-xs text-amber-700/60">{streak > 0 ? "Keep it up!" : "Start focusing to build streak"}</p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < streak ? "bg-amber-500" : "bg-amber-100"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
