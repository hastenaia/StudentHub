import { CalendarDays, Flame, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMinutes, type StudyStats } from "@/lib/focus";

interface StudyStatsCardsProps {
  stats: StudyStats;
}

/** Today / this week / streak summary row for the Focus page. */
export function StudyStatsCards({ stats }: StudyStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={<Timer className="h-5 w-5 text-brand-royal" />}
        label="Focused today"
        value={formatMinutes(stats.minutesToday)}
      />
      <StatCard
        icon={<CalendarDays className="h-5 w-5 text-brand-royal" />}
        label="This week"
        value={formatMinutes(stats.minutesThisWeek)}
      />
      <StatCard
        icon={<Flame className="h-5 w-5 text-orange-500" />}
        label="Day streak"
        value={String(stats.streakDays)}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gray">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          <p className="truncate text-xl font-semibold text-brand-dark">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
