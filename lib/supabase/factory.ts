import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export type CookieToSet = { name: string; value: string; options: CookieOptions };

interface CookieMethods {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: CookieToSet[]) => void;
}

/**
 * Builds a Supabase server client wired to Next.js cookies. The shared cookie
 * plumbing lives here so Server Components, Route Handlers, and middleware
 * don't each re-implement it.
 */
export function createServerCookieClient({ getAll, setAll }: CookieMethods) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll, setAll },
    }
  );
}