'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  loadIncidents,
  computeKPIs,
  computeMonthlyTrend,
  countByField,
  computeSeverityBreakdown,
  computeTimeDistribution,
  computeYearOnYear,
  getRecentHighSeverity,
  getRVHData,
  computeTrendAlerts,
  computeControllability,
  SEVERITY_BADGE,
  CHART_PALETTE,
  SEVERITY_COLORS,
  formatTime,
  filterByYear,
  type Incident,
} from '@/lib/incidents-data';

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
};

type Tab = 'island' | 'rvh';

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'highlight';
}

interface TrendAlertPill {
  category: string;
  direction: 'up' | 'down';
  change: number;
  prev: number;
  curr: number;
  prevLabel: string;
  currLabel: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subtext, variant = 'default' }) => (
  <div className={`glass rounded-xl p-6 ${variant === 'highlight' ? 'ring-2 ring-brand-500/50' : ''}`}>
    <div className="text-night-400 text-sm font-medium mb-2">{label}</div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    {subtext && <div className="text-night-400 text-xs">{subtext}</div>}
  </div>
);

const TrendAlertPill: React.FC<{ alert: TrendAlertPill }> = ({ alert }) => {
  const isIncrease = alert.direction === 'up';
  const bgColor = isIncrease ? 'bg-red-500/15' : 'bg-green-500/15';
  const textColor = isIncrease ? 'text-red-400' : 'text-green-400';
  const arrow = isIncrease ? 'â²' : 'â¼';

  return (
    <div className={`${bgColor} ${textColor} px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2`}>
      <span>{alert.category} {arrow}{alert.change}%</span>
      <span className="text-xs opacity-75">({alert.prev} â {alert.curr}) Â· {alert.prevLabel} vs {alert.currLabel}</span>
    </div>
  );
};

interface RecentHighSeverityTableProps {
  incidents: Incident[];
}

const RecentHighSeverityTable: React.FC<RecentHighSeverityTableProps> = ({ incidents }) => (
  <div className="glass rounded-xl p-6 overflow-x-auto">
    <h3 className="text-white font-semibold text-lg mb-4">Recent High Severity Incidents</h3>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-night-700">
          <th className="text-left text-night-400 font-medium py-3 px-4">Date</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Site</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Type</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Issue</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Impact</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Escalated</th>
        </tr>
      </thead>
      <tbody>
        {incidents.slice(0, 10).map((incident, idx) => (
          <tr key={idx} className="border-b border-night-800 hover:bg-night-900/30">
            <td className="py-3 px-4 text-night-300">{new Date(incident.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-night-300">{incident.site}</td>
            <td className="py-3 px-4">
              <span className="bg-brand-500/20 text-brand-400 px-2 py-1 rounded text-xs font-medium">
                {incident.incident_type}
              </span>
            </td>
            <td className="py-3 px-4 text-night-300">{incident.issue_summary}</td>
            <td className="py-3 px-4 text-night-300">{incident.primary_impact}</td>
            <td className="py-3 px-4">
              {incident.escalation === 'Yes' ? (
                <span className="text-red-400 font-semibold">Yes</span>
              ) : (
                <span className="text-green-400">No</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface HotSpot {
  room: string;
  count: number;
  types: string[];
  lastDate: string;
  highCount: number;
}

interface RVHHotSpotTableProps {
  hotspots: HotSpot[];
}

const RVHHotSpotTable: React.FC<RVHHotSpotTableProps> = ({ hotspots }) => (
  <div className="glass rounded-xl p-6 overflow-x-auto">
    <h3 className="text-white font-semibold text-lg mb-4">Hotspot Rooms (4+ Incidents)</h3>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-night-700">
          <th className="text-left text-night-400 font-medium py-3 px-4">Room</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Total Incidents</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">High Severity</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Types</th>
          <th className="text-left text-night-400 font-medium py-3 px-4">Last Incident</th>
        </tr>
      </thead>
      <tbody>
        {hotspots.map((spot, idx) => (
          <tr key={idx} className="border-b border-night-800 hover:bg-night-900/30">
            <td className="py-3 px-4 text-white font-semibold">{spot.room}</td>
            <td className="py-3 px-4 text-night-300">{spot.count}</td>
            <td className="py-3 px-4">
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium">
                {spot.highCount}
              </span>
            </td>
            <td className="py-3 px-4 text-night-300 text-xs">{spot.types.slice(0, 3).join(', ')}</td>
            <td className="py-3 px-4 text-night-300">{new Date(spot.lastDate).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('island');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Island Overview data
  const [kpis, setKpis] = useState<any>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [topTypes, setTopTypes] = useState<any[]>([]);
  const [topSites, setTopSites] = useState<any[]>([]);
  const [rootCauses, setRootCauses] = useState<any[]>([]);
  const [severityBreakdown, setSeverityBreakdown] = useState<any[]>([]);
  const [impactBreakdown, setImpactBreakdown] = useState<any[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<any[]>([]);
  const [yearOnYear, setYearOnYear] = useState<any[]>([]);
  const [controllability, setControllability] = useState<any[]>([]);
  const [recentHighSeverity, setRecentHighSeverity] = useState<Incident[]>([]);
  const [trendAlerts, setTrendAlerts] = useState<TrendAlertPill[]>([]);

  // RVH View data
  const [rvhData, setRvhData] = useState<any>(null);
  const [rvhIncidents, setRvhIncidents] = useState<Incident[]>([]);
  const [rvhMonthlyTrend, setRvhMonthlyTrend] = useState<any[]>([]);
  const [rvhTypeBreakdown, setRvhTypeBreakdown] = useState<any[]>([]);
  const [rvhHotspots, setRvhHotspots] = useState<HotSpot[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const loadedIncidents = await loadIncidents();
        setIncidents(loadedIncidents);

        // Island Overview calculations
        const kpiData = computeKPIs(loadedIncidents);
        setKpis(kpiData);

        const monthlyData = computeMonthlyTrend(loadedIncidents);
        setMonthlyTrend(monthlyData);

        const typeCounts = countByField(loadedIncidents, 'incident_type');
        const topTypeData = typeCounts
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map((item) => ({
            name: item.name,
            value: item.value,
          }));
        setTopTypes(topTypeData);

        const siteCounts = countByField(loadedIncidents, 'site');
        const topSiteData = siteCounts
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map((item, idx) => ({
            name: item.name,
            value: item.value,
            isTop: idx === 0,
          }));
        setTopSites(topSiteData);

        const rootCauseCounts = countByField(loadedIncidents, 'root_cause');
        const rootCauseData = rootCauseCounts
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map((item) => ({
            name: item.name,
            value: item.value,
          }));
        setRootCauses(rootCauseData);

        const severityData = computeSeverityBreakdown(loadedIncidents);
        setSeverityBreakdown(severityData);

        const impactCounts = countByField(loadedIncidents, 'primary_impact');
        const impactData = impactCounts.map((item) => ({
          name: item.name,
          value: item.value,
        }));
        setImpactBreakdown(impactData);

        const timeData = computeTimeDistribution(loadedIncidents);
        setTimeDistribution(timeData);

        const yoyData = computeYearOnYear(loadedIncidents);
        setYearOnYear(yoyData);

        const controllabilityData = computeControllability(loadedIncidents);
        setControllability(controllabilityData);

        const recentHigh = getRecentHighSeverity(loadedIncidents, 10);
        setRecentHighSeverity(recentHigh);

        const alerts = computeTrendAlerts(loadedIncidents);
        const formattedAlerts = alerts.map((alert) => ({
          category: alert.category,
          direction: alert.direction as 'up' | 'down',
          change: alert.change,
          prev: alert.prev,
          curr: alert.curr,
          prevLabel: alert.prevLabel,
          currLabel: alert.currLabel,
        }));
        setTrendAlerts(formattedAlerts);

        // RVH calculations
        const rvhInfo = getRVHData(loadedIncidents);
        setRvhData(rvhInfo);

        const rvhFilteredIncidents = loadedIncidents.filter((inc) => inc.site === 'Reef View Hotel');
        setRvhIncidents(rvhFilteredIncidents);

        const rvhMonthly = computeMonthlyTrend(rvhFilteredIncidents);
        setRvhMonthlyTrend(rvhMonthly);

        const rvhTypes = countByField(rvhFilteredIncidents, 'incident_type');
        const rvhTypeData = rvhTypes.map((item) => ({
          name: item.name,
          value: item.value,
        }));
        setRvhTypeBreakdown(rvhTypeData);

        // Compute hotspots for RVH
        const roomIncidents = countByField(rvhFilteredIncidents, 'room_number');
        const hotspots: HotSpot[] = roomIncidents
          .filter((room) => room.value >= 4)
          .map((room) => {
            const roomIncs = rvhFilteredIncidents.filter((inc) => inc.room_number === room.name);
            const types = [...new Set(roomIncs.map((inc) => inc.incident_type))];
            const lastDate = new Date(
              Math.max(...roomIncs.map((inc) => new Date(inc.date).getTime()))
            ).toISOString();
            const highCount = roomIncs.filter((inc) => inc.severity === 'High').length;
            return {
              room: room.name,
              count: room.value,
              types,
              lastDate,
              highCount,
            };
          })
          .sort((a, b) => b.count - a.count);
        setRvhHotspots(hotspots);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-950 text-night-300 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-night-400">Monitor incidents across Hamilton Island sites</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('island')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'island'
                ? 'bg-brand-500 text-white'
                : 'bg-night-900/50 text-night-300 border border-night-700 hover:bg-night-800/50'
            }`}
          >
            Island Overview
          </button>
          <button
            onClick={() => setActiveTab('rvh')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'rvh'
                ? 'bg-brand-500 text-white'
                : 'bg-night-900/50 text-night-300 border border-night-700 hover:bg-night-800/50'
            }`}
          >
            Reef View Hotel
          </button>
        </div>

        {/* Island Overview Tab */}
        {activeTab === 'island' && (
          <div className="space-y-8">
            {/* Trend Alerts */}
            {trendAlerts.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {trendAlerts.map((alert, idx) => (
                  <TrendAlertPill key={idx} alert={alert} />
                ))}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <KPICard label="Total Incidents" value={kpis?.total || 0} />
              <KPICard
                label="High Severity"
                value={kpis?.highSeverity || 0}
                variant="highlight"
              />
              <KPICard
                label="Escalation Rate"
                value={`${kpis?.escalationRate.toFixed(1)}%` || '0%'}
              />
              <KPICard label="Top Type" value={kpis?.topIncidentType || 'N/A'} />
              <KPICard label="Unique Sites" value={kpis?.uniqueSites || 0} />
            </div>

            {/* Monthly Trend */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-4">Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="escalated" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Two-column grid: Top Types & Top Sites */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Incident Types */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Top Incident Types</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topTypes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Locations/Sites */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Top Locations</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSites} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={140} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]}>
                      {topSites.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isTop ? '#f97316' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Root Cause & Severity Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Root Cause Analysis */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Root Cause Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rootCauses} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" fill="#a78bfa" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Severity Distribution */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {severityBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SEVERITY_COLORS[entry.name] || '#6366f1'}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Primary Impact & Time of Night */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Impact Breakdown */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Primary Impact</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={impactBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {impactBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Time of Night Distribution */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Time of Night Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeWindow" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Year-on-Year & Controllability */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Year-on-Year Comparison */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Year-on-Year Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yearOnYear}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Bar dataKey="2025" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="2026" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* RDM Controllability */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">RDM Controllability</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={controllability}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {controllability.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === 'Yes'
                              ? '#22c55e'
                              : entry.name === 'Partial'
                                ? '#f97316'
                                : '#ef4444'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent High Severity Incidents Table */}
            <RecentHighSeverityTable incidents={recentHighSeverity} />
          </div>
        )}

        {/* RVH View Tab */}
        {activeTab === 'rvh' && (
          <div className="space-y-8">
            {/* RVH KPI Cards */}
            {rvhData && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KPICard label="Total RVH Incidents" value={rvhData.total} variant="highlight" />
                <KPICard label="Pest Incidents" value={rvhData.pestCount} />
                <KPICard label="Smell Incidents" value={rvhData.smellCount} />
                <KPICard label="AC Incidents" value={rvhData.acCount} />
                <KPICard label="Safelock Incidents" value={rvhData.safelockCount} />
              </div>
            )}

            {/* RVH Incident Type Breakdown & Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RVH Incident Type Breakdown */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Incident Types</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={rvhTypeBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {rvhTypeBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* RVH Monthly Trend */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Monthly Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={rvhMonthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} />
                    <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RVH Hotspots Table */}
            {rvhHotspots.length > 0 && <RVHHotSpotTable hotspots={rvhHotspots} />}

            {/* RVH Recent Incidents Table */}
            {rvhIncidents.length > 0 && (
              <RecentHighSeverityTable incidents={rvhIncidents.slice(0, 10)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
