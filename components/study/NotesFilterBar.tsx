"use client";

import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CourseFilterSelect } from "@/components/common/FormFields";
import { NoteCategoryFilter } from "@/components/study/NoteCategoryFilter";
import { EMPTY_NOTE_FILTERS, hasActiveFilters, type NoteFilters } from "@/lib/notesForm";
import type { CategorySummary } from "@/lib/noteCategories";
import type { CourseOption } from "@/types/study";

interface Props {
  filters: NoteFilters;
  onChange: (filters: NoteFilters) => void;
  courses: CourseOption[];
  tags: string[];
  categories: CategorySummary[];
  uncategorized: number;
  onRenameCategory: (from: string, to: string | null) => Promise<boolean>;
}

/** Favorite / course / tag / category filters for the notes list, plus "Clear". */
export function NotesFilterBar({ filters, onChange, courses, tags, categories, uncategorized, onRenameCategory }: Props) {
  const set = (patch: Partial<NoteFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={filters.favorite ? "default" : "outline"} size="sm" onClick={() => set({ favorite: !filters.favorite })}>
        <Star className="h-4 w-4" /> {filters.favorite ? "Favorites" : "All"}
      </Button>
      <CourseFilterSelect courses={courses} value={filters.course} onChange={(course) => set({ course })} />
      <Select value={filters.tag} onChange={(e) => set({ tag: e.target.value })} aria-label="Filter by tag">
        <option value="all">All tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <NoteCategoryFilter
        categories={categories}
        uncategorized={uncategorized}
        value={filters.category}
        onChange={(category) => set({ category })}
        onRename={onRenameCategory}
      />
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_NOTE_FILTERS)}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
