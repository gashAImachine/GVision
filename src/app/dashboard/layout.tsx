"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    // First, check if there's an existing session in localStorage
    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (session?.user) {
          setUser(session.user);
        }
        setLoading(false);
      }
    };

    // Initial check for existing session
    checkExistingSession();

    // Listen for auth state changes (e.g., sign outs, token refreshes)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        // Not authenticated — redirect to login
        setUser(null);
        setLoading(false);
        window.location.href = "/auth/login";
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-night-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // If not loading but no user, redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return null;
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
