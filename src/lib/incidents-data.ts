/**
 * Night Eye â Incident data loading & analytics
 * Loads from /public/incidents.json (2,404 real Hamilton Island records)
 * Falls back to Supabase if available in the future.
 */

export interface Incident {
  date: string;           // "2025-01-01"
  time: string;           // "1945"
  site: string;           // "Reef View Hotel"
  room_number: string;    // "R1405" or "N/A"
  incident_type: string;  // "Maintenance"
  issue_summary: string;  // "AC leak"
  primary_department: string;
  escalation: string;     // "Yes" | "No"
  escalated_to: string;
  primary_impact: string; // "Guest" | "Safety" | "Operations"
  severity: string;       // "Low" | "Medium" | "High"
  controllable: string;   // "Yes" | "Partial" | "No"
  root_cause: string;
}

// âââ Color constants matching Streamlit app âââ
export const COLORS = {
  indigo: "#6366f1",
  indigoDark: "#4f46e5",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  gray: "#6b7280",
};

export const CHART_PALETTE = [
  "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6", "#22c55e",
  "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6",
];

export const SEVERITY_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#eab308",
  Low: "#22c55e",
};

export const SEVERITY_BADGE: Record<string, string> = {
  High: "bg-red-500/15 text-red-400",
  Medium: "bg-yellow-500/15 text-yellow-400",
  Low: "bg-green-500/15 text-green-400",
};

// âââ Data loading âââ
let cachedData: Incident[] | null = null;

export async function loadIncidents(): Promise<Incident[]> {
  if (cachedData) return cachedData;
  try {
    const res = await fetch("/incidents.json");
    if (!res.ok) throw new Error("Failed to load incidents");
    const data: Incident[] = await res.json();
    cachedData = data;
    return data;
  } catch {
    console.warn("Could not load incidents.json, returning empty array");
    return [];
  }
}

// âââ Filtering âââ
export function filterByDateRange(
  data: Incident[],
  startDate?: string,
  endDate?: string
): Incident[] {
  return data.filter((d) => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });
}

export function filterByYear(data: Incident[], year: number): Incident[] {
  const prefix = String(year);
  return data.filter((d) => d.date.startsWith(prefix));
}

// âââ Analytics computations âââ

export interface KPIData {
  totalIncidents: number;
  highSeverity: number;
  escalationRate: number;
  topIncidentType: string;
  controllableCount: number;
  uniqueSites: number;
  uniqueDepartments: number;
}

export function computeKPIs(data: Incident[]): KPIData {
  const total = data.length;
  const high = data.filter((d) => d.severity === "High").length;
  const escalated = data.filter((d) => d.escalation === "Yes").length;
  const controllable = data.filter((d) => d.controllable === "Yes").length;

  // Top incident type by count
  const typeCounts: Record<string, number> = {};
  data.forEach((d) => {
    typeCounts[d.incident_type] = (typeCounts[d.incident_type] || 0) + 1;
  });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const uniqueSites = new Set(data.map((d) => d.site)).size;
  const uniqueDepts = new Set(data.map((d) => d.primary_department)).size;

  return {
    totalIncidents: total,
    highSeverity: high,
    escalationRate: total > 0 ? (escalated / total) * 100 : 0,
    topIncidentType: topType,
    controllableCount: controllable,
    uniqueSites,
    uniqueDepartments: uniqueDepts,
  };
}

// Monthly trend data for charts
export interface MonthlyTrend {
  month: string; // "Jan 2025"
  monthKey: string; // "2025-01"
  total: number;
  high: number;
  escalated: number;
}

export function computeMonthlyTrend(data: Incident[]): MonthlyTrend[] {
  const months: Record<string, { total: number; high: number; escalated: number }> = {};

  data.forEach((d) => {
    const key = d.date.substring(0, 7); // "2025-01"
    if (!months[key]) months[key] = { total: 0, high: 0, escalated: 0 };
    months[key].total++;
    if (d.severity === "High") months[key].high++;
    if (d.escalation === "Yes") months[key].escalated++;
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [year, mon] = key.split("-");
      return {
        month: `${monthNames[parseInt(mon) - 1]} ${year}`,
        monthKey: key,
        ...val,
      };
    });
}

// Count by a field (top N)
export interface CountItem {
  name: string;
  value: number;
  color: string;
}

export function countByField(
  data: Incident[],
  field: keyof Incident,
  topN: number = 10
): CountItem[] {
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    const val = d[field] || "Unknown";
    counts[val] = (counts[val] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, value], i) => ({
      name,
      value,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
}

// Department workload
export interface DeptWorkload {
  department: string;
  total: number;
  high: number;
  escalated: number;
}

export function computeDeptWorkload(data: Incident[]): DeptWorkload[] {
  const depts: Record<string, { total: number; high: number; escalated: number }> = {};
  data.forEach((d) => {
    const dept = d.primary_department || "Unknown";
    if (!depts[dept]) depts[dept] = { total: 0, high: 0, escalated: 0 };
    depts[dept].total++;
    if (d.severity === "High") depts[dept].high++;
    if (d.escalation === "Yes") depts[dept].escalated++;
  });

  return Object.entries(depts)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([department, val]) => ({ department, ...val }));
}

// Severity breakdown
export function computeSeverityBreakdown(data: Incident[]): CountItem[] {
  const order = ["Low", "Medium", "High"];
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.severity] = (counts[d.severity] || 0) + 1;
  });

  return order.map((name) => ({
    name,
    value: counts[name] || 0,
    color: SEVERITY_COLORS[name],
  }));
}

// Time of night distribution (for shift analysis)
export interface TimeSlot {
  slot: string;
  count: number;
  color: string;
}

export function computeTimeDistribution(data: Incident[]): TimeSlot[] {
  const slots: Record<string, number> = {
    "18:00â20:00": 0,
    "20:00â22:00": 0,
    "22:00â00:00": 0,
    "00:00â02:00": 0,
    "02:00â06:00": 0,
    "06:00â08:00": 0,
  };

  const slotColors: Record<string, string> = {
    "18:00â20:00": "#6366f1",
    "20:00â22:00": "#3b82f6",
    "22:00â00:00": "#06b6d4",
    "00:00â02:00": "#eab308",
    "02:00â06:00": "#f97316",
    "06:00â08:00": "#22c55e",
  };

  data.forEach((d) => {
    const t = d.time;
    if (!t || t.length < 4) return;
    const hr = parseInt(t.substring(0, 2));
    if (hr >= 18 && hr < 20) slots["18:00â20:00"]++;
    else if (hr >= 20 && hr < 22) slots["20:00â22:00"]++;
    else if (hr >= 22) slots["22:00â00:00"]++;
    else if (hr < 2) slots["00:00â02:00"]++;
    else if (hr < 6) slots["02:00â06:00"]++;
    else if (hr < 8) slots["06:00â08:00"]++;
  });

  return Object.entries(slots).map(([slot, count]) => ({
    slot,
    count,
    color: slotColors[slot],
  }));
}

// Year-on-year comparison
export interface YoYData {
  month: string;
  y2025: number;
  y2026: number;
}

export function computeYearOnYear(data: Incident[]): YoYData[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const y2025: Record<number, number> = {};
  const y2026: Record<number, number> = {};

  data.forEach((d) => {
    const [year, mon] = d.date.split("-").map(Number);
    if (year === 2025) y2025[mon] = (y2025[mon] || 0) + 1;
    if (year === 2026) y2026[mon] = (y2026[mon] || 0) + 1;
  });

  return monthNames.map((name, i) => ({
    month: name,
    y2025: y2025[i + 1] || 0,
    y2026: y2026[i + 1] || 0,
  }));
}

// Recent high severity incidents
export function getRecentHighSeverity(data: Incident[], limit: number = 10): Incident[] {
  return data
    .filter((d) => d.severity === "High")
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    })
    .slice(0, limit);
}

// RVH-specific analysis
export function getRVHData(data: Incident[]) {
  const rvh = data.filter((d) => d.site === "Reef View Hotel");

  // Room-level analysis for RVH rooms (R0101-R2020 pattern)
  const roomCounts: Record<string, { count: number; types: Set<string>; lastDate: string; severities: string[] }> = {};

  rvh.forEach((d) => {
    const room = d.room_number;
    if (!room || room === "N/A") return;
    if (!roomCounts[room]) {
      roomCounts[room] = { count: 0, types: new Set(), lastDate: d.date, severities: [] };
    }
    roomCounts[room].count++;
    roomCounts[room].types.add(d.incident_type);
    roomCounts[room].severities.push(d.severity);
    if (d.date > roomCounts[room].lastDate) roomCounts[room].lastDate = d.date;
  });

  // Hot spots: rooms with 4+ incidents
  const hotSpots = Object.entries(roomCounts)
    .filter(([, v]) => v.count >= 4)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([room, v]) => ({
      room,
      count: v.count,
      types: Array.from(v.types),
      lastDate: v.lastDate,
      highCount: v.severities.filter((s) => s === "High").length,
    }));

  // Category counts for RVH
  const pestRegex = /pest|cockroach|insect|bug|ant|rodent|mouse|rat|flies|spider|gecko/i;
  const smellRegex = /odour|odor|bleach|mould|mold|musty|smell/i;
  const acRegex = /a\/c|aircon|air con|ac leak|ac not/i;
  const safelockRegex = /safelock|safe lock|keycard|key card/i;

  const pestCount = rvh.filter((d) => pestRegex.test(d.issue_summary) || pestRegex.test(d.incident_type)).length;
  const smellCount = rvh.filter((d) => smellRegex.test(d.issue_summary)).length;
  const acCount = rvh.filter((d) => acRegex.test(d.issue_summary) || d.incident_type === "AC").length;
  const safelockCount = rvh.filter((d) => safelockRegex.test(d.issue_summary)).length;

  return {
    total: rvh.length,
    incidents: rvh,
    hotSpots,
    categories: {
      pest: pestCount,
      smell: smellCount,
      ac: acCount,
      safelock: safelockCount,
    },
    roomCounts,
  };
}

// Trend alerts: month-on-month changes > 15%
export interface TrendAlert {
  category: string;
  change: number; // percentage
  direction: "up" | "down";
  prev: number;
  curr: number;
  prevLabel: string;
  currLabel: string;
}

export function computeTrendAlerts(data: Incident[]): TrendAlert[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Group by type and month
  const typeMonthly: Record<string, Record<string, number>> = {};
  data.forEach((d) => {
    const type = d.incident_type;
    const monthKey = d.date.substring(0, 7);
    if (!typeMonthly[type]) typeMonthly[type] = {};
    typeMonthly[type][monthKey] = (typeMonthly[type][monthKey] || 0) + 1;
  });

  const alerts: TrendAlert[] = [];
  Object.entries(typeMonthly).forEach(([type, months]) => {
    const sortedMonths = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
    if (sortedMonths.length < 2) return;

    const [prevKey, prev] = sortedMonths[sortedMonths.length - 2];
    const [currKey, curr] = sortedMonths[sortedMonths.length - 1];

    if (prev === 0) return;
    const change = ((curr - prev) / prev) * 100;
    if (Math.abs(change) < 15) return;

    const prevMonth = parseInt(prevKey.split("-")[1]);
    const currMonth = parseInt(currKey.split("-")[1]);

    alerts.push({
      category: type,
      change: Math.round(change),
      direction: change > 0 ? "up" : "down",
      prev,
      curr,
      prevLabel: monthNames[prevMonth - 1],
      currLabel: monthNames[currMonth - 1],
    });
  });

  return alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

// Controllability breakdown
export function computeControllability(data: Incident[]): CountItem[] {
  const order = ["Yes", "Partial", "No"];
  const colors: Record<string, string> = { Yes: "#22c55e", Partial: "#eab308", No: "#ef4444" };
  const counts: Record<string, number> = {};
  data.forEach((d) => {
    counts[d.controllable] = (counts[d.controllable] || 0) + 1;
  });

  return order.map((name) => ({
    name,
    value: counts[name] || 0,
    color: colors[name],
  }));
}

// Format time string "1945" -> "19:45"
export function formatTime(t: string): string {
  if (!t || t.length < 4) return t || "";
  return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
}
