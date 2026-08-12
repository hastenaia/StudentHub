import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRole, roleFromUser, type UserRole } from "@/lib/rbac";

/**
 * Server-side guard. Redirects unauthenticated users to /login and
 * authorized-but-underprivileged users to /dashboard. Returns the role.
 *
 * The role is read from the `profiles` table (DB source of truth), falling
 * back to the JWT-backed `app_metadata` if the profile is missing.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    (profile as { role?: UserRole } | null)?.role ?? roleFromUser(user);

  if (!hasRole(role, required)) {
    redirect("/dashboard");
  }

  return role;
}