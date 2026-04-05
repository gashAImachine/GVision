'use client';

import { useState, useEffect } from 'react';
import { loadIncidents, Incident, computeKPIs, SEVERITY_BADGE, formatTime } from '@/lib/incidents-data';

export default function ReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filtered, setFiltered] = useState<Incident[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents().then(data => {
      setIncidents(data);
      setFiltered(data.slice(0, 100));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = incidents.slice(0, 100);

    if (startDate) {
      result = result.filter(i => i.date >= startDate);
    }

    if (endDate) {
      result = result.filter(i => i.date <= endDate);
    }

    if (severityFilter) {
      result = result.filter(i => i.severity === severityFilter);
    }

    if (siteFilter) {
      result = result.filter(i => i.site === siteFilter);
    }

    setFiltered(result);
  }, [incidents, startDate, endDate, severityFilter, siteFilter]);

  const kpis = computeKPIs(incidents);

  const downloadCSV = () => {
    const headers = ['Date', 'Time', 'Site', 'Room', 'Type', 'Issue', 'Severity', 'Escalation', 'Department', 'Impact', 'Root Cause', 'Controllable'];
    const rows = filtered.map(incident => [
      incident.date,
      formatTime(incident.time),
      incident.site,
      incident.room_number,
      incident.incident_type,
      incident.issue_summary,
      incident.severity,
      incident.escalation ? 'Yes' : 'No',
      incident.primary_department,
      incident.primary_impact,
      incident.root_cause || '',
      incident.controllable ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sites = [...new Set(incidents.map(i => i.site))].sort();
  const severities = ['Critical', 'High', 'Medium', 'Low'];

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading reports...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reports & Data Export</h1>
          <p className="text-gray-400">View and export incident data with filtering options</p>
        </div>

        {/* KPI Row */}
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

        {/* Filters */}
        <div className="glass rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Severities</option>
                {severities.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Site</label>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Sites</option>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mb-8">
          <button
            onClick={downloadCSV}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Download CSV
          </button>
        </div>

        {/* Incident Table */}
        <div className="glass rounded-xl p-6 border border-white/10 overflow-x-auto">
          <h2 className="text-lg font-semibold text-white mb-4">
            Incident Log ({filtered.length} of {incidents.length})
          </h2>
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-semibold text-white">Date/Time</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Site</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Room</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Issue</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Severity</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-white">Impact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident, idx) => (
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
                  <td className="py-3 px-4">{incident.primary_department}</td>
                  <td className="py-3 px-4">{incident.primary_impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400">No incidents match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
