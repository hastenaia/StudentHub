/**
 * Restricts a redirect target to a same-origin relative path to prevent
 * open-redirect attacks. External URLs, protocol-relative URLs (`//host`),
 * and anything not starting with `/` fall back to the supplied fallback.
 * Backslashes and control characters are rejected too: browsers treat `\` as `/` and strip
 * tabs/newlines, so `/\evil.com` or `/<TAB>/evil.com` would otherwise resolve to `//evil.com`.
 */
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

export function safeRedirect(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !UNSAFE_CHARS.test(value)) {
    return value;
  }
  return fallback;
}