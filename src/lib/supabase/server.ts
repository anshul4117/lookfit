import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Creates a server-scoped Supabase client for Server Components, Server Actions,
 * and Route Handlers using request cookies.
 */
export async function createClient(): Promise<SupabaseClient<Database, "public", "public", Database["public"]>> {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // In Next.js App Router, cookieStore.set throws in Server Components during render.
            // This is expected and safe when middleware is actively refreshing user sessions.
            // Only suppress expected read-only cookie errors; rethrow any unrelated exceptions.
            if (
              error instanceof Error &&
              (error.message.includes("Cookies can only be modified in a Server Action or Route Handler") ||
                error.message.includes("Headers are read-only"))
            ) {
              return;
            }
            throw error;
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database, "public", "public", Database["public"]>;
}
