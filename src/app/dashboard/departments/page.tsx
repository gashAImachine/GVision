'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  loadIncidents,
  Incident,
  computeKPIs,
  computeMonthlyTrend,
  countByField,
  computeSeverityBreakdown,
  SEVERITY_BADGE,
  CHART_PALETTE,
  formatTime,
} from '@/lib/incidents-data';

const DEPARTMENTS = [
  'All',
  'Maintenance',
  'IT',
  'Housekeeping',
  'Front Office',
  'Safety',
  'Security',
  'Transport',
  'Food & Beverage',
];

export default function DepartmentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents().then(data => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading departments...</div>;
  }

  // Filter incidents by selected department
  const filtered = selectedDept === 'All'
    ? incidents
    : incidents.filter(i => i.primary_department === selectedDept);

  if (selectedDept === 'All') {
    // Overview grid showing each department
    const deptStats = DEPARTMENTS.filter(d => d !== 'All').map(dept => {
      const deptIncidents = incidents.filter(i => i.primary_department === dept);
      const kpis = computeKPIs(deptIncidents);
      return {
        dept,
        total: kpis.totalIncidents,
        highSeverity: kpis.highSeverity,
        escalationRate: kpis.escalationRate,
      };
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Department Portal</h1>
            <p className="text-gray-400">Per-department incident breakdown and trends</p>
          </div>

          {/* Department buttons */}
          <div className="flex gap-2 flex-wrap mb-8">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDept === dept
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Department grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deptStats.map(stat => (
              <div
                key={stat.dept}
                onClick={() => setSelectedDept(stat.dept)}
                className="glass rounded-xl p-6 border border-white/10 cursor-pointer hover:border-white/30 transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-4">{stat.dept}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Incidents</span>
                    <span className="text-2xl font-bold text-white">{stat.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">High Severity</span>
                    <span className="text-xl font-bold text-orange-400">{stat.highSeverity}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Escalation Rate</span>
                    <span className="text-xl font-bold text-blue-400">{stat.escalationRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Department detail view
  const kpis = computeKPIs(filtered);
  const monthlyTrend = computeMonthlyTrend(filtered);
  const severityBreakdown = computeSeverityBreakdown(filtered);
  const recentIncidents = filtered.slice(0, 20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSelectedDept('All')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors text-sm"
            >
              Back to All
            </button>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{selectedDept}</h1>
          <p className="text-gray-400">Department incident analysis and trends</p>
        </div>

        {/* Department buttons */}
        <div className="flex gap-2 flex-wrap mb-8 overflow-x-auto">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sm font-medium text-gray-400 mb-2">Total Incidents</div>
            <div className="text-3xl font-bold text-white">{kpis.totalIncidents}</div>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sm font-medium text-gray-400 mb-2">High Severity</div>
            <div className="text-3xl font-bold text-orange-400">{kpis.highSeverity}</div>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sm font-medium text-gray-400 mb-2">Escalation Rate</div>
            <div className="text-3xl font-bold text-blue-400">{kpis.escalationRate}%</div>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sm font-medium text-gray-400 mb-2">Most Common Type</div>
            <div className="text-lg font-bold text-green-400">{kpis.topIncidentType}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <div className="glass rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Monthly Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Breakdown */}
          <div className="glass rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Severity Breakdown</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="severity" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="glass rounded-xl p-6 border border-white/10 overflow-x-auto">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Incidents (Last 20)</h2>
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-semibold text-white">Date/Time</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Site</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Room</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Issue</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Severity</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Impact</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((incident, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 whitespace-nowrap">{formatTime(incident.time)}</td>
                  <td className="py-3 px-4">{incident.site}</td>
                  <td className="py-3 px-4">{incident.room_number}</td>
                  <td className="py-3 px-4">{incident.incident_type}</td>
                  <td className="py-3 px-4">{incident.issue_summary}</td>
                  <td className="py-3 px-4">
                    <span className={SEVERITY_BADGE[incident.severity as keyof typeof SEVERITY_BADGE]}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">{incident.primary_impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
