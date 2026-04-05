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
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware to refresh the user's session on every request.
 * This is CRITICAL — without it, the auth token expires and the user
 * gets kicked out. The middleware reads the auth cookies, calls getUser()
 * to validate/refresh the token, and writes updated cookies to the response.
 */
export async function updateSession(request: NextRequest) {
  // Create a response that we can modify (set cookies on)
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          // Write cookies to the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Write cookies to the response (for the browser)
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() here — it reads from storage only
  // and doesn't validate. getUser() actually calls Supabase to verify
  // the token and refresh it if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated and trying to access dashboard, redirect to login
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // If authenticated and on login page, redirect to dashboard
  if (user && request.nextUrl.pathname === "/auth/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
