"use client";

import { AuthForm, NewPasswordFields, useNewPasswordForm } from "@/components/auth/AuthFields";

export function ChangePasswordForm({ isFirstLogin = false }: { isFirstLogin?: boolean }) {
  const { form, onSubmit } = useNewPasswordForm();

  return (
    <AuthForm form={form} onSubmit={onSubmit}>
      {isFirstLogin && (
        <div className="rounded-md border border-brand-sky/50 bg-brand-sky/10 p-3 text-sm text-brand-royal">
          For security, you need to set a new password before continuing.
        </div>
      )}
      <NewPasswordFields isSubmitting={form.formState.isSubmitting} submitLabel="Update password" />
    </AuthForm>
  );
}
