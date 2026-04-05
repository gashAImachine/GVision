'use client';

import { useState, useEffect } from 'react';
import { loadIncidents, computeKPIs, type Incident } from '@/lib/incidents-data';
import { Cloud, AlertCircle, CheckCircle, File } from 'lucide-react';

export default function ImportPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uniqueSites, setUniqueSites] = useState(0);
  const [uniqueDepartments, setUniqueDepartments] = useState(0);
  const [dateRange, setDateRange] = useState({ min: '', max: '' });

  // Load initial data on mount
  useEffect(() => {
    loadIncidents().then(loadedIncidents => {
      setIncidents(loadedIncidents);

      if (loadedIncidents.length > 0) {
        const sites = new Set(loadedIncidents.map(i => i.site)).size;
        const depts = new Set(loadedIncidents.map(i => i.primary_department)).size;
        const dates = loadedIncidents.map(i => new Date(i.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        setUniqueSites(sites);
        setUniqueDepartments(depts);
        setDateRange({
          min: minDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          max: maxDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        });
      }
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setUploadMessage('Please upload a .xlsx file only.');
      return;
    }

    // Create a mock preview since we're not actually parsing Excel yet
    const mockPreview = [
      { Date: '2026-01-15', Time: '09:30', Site: 'Main Campus', 'Room Number': '101A', 'Incident Type': 'Safety', Issue: 'Minor injury', 'Primary Department': 'Maintenance', Escalation: 'No', 'Escalated To': '-', 'Primary Impact': 'Staff', Severity: 'Low', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Negligence' },
      { Date: '2026-01-16', Time: '14:22', Site: 'Annex Building', 'Room Number': '205B', 'Incident Type': 'Security', Issue: 'Unauthorized access attempt', 'Primary Department': 'Security', Escalation: 'Yes', 'Escalated To': 'Director', 'Primary Impact': 'Facility', Severity: 'Medium', 'Controllable by RDM': 'No', 'Likely Root Cause': 'External threat' },
      { Date: '2026-01-17', Time: '11:45', Site: 'Main Campus', 'Room Number': '301C', 'Incident Type': 'Health & Safety', Issue: 'Chemical spill', 'Primary Department': 'Operations', Escalation: 'Yes', 'Escalated To': 'Manager', 'Primary Impact': 'Environment', Severity: 'High', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Equipment failure' },
      { Date: '2026-01-18', Time: '16:10', Site: 'Sub-site 3', 'Room Number': '102', 'Incident Type': 'Accident', Issue: 'Slip and fall', 'Primary Department': 'Facilities', Escalation: 'No', 'Escalated To': '-', 'Primary Impact': 'Staff', Severity: 'Low', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Poor housekeeping' },
      { Date: '2026-01-19', Time: '08:15', Site: 'Main Campus', 'Room Number': '150', 'Incident Type': 'Safety', Issue: 'Equipment malfunction', 'Primary Department': 'Maintenance', Escalation: 'No', 'Escalated To': '-', 'Primary Impact': 'Operations', Severity: 'Medium', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Wear and tear' },
      { Date: '2026-01-20', Time: '13:30', Site: 'Annex Building', 'Room Number': '401', 'Incident Type': 'Security', Issue: 'System breach attempt', 'Primary Department': 'IT', Escalation: 'Yes', 'Escalated To': 'CISO', 'Primary Impact': 'Data', Severity: 'Critical', 'Controllable by RDM': 'No', 'Likely Root Cause': 'Cyber attack' },
      { Date: '2026-01-21', Time: '10:20', Site: 'Main Campus', 'Room Number': '250', 'Incident Type': 'Health & Safety', Issue: 'Noise exposure', 'Primary Department': 'Operations', Escalation: 'No', 'Escalated To': '-', 'Primary Impact': 'Staff', Severity: 'Low', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Process issue' },
      { Date: '2026-01-22', Time: '15:45', Site: 'Sub-site 3', 'Room Number': '75', 'Incident Type': 'Accident', Issue: 'Vehicle collision', 'Primary Department': 'Transport', Escalation: 'Yes', 'Escalated To': 'Manager', 'Primary Impact': 'Asset', Severity: 'Medium', 'Controllable by RDM': 'Partial', 'Likely Root Cause': 'Driver error' },
      { Date: '2026-01-23', Time: '09:00', Site: 'Main Campus', 'Room Number': '500', 'Incident Type': 'Safety', Issue: 'Electrical hazard', 'Primary Department': 'Maintenance', Escalation: 'Yes', 'Escalated To': 'Director', 'Primary Impact': 'Facility', Severity: 'High', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Design flaw' },
      { Date: '2026-01-24', Time: '12:30', Site: 'Annex Building', 'Room Number': '150A', 'Incident Type': 'Health & Safety', Issue: 'Exposure to hazard', 'Primary Department': 'Operations', Escalation: 'No', 'Escalated To': '-', 'Primary Impact': 'Staff', Severity: 'Medium', 'Controllable by RDM': 'Yes', 'Likely Root Cause': 'Procedure violation' }
    ];

    setPreviewData(mockPreview);
    setShowPreview(true);
    setUploadMessage('');
  };

  const handleConfirmUpload = () => {
    setShowPreview(false);
    setUploadMessage('Data preview confirmed. Upload functionality will be available in the next update.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-night-950 via-night-900 to-night-950 p-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">Update Data</h1>
        <p className="text-night-300 text-lg">Upload your incident Excel file (.xlsx) to update the dashboard</p>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Upload Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Drag and Drop */}
          <div className="lg:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`glass rounded-xl p-8 border-2 border-dashed transition-all cursor-pointer ${
                isDragging
                  ? 'border-brand-400 bg-brand-500/10 scale-105'
                  : 'border-night-600 bg-night-900/50 hover:border-brand-500/50'
              }`}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="flex flex-col items-center justify-center cursor-pointer">
                <Cloud className="w-16 h-16 text-brand-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Drag and drop your Excel file</h3>
                <p className="text-night-300 text-center mb-4">or click to browse your computer</p>
                <p className="text-sm text-night-400">Supported format: .xlsx only</p>
              </label>
            </div>

            {/* Upload Message */}
            {uploadMessage && (
              <div className="mt-4 glass rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200">{uploadMessage}</p>
              </div>
            )}

            {/* Preview Section */}
            {showPreview && (
              <div className="mt-8 glass rounded-xl p-6 bg-night-900/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <File className="w-5 h-5 text-brand-400" />
                  Preview (First 10 rows)
                </h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm text-night-200">
                    <thead className="border-b border-night-600">
                      <tr>
                        {Object.keys(previewData[0] || {}).slice(0, 7).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-semibold text-brand-300">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="border-b border-night-700/50 hover:bg-night-800/30">
                          {Object.values(row).slice(0, 7).map((val: any, i) => (
                            <td key={i} className="px-3 py-2">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmUpload}
                    className="flex-1 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold py-3 rounded-lg transition-all"
                  >
                    Confirm Upload
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 bg-night-800 hover:bg-night-700 text-white font-semibold py-3 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions Panel */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-6 bg-night-900/50 h-full">
              <h3 className="text-lg font-semibold text-white mb-4">File Format</h3>
              <div className="space-y-3 text-sm text-night-300">
                <div>
                  <p className="font-semibold text-brand-300 mb-1">Required Columns:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Date</li>
                    <li>Time</li>
                    <li>Site</li>
                    <li>Room Number</li>
                    <li>Incident Type</li>
                    <li>Issue</li>
                    <li>Primary Department</li>
                    <li>Escalation</li>
                    <li>Escalated To</li>
                    <li>Primary Impact</li>
                    <li>Severity</li>
                    <li>Controllable by RDM</li>
                    <li>Likely Root Cause</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-night-600">
                  <p className="font-semibold text-brand-300 mb-1">Sheet Naming:</p>
                  <p className="text-xs text-night-400">Use year-based names (e.g., "Data 2025", "Data 2026")</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Stats and Limitations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Data Stats */}
          <div className="glass rounded-xl p-6 bg-night-900/50">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Current Data Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-night-600">
                <span className="text-night-300">Total Incidents</span>
                <span className="text-2xl font-bold text-brand-400">{incidents.length}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-night-600">
                <span className="text-night-300">Date Range</span>
                <span className="text-sm font-semibold text-brand-300">
                  {dateRange.min} to {dateRange.max}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-night-600">
                <span className="text-night-300">Unique Sites</span>
                <span className="text-xl font-bold text-brand-400">{uniqueSites}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-night-300">Departments</span>
                <span className="text-xl font-bold text-brand-400">{uniqueDepartments}</span>
              </div>
            </div>
          </div>

          {/* Limitations Notice */}
          <div className="glass rounded-xl p-6 bg-night-900/50 border border-amber-500/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Important Notice
            </h3>
            <p className="text-night-300 text-sm leading-relaxed mb-4">
              Data upload will be available in the next update. Currently using pre-loaded data from your configuration.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-200 text-xs font-semibold">
                For updates to dashboard data, please contact your administrator or wait for the next release.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
