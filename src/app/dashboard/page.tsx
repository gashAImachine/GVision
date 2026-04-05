"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  loadIncidents,
  computeKPIs,
  computeMonthlyTrend,
  countByField,
  computeSeverityBreakdown,
  computeDeptWorkload,
  getRecentHighSeverity,
  SEVERITY_BADGE,
  CHART_PALETTE,
  formatTime,
} from "@/lib/incidents-data";
import type { Incident } from "@/lib/incidents-data";

type YearFilter = "all" | "2025" | "2026";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  // Filtered data based on year
  const filteredIncidents = incidents.filter((inc) => {
    if (yearFilter === "all") return true;
    return inc.date.startsWith(yearFilter);
  });

  // Load incidents on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await loadIncidents();
        setIncidents(data);
      } catch (err) {
        console.error("Failed to load incidents:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-night-400 text-sm">Loading incident data...</div>
      </div>
    );
  }

  // Compute analytics
  const kpis = computeKPIs(filteredIncidents);
  const monthlyTrend = computeMonthlyTrend(filteredIncidents);
  const byType = countByField(filteredIncidents, "incident_type", 10);
  const byDept = computeDeptWorkload(filteredIncidents);
  const severityBreakdown = computeSeverityBreakdown(filteredIncidents);
  const recentHighSeverity = getRecentHighSeverity(filteredIncidents, 10);

  // Department workload for bar chart
  const deptChartData = byDept.map((d) => ({
    department: d.department,
    total: d.total,
    high: d.high,
  }));

  // Severity chart data
  const severityChartData = severityBreakdown.map((s) => ({
    name: s.name,
    value: s.value,
    color: s.color,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">Night Eye â Operational Intelligence</h1>
        <p className="text-sm text-night-400">Hamilton Island</p>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all" as YearFilter, label: "All" },
          { key: "2025" as YearFilter, label: "2025" },
          { key: "2026" as YearFilter, label: "2026" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setYearFilter(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              yearFilter === tab.key
                ? "bg-brand-500 text-white"
                : "bg-night-900/50 text-night-300 border border-night-700 hover:bg-night-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Incidents */}
        <div className="glass rounded-xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-night-400">Total Incidents</p>
          <p className="text-3xl font-bold text-white mt-2">{kpis.totalIncidents.toLocaleString()}</p>
        </div>

        {/* High Severity */}
        <div className="glass rounded-xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-night-400">High Severity</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{kpis.highSeverity}</p>
        </div>

        {/* Escalation Rate */}
        <div className="glass rounded-xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-night-400">Escalation Rate</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">
            {kpis.escalationRate.toFixed(1)}%
          </p>
        </div>

        {/* Top Type */}
        <div className="glass rounded-xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-night-400">Top Type</p>
          <p className="text-3xl font-bold text-green-400 mt-2 truncate">{kpis.topIncidentType}</p>
        </div>

        {/* RDM Controllable */}
        <div className="glass rounded-xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-night-400">RDM Controllable</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">{kpis.controllableCount}</p>
        </div>
      </div>

      {/* Charts Row 1: Trend + By Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-night-300 mb-4">Monthly Incident Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" dot={false} />
              <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} name="High" dot={false} />
              <Line type="monotone" dataKey="escalated" stroke="#eab308" strokeWidth={2} name="Escalated" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Incident Type */}
        <div className="glass rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-night-300 mb-4">By Incident Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byType}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {byType.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-1 text-xs max-h-40 overflow-y-auto">
            {byType.slice(0, 10).map((t) => (
              <div key={t.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-night-400 truncate">{t.name}</span>
                <span className="text-night-500 ml-auto flex-shrink-0">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Severity + Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="glass rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-night-300 mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {severityChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Workload */}
        <div className="glass rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-night-300 mb-4">Department Workload</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="total" fill="#6366f1" name="Total" radius={[2, 2, 0, 0]} />
              <Bar dataKey="high" fill="#ef4444" name="High" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent High Severity Incidents Table */}
      <div className="glass rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl">
        <h2 className="text-sm font-medium text-night-300 mb-4">Recent High Severity Incidents</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Date</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Time</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Room</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Type</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Issue</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Severity</th>
                <th className="pb-3 px-4 text-left text-night-400 font-medium">Department</th>
              </tr>
            </thead>
            <tbody>
              {recentHighSeverity.map((inc) => (
                <tr key={`${inc.date}-${inc.time}-${inc.room_number}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-night-300 font-mono text-xs">{inc.date}</td>
                  <td className="py-3 px-4 text-night-300 font-mono text-xs">{formatTime(inc.time)}</td>
                  <td className="py-3 px-4 text-white font-mono text-xs">{inc.room_number}</td>
                  <td className="py-3 px-4 text-night-300 text-xs">{inc.incident_type}</td>
                  <td className="py-3 px-4 text-white text-xs max-w-xs truncate">{inc.issue_summary}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${SEVERITY_BADGE[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-night-300 text-xs">{inc.primary_department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentHighSeverity.length === 0 && (
          <div className="py-8 text-center text-night-400">
            No high severity incidents in this period.
          </div>
        )}
      </div>
    </div>
  );
}
