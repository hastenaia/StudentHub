import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Schedule — StudentHub" };

export default function SchedulePage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Class schedule"
      description="A full calendar view of your classes, exams, and deadlines is on the way."
    />
  );
}
