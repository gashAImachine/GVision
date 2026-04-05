import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — pass-through only.
 *
 * We do NOT check auth here because @supabase/ssr v0.3.0 has a known
 * issue where createServerClient cannot reliably read chunked cookies
 * on Vercel's edge runtime. Auth is handled entirely client-side
 * in the dashboard layout instead.
 */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
