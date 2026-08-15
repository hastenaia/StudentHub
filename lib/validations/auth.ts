import { z } from "zod";
import { PASSWORD_RULES } from "@/utils/validation";

const emailSchema = z.string().trim().email("Enter a valid email address");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULES[0].label)
  .regex(/[A-Z]/, PASSWORD_RULES[1].label)
  .regex(/[a-z]/, PASSWORD_RULES[2].label)
  .regex(/[0-9]/, PASSWORD_RULES[3].label);

export const signupSchema = z
  .object({
    fullName: z.string().trim().max(120, "Name is too long").optional(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
