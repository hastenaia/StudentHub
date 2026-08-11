"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
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
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: ForgotPasswordInput) => {
    const result = await authService.requestPasswordReset({ email });

    if (!result.success) {
      toast({ title: "Something went wrong", description: result.message, variant: "error" });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-sky/30">
          <MailCheck className="h-6 w-6 text-brand-royal" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">Check your inbox</h2>
          <p className="mt-1 text-sm text-gray-500">
            We sent a password reset link to{" "}
            <span className="font-medium">{form.getValues("email")}</span>.
          </p>
        </div>
        <Link href="/login" className="text-sm font-medium text-brand-royal hover:underline">
          Back to sign in
        </Link>
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@studenthub.edu"
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
          Send reset link
        </Button>
      </Form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-royal"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </motion.form>
  );
}
