"use client";
import { BookOpen, MapPin, Users, Award, Target, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MockCourse } from "@/lib/mocks/courses";

export function CourseProgressCard({ course }: { course: MockCourse }) {
  const simple = course.progress;
  const weighted = course.weightedProgress;
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full bg-gray-100">
        <div
          className="h-1.5 bg-brand-royal transition-all"
          style={{ width: `${Math.round((weighted ?? simple ?? 0) * 100)}%` }}
        />
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ background: course.color ?? "#0033A0" }}>
              <BookOpen className="h-4 w-4" />
            </span>
            {course.name}
          </span>
          <span className="text-sm font-bold text-brand-royal">
            {weighted != null ? `${Math.round(weighted * 100)}%` : simple != null ? `${Math.round(simple * 100)}%` : "—"}
          </span>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-3">
          {course.teacherName && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course.teacherName}</span>}
          {course.section && <span>{course.section}</span>}
          {course.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {course.room}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-gray-100 bg-brand-gray/40 p-2">
            <p className="flex items-center gap-1 text-gray-500"><Award className="h-3 w-3" /> Points</p>
            <p className="font-semibold text-brand-dark">{simple != null ? `${Math.round(simple * 100)}% earned` : "No graded work"}</p>
          </div>
          <div className="rounded-md border border-gray-100 bg-brand-gray/40 p-2">
            <p className="flex items-center gap-1 text-gray-500"><Target className="h-3 w-3" /> Weighted</p>
            <p className="font-semibold text-brand-dark">{weighted != null ? `${Math.round(weighted * 100)}% projected` : "—"}</p>
          </div>
        </div>
        {course.milestones.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">Milestones</p>
            {course.milestones.map((m) => (
              <div key={m.label} className="flex items-center gap-2 text-xs">
                {m.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-gray-300" />}
                <span className={m.done ? "text-brand-dark line-through decoration-gray-300" : "text-brand-dark"}>{m.label}</span>
                <span className="ml-auto text-gray-400">{m.date}</span>
              </div>
            ))}
          </div>
        )}
        {course.upcomingAssignments.length > 0 && (
          <div className="rounded-md border border-gray-100 bg-white p-2">
            <p className="mb-1 text-xs font-medium text-gray-500">Upcoming</p>
            {course.upcomingAssignments.map((a) => (
              <p key={a.id} className="text-xs text-brand-dark">• {a.title} <span className="text-gray-400">— {a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "no date"}</span></p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
