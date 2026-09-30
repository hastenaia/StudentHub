import type * as React from "react";

/** Title + subtitle block used at the top of dashboard pages. */
export function PageHeader({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-dark sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

/** Page header + red error box, for a page whose server data failed to load. */
export function PageLoadError({ title, description, error }: { title: string; description: React.ReactNode; error: string | null }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    </div>
  );
}
