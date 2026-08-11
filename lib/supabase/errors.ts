import type { AuthError } from "@supabase/supabase-js";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "The email or password is incorrect.",
  "Email not confirmed": "Please confirm your email address before signing in.",
  "User already registered": "An account with that email already exists.",
  "Password should be at least 6 characters":
    "Your password must be at least 6 characters long.",
  "For security purposes, you can only request this once every 60 seconds":
    "Please wait a moment before trying again.",
};

/**
 * Maps a Supabase auth error to a friendly, user-safe message.
 * Falls back to the raw message when there's no known mapping.
 */
export function getAuthErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  return AUTH_ERROR_MESSAGES[error.message] ?? error.message;
}
