import type { Database } from "./database.types";

/** Kept out of the generated database.types.ts, which `npm run typegen` overwrites. */
export type UserRole = Database["public"]["Enums"]["user_role"];

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ChangePasswordPayload {
  newPassword: string;
  confirmPassword: string;
}
