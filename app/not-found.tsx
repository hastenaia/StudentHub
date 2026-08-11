import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-gray text-center">
      <p className="text-6xl font-bold text-brand-royal">404</p>
      <div>
        <h1 className="text-lg font-semibold text-brand-dark">Page not found</h1>
        <p className="mt-1 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
