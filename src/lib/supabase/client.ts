import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * Uses @supabase/supabase-js directly with default localStorage persistence.
 * This is the simplest, most reliable approach — no cookie chunking issues,
 * no middleware dependency. Session persists in the browser's localStorage.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
