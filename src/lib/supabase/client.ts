import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Create a Supabase client with localStorage-based session persistence.
 * This is used exclusively in the browser and ensures sessions survive page refreshes.
 */
export function createClient() {
  if (client) return client;

  // Only create client on the browser
  if (typeof window === "undefined") {
    // Return a dummy client for SSR - should not be used
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );

  return client;
}
