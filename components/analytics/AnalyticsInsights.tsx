import { Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { insights: string[] }

export function AnalyticsInsights({ insights }: Props) {
  if (insights.length === 0) return null;
  return (
    <Card className="border-sky-200 bg-sky-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-sky-900">
          <Lightbulb className="h-4 w-4 text-sky-600" /> Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 shadow-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
