"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Verify we actually have a session before redirecting
    if (!data.session) {
      setMessage("Login succeeded but no session was returned. Please try again.");
      setLoading(false);
      return;
    }

    // Session is stored in localStorage by @supabase/supabase-js.
    // Hard navigate to dashboard — the layout will read the session client-side.
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold">GV</span>
          </div>
          <span className="text-xl font-semibold text-white">G-Vision</span>
        </div>

        {/* Login card */}
        <div className="glass rounded-xl p-6">
          <h1 className="text-lg font-semibold text-white mb-1">
            Sign in to your account
          </h1>
          <p className="text-sm text-night-400 mb-6">
            Enter your credentials to sign in.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-night-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hotel.com"
                required
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-night-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm text-center text-red-400">{message}</p>
          )}
        </div>

        <p className="text-center text-sm text-night-500 mt-6">
          <Link href="/" className="hover:text-night-300 transition-colors">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
