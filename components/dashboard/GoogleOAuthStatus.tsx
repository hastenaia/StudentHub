"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast, type ToastVariant } from "@/hooks/useToast";

interface OAuthMessage {
  variant: ToastVariant;
  title: string;
  description: string;
}

/** Maps the status the Google callback drops on the URL to a toast. */
const MESSAGES: Record<string, OAuthMessage> = {
  linked: {
    variant: "success",
    title: "Google connected",
    description: "Your school data is syncing into the dashboard.",
  },
  error: {
    variant: "error",
    title: "Connection failed",
    description: "We couldn't link your Google account. Please try again.",
  },
  auth_denied: {
    variant: "warning",
    title: "Authorization cancelled",
    description: "You closed the Google sign-in screen. Nothing was changed.",
  },
  state_mismatch: {
    variant: "error",
    title: "Session expired",
    description: "The connection request was too old. Please try again.",
  },
};

/**
 * Reads the `?google=` status left by /api/google/callback, surfaces it as a
 * toast, then strips the query param so it can't re-fire on refresh/back.
 */
export function GoogleOAuthStatus() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const handled = React.useRef(false);

  React.useEffect(() => {
    const status = searchParams.get("google");
    if (!status || handled.current) return;
    handled.current = true;

    const message = MESSAGES[status];
    if (message) toast(message);

    router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router, toast]);

  return null;
}
