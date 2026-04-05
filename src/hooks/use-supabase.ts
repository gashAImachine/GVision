"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to access the Supabase browser client in client components.
 * Memoized so it doesn't recreate on every render.
 */
export function useSupabase() {
  const supabase = useMemo(() => createClient(), []);
  return supabase;
}
