"use client";

import * as React from "react";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { categoryFromFilter, MAX_CATEGORY_LENGTH, normalizeCategory, UNCATEGORIZED_FILTER, type CategorySummary } from "@/lib/noteCategories";

interface Props {
  categories: CategorySummary[];
  uncategorized: number;
  value: string;
  onChange: (value: string) => void;
  /** `to` is normalized; null clears the category from its notes. Resolves true when the change was applied. */
  onRename: (from: string, to: string | null) => Promise<boolean>;
}

/** Category filter `<select>` plus rename/remove for the selected category. */
export function NoteCategoryFilter({ categories, uncategorized, value, onChange, onRename }: Props) {
  const [renaming, setRenaming] = React.useState<{ from: string; to: string } | null>(null);
  const selected = categoryFromFilter(value);
  // A rename started for another category is stale once the filter moves on.
  const draft = renaming?.from === selected ? renaming : null;

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const next = normalizeCategory(draft.to);
    // An unchanged name needs no write.
    if (next === draft.from || (await onRename(draft.from, next))) setRenaming(null);
  };

  const remove = (name: string) => {
    const count = categories.find((c) => c.name === name)?.count ?? 0;
    if (!window.confirm(`Remove category “${name}”? Its ${count} note${count === 1 ? "" : "s"} will be kept as uncategorized.`)) return;
    void onRename(name, null);
  };

  return (
    <>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by category">
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} ({c.count})
          </option>
        ))}
        <option value={UNCATEGORIZED_FILTER}>Uncategorized ({uncategorized})</option>
      </Select>
      {selected && !draft && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setRenaming({ from: selected, to: selected })} aria-label={`Rename category ${selected}`}>
            <Pencil className="h-3.5 w-3.5" /> Rename
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(selected)} aria-label={`Remove category ${selected}`}>
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        </>
      )}
      {draft && (
        <form className="flex items-center gap-1" onSubmit={submitRename}>
          <Input autoFocus value={draft.to} maxLength={MAX_CATEGORY_LENGTH} onChange={(e) => setRenaming({ from: draft.from, to: e.target.value })} className="h-8 w-40" aria-label={`Rename ${draft.from}`} />
          <Button type="submit" size="sm" variant="outline" aria-label="Save category name"><Check className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="outline" aria-label="Cancel rename" onClick={() => setRenaming(null)}><X className="h-4 w-4" /></Button>
        </form>
      )}
    </>
  );
}
