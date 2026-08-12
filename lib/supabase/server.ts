import { cookies } from "next/headers";
import { createServerCookieClient } from "@/lib/supabase/factory";

/**
 * Supabase client for use in Server Components, Route Handlers, and
 * Server Actions. Reads/writes the session via Next.js cookies().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerCookieClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      } catch {
        // Called from a Server Component — safe to ignore because
        // middleware refreshes the session on every request.
      }
    },
  });
}