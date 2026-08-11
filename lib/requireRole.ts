import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRole, type UserRole } from "@/lib/rbac";

/**
 * Server-side guard. Redirects unauthenticated users to /login and
 * authorized-but-underprivileged users to /dashboard. Returns the role.
 *
 * Usage in a Server Component:
 *   const role = await requireRole("teacher");
 */
export async function requireRole(required: UserRole) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role: UserRole =
    (user.user_metadata?.role as UserRole) ?? "student";

  if (!hasRole(role, required)) {
    redirect("/dashboard");
  }

  return role;
}
