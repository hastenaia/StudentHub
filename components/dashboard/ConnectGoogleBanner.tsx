import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when no Google account is linked. The "Connect Google" target is the
 * API route that starts the OAuth flow (a normal link — no JS needed).
 */
export function ConnectGoogleBanner() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-royal/10">
            <CalendarClock className="h-5 w-5 text-brand-royal" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-dark">Connect Google</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Link your Google account to pull in your class schedule, assignments, and
              announcements — pulled in securely and cached for a fast dashboard.
            </p>
          </div>
        </div>
        <Link href="/api/google/auth" className={buttonVariants()}>
          Connect Google
        </Link>
      </CardContent>
    </Card>
  );
}