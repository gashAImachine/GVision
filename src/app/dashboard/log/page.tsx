'use client';

import { useState } from 'react';

// Types and constants
type IncidentType = 'Maintenance' | 'IT' | 'Housekeeping' | 'Noise' | 'Guest Complaint' | 'Safety' | 'Transport' | 'Guest Behaviour' | 'Alarm' | 'Pest' | 'Other';
type Severity = 'Low' | 'Medium' | 'High';
type PrimaryImpact = 'Guest' | 'Safety' | 'Operations' | 'Revenue' | 'Compliance';
type Controllable = 'Yes' | 'Partial' | 'No';
type PrimaryDepartment = 'Maintenance' | 'IT' | 'Housekeeping' | 'Front Office' | 'Safety' | 'Security' | 'Transport' | 'Food & Beverage' | 'Marina' | 'Pools' | 'Activities';
type RootCause = 'Equipment' | 'Process' | 'Human Error' | 'External' | 'Infrastructure' | 'Policy' | 'Training' | 'Environmental';

interface LoggedIncident {
  id: string;
  date: string;
  time: string;
  site: string;
  room_number: string;
  incident_type: IncidentType;
  issue_summary: string;
  severity: Severity;
  escalation: 'Yes' | 'No';
  escalated_to?: string;
  primary_impact: PrimaryImpact;
  controllable: Controllable;
  primary_department: PrimaryDepartment;
  root_cause: RootCause;
  timestamp: number;
}

const SITES = [
  'Reef View Hotel',
  'Palm Bungalows',
  'The Palms',
  'Beach Club',
  'Yacht Club',
  'Marina Suites',
  'Island Lodge',
];

const INCIDENT_TYPES: IncidentType[] = [
  'Maintenance',
  'IT',
  'Housekeeping',
  'Noise',
  'Guest Complaint',
  'Safety',
  'Transport',
  'Guest Behaviour',
  'Alarm',
  'Pest',
  'Other',
];

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High'];

const IMPACTS: PrimaryImpact[] = ['Guest', 'Safety', 'Operations', 'Revenue', 'Compliance'];

const CONTROLLABLE_OPTIONS: Controllable[] = ['Yes', 'Partial', 'No'];

const DEPARTMENTS: PrimaryDepartment[] = [
  'Maintenance',
  'IT',
  'Housekeeping',
  'Front Office',
  'Safety',
  'Security',
  'Transport',
  'Food & Beverage',
  'Marina',
  'Pools',
  'Activities',
];

const ROOT_CAUSES: RootCause[] = [
  'Equipment',
  'Process',
  'Human Error',
  'External',
  'Infrastructure',
  'Policy',
  'Training',
  'Environmental',
];

export default function LogPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [site, setSite] = useState('Reef View Hotel');
  const [roomNumber, setRoomNumber] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('Maintenance');
  const [issueSummary, setIssueSummary] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [escalation, setEscalation] = useState<'Yes' | 'No'>('No');
  const [escalatedTo, setEscalatedTo] = useState('');
  const [primaryImpact, setPrimaryImpact] = useState<PrimaryImpact>('Guest');
  const [controllable, setControllable] = useState<Controllable>('Yes');
  const [primaryDepartment, setPrimaryDepartment] = useState<PrimaryDepartment>('Maintenance');
  const [rootCause, setRootCause] = useState<RootCause>('Equipment');
  const [pendingIncidents, setPendingIncidents] = useState<LoggedIncident[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!time || !roomNumber || !issueSummary) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    const formattedTime = time.includes(':') ? time : time.substring(0, 2) + ':' + time.substring(2, 4);
    if (!timeRegex.test(formattedTime)) {
      alert('Please enter time in HH:MM format');
      return;
    }

    const newIncident: LoggedIncident = {
      id: `pending-${Date.now()}`,
      date,
      time: formattedTime.replace(':', ''),
      site,
      room_number: roomNumber,
      incident_type: incidentType,
      issue_summary: issueSummary,
      severity,
      escalation,
      escalated_to: escalation === 'Yes' ? escalatedTo : undefined,
      primary_impact: primaryImpact,
      controllable,
      primary_department: primaryDepartment,
      root_cause: rootCause,
      timestamp: Date.now(),
    };

    setPendingIncidents([newIncident, ...pendingIncidents]);

    // Reset form
    setTime('');
    setRoomNumber('');
    setIssueSummary('');
    setIncidentType('Maintenance');
    setSeverity('Medium');
    setEscalation('No');
    setEscalatedTo('');
    setPrimaryImpact('Guest');
    setControllable('Yes');
    setPrimaryDepartment('Maintenance');
    setRootCause('Equipment');
  };

  const handleClearAll = () => {
    if (pendingIncidents.length === 0) return;
    if (confirm('Are you sure you want to clear all pending incidents?')) {
      setPendingIncidents([]);
    }
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-night-50">Log Incident</h1>
        <p className="mt-2 text-night-400">Record a new incident</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-night-900/50 border border-night-700 p-8">
        {/* Row 1: Date, Time, Site */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Time (HHMM)</label>
            <input
              type="text"
              placeholder="1430"
              value={time}
              onChange={(e) => setTime(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Site</label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Room Number, Incident Type */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Room Number</label>
            <input
              type="text"
              placeholder="R1405"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Incident Type</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as IncidentType)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {INCIDENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Issue Summary */}
        <div>
          <label className="block text-sm font-medium text-night-300 mb-2">Issue Summary (max 3 words)</label>
          <input
            type="text"
            placeholder="AC not cooling"
            value={issueSummary}
            onChange={(e) => setIssueSummary(e.target.value)}
            className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Row 4: Severity, Escalation */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Escalation</label>
            <div className="flex gap-4 mt-2">
              {(['Yes', 'No'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="escalation"
                    value={option}
                    checked={escalation === option}
                    onChange={(e) => setEscalation(e.target.value as 'Yes' | 'No')}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-night-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Row 5: Escalated To (conditional) */}
        {escalation === 'Yes' && (
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Escalated To</label>
            <input
              type="text"
              placeholder="Manager name or dept"
              value={escalatedTo}
              onChange={(e) => setEscalatedTo(e.target.value)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Row 6: Primary Impact, Controllable */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Primary Impact</label>
            <select
              value={primaryImpact}
              onChange={(e) => setPrimaryImpact(e.target.value as PrimaryImpact)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {IMPACTS.map((impact) => (
                <option key={impact} value={impact}>
                  {impact}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Controllable by RDM</label>
            <select
              value={controllable}
              onChange={(e) => setControllable(e.target.value as Controllable)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CONTROLLABLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 7: Primary Department, Root Cause */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Primary Department</label>
            <select
              value={primaryDepartment}
              onChange={(e) => setPrimaryDepartment(e.target.value as PrimaryDepartment)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-night-300 mb-2">Likely Root Cause</label>
            <select
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value as RootCause)}
              className="w-full px-4 py-2 bg-night-800/50 border border-night-600 rounded text-night-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ROOT_CAUSES.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-night-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          Log Incident
        </button>
      </form>

      {/* Pending Incidents Section */}
      {pendingIncidents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-night-50">Pending Incidents</h2>
              <p className="text-sm text-night-400">{pendingIncidents.length} incident{pendingIncidents.length !== 1 ? 's' : ''} waiting to be synced</p>
            </div>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded font-medium transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingIncidents.map((incident) => (
              <div key={incident.id} className="rounded-lg bg-night-900/50 border border-night-700 p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-night-400">Room</p>
                    <p className="text-lg font-bold text-night-50 font-mono">{incident.room_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Date & Time</p>
                    <p className="text-lg font-bold text-night-50">{incident.date} {incident.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Type</p>
                    <p className="text-night-300">{incident.incident_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Issue</p>
                    <p className="text-night-300">{incident.issue_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Severity</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      incident.severity === 'High'
                        ? 'bg-red-500/15 text-red-400'
                        : incident.severity === 'Medium'
                          ? 'bg-yellow-500/15 text-yellow-400'
                          : 'bg-green-500/15 text-green-400'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Escalation</p>
                    <p className="text-night-300">{incident.escalation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Site</p>
                    <p className="text-night-300 text-sm">{incident.site}</p>
                  </div>
                  <div>
                    <p className="text-xs text-night-400">Department</p>
                    <p className="text-night-300 text-sm">{incident.primary_department}</p>
                  </div>
                </div>
                {incident.escalated_to && (
                  <div className="pt-4 border-t border-night-700">
                    <p className="text-xs text-night-400">Escalated To</p>
                    <p className="text-night-300">{incident.escalated_to}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
