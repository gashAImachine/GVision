"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── Demo report data ───
const MONTHLY_COMPARISON = [
  { month: "Jan", current: 261, previous: 198 },
  { month: "Feb", current: 218, previous: 175 },
  { month: "Mar", current: 195, previous: 162 },
];

const TOP_ROOMS = [
  { room: "R0810", count: 9, issues: "AC, Pest, Maintenance" },
  { room: "R0811", count: 8, issues: "AC, Plumbing" },
  { room: "R1204", count: 7, issues: "WiFi, TV, Safelock" },
  { room: "R0307", count: 7, issues: "Pest, Smell" },
  { room: "R0519", count: 6, issues: "Housekeeping, Noise" },
  { room: "R1415", count: 6, issues: "AC, Maintenance" },
  { room: "R0604", count: 5, issues: "Noise, Guest Behaviour" },
  { room: "R1015", count: 5, issues: "IT, Safelock" },
];

const ROOT_CAUSES = [
  { name: "Equipment", value: 612, color: "#f97316" },
  { name: "Human", value: 487, color: "#8b5cf6" },
  { name: "Plumbing", value: 234, color: "#3b82f6" },
  { name: "IT", value: 198, color: "#06b6d4" },
  { name: "Hygiene", value: 156, color: "#22c55e" },
  { name: "External", value: 89, color: "#eab308" },
  { name: "Medical", value: 67, color: "#ef4444" },
  { name: "Unknown", value: 595, color: "#6b7280" },
];

const CONTROLLABILITY = [
  { name: "Yes (RDM resolved)", value: 1245, color: "#22c55e" },
  { name: "Partial (escalated)", value: 698, color: "#eab308" },
  { name: "No (beyond RDM)", value: 495, color: "#ef4444" },
];

const TIME_DIST = [
  { hour: "18:00", count: 42 }, { hour: "19:00", count: 68 },
  { hour: "20:00", count: 95 }, { hour: "21:00", count: 124 },
  { hour: "22:00", count: 186 }, { hour: "23:00", count: 247 },
  { hour: "00:00", count: 198 }, { hour: "01:00", count: 156 },
  { hour: "02:00", count: 112 }, { hour: "03:00", count: 78 },
  { hour: "04:00", count: 45 }, { hour: "05:00", count: 32 },
  { hour: "06:00", count: 55 },
];

const COMP_BY_TYPE = [
  { type: "Room Credit", amount: 6840, count: 19 },
  { type: "Refund", amount: 3250, count: 8 },
  { type: "Complimentary", amount: 2180, count: 12 },
  { type: "Upgrade", amount: 1450, count: 5 },
  { type: "Voucher", amount: 600, count: 3 },
];

type ReportTab = "executive" | "rooms" | "compensation" | "time";

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("executive");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-night-400 mt-1">
          Executive briefings and operational analysis (demo data)
        </p>
      </div>

      {/* ─── Tab selector ─── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "executive", label: "Executive Brief" },
          { key: "rooms", label: "Room Hot Spots" },
          { key: "compensation", label: "Compensation" },
          { key: "time", label: "Time Analysis" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as ReportTab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "bg-white/5 text-night-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Executive Brief ─── */}
      {tab === "executive" && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Key Findings</h2>
            <div className="space-y-3 text-sm text-night-200">
              <p><span className="text-red-400 font-medium">Maintenance</span> is the #1 incident type at 25.6% of all incidents. AC issues alone account for 142 cases across 89 unique rooms.</p>
              <p><span className="text-yellow-400 font-medium">8 hot-spot rooms</span> have 4+ incidents each and need targeted intervention — primarily on Floors 3, 5, 8, 12, and 14.</p>
              <p>The <span className="text-brand-400 font-medium">escalation rate is 12.8%</span>, with most escalations going to AH Maintenance and AH Security during overnight hours.</p>
              <p><span className="text-green-400 font-medium">51% of incidents</span> are fully controllable by the Resort Duty Manager, suggesting strong frontline capability with room for improvement on the remaining 49%.</p>
              <p>Compensation totals <span className="text-brand-400 font-medium">$14,320 across 47 cases</span> (avg $304.68). Room credits are the most common form at 40% of total compensation value.</p>
            </div>
          </div>

          {/* YoY Comparison + Root Causes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-medium text-night-300 mb-4">Year-on-Year Comparison (Q1)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_COMPARISON}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                  <Bar dataKey="previous" fill="#475569" name="2025" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="current" fill="#6366f1" name="2026" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-medium text-night-300 mb-4">Root Cause Analysis</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={ROOT_CAUSES} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
                    {ROOT_CAUSES.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {ROOT_CAUSES.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-night-400">{r.name}</span>
                    <span className="text-night-500 ml-auto">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controllability */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-night-300 mb-4">RDM Controllability</h2>
            <div className="flex gap-4">
              {CONTROLLABILITY.map((c) => (
                <div key={c.name} className="flex-1 text-center">
                  <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-xs text-night-400 mt-1">{c.name}</p>
                  <div className="mt-2 h-2 rounded-full bg-night-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.value / 2438) * 100}%`, backgroundColor: c.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Room Hot Spots ─── */}
      {tab === "rooms" && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top 8 Repeat-Incident Rooms</h2>
          <p className="text-sm text-night-400 mb-4">Rooms with 4+ incidents that need targeted maintenance or investigation.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-2 text-night-400 font-medium">Rank</th>
                <th className="pb-2 text-night-400 font-medium">Room</th>
                <th className="pb-2 text-night-400 font-medium">Incidents</th>
                <th className="pb-2 text-night-400 font-medium">Top Issues</th>
                <th className="pb-2 text-night-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {TOP_ROOMS.map((r, i) => (
                <tr key={r.room} className="border-b border-white/5">
                  <td className="py-3 text-night-500">#{i + 1}</td>
                  <td className="py-3 text-white font-mono">{r.room}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.count >= 8 ? "bg-red-500/15 text-red-400" : "bg-orange-500/15 text-orange-400"
                    }`}>{r.count}</span>
                  </td>
                  <td className="py-3 text-night-300">{r.issues}</td>
                  <td className="py-3">
                    <span className="text-xs text-brand-400">Inspect & schedule</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Compensation Report ─── */}
      {tab === "compensation" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Compensation Summary</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">$14,320</p>
                <p className="text-xs text-night-400 mt-1">Total Given</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">47</p>
                <p className="text-xs text-night-400 mt-1">Total Cases</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">$304.68</p>
                <p className="text-xs text-night-400 mt-1">Average Per Case</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-2 text-night-400 font-medium">Type</th>
                  <th className="pb-2 text-night-400 font-medium">Cases</th>
                  <th className="pb-2 text-night-400 font-medium">Total</th>
                  <th className="pb-2 text-night-400 font-medium">Avg</th>
                </tr>
              </thead>
              <tbody>
                {COMP_BY_TYPE.map((c) => (
                  <tr key={c.type} className="border-b border-white/5">
                    <td className="py-3 text-white">{c.type}</td>
                    <td className="py-3 text-night-300">{c.count}</td>
                    <td className="py-3 text-white font-medium">${c.amount.toLocaleString()}</td>
                    <td className="py-3 text-night-300">${(c.amount / c.count).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Time Analysis ─── */}
      {tab === "time" && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Incidents by Time of Night</h2>
          <p className="text-sm text-night-400 mb-4">Peak activity is between 22:00 – 01:00. Staff scheduling should reflect this.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={TIME_DIST}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#6366f1" name="Incidents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
