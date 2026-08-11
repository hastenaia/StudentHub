import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Courses — StudentHub" };

export default function CoursesPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Course management"
      description="Browse enrolled courses, syllabi, and materials once this module ships."
    />
  );
}
