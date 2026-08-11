"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-brand-gray font-sans">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div>
            <h1 className="text-lg font-semibold text-brand-dark">Something went wrong</h1>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              An unexpected error occurred. You can try again or return to the dashboard.
            </p>
          </div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
