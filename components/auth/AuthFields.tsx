"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Eye, EyeOff, Lock, X, type LucideIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldValues, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { PASSWORD_RULES } from "@/utils/validation";
import { cn } from "@/utils/cn";

// Shared pieces of the auth forms (login, signup, forgot/reset/change password).

/** Fade-in `<form>` wrapper that also provides the react-hook-form context. */
export function AuthForm<T extends FieldValues>({
  form,
  onSubmit,
  children,
}: {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => Promise<void> | void;
  children: React.ReactNode;
}) {
  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-5"
      noValidate
    >
      <Form {...form}>{children}</Form>
    </motion.form>
  );
}

/**
 * Labelled input with a leading icon. Pass `reveal` for a password field with a show/hide toggle
 * (the parent owns the state so one toggle can drive several fields).
 */
export function IconField({
  name,
  label,
  icon: Icon,
  type = "text",
  autoComplete,
  placeholder,
  labelAside,
  reveal,
  children,
}: {
  name: string;
  label: string;
  icon: LucideIcon;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  placeholder?: string;
  labelAside?: React.ReactNode;
  reveal?: { shown: boolean; toggle: () => void };
  children?: React.ReactNode;
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            {labelAside}
          </div>
          <div className="relative">
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <FormControl>
              <Input
                type={reveal?.shown ? "text" : type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className={reveal ? "px-10" : "pl-10"}
                {...field}
              />
            </FormControl>
            {reveal && <RevealToggle {...reveal} />}
          </div>
          <FormMessage />
          {children}
        </FormItem>
      )}
    />
  );
}

function RevealToggle({ shown, toggle }: { shown: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

/** Live checklist of PASSWORD_RULES for the named password field. */
export function PasswordRules({ name }: { name: string }) {
  const password = (useWatch({ name }) as string | undefined) ?? "";
  return (
    <ul className="grid grid-cols-1 gap-1.5 rounded-md bg-brand-gray p-3 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", met ? "text-green-600" : "text-gray-400")}>
            {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function SubmitButton({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
      {children}
    </Button>
  );
}

/** Form + submit handler for setting a new password (first-login change and reset-link flows). */
export function useNewPasswordForm(successDescription?: string) {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ newPassword }: ChangePasswordInput) => {
    const result = await authService.changePassword({ newPassword, confirmPassword: newPassword });
    if (!result.success) {
      toast({ title: "Could not update password", description: result.message, variant: "error" });
      return;
    }
    toast({ title: "Password updated", description: successDescription ?? result.message, variant: "success" });
    router.push("/dashboard");
    router.refresh();
  };

  return { form, onSubmit };
}

/** New password + rules checklist + confirmation + submit, for use inside an `AuthForm`. */
export function NewPasswordFields({ isSubmitting, submitLabel }: { isSubmitting: boolean; submitLabel: string }) {
  return (
    <>
      <IconField name="newPassword" label="New password" icon={Lock} type="password" autoComplete="new-password" placeholder="••••••••" />
      <PasswordRules name="newPassword" />
      <IconField name="confirmPassword" label="Confirm new password" icon={Lock} type="password" autoComplete="new-password" placeholder="••••••••" />
      <SubmitButton isLoading={isSubmitting}>{submitLabel}</SubmitButton>
    </>
  );
}
