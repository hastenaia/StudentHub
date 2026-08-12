/**
 * Restricts a redirect target to a same-origin relative path to prevent
 * open-redirect attacks. External URLs, protocol-relative URLs (`//host`),
 * and anything not starting with `/` fall back to the supplied fallback.
 */
export function safeRedirect(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return fallback;
}