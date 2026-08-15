"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/supabase/errors";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  SignupPayload,
} from "@/types/auth";
import { fail, ok, type ApiResult } from "@/types/api";

/**
 * Thin service layer around Supabase Auth. Keeping these calls out of
 * components makes it trivial to swap providers or add logging/analytics
 * later without touching UI code.
 */
export const authService = {
  async signup({ fullName, email, password }: SignupPayload): Promise<ApiResult<{ sessionCreated: boolean }>> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/login?confirmed=true`,
        data: {
          full_name: fullName ?? null,
          must_change_password: false,
        },
      },
    });

    if (error) {
      return fail(getAuthErrorMessage(error));
    }
    const sessionCreated = data.session != null;
    return ok(
      sessionCreated
        ? "Account created — welcome to StudentHub!"
        : "Check your email to confirm your account before signing in.",
      { sessionCreated }
    );
  },

  async login({ email, password }: LoginPayload): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return fail(getAuthErrorMessage(error));
    }
    return ok();
  },

  async logout(): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return fail(getAuthErrorMessage(error));
    }
    return ok();
  },

  async requestPasswordReset({ email }: ForgotPasswordPayload): Promise<ApiResult> {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/change-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      return fail(getAuthErrorMessage(error));
    }
    return ok("If an account exists for that email, a reset link is on its way.");
  },

  async changePassword({ newPassword }: ChangePasswordPayload): Promise<ApiResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });

    if (error) {
      return fail(getAuthErrorMessage(error));
    }
    return ok("Password updated successfully.");
  },

  async getCurrentUser() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },
};
