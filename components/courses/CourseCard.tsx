"use client";

import { BookOpen, MapPin, User, Hash, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/date";
import type { Course } from "@/types/courses";

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
}

export function CourseCard({ course, onEdit, onDelete }: CourseCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: course.color || "#0033A0" }}
        aria-hidden
      />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-brand-royal" />
              <p className="truncate text-base">{course.course_name}</p>
            </div>
            {course.course_code && (
              <p className="mt-1 flex items-center gap-1 text-xs font-normal text-gray-500">
                <Hash className="h-3 w-3" /> {course.course_code}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              course.source === "classroom"
                ? "bg-brand-royal/10 text-brand-royal"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {course.source === "classroom" ? "Classroom" : "Manual"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {course.description && (
          <p className="line-clamp-3 text-sm text-gray-600">{course.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {course.instructor && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {course.instructor}
            </span>
          )}
          {course.room && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {course.room}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Added {formatDate(course.created_at)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onEdit(course)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(course.id)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
