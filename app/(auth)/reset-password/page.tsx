import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Set new password — StudentHub" };

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-dark">Choose a new password</h1>
        <p className="mt-1 text-sm text-gray-500">
          You followed a reset link — set a strong password below to finish.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
