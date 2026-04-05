"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";

// ─── Demo incidents (shown when no real data yet) ───
const DEMO_INCIDENTS = Array.from({ length: 40 }, (_, i) => {
  const types = ["Maintenance", "Housekeeping", "IT", "Noise", "Safety", "Guest Behaviour", "Guest dissatisfaction", "Transport", "Alarm", "Other"];
  const severities: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];
  const statuses: Array<"open" | "in_progress" | "resolved" | "closed"> = ["open", "in_progress", "resolved", "closed"];
  const rooms = ["R0812", "R0604", "R1015", "R0307", "R0519", "R1408", "R0203", "R0916", "B0043", "T0214"];
  const titles = [
    "AC not cooling", "Noise complaint Floor 8", "WiFi not working", "Smoke alarm triggered",
    "Towels not replenished", "Guest intoxicated at pool", "TV remote broken", "Buggy tyre flat",
    "Safelock battery dead", "Blocked toilet", "Hot water not working", "Fridge leaking",
    "Loud music from R0605", "Cockroach in bathroom", "Power outage wing A", "Door lock jammed",
    "Guest requesting refund", "Elevator stuck Floor 3", "Bleach smell in room", "Fire alarm false trigger",
  ];

  const day = Math.floor(Math.random() * 28) + 1;
  const month = Math.floor(Math.random() * 3) + 1;
  const hour = Math.floor(Math.random() * 24);
  const min = Math.floor(Math.random() * 60);
  const sev = severities[i < 5 ? 2 : i < 15 ? 1 : 0];
  const stat = i < 8 ? statuses[Math.floor(Math.random() * 2)] : statuses[2 + Math.floor(Math.random() * 2)];

  return {
    id: `demo-${i}`,
    incident_date: `2026-0${month}-${day.toString().padStart(2, "0")}`,
    incident_time: `${hour.toString().padStart(2, "0")}${min.toString().padStart(2, "0")}`,
    title: titles[i % titles.length],
    room_code: rooms[i % rooms.length],
    incident_type: types[i % types.length],
    severity: sev,
    status: stat,
    is_escalated: i % 5 === 0,
    primary_department: ["Maintenance", "Housekeeping", "IT", "Security", "Front Office", "Transport"][i % 6],
  };
});

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-yellow-500/15 text-yellow-400",
  low: "bg-green-500/15 text-green-400",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-orange-500/15 text-orange-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-night-500/15 text-night-400",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function IncidentsPage() {
  const supabase = useSupabase();
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const loadIncidents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);
      let query = supabase
        .from("incidents")
        .select("*")
        .order("incident_date", { ascending: false })
        .order("incident_time", { ascending: false })
        .limit(200);

      if (filterType !== "all") query = query.eq("incident_type", filterType);
      if (filterSeverity !== "all") query = query.eq("severity", filterSeverity);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);

      const { data } = await query;
      if (data && data.length > 0) {
        setIncidents(data);
        setIsDemo(false);
      }
    } catch {
      // Use demo data
    }
    setLoading(false);
  }, [supabase, filterType, filterSeverity, filterStatus]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Client-side search filter
  const filtered = incidents.filter((inc) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inc.title?.toLowerCase().includes(s) ||
      inc.room_code?.toLowerCase().includes(s) ||
      inc.incident_type?.toLowerCase().includes(s)
    );
  });

  const types = [...new Set(incidents.map((i) => i.incident_type))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Incidents</h1>
          <p className="text-night-400 mt-1">
            {filtered.length} incidents {isDemo ? "(demo data)" : ""}
          </p>
        </div>
        <a
          href="/dashboard/log"
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          + Log New
        </a>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, room, type..."
          className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[220px]"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* ─── Table ─── */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-night-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-night-400 font-medium">Date</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Time</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Issue</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Room</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Type</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Severity</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Dept</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Esc</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-night-300 whitespace-nowrap">{inc.incident_date}</td>
                    <td className="px-4 py-3 text-night-300 font-mono text-xs">{inc.incident_time || "—"}</td>
                    <td className="px-4 py-3 text-white max-w-[250px] truncate">{inc.title}</td>
                    <td className="px-4 py-3 text-night-300 font-mono text-xs">{inc.room_code || "—"}</td>
                    <td className="px-4 py-3 text-night-300 whitespace-nowrap">{inc.incident_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[inc.severity] || ""}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[inc.status] || ""}`}>
                        {STATUS_LABEL[inc.status] || inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-night-400 text-xs">{inc.primary_department || "—"}</td>
                    <td className="px-4 py-3 text-center">{inc.is_escalated ? "⬆" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
