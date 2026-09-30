"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface CourseLike {
  id: string;
  name: string;
}

/** A labelled single-line text input bound to the surrounding react-hook-form `<Form>`. */
export function TextField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Course picker for a form; the empty value means "No course". */
export function CourseSelectField({ courses, name = "courseId", label = "Course" }: { courses: CourseLike[]; name?: string; label?: string }) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select {...field}>
              <option value="">No course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** List filter by course: "all", "none" (no course) or a course id. */
export function CourseFilterSelect({
  courses,
  value,
  onChange,
  allLabel = "All courses",
}: {
  courses: CourseLike[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by course">
      <option value="all">{allLabel}</option>
      <option value="none">No course</option>
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}
