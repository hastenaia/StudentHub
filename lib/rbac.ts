import type { UserRole } from "@/types/database.types";

export type { UserRole };

/** Ordered role hierarchy: higher index = more privileged. */
export const ROLE_RANK: Record<UserRole, number> = {
  student: 0,
  teacher: 1,
  admin: 2,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

/**
 * Resolves a user's role from `app_metadata`. We deliberately read from
 * `app_metadata` (JWT-backed, only writable via the service role / admin) and
 * NOT from `user_metadata`, which is client-controllable and would allow a
 * self-signed privilege escalation.
 */
export function roleFromUser(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined
): UserRole {
  return (user?.app_metadata?.role as UserRole) ?? "student";
}

/** Returns true when `role` is equal to or above `required`. */
export function hasRole(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Route-level access map. Keys are path prefixes, values are the roles
 * allowed to view them. More-specific (longer) prefixes win.
 */
export const ROUTE_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/dashboard/students", roles: ["teacher", "admin"] },
];

/** Returns the roles required for `path`, or null if the path is open. */
export function getRequiredRoles(path: string): UserRole[] | null {
  const match = ROUTE_ROLES.filter(({ prefix }) => path.startsWith(prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )[0];
  return match?.roles ?? null;
}
