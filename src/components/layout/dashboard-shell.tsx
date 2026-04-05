"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  { label: "Log Incident", href: "/dashboard/log", icon: "plus" },
  { label: "Incidents", href: "/dashboard/incidents", icon: "alert" },
  { label: "Compensation", href: "/dashboard/compensation", icon: "dollar" },
  { label: "Room Map", href: "/dashboard/rooms", icon: "map" },
  { label: "Reports", href: "/dashboard/reports", icon: "chart" },
  { label: "Import Data", href: "/dashboard/import", icon: "upload" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

// Simple icon components (will swap for Lucide later)
function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    grid: "⊞",
    plus: "＋",
    alert: "⚡",
    dollar: "💰",
    map: "◫",
    chart: "📊",
    upload: "⬆",
    settings: "⚙",
  };
  return <span className="text-base">{icons[icon] || "•"}</span>;
}

interface DashboardShellProps {
  user: User;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-night-950 border-r border-white/10 transform transition-transform lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">GV</span>
              </div>
              <span className="text-lg font-semibold text-white">
                G-Vision
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-500/10 text-brand-400"
                      : "text-night-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <NavIcon icon={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user.email?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-night-500 hover:text-night-300 text-xs"
                title="Sign out"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden border-b border-white/10 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-night-400 hover:text-white"
          >
            <span className="text-xl">☰</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
