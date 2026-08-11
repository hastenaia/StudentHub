"use client";

import { useAuth } from "@/hooks/useAuth";
import { hasRole, type UserRole } from "@/lib/rbac";

/**
 * Client-side role helpers backed by the current auth session.
 * Server components/actions should enforce access via requireRole / middleware.
 */
export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? "student";

  return {
    role,
    isAuthenticated: !!user,
    has: (required: UserRole) => hasRole(role, required),
    isAtLeast: (required: UserRole) => hasRole(role, required),
  };
}
