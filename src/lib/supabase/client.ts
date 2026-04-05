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
import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase browser client.
 * Uses @supabase/ssr's createBrowserClient which automatically handles
 * cookie-based session persistence in the browser.
 *
 * This is safe to call multiple times — @supabase/ssr deduplicates internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
