import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create account — StudentHub" };

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-dark">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join StudentHub to get started.</p>
      </div>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-royal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
