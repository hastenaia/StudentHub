"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  AuthResult,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
} from "@/types/auth";

/**
 * Thin service layer around Supabase Auth. Keeping these calls out of
 * components makes it trivial to swap providers or add logging/analytics
 * later without touching UI code.
 */
export const authService = {
  async login({ email, password }: LoginPayload): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  async logout(): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  async requestPasswordReset({ email }: ForgotPasswordPayload): Promise<AuthResult> {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/change-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: "If an account exists for that email, a reset link is on its way.",
    };
  },

  async changePassword({ newPassword }: ChangePasswordPayload): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Password updated successfully." };
  },

  async getCurrentUser() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },
};
