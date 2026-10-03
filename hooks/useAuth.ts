"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authService } from "@/services/auth.service";
import { roleFromUser } from "@/lib/rbac";
import type { User } from "@supabase/supabase-js";
import type { AuthUser } from "@/types/auth";

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    role: roleFromUser(user),
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) {
          setUser(mapUser(data.user));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  return { user, isLoading, isAuthenticated: !!user, logout };
}
