import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password — StudentHub" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-dark">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
