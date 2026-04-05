"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Demo data (used when Supabase has no records yet) ───
const DEMO_MONTHLY = [
  { month: "Jul", incidents: 142, high: 12, escalated: 18 },
  { month: "Aug", incidents: 168, high: 15, escalated: 24 },
  { month: "Sep", incidents: 131, high: 9, escalated: 14 },
  { month: "Oct", incidents: 189, high: 18, escalated: 28 },
  { month: "Nov", incidents: 204, high: 22, escalated: 31 },
  { month: "Dec", incidents: 247, high: 28, escalated: 42 },
  { month: "Jan", incidents: 261, high: 31, escalated: 45 },
  { month: "Feb", incidents: 218, high: 19, escalated: 33 },
  { month: "Mar", incidents: 195, high: 16, escalated: 26 },
  { month: "Apr", incidents: 178, high: 14, escalated: 21 },
  { month: "May", incidents: 156, high: 11, escalated: 17 },
  { month: "Jun", incidents: 149, high: 10, escalated: 15 },
];

const DEMO_BY_TYPE = [
  { name: "Maintenance", value: 624, color: "#f97316" },
  { name: "Housekeeping", value: 389, color: "#8b5cf6" },
  { name: "IT", value: 287, color: "#3b82f6" },
  { name: "Noise", value: 245, color: "#eab308" },
  { name: "Guest Complaint", value: 198, color: "#ec4899" },
  { name: "Safety", value: 156, color: "#ef4444" },
  { name: "Transport", value: 134, color: "#22c55e" },
  { name: "Guest Behaviour", value: 112, color: "#f97316" },
  { name: "Alarm", value: 87, color: "#ef4444" },
  { name: "Other", value: 106, color: "#6b7280" },
];

const DEMO_BY_SEVERITY = [
  { name: "Low", value: 1489, color: "#22c55e" },
  { name: "Medium", value: 698, color: "#eab308" },
  { name: "High", value: 251, color: "#ef4444" },
];

const DEMO_BY_DEPARTMENT = [
  { department: "Maintenance", open: 23, resolved: 601 },
  { department: "Housekeeping", open: 12, resolved: 377 },
  { department: "IT", open: 8, resolved: 279 },
  { department: "Security", open: 15, resolved: 585 },
  { department: "Front Office", open: 6, resolved: 298 },
  { department: "Transport", open: 4, resolved: 130 },
];

const DEMO_RECENT = [
  { id: "1", title: "AC not cooling", room: "R0812", type: "Maintenance", severity: "high", time: "23:45" },
  { id: "2", title: "Noise complaint", room: "R0604", type: "Noise", severity: "medium", time: "23:20" },
  { id: "3", title: "WiFi not working", room: "R1015", type: "IT", severity: "low", time: "22:55" },
  { id: "4", title: "Smoke alarm triggered", room: "R0307", type: "Alarm", severity: "high", time: "22:30" },
  { id: "5", title: "Towels not replenished", room: "R0519", type: "Housekeeping", severity: "low", time: "22:10" },
  { id: "6", title: "Guest intoxicated at pool", room: "—", type: "Guest Behaviour", severity: "medium", time: "21:45" },
];

const DEMO_COMP = { total: 14320, count: 47, avg: 304.68 };

const severityBadge: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-yellow-500/15 text-yellow-400",
  low: "bg-green-500/15 text-green-400",
};

export default function DashboardPage() {
  const supabase = useSupabase();
  const [isDemo, setIsDemo] = useState(true);
  const [totalIncidents, setTotalIncidents] = useState(2438);
  const [openCases, setOpenCases] = useState(68);
  const [highSeverity, setHighSeverity] = useState(251);
  const [escalationRate] = useState(12.8);

  // Try fetching real data; fall back to demo
  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true });

        if (count && count > 0) {
          setIsDemo(false);
          setTotalIncidents(count);

          const { count: openCount } = await supabase
            .from("incidents")
            .select("*", { count: "exact", head: true })
            .eq("status", "open");
          setOpenCases(openCount || 0);

          const { count: highCount } = await supabase
            .from("incidents")
            .select("*", { count: "exact", head: true })
            .eq("severity", "high");
          setHighSeverity(highCount || 0);
        }
      } catch {
        // Supabase not connected yet — use demo data
      }
    }
    loadStats();
  }, [supabase]);

  return (
    <div className="space-y-6">
      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-lg px-4 py-2.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
          Showing demo data. Import your incidents to see real numbers.
        </div>
      )}

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Total Incidents</p>
          <p className="text-3xl font-bold text-white mt-1">{totalIncidents.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Open Cases</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{openCases}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">High Severity</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{highSeverity}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Escalation Rate</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{escalationRate}%</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Compensation</p>
          <p className="text-3xl font-bold text-brand-400 mt-1">${DEMO_COMP.total.toLocaleString()}</p>
          <p className="text-xs text-night-500 mt-0.5">{DEMO_COMP.count} cases · avg ${DEMO_COMP.avg}</p>
        </div>
      </div>

      {/* ─── Row: Trend + Type Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-night-300 mb-4">Monthly Incident Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={DEMO_MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              <Line type="monotone" dataKey="incidents" stroke="#6366f1" strokeWidth={2} name="All" dot={false} />
              <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} name="High" dot={false} />
              <Line type="monotone" dataKey="escalated" stroke="#eab308" strokeWidth={2} name="Escalated" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Type */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-night-300 mb-4">By Type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={DEMO_BY_TYPE}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {DEMO_BY_TYPE.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {DEMO_BY_TYPE.slice(0, 6).map((t) => (
              <div key={t.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-night-400">{t.name}</span>
                <span className="text-night-500 ml-auto">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Row: Severity + Department ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-night-300 mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEMO_BY_SEVERITY} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {DEMO_BY_SEVERITY.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Workload */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-night-300 mb-4">Department Workload</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEMO_BY_DEPARTMENT}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="resolved" fill="#6366f1" name="Resolved" radius={[2, 2, 0, 0]} />
              <Bar dataKey="open" fill="#f97316" name="Open" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Recent Incidents ─── */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-sm font-medium text-night-300 mb-4">Recent Incidents</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 text-night-400 font-medium">Time</th>
                <th className="pb-2 text-night-400 font-medium">Issue</th>
                <th className="pb-2 text-night-400 font-medium">Room</th>
                <th className="pb-2 text-night-400 font-medium">Type</th>
                <th className="pb-2 text-night-400 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_RECENT.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2.5 text-night-300 font-mono text-xs">{r.time}</td>
                  <td className="py-2.5 text-white">{r.title}</td>
                  <td className="py-2.5 text-night-300 font-mono text-xs">{r.room}</td>
                  <td className="py-2.5 text-night-300">{r.type}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadge[r.severity]}`}>
                      {r.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
