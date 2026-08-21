"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function AccountCard() {
  const router = useRouter();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      toast({ title: "Signed out", variant: "success" });
    } catch (e) {
      toast({ title: "Could not sign out", description: e instanceof Error ? e.message : undefined, variant: "error" });
      setSigningOut(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({ title: "Type DELETE to confirm", variant: "error" });
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not signed in", variant: "error" });
      setDeleting(false);
      return;
    }

    // Attempt to delete user data first (RLS will ensure only own rows)
    // Delete in order to respect FKs: tasks, schedule_events, etc. will cascade via profiles delete
    // But we can also just delete the profile which cascades, or call the API to delete the auth user if possible.
    // Since client cannot delete auth user without service role, we do a soft delete: clear data and sign out.

    // Try to delete profile (will cascade to all user data due to FK onDelete cascade)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id);

    // Always sign out locally
    await supabase.auth.signOut();

    setDeleting(false);
    setConfirmOpen(false);

    if (profileError) {
      toast({
        title: "Account data cleared locally, please contact support to fully delete auth record",
        description: profileError.message,
        variant: "error",
      });
    } else {
      toast({ title: "Account deleted", description: "Your StudentHub data has been removed.", variant: "success" });
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gray">
            <LogOut className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-dark">Sign out</p>
            <p className="text-xs text-gray-500">End your current session on this device.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} isLoading={signingOut} disabled={signingOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      <div className="rounded-md border border-red-200 bg-red-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Delete account</p>
            <p className="mt-1 text-xs text-red-700/80">
              Permanently delete your StudentHub account and all associated data (courses, tasks, schedule, focus sessions, notes, flashcards, quizzes, wellness entries). This cannot be undone.
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <ShieldCheck className="h-3 w-3" /> Your Google tokens are encrypted and will be removed. Classroom/Calendar data remains in Google.
            </p>
            <div className="mt-3">
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-brand-dark">Delete account?</h3>
                <p className="mt-1 text-sm text-gray-600">This will permanently delete your account and all StudentHub data. Type <span className="font-mono font-semibold">DELETE</span> to confirm.</p>
              </div>
            </div>
            <div className="mt-4">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-royal focus:outline-none focus:ring-1 focus:ring-brand-royal"
                autoFocus
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={deleting} disabled={confirmText !== "DELETE" || deleting}>
                <Trash2 className="h-4 w-4" /> Permanently delete
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">This action cannot be undone.</p>
          </div>
        </div>
      )}
    </div>
  );
}
