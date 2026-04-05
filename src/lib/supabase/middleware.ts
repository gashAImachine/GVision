import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware to handle session updates.
 * Since the browser client uses localStorage for session persistence,
 * auth redirects are handled client-side by the dashboard layout.
 * This middleware is minimal and mainly passes through requests.
 */
export async function updateSession(request: NextRequest) {
  // Simply pass through - auth is handled client-side with localStorage
  return NextResponse.next({ request });
}
