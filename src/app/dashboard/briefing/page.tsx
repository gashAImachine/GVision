'use client';

import { useState, useEffect } from 'react';
import {
  loadIncidents,
  Incident,
  computeKPIs,
  countByField,
  getRecentHighSeverity,
  getRVHData,
  computeTrendAlerts,
  filterByDateRange,
  formatTime,
} from '@/lib/incidents-data';

type PeriodType = '7days' | '30days' | '90days' | 'all';

export default function BriefingPage() {
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [briefingText, setBriefingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadIncidents().then((incidents) => {
      // Format date strings for filtering (YYYY-MM-DD format)
      const formatDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Filter by period
      let filtered = incidents;
      const now = new Date();
      if (period === '7days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filterByDateRange(
          incidents,
          formatDateString(start),
          formatDateString(now)
        );
      } else if (period === '30days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filterByDateRange(
          incidents,
          formatDateString(start),
          formatDateString(now)
        );
      } else if (period === '90days') {
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filterByDateRange(
          incidents,
          formatDateString(start),
          formatDateString(now)
        );
      }

      // Compute KPIs
      const kpis = computeKPIs(filtered);

      // Get top 5 incident types (countByField returns sorted CountItem[])
      const topTypes = countByField(filtered, 'incident_type', 5);

      // Get top 5 problem sites
      const topSites = countByField(filtered, 'site', 5);

      // Get recent high severity incidents
      const recentHigh = getRecentHighSeverity(filtered, 5);

      // Get trend alerts
      const trendAlerts = computeTrendAlerts(filtered);

      // Get RVH data
      const rvhData = getRVHData(filtered);

      // Format briefing text
      const briefing = `G-VISION OPERATIONS BRIEFING
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Period: ${period === '7days' ? 'Last 7 days' : period === '30days' ? 'Last 30 days' : period === '90days' ? 'Last 90 days' : 'All time'}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

KPI SUMMARY
âââââââââââ
Total Incidents: ${kpis.totalIncidents}
High Severity: ${kpis.highSeverity}
Escalation Rate: ${kpis.escalationRate}%
Most Common Type: ${kpis.topIncidentType}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

TOP 5 INCIDENT TYPES
ââââââââââââââââââââ
${topTypes.map(t => `â¢ ${t.name}: ${t.value} incidents`).join('\n')}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

TOP 5 PROBLEM SITES
âââââââââââââââââââ
${topSites.map(s => `â¢ ${s.name}: ${s.value} incidents`).join('\n')}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

RECENT HIGH SEVERITY INCIDENTS (Last 5)
ââââââââââââââââââââââââââââââââââââââââ
${recentHigh
  .map(
    (inc, i) =>
      `${i + 1}. ${formatTime(inc.time)} - ${inc.site} Room ${inc.room_number}
   Type: ${inc.incident_type} | Issue: ${inc.issue_summary}
   Severity: ${inc.severity} | Department: ${inc.primary_department}`
  )
  .join('\n\n')}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

MONTH-ON-MONTH TREND ALERTS (Categories with >15% change)
ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
${trendAlerts.length > 0
  ? trendAlerts.map(alert => `â¢ ${alert.category}: ${alert.change > 0 ? '+' : ''}${alert.change}%`).join('\n')
  : 'â¢ No significant trends detected'
}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

RVH QUICK SCAN
ââââââââââââââ
Total RVH Incidents: ${rvhData.total}
  â¢ Pest/Hygiene Issues: ${rvhData.categories.pest}
  â¢ Smell Issues: ${rvhData.categories.smell}
  â¢ AC/Climate Issues: ${rvhData.categories.ac}
  â¢ Safelock Issues: ${rvhData.categories.safelock}

âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

Report compiled for Hamilton Island Operations
`;

      setBriefingText(briefing);
      setLoading(false);
    });
  }, [period]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(briefingText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Generating briefing...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">GM Operations Briefing</h1>
          <p className="text-gray-400">Auto-generated daily operational summary</p>
        </div>

        {/* Period Selector */}
        <div className="glass rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Period</h2>
          <div className="flex gap-4 flex-wrap">
            {[
              { value: '7days' as PeriodType, label: 'Last 7 days' },
              { value: '30days' as PeriodType, label: 'Last 30 days' },
              { value: '90days' as PeriodType, label: 'Last 90 days' },
              { value: 'all' as PeriodType, label: 'All time' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Button */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={copyToClipboard}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Briefing Text */}
        <div className="glass rounded-xl p-6 border border-white/10">
          <pre className="bg-slate-950/50 rounded-lg p-6 text-gray-300 text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap break-words">
            {briefingText}
          </pre>
        </div>
      </div>
    </div>
  );
}
