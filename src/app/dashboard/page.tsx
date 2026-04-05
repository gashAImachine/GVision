"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Utilities ───
type DateRangeType = "7d" | "30d" | "90d" | "12m" | "all";

function generateDemoIncidents(count: number, daysBack: number): any[] {
  const incidents = [
    "AC not cooling", "Noise complaint", "WiFi not working", "Smoke alarm triggered",
    "Towels not replenished", "Guest intoxicated at pool", "Plumbing issue", "Light fixture broken",
    "TV not working", "Door lock malfunction", "Heating not working", "Water pressure low",
    "Phone line down", "Bed sheets torn", "Bathroom tiles loose", "Elevator breakdown",
  ];
  const types = [
    "Maintenance", "Housekeeping", "IT", "Noise", "Guest Complaint",
    "Safety", "Transport", "Guest Behaviour", "Alarm", "Other"
  ];
  const severities = ["low", "medium", "high"];
  const sites = ["East Tower", "West Tower", "Central", "Annex"];
  const rooms = Array.from({ length: 20 }, (_, i) => `R${String(i + 1).padStart(4, "0")}`);

  const result = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * daysBack);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const hours = Math.floor(Math.random() * 24);
    const mins = Math.floor(Math.random() * 60);
    date.setHours(hours, mins, 0);

    result.push({
      id: `demo-${i}`,
      date: date.toISOString().split("T")[0],
      time: `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
      site: sites[Math.floor(Math.random() * sites.length)],
      room: rooms[Math.floor(Math.random() * rooms.length)],
      type: types[Math.floor(Math.random() * types.length)],
      title: incidents[Math.floor(Math.random() * incidents.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      escalated: Math.random() > 0.85,
      department: ["Maintenance", "Housekeeping", "IT", "Security", "Front Office"][Math.floor(Math.random() * 5)],
    });
  }
  return result.sort((a, b) => new Date(b.date + " " + b.time).getTime() - new Date(a.date + " " + a.time).getTime());
}

function getDateRangeDays(range: DateRangeType): number {
  const map: Record<DateRangeType, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365, "all": 999 };
  return map[range];
}

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
  const [selectedRange, setSelectedRange] = useState<DateRangeType>("30d");
  const [totalIncidents, setTotalIncidents] = useState(2438);
  const [prevTotalIncidents, setPrevTotalIncidents] = useState(2100);
  const [openCases, setOpenCases] = useState(68);
  const [prevOpenCases, setPrevOpenCases] = useState(74);
  const [highSeverity, setHighSeverity] = useState(251);
  const [prevHighSeverity, setPrevHighSeverity] = useState(198);
  const [escalationRate] = useState(12.8);
  const [prevEscalationRate] = useState(11.2);
  const [demoIncidents, setDemoIncidents] = useState<any[]>([]);
  const [searchIncidents, setSearchIncidents] = useState("");

  // Generate demo incidents based on selected range
  useEffect(() => {
    const days = getDateRangeDays(selectedRange);
    const incidents = generateDemoIncidents(50, days);
    setDemoIncidents(incidents);
  }, [selectedRange]);

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

  // Calculate trend percentage and direction
  const calcTrend = (current: number, previous: number): { pct: string; isUp: boolean } => {
    if (previous === 0) return { pct: "0%", isUp: false };
    const change = ((current - previous) / previous) * 100;
    return {
      pct: Math.abs(change).toFixed(1),
      isUp: change > 0,
    };
  };

  const incidentsTrend = calcTrend(totalIncidents, prevTotalIncidents);
  const openCasesTrend = calcTrend(openCases, prevOpenCases);
  const highSeverityTrend = calcTrend(highSeverity, prevHighSeverity);
  const escalationTrend = calcTrend(escalationRate, prevEscalationRate);

  // Filter incidents by search
  const filteredIncidents = demoIncidents.filter((inc) =>
    inc.title.toLowerCase().includes(searchIncidents.toLowerCase()) ||
    inc.room.toLowerCase().includes(searchIncidents.toLowerCase()) ||
    inc.type.toLowerCase().includes(searchIncidents.toLowerCase()) ||
    inc.site.toLowerCase().includes(searchIncidents.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-lg px-4 py-2.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
          Showing demo data. Import your incidents to see real numbers.
        </div>
      )}

      {/* ─── Date Range Filter ─── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "7d" as DateRangeType, label: "7 Days" },
          { key: "30d" as DateRangeType, label: "30 Days" },
          { key: "90d" as DateRangeType, label: "90 Days" },
          { key: "12m" as DateRangeType, label: "12 Months" },
          { key: "all" as DateRangeType, label: "All Time" },
        ].map((range) => (
          <button
            key={range.key}
            onClick={() => setSelectedRange(range.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              selectedRange === range.key
                ? "bg-brand-500 text-white"
                : "bg-night-900/50 text-night-300 border border-night-700 hover:bg-night-800/50"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* ─── KPI Cards with Trends ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-night-400">Total Incidents</p>
              <p className="text-3xl font-bold text-white mt-1">{totalIncidents.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${incidentsTrend.isUp ? "text-green-400" : "text-red-400"}`}>
                {incidentsTrend.isUp ? "↑" : "↓"} {incidentsTrend.pct}%
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-night-400">Open Cases</p>
              <p className="text-3xl font-bold text-orange-400 mt-1">{openCases}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${openCasesTrend.isUp ? "text-red-400" : "text-green-400"}`}>
                {openCasesTrend.isUp ? "↑" : "↓"} {openCasesTrend.pct}%
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-night-400">High Severity</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{highSeverity}</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${highSeverityTrend.isUp ? "text-red-400" : "text-green-400"}`}>
                {highSeverityTrend.isUp ? "↑" : "↓"} {highSeverityTrend.pct}%
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-night-400">Escalation Rate</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">{escalationRate}%</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${escalationTrend.isUp ? "text-red-400" : "text-green-400"}`}>
                {escalationTrend.isUp ? "↑" : "↓"} {escalationTrend.pct}%
              </span>
            </div>
          </div>
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

      {/* ─── Last 50 Incidents ─── */}
      <div className="glass rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-sm font-medium text-night-300">Last 50 Incidents</h2>
          <input
            type="text"
            placeholder="Search by room, type, site, or issue..."
            value={searchIncidents}
            onChange={(e) => setSearchIncidents(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-night-900/50 border border-night-700 text-white placeholder-night-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 px-2 text-night-400 font-medium">Date</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Time</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Site</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Room</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Type</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Issue</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Severity</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Escalation</th>
                <th className="pb-2 px-2 text-night-400 font-medium">Department</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.slice(0, 50).map((inc) => (
                <tr key={inc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-2 text-night-300 font-mono text-xs">{inc.date}</td>
                  <td className="py-2.5 px-2 text-night-300 font-mono text-xs">{inc.time}</td>
                  <td className="py-2.5 px-2 text-night-300 text-xs">{inc.site}</td>
                  <td className="py-2.5 px-2 text-white font-mono text-xs">{inc.room}</td>
                  <td className="py-2.5 px-2 text-night-300 text-xs">{inc.type}</td>
                  <td className="py-2.5 px-2 text-white text-xs max-w-xs truncate">{inc.title}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${severityBadge[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {inc.escalated ? <span className="text-xl">⚠️</span> : <span className="text-night-600">·</span>}
                  </td>
                  <td className="py-2.5 px-2 text-night-300 text-xs">{inc.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredIncidents.length === 0 && (
          <div className="py-8 text-center text-night-400">
            No incidents match your search.
          </div>
        )}
        {filteredIncidents.length > 0 && (
          <div className="mt-3 text-xs text-night-500">
            Showing {Math.min(50, filteredIncidents.length)} of {filteredIncidents.length} incidents
          </div>
        )}
      </div>
    </div>
  );
}
