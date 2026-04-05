# G-Vision Authentication Implementation Guide

## Architecture Overview

The G-Vision app uses a **client-side localStorage-based authentication** pattern with the following components:

```
┌─────────────────┐
│  Browser/Client │
├─────────────────┤
│ localStorage    │ ← Stores auth session
│ (auth tokens)   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Supabase Client (createClient)     │
├─────────────────────────────────────┤
│ - Reads/writes to localStorage      │
│ - Handles signInWithPassword        │
│ - Listens to auth state changes     │
│ - Auto-refreshes tokens            │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Supabase Backend (Auth API)        │
├─────────────────────────────────────┤
│ Project: qtjtwpdxybjdsdefxxwp      │
│ Endpoint: supabase.co              │
└─────────────────────────────────────┘
```

## How It Works

### 1. Initial Page Load

```typescript
// dashboard/layout.tsx
useEffect(() => {
  // Step 1: Check if session exists in localStorage
  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
  };

  checkExistingSession();

  // Step 2: Listen for future changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setUser(session.user);
    } else {
      window.location.href = "/auth/login";
    }
  });
}, []);
```

**Flow:**
1. Component mounts
2. Call `getSession()` to read localStorage
3. If session exists, set user state
4. Subscribe to auth state changes
5. Stop showing "Loading..."

### 2. Login Flow

```typescript
// app/auth/login/page.tsx
const handleLogin = async (e: React.FormEvent) => {
  // Step 1: Authenticate with Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  // Step 2: Wait for localStorage to be written
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Verify session was persisted
  const { data: { session } } = await supabase.auth.getSession();

  // Step 4: Redirect to dashboard
  if (session) {
    window.location.href = "/dashboard";
  }
};
```

**Flow:**
1. User enters email and password
2. Call `signInWithPassword()` → Supabase validates credentials
3. Supabase returns session with access and refresh tokens
4. Supabase client automatically persists to localStorage
5. Wait 100ms (microtask queue settling)
6. Call `getSession()` to verify it was written
7. Hard redirect to `/dashboard`

### 3. Dashboard Load (After Login)

```typescript
// After hard redirect from login
// Browser loads /dashboard
// dashboard/layout.tsx useEffect runs:

1. Call getSession() → reads from localStorage
   → Finds session with user data
   → Sets user state
   → Renders dashboard

2. Subscribe to onAuthStateChange()
   → Listens for future auth events
   → If user signs out, redirects to login
   → If token refreshes, updates session
```

### 4. Page Refresh (Session Persistence)

```typescript
// User is on dashboard, refreshes page:

1. Browser unloads and reloads /dashboard
2. Dashboard layout mounts again
3. useEffect runs:
   → Call getSession()
   → localStorage still has tokens
   → Session is restored
   → User sees dashboard immediately
```

## Key Implementation Details

### Client Initialization

```typescript
// src/lib/supabase/client.ts
export function createClient() {
  if (client) return client;

  // Check if we're in browser
  if (typeof window === "undefined") {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Create browser client with localStorage
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",                    // Use PKCE for security
        autoRefreshToken: true,              // Auto-refresh expired tokens
        detectSessionInUrl: true,            // Detect session from URL
        persistSession: true,                // Persist to storage
        storage: window.localStorage,        // Use browser's localStorage
      },
    }
  );

  return client;
}
```

### Why localStorage?

| Method | Pros | Cons |
|--------|------|------|
| **Cookies** | Server can read in middleware | Requires secure cookie handling |
| **localStorage** (CHOSEN) | Simple, persistent, client-side | Server can't read directly |
| **Memory** | Fast | Lost on page refresh |

**Decision:** localStorage is ideal because:
- Auth is handled entirely client-side
- No SSR authentication needed
- Survives page refreshes
- No cookie security issues
- Works with `@supabase/supabase-js` v2.43.0

### Session Verification Pattern

```typescript
// Check if user is logged in
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  console.log("User is logged in:", session.user.email);
} else {
  console.log("User is not logged in");
}
```

This reads from localStorage and is the **canonical way** to check auth state.

### Auth State Listener Pattern

```typescript
// Subscribe to auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // event can be: "INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"

    if (event === "SIGNED_IN") {
      console.log("User signed in");
    } else if (event === "SIGNED_OUT") {
      console.log("User signed out");
    }
  }
);

// Cleanup
return () => subscription.unsubscribe();
```

This is used for reactive updates (e.g., redirect on logout).

## Middleware (Simplified)

```typescript
// src/lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  // Auth is handled client-side, not in middleware
  // This just passes through
  return NextResponse.next({ request });
}
```

**Why simplified?**
- Auth tokens live in browser localStorage
- Server middleware can't access localStorage
- Client components handle all auth checks
- No need for cookie-based SSR auth

## Common Operations

### Sign In

```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});

if (!error) {
  // Session is now in localStorage
  window.location.href = "/dashboard";
}
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();

if (!error) {
  // Session removed from localStorage
  // Redirect happens in onAuthStateChange listener
  window.location.href = "/auth/login";
}
```

### Get Current User

```typescript
const { data: { session } } = await supabase.auth.getSession();

if (session?.user) {
  console.log(session.user.email);
  console.log(session.user.id);
}
```

### Check Auth in Component

```typescript
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function MyComponent() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!user) return <p>Not logged in</p>;
  return <p>Welcome, {user.email}</p>;
}
```

## Security Considerations

1. **PKCE Flow**: Uses proof key for code exchange, more secure than implicit grant
2. **Auto Token Refresh**: `autoRefreshToken: true` automatically refreshes expired tokens
3. **No Secrets in Client**: ANON key only has user auth permissions, no admin privileges
4. **HTTPS Only**: localStorage is isolated per-origin, HTTPS enforces connection security
5. **XSS Protection**: localStorage can be accessed by JavaScript, so XSS protection is critical

## Deployment

When deploying to Vercel:

1. **Environment Variables** should be set in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **No Additional Setup** needed:
   - Middleware handles all routes
   - Client components work as-is
   - localStorage works in Vercel's edge runtime

3. **Testing on Vercel**:
   - Login should work immediately
   - Page refresh should persist session
   - Logout should clear localStorage

## Troubleshooting

### "Session lost after redirect"
**Cause**: Session not yet written to localStorage
**Fix**: Added 100ms wait and verification in login handler

### "Can't get session in middleware"
**Reason**: Middleware can't access browser localStorage
**Solution**: Moved all auth checks to client components

### "Auth state not updating"
**Cause**: Subscription wasn't cleaned up
**Fix**: Added isMounted check and proper cleanup

### "Page refresh loses session"
**Cause**: Using wrong storage mechanism
**Fix**: Ensured localStorage is properly configured

## Testing Checklist

- [ ] Login with valid credentials → redirects to dashboard
- [ ] Login with invalid credentials → shows error message
- [ ] Dashboard loads → shows user name/email
- [ ] Refresh dashboard page → stays logged in
- [ ] Logout (if implemented) → redirects to login
- [ ] Visit /dashboard without logging in → redirects to login
- [ ] Multiple tabs → auth state syncs across tabs (localStorage event)
