/**
 * Startup/config guard for the Google Classroom + Calendar integration.
 *
 * Pure and unit-tested: takes an env record so tests can inject values
 * without touching `process.env`. Empty strings count as missing (an empty
 * `KEY=` line in `.env.local` must not hide the problem).
 */

export const GOOGLE_REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
] as const;

export type GoogleEnv = Record<string, string | undefined>;

/** Names of required Google env vars that are unset or blank. */
export function missingGoogleEnvVars(env: GoogleEnv = process.env): string[] {
  return GOOGLE_REQUIRED_ENV.filter((key) => !env[key]?.trim());
}

/** True when every required Google env var is present and non-blank. */
export function isGoogleConfigured(env: GoogleEnv = process.env): boolean {
  return missingGoogleEnvVars(env).length === 0;
}

/**
 * Friendly, user-safe message naming the missing vars. Surfaced by the
 * Google routes (OAuth redirect reason / sync 503 body) instead of a raw
 * thrown error, so a fresh clone without `.env.local` explains itself.
 */
export function googleNotConfiguredMessage(env: GoogleEnv = process.env): string {
  const missing = missingGoogleEnvVars(env);
  const names = missing.length ? missing.join(", ") : GOOGLE_REQUIRED_ENV.join(", ");
  return (
    `Google Classroom sync is not configured. Missing: ${names}. ` +
    "Copy .env.local.example to .env.local and set them (see docs/google-integration.md)."
  );
}
