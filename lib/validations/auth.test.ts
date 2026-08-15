import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
} from "./auth";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@studenthub.edu",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    fullName: "Jane Doe",
    email: "jane@studenthub.edu",
    password: "Abcdef1!",
    confirmPassword: "Abcdef1!",
  };

  it("accepts valid credentials with a full name", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a signup without a full name", () => {
    const { fullName, ...rest } = valid;
    expect(signupSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({ ...valid, email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects weak passwords", () => {
    const result = signupSchema.safeParse({ ...valid, password: "weak", confirmPassword: "weak" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "Abcdef1?" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching, strong passwords", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "Abcdef1!",
      confirmPassword: "Abcdef1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects weak passwords", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "weak",
      confirmPassword: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "Abcdef1!",
      confirmPassword: "Abcdef1?",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});
