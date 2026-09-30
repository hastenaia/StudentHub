import type { CourseProgress } from "@/types/courses";

/** Weighted 0–100 course score: "72% current • 85% projected". Never a GPA. */
export function CourseProgressBar({ progress }: { progress: CourseProgress }) {
  return (
    <div className="space-y-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded bg-gray-200"
        role="progressbar"
        aria-label="Course score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.current}
      >
        <div className="h-full rounded bg-brand-royal" style={{ width: `${progress.current}%` }} />
      </div>
      <p className="text-xs text-gray-500">
        {progress.current}% current • {progress.projected}% projected
      </p>
    </div>
  );
}
