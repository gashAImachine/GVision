'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadIncidents, Incident, SEVERITY_BADGE, formatTime } from '@/lib/incidents-data';

type SortField = 'date' | 'time' | 'site' | 'room_number' | 'incident_type' | 'issue_summary' | 'severity' | 'escalation' | 'primary_department' | 'primary_impact' | 'root_cause';
type SortOrder = 'asc' | 'desc';

const INCIDENTS_PER_PAGE = 50;

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [siteFilter, setSiteFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);

  // Load incidents
  useEffect(() => {
    const loadData = async () => {
      const data = await loadIncidents();
      setIncidents(data);
      setLoading(false);
    };
    loadData();
  }, []);

  // Get unique values for filters
  const allSites = useMemo(() => {
    const sites = new Set(incidents.map((inc) => inc.site));
    return Array.from(sites).sort();
  }, [incidents]);

  const allDepartments = useMemo(() => {
    const depts = new Set(incidents.map((inc) => inc.primary_department));
    return Array.from(depts).sort();
  }, [incidents]);

  const allYears = useMemo(() => {
    const years = new Set(incidents.map((inc) => inc.date.substring(0, 4)));
    return Array.from(years).sort().reverse();
  }, [incidents]);

  // Apply filters
  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        inc.room_number.toLowerCase().includes(searchLower) ||
        inc.incident_type.toLowerCase().includes(searchLower) ||
        inc.site.toLowerCase().includes(searchLower) ||
        inc.issue_summary.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Severity filter
      if (severityFilter !== 'All' && inc.severity !== severityFilter) return false;

      // Site filter
      if (siteFilter !== 'All' && inc.site !== siteFilter) return false;

      // Department filter
      if (departmentFilter !== 'All' && inc.primary_department !== departmentFilter) return false;

      // Year filter
      if (yearFilter !== 'All' && !inc.date.startsWith(yearFilter)) return false;

      return true;
    });
  }, [incidents, searchTerm, severityFilter, siteFilter, departmentFilter, yearFilter]);

  // Apply sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle numeric sorting for dates
      if (sortField === 'date') {
        aVal = a.date;
        bVal = b.date;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / INCIDENTS_PER_PAGE);
  const paginatedIncidents = sorted.slice(
    (currentPage - 1) * INCIDENTS_PER_PAGE,
    currentPage * INCIDENTS_PER_PAGE
  );

  // Count stats
  const highSeverityCount = filtered.filter((inc) => inc.severity === 'High').length;
  const escalatedCount = filtered.filter((inc) => inc.escalation === 'Yes').length;

  // Handle column click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  if (loading) {
    return <div className="p-8 text-night-300">Loading incidents...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-night-50">Incidents</h1>
        <p className="mt-2 text-night-400">All 2,404 recorded incidents</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Total Matching</div>
          <div className="text-2xl font-bold text-night-50">{filtered.length}</div>
        </div>
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">High Severity</div>
          <div className="text-2xl font-bold text-red-400">{highSeverityCount}</div>
        </div>
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Escalated</div>
          <div className="text-2xl font-bold text-orange-400">{escalatedCount}</div>
        </div>
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Page</div>
          <div className="text-2xl font-bold text-night-50">{currentPage} of {totalPages || 1}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 rounded-lg bg-night-900/50 border border-night-700 p-6">
        {/* Search Box */}
        <div>
          <label className="block text-sm font-medium text-night-300 mb-2">Search</label>
          <input
            type="text"
            placeholder="Room, type, site, issue..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-night-800 border border-night-600 rounded text-night-50 placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-night-800 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Site</label>
            <select
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-night-800 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option>All</option>
              {allSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-night-800 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option>All</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-night-800 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option>All</option>
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-night-900/50 border border-night-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-night-700 bg-night-900">
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('date')}>
                  Date {sortField === 'date' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('time')}>
                  Time {sortField === 'time' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('site')}>
                  Site {sortField === 'site' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('room_number')}>
                  Room {sortField === 'room_number' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('incident_type')}>
                  Type {sortField === 'incident_type' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('issue_summary')}>
                  Issue {sortField === 'issue_summary' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium">Severity</th>
                <th className="px-4 py-3 text-left text-night-300 font-medium">Escalation</th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('primary_department')}>
                  Department {sortField === 'primary_department' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('primary_impact')}>
                  Impact {sortField === 'primary_impact' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-night-300 font-medium cursor-pointer hover:text-night-100" onClick={() => handleSort('root_cause')}>
                  Root Cause {sortField === 'root_cause' && <span className="text-brand-500">{sortOrder === 'desc' ? 'â' : 'â'}</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.length > 0 ? (
                paginatedIncidents.map((inc, idx) => (
                  <tr key={idx} className="border-b border-night-700 hover:bg-night-800/30">
                    <td className="px-4 py-3 text-night-300">{inc.date}</td>
                    <td className="px-4 py-3 text-night-300">{formatTime(inc.time)}</td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.site}</td>
                    <td className="px-4 py-3 text-night-50 font-mono font-semibold">{inc.room_number}</td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.incident_type}</td>
                    <td className="px-4 py-3 text-night-400 text-xs max-w-xs truncate">{inc.issue_summary}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${SEVERITY_BADGE[inc.severity as keyof typeof SEVERITY_BADGE]}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.escalation}</td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.primary_department}</td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.primary_impact}</td>
                    <td className="px-4 py-3 text-night-300 text-xs">{inc.root_cause}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-night-400">
                    No incidents match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-night-900/50 border border-night-700 p-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-night-800 text-night-300 rounded hover:bg-night-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                page = currentPage - 2 + i;
              }
              return page <= totalPages ? (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded ${
                    currentPage === page
                      ? 'bg-brand-500 text-night-900 font-semibold'
                      : 'bg-night-800 text-night-300 hover:bg-night-700'
                  }`}
                >
                  {page}
                </button>
              ) : null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-night-800 text-night-300 rounded hover:bg-night-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
