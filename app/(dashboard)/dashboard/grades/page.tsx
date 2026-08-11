import { GraduationCap } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Grades — StudentHub" };

export default function GradesPage() {
  return (
    <ComingSoon
      icon={GraduationCap}
      title="Grades & transcripts"
      description="Track grades, GPA trends, and download transcripts once this module ships."
    />
  );
}
