"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, KeyRound, Lock, X } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { PASSWORD_RULES } from "@/utils/validation";
import { cn } from "@/utils/cn";

type VerifyState = "verifying" | "ready" | "invalid";

/**
 * Recovery form for the password-reset email flow.
 * Handles every Supabase link shape:
 * - `?code=` (PKCE, after /auth/callback or direct)
 * - `?token_hash=&type=recovery` (OTP links)
 * - `#access_token` hash fragments (implicit flow, auto-detected by the client)
 * A valid recovery session is required before allowing a password update.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<VerifyState>("verifying");
  const [errorDetail, setErrorDetail] = React.useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = form.watch("newPassword");
  const rules = PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    met: rule.test(newPassword),
  }));

  React.useEffect(() => {
    let cancelled = false;

    const markInvalid = (detail?: string | null) => {
      if (cancelled) return;
      setErrorDetail(detail ?? null);
      setStatus("invalid");
    };

    const markReady = () => {
      if (cancelled) return;
      // Clean single-use params out of the URL without a navigation.
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      setStatus("ready");
    };

    const run = async () => {
      const errorParam = searchParams.get("error");
      if (errorParam) {
        markInvalid(searchParams.get("error_description"));
        return;
      }

      const supabase = createClient();
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");

      try {
        if (code) {
          const result = await authService.verifyRecoveryCode(code);
          if (!result.success) {
            markInvalid(result.message);
            return;
          }
          markReady();
          return;
        }

        if (tokenHash) {
          const result = await authService.verifyRecoveryToken(tokenHash);
          if (!result.success) {
            markInvalid(result.message);
            return;
          }
          markReady();
          return;
        }

        // Direct visit (already exchanged via /auth/callback) or
        // implicit-flow hash fragment detected by the Supabase client.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          markReady();
          return;
        }

        // Give the client a tick to process a `#access_token=...` hash.
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            subscription.unsubscribe();
            markReady();
          }
        });
        window.setTimeout(() => {
          subscription.unsubscribe();
          if (!cancelled) {
            supabase.auth.getUser().then(({ data }) => {
              if (cancelled) return;
              if (data.user) setStatus("ready");
              else markInvalid(null);
            });
          }
        }, 1500);
      } catch (err) {
        markInvalid(err instanceof Error ? err.message : null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async ({ newPassword }: ChangePasswordInput) => {
    const result = await authService.changePassword({
      newPassword,
      confirmPassword: newPassword,
    });

    if (!result.success) {
      toast({ title: "Could not update password", description: result.message, variant: "error" });
      return;
    }

    toast({ title: "Password updated", description: "You can now sign in with your new password.", variant: "success" });
    router.push("/dashboard");
    router.refresh();
  };

  if (status === "verifying") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-sky/30">
          <KeyRound className="h-6 w-6 animate-pulse text-brand-royal" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">Verifying your link…</h2>
          <p className="mt-1 text-sm text-gray-500">This only takes a moment.</p>
        </div>
      </motion.div>
    );
  }

  if (status === "invalid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <X className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">This reset link is invalid or expired</h2>
          <p className="mt-1 text-sm text-gray-500">
            {errorDetail ?? "Links can only be used once and expire after a while. Request a fresh one below."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/forgot-password"
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-brand-royal px-8 text-sm font-medium text-white transition-colors hover:bg-brand-royal-dark"
          >
            Request a new link
          </Link>
          <Link href="/login" className="text-sm font-medium text-brand-royal hover:underline">
            Back to sign in
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-5"
      noValidate
    >
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
          Set new password
        </Button>
      </Form>

      <Link
        href="/login"
        className="flex items-center justify-center text-sm font-medium text-gray-500 hover:text-brand-royal"
      >
        Back to sign in
      </Link>
    </motion.form>
  );
}
