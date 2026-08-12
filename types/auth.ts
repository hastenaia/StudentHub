import type { UserRole } from "./database.types";

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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ChangePasswordPayload {
  newPassword: string;
  confirmPassword: string;
}
