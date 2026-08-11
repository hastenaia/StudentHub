import { Users } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata = { title: "Students — StudentHub" };

export default function StudentsPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Student directory"
      description="Search and connect with classmates and faculty once this module ships."
    />
  );
}
