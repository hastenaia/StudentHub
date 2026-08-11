"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/useToast";
import { checkPasswordStrength } from "@/utils/validation";
import { cn } from "@/utils/cn";

export function ChangePasswordForm({ isFirstLogin = false }: { isFirstLogin?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const strength = checkPasswordStrength(newPassword);
  const rules = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", met: /[a-z]/.test(newPassword) },
    { label: "One number", met: /[0-9]/.test(newPassword) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!strength.valid) {
      setError("Password does not meet the requirements below");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = await authService.changePassword({ newPassword, confirmPassword });
    setIsLoading(false);

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
      onSubmit={handleSubmit}
      className="w-full space-y-5"
      noValidate
    >
      {isFirstLogin && (
        <div className="rounded-md border border-brand-sky/50 bg-brand-sky/10 p-3 text-sm text-brand-royal">
          For security, you need to set a new password before continuing.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="pl-10"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="pl-10"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Update password
      </Button>
    </motion.form>
  );
}
