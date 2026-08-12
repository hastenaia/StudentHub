import { describe, expect, it } from "vitest";
import { checkPasswordStrength, getInitials, isValidEmail, PASSWORD_RULES } from "./validation";

describe("isValidEmail", () => {
  it("accepts a valid email", () => {
    expect(isValidEmail("user@studenthub.edu")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(isValidEmail("user@studenthub")).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    expect(isValidEmail("  user@studenthub.edu  ")).toBe(true);
  });
});

describe("checkPasswordStrength", () => {
  it("is valid for a strong password", () => {
    const result = checkPasswordStrength("Abcdef1!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("flags a short password", () => {
    const result = checkPasswordStrength("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_RULES[0].label);
  });

  it("flags a missing number", () => {
    const result = checkPasswordStrength("Abcdefgh");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_RULES[3].label);
  });
});

describe("getInitials", () => {
  it("returns initials from first two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("handles a single word", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("returns ? for empty input", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });
});
