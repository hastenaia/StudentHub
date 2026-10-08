"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function BarChart({ title, description, data, color = "bg-brand-royal", valueLabel = "min", emptyText }: { title: string; description?: string; data: { label: string; value: number }[]; color?: string; valueLabel?: string; emptyText?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const empty = data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2">
        {empty && emptyText && <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-xs text-gray-500">{emptyText}</p>}
        <div className="flex h-40 items-end gap-2">
          {data.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-brand-dark">{d.value}{valueLabel !== "" ? ` ${valueLabel}` : ""}</span>
              <div className="flex w-full justify-center" style={{ height: "110px" }}>
                <div className={`w-full max-w-10 rounded-t-md ${color}`} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "6px" : "0" }} />
              </div>
              <span className="text-[11px] text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Mood 1–5 per day; 0 means no check-in that day. */
export function LineDots({ data }: { data: { label: string; value: number }[] }) {
  const logged = data.filter((d) => d.value > 0).map((d) => d.value);
  const max = Math.max(1, ...logged);
  const min = logged.length ? Math.min(...logged) : 1;
  const range = max - min || 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mood trend (1–5)</CardTitle>
        <CardDescription>Daily mood check-ins — higher is better</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {logged.length === 0 && <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-xs text-gray-500">No check-ins yet — log your mood on the Wellness page.</p>}
        <div className="relative h-40">
          <div className="absolute inset-0 flex items-end gap-2 px-2">
            {data.map((d) => {
              const h = d.value > 0 ? ((d.value - min) / range) * 70 + 20 : 20;
              return (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  {d.value > 0 ? (
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${d.value >= 4 ? "bg-emerald-100 text-emerald-700" : d.value <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{d.value}</span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-sm text-gray-400" title="No check-in">—</span>
                  )}
                  <div className="w-0.5 flex-1 bg-gray-100" style={{ height: `${h}%` }} />
                  <span className="text-[11px] text-gray-500">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
