export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

/** Single source of truth for password rules (validations, forms, schemas). */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
];

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

export function checkPasswordStrength(password: string): PasswordCheck {
  const errors = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
  return { valid: errors.length === 0, errors };
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}
