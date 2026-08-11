import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata: Metadata = { title: "Change password — StudentHub" };

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isFirstLogin = user?.user_metadata?.must_change_password === true;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-dark">
          {isFirstLogin ? "Set a new password" : "Change password"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a strong password you haven&apos;t used before.
        </p>
      </div>
      <ChangePasswordForm isFirstLogin={isFirstLogin} />
    </div>
  );
}
