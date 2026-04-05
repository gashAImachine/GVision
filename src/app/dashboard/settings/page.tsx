"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import Link from "next/link";

export default function SettingsPage() {
  const supabase = useSupabase();
  const [orgName, setOrgName] = useState("Your Hotel");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("admin");

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, organization_id")
            .eq("id", user.id)
            .single();
          if (profile) {
            setUserRole(profile.role);
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", profile.organization_id)
              .single();
            if (org) setOrgName(org.name);
          }
        }
      } catch {
        // Not connected yet
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-night-400 mt-1">
          Manage your organization, properties, and account.
        </p>
      </div>

      {/* Account */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">Account</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-night-400 mb-1">Email</label>
            <p className="text-white text-sm">{userEmail || "Not signed in"}</p>
          </div>
          <div>
            <label className="block text-sm text-night-400 mb-1">Role</label>
            <p className="text-white text-sm capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">Organization</h2>
        <div>
          <label className="block text-sm text-night-400 mb-1">Name</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="glass rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-medium text-white">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/settings/rooms"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <span className="text-xl">◫</span>
            <div>
              <p className="text-sm font-medium text-white">Room Layout</p>
              <p className="text-xs text-night-400">Configure floor plans and room maps</p>
            </div>
          </Link>
          <Link
            href="/dashboard/import"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <span className="text-xl">⬆</span>
            <div>
              <p className="text-sm font-medium text-white">Import Data</p>
              <p className="text-xs text-night-400">Upload incident records from CSV</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 opacity-50">
            <span className="text-xl">🏷️</span>
            <div>
              <p className="text-sm font-medium text-white">Incident Types</p>
              <p className="text-xs text-night-400">Customize categories — coming soon</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 opacity-50">
            <span className="text-xl">👥</span>
            <div>
              <p className="text-sm font-medium text-white">Team Members</p>
              <p className="text-xs text-night-400">Invite staff and managers — coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass rounded-xl p-6 border-red-500/20">
        <h2 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-night-400 mb-3">
          These actions are permanent and cannot be undone.
        </p>
        <button
          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          onClick={async () => {
            if (confirm("Are you sure you want to sign out?")) {
              await supabase.auth.signOut();
              window.location.href = "/";
            }
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
