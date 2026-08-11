import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-royal/10">
          <Icon className="h-7 w-7 text-brand-royal" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">{title}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{description}</p>
        </div>
        <span className="rounded-full bg-brand-sky/20 px-3 py-1 text-xs font-medium text-brand-royal">
          Coming in a future phase
        </span>
      </CardContent>
    </Card>
  );
}
