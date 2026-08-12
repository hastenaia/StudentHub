"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Lock, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { PASSWORD_RULES } from "@/utils/validation";
import { cn } from "@/utils/cn";

export function ChangePasswordForm({ isFirstLogin = false }: { isFirstLogin?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = form.watch("newPassword");
  const rules = PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    met: rule.test(newPassword),
  }));

  const onSubmit = async ({ newPassword }: ChangePasswordInput) => {
    const result = await authService.changePassword({
      newPassword,
      confirmPassword: newPassword,
    });

    if (!result.success) {
      toast({ title: "Could not update password", description: result.message, variant: "error" });
      return;
    }

    toast({ title: "Password updated", description: result.message, variant: "success" });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-5"
      noValidate
    >
      {isFirstLogin && (
        <div className="rounded-md border border-brand-sky/50 bg-brand-sky/10 p-3 text-sm text-brand-royal">
          For security, you need to set a new password before continuing.
        </div>
      )}

      <Form {...form}>
        <FormField
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <ul className="grid grid-cols-1 gap-1.5 rounded-md bg-brand-gray p-3 sm:grid-cols-2">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                rule.met ? "text-green-600" : "text-gray-400"
              )}
            >
              {rule.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {rule.label}
            </li>
          ))}
        </ul>

        <FormField
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={form.formState.isSubmitting}
        >
          Update password
        </Button>
      </Form>
    </motion.form>
  );
}
