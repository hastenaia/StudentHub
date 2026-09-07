"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthView, WeekView, DayView, AgendaView } from "./CalendarViews";
import { CalendarDays } from "lucide-react";

type View = "month" | "week" | "day" | "agenda";

export function CalendarShell() {
  const [view, setView] = React.useState<View>("month");
  const views: View[] = ["month", "week", "day", "agenda"];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-brand-royal" /> Multi-view Calendar</CardTitle>
        <CardDescription>Layered classes, exams, assignments, personal events (FR-11 mock). Switch views below.</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {views.map((v) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)} className="capitalize">
              {v}
            </Button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-brand-royal" /> class
            <span className="h-2 w-2 rounded-full bg-red-500" /> exam
            <span className="h-2 w-2 rounded-full bg-amber-500" /> assignment
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> personal
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "day" && <DayView />}
        {view === "agenda" && <AgendaView />}
      </CardContent>
    </Card>
  );
}
