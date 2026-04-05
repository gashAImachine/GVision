"use client";

import { useState, useEffect } from "react";
import { Copy, Download, Check } from "lucide-react";

// ─── Demo incident data ───
const DEMO_INCIDENTS = [
  {
    date: new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0],
    incidents: [
      {
        room: "R0810",
        type: "Maintenance",
        issue: "AC unit not cooling properly",
        severity: "High",
      },
      {
        room: "R1204",
        type: "IT",
        issue: "WiFi connectivity issues",
        severity: "Medium",
      },
      {
        room: "R0519",
        type: "Housekeeping",
        issue: "Guest reported dirty linens",
        severity: "High",
      },
      {
        room: "R0811",
        type: "Plumbing",
        issue: "Shower water pressure low",
        severity: "Medium",
      },
    ],
  },
];

interface Task {
  id: string;
  room: string;
  type: string;
  description: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  assignedTo: string;
}

export default function BriefingPage() {
  const [emailTo, setEmailTo] = useState("gm@hotel.com, eam@hotel.com");
  const [reportDate, setReportDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0]
  );
  const [briefing, setBriefing] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [copied, setCopied] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gvision_tasks");
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
  }, []);

  // Generate briefing
  const generateBriefing = () => {
    const date = new Date(reportDate);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Find incidents for selected date
    const incidentsForDate = DEMO_INCIDENTS.find((d) => d.date === reportDate);
    const incidents = incidentsForDate ? incidentsForDate.incidents : [];

    // Calculate due dates relative to report date
    const today = new Date(reportDate);
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdueTasks = tasks.filter((t) => {
      const dueDate = new Date(t.dueDate);
      return dueDate <= today;
    });

    const upcomingTasks = tasks.filter((t) => {
      const dueDate = new Date(t.dueDate);
      return dueDate > today && dueDate <= oneWeekFromNow;
    });

    // Sort overdue by days overdue
    overdueTasks.sort((a, b) => {
      const aDaysOverdue = Math.floor(
        (new Date(reportDate).getTime() - new Date(a.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const bDaysOverdue = Math.floor(
        (new Date(reportDate).getTime() - new Date(b.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return bDaysOverdue - aDaysOverdue;
    });

    // Build briefing text
    let content = `G-Vision | Daily Briefing — ${dateStr}\n`;
    content += `=${"=".repeat(60)}\n\n`;

    content += `To: ${emailTo}\n`;
    content += `Date: ${dateStr}\n`;
    content += `=${"=".repeat(60)}\n\n`;

    // Section 1: Previous Night Incidents
    content += `🌙 PREVIOUS NIGHT — INCIDENTS\n`;
    content += `-${"−".repeat(59)}\n`;
    if (incidents.length === 0) {
      content += `✅ No incidents reported.\n\n`;
    } else {
      content += `Room | Type | Issue | Severity\n`;
      content += `-${"−".repeat(59)}\n`;
      incidents.forEach((inc) => {
        content += `${inc.room} | ${inc.type} | ${inc.issue} | ${inc.severity}\n`;
      });
      content += `\nTotal: ${incidents.length} incident(s)\n\n`;
    }

    // Section 2: Ongoing & Overdue Work
    content += `🔧 ONGOING & OVERDUE WORK\n`;
    content += `-${"−".repeat(59)}\n`;
    if (overdueTasks.length === 0) {
      content += `✅ No overdue tasks.\n\n`;
    } else {
      content += `Room | Type | Description | Due | Days Overdue | Priority | Assigned\n`;
      content += `-${"−".repeat(59)}\n`;
      overdueTasks.forEach((task) => {
        const daysOverdue = Math.floor(
          (new Date(reportDate).getTime() - new Date(task.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        content += `${task.room} | ${task.type} | ${task.description} | ${task.dueDate} | ${daysOverdue} | ${task.priority} | ${task.assignedTo}\n`;
      });
      content += `\nTotal: ${overdueTasks.length} task(s)\n\n`;
    }

    // Section 3: Upcoming This Week
    content += `📅 UPCOMING THIS WEEK\n`;
    content += `-${"−".repeat(59)}\n`;
    if (upcomingTasks.length === 0) {
      content += `✅ No upcoming tasks this week.\n\n`;
    } else {
      content += `Room | Type | Description | Due | Priority | Assigned\n`;
      content += `-${"−".repeat(59)}\n`;
      upcomingTasks.forEach((task) => {
        content += `${task.room} | ${task.type} | ${task.description} | ${task.dueDate} | ${task.priority} | ${task.assignedTo}\n`;
      });
      content += `\nTotal: ${upcomingTasks.length} task(s)\n\n`;
    }

    // Summary footer
    content += `SUMMARY\n`;
    content += `-${"−".repeat(59)}\n`;
    content += `Open Tasks: ${tasks.length}\n`;
    content += `Overdue Count: ${overdueTasks.length}\n`;
    content += `Night Incident Count: ${incidents.length}\n\n`;

    content += `=${"=".repeat(60)}\n`;
    content += `Sent by G-Vision\n`;
    content += `Resort Duty Manager · Hamilton Island Enterprises\n`;

    setBriefing(content);
  };

  const copyToClipboard = async () => {
    if (!briefing) return;
    try {
      await navigator.clipboard.writeText(briefing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const downloadAsText = () => {
    if (!briefing) return;
    const element = document.createElement("a");
    const file = new Blob([briefing], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `g-vision-briefing-${reportDate}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Daily Briefing</h1>
        <p className="text-night-400 mt-1">
          Generate and send shift briefings to your management team
        </p>
      </div>

      {/* Controls Section */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-night-300 mb-2">
            To (Email addresses)
          </label>
          <input
            type="text"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="gm@hotel.com, eam@hotel.com"
            className="w-full bg-night-800 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-night-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
          <p className="text-xs text-night-500 mt-1">
            Comma-separated email addresses
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-night-300 mb-2">
            Reporting Night Date
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full bg-night-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
          <p className="text-xs text-night-500 mt-1">Select the night to report</p>
        </div>

        <button
          onClick={generateBriefing}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Generate Briefing
        </button>
      </div>

      {/* Generated Briefing */}
      {briefing && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500/15 border border-brand-500/30 text-brand-400 rounded-lg hover:bg-brand-500/25 transition-colors text-sm font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              onClick={downloadAsText}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/25 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download as .txt
            </button>
          </div>

          {/* Briefing Preview */}
          <div className="glass rounded-xl p-6">
            <p className="text-xs text-night-400 mb-3 font-medium">BRIEFING PREVIEW</p>
            <pre className="bg-night-950 rounded-lg p-4 overflow-auto max-h-96 text-xs text-night-100 font-mono whitespace-pre-wrap">
              {briefing}
            </pre>
          </div>
        </div>
      )}

      {/* Demo Data Info */}
      {!briefing && (
        <div className="glass rounded-xl p-6">
          <p className="text-sm text-night-400">
            Select a date and email recipients, then click &ldquo;Generate Briefing&rdquo; to create your daily briefing.
          </p>
          <div className="mt-4 space-y-2 text-xs text-night-500">
            <p>Demo Incidents: {DEMO_INCIDENTS[0].date}</p>
            <p>Tasks: Loaded from localStorage (gvision_tasks)</p>
          </div>
        </div>
      )}
    </div>
  );
}
