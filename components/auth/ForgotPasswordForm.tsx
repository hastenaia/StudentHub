"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { isValidEmail } from "@/utils/validation";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    setIsLoading(true);
    const result = await authService.requestPasswordReset({ email });
    setIsLoading(false);

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
            We sent a password reset link to <span className="font-medium">{email}</span>.
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
      onSubmit={handleSubmit}
      className="w-full space-y-5"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@studenthub.edu"
            className="pl-10"
            value={email}
            error={!!error}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Send reset link
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-royal"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </motion.form>
  );
}
