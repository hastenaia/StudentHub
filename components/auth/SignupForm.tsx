"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buttonVariants } from "@/components/ui/button";
import { AuthForm, IconField, PasswordRules, SubmitButton } from "@/components/auth/AuthFields";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { cn } from "@/utils/cn";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ fullName, email, password }: SignupInput) => {
    const result = await authService.signup({
      fullName,
      email,
      password,
      confirmPassword: password,
    });

    if (!result.success) {
      toast({ title: "Could not create account", description: result.message, variant: "error" });
      return;
    }

    if (result.data?.sessionCreated) {
      toast({ title: "Account created!", description: result.message, variant: "success" });
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full space-y-4"
      >
        <div className="rounded-md border border-brand-sky/50 bg-brand-sky/10 p-4 text-sm text-brand-royal">
          Almost there! We&apos;ve sent a confirmation link to your email. Click it to verify your
          account, then sign in.
        </div>
        <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <AuthForm form={form} onSubmit={onSubmit}>
        <IconField name="fullName" label="Full name" icon={User} autoComplete="name" placeholder="Jane Doe" />
        <IconField name="email" label="Email address" icon={Mail} type="email" autoComplete="email" placeholder="you@studenthub.edu" />

        <IconField
          name="password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          reveal={{ shown: showPassword, toggle: () => setShowPassword((v) => !v) }}
        >
          <PasswordRules name="password" />
        </IconField>

        <IconField
          name="confirmPassword"
          label="Confirm password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        <SubmitButton isLoading={form.formState.isSubmitting}>Create account</SubmitButton>
    </AuthForm>
  );
}
