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
