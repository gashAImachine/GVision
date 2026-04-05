"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSupabase } from "@/hooks/use-supabase";

// ─── Types ───
interface RoomData {
  code: string;
  floor: number;
  position: number;
  wing: "low" | "high";
  incidentCount: number;
  incidentHistory: Incident[];
  lastIssue: string | null;
  lastSeverity: string | null;
  issues: string[];
  taskCount: number;
}

interface Incident {
  id: string;
  date: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
}

interface Task {
  id: string;
  roomCode: string;
  taskType: "Pest Control" | "Maintenance" | "Refurbishment" | "Deep Clean" | "Other";
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  dueDate: string;
}

// ─── Incident type pool ───
const incidentTypes = [
  { type: "AC not cooling", severity: "high" as const },
  { type: "Pest control needed", severity: "high" as const },
  { type: "WiFi issues", severity: "low" as const },
  { type: "Safelock battery", severity: "medium" as const },
  { type: "Blocked toilet", severity: "high" as const },
  { type: "TV not working", severity: "low" as const },
  { type: "Noise complaint", severity: "medium" as const },
  { type: "Fridge leaking", severity: "high" as const },
  { type: "Door lock jammed", severity: "medium" as const },
  { type: "Hot water issue", severity: "high" as const },
  { type: "Smell complaint", severity: "medium" as const },
  { type: "Towels missing", severity: "low" as const },
];

const taskTypes: Array<"Pest Control" | "Maintenance" | "Refurbishment" | "Deep Clean" | "Other"> = [
  "Pest Control", "Maintenance", "Refurbishment", "Deep Clean", "Other"
];

// Generate demo incidents for a room
function generateIncidentHistory(roomCode: string, count: number): Incident[] {
  const incidents: Incident[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const incident = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    incidents.push({
      id: `${roomCode}-inc-${i}`,
      date: date.toISOString().split('T')[0],
      type: incident.type,
      severity: incident.severity,
      description: `${incident.type} - reported by guest`,
    });
  }

  return incidents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate the full RVH room layout with demo data
function generateDemoLayout(): RoomData[] {
  const rooms: RoomData[] = [];

  for (let floor = 1; floor <= 19; floor++) {
    let lowStart = 1, lowEnd = 11, highStart = 12, highEnd = 21;
    if (floor === 17) { lowStart = 3; highEnd = 18; }
    if (floor === 18 || floor === 19) { lowStart = 4; highEnd = 18; }

    for (let pos = lowStart; pos <= lowEnd; pos++) {
      const code = `R${floor.toString().padStart(2, "0")}${pos.toString().padStart(2, "0")}`;
      const isHotspot = (floor === 8 && pos >= 10) || (floor === 12 && pos <= 5) || (floor === 3 && pos === 7);
      const isWarm = Math.random() < 0.15;
      const count = isHotspot ? 4 + Math.floor(Math.random() * 5) : isWarm ? 1 + Math.floor(Math.random() * 3) : 0;
      const incidentHistory = generateIncidentHistory(code, count);

      rooms.push({
        code,
        floor,
        position: pos,
        wing: "low",
        incidentCount: count,
        incidentHistory,
        lastIssue: incidentHistory[0]?.type || null,
        lastSeverity: incidentHistory[0]?.severity || null,
        issues: incidentHistory.slice(0, 3).map(i => i.type),
        taskCount: Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0,
      });
    }

    for (let pos = highStart; pos <= highEnd; pos++) {
      const code = `R${floor.toString().padStart(2, "0")}${pos.toString().padStart(2, "0")}`;
      const isHotspot = (floor === 5 && pos >= 17) || (floor === 14 && pos === 15);
      const isWarm = Math.random() < 0.12;
      const count = isHotspot ? 4 + Math.floor(Math.random() * 4) : isWarm ? 1 + Math.floor(Math.random() * 2) : 0;
      const incidentHistory = generateIncidentHistory(code, count);

      rooms.push({
        code,
        floor,
        position: pos,
        wing: "high",
        incidentCount: count,
        incidentHistory,
        lastIssue: incidentHistory[0]?.type || null,
        lastSeverity: incidentHistory[0]?.severity || null,
        issues: incidentHistory.slice(0, 3).map(i => i.type),
        taskCount: Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0,
      });
    }
  }

  return rooms;
}

// Determine room status color based on combined incident + task status
function getRoomStatusColor(incidentCount: number, taskCount: number, taskPriority?: "low" | "medium" | "high"): string {
  const totalIssues = incidentCount + (taskCount > 0 ? 1 : 0);

  // High priority task escalates the color
  if (taskCount > 0 && taskPriority === "high") {
    return "bg-red-500/30 border-red-500/50";
  }

  if (totalIssues === 0) return "bg-night-800 border-night-700";
  if (incidentCount <= 1 && taskCount === 0) return "bg-green-500/20 border-green-500/40";
  if (incidentCount <= 3 && taskCount === 0) return "bg-yellow-500/20 border-yellow-500/40";
  if (incidentCount >= 4 && incidentCount <= 5) return "bg-orange-500/25 border-orange-500/50";
  return "bg-red-500/30 border-red-500/50";
}

function getRoomTextColor(incidentCount: number, taskCount: number, taskPriority?: "low" | "medium" | "high"): string {
  const totalIssues = incidentCount + (taskCount > 0 ? 1 : 0);

  if (taskCount > 0 && taskPriority === "high") {
    return "text-red-400";
  }

  if (totalIssues === 0) return "text-night-500";
  if (incidentCount <= 1 && taskCount === 0) return "text-green-400";
  if (incidentCount <= 3 && taskCount === 0) return "text-yellow-400";
  if (incidentCount >= 4 && incidentCount <= 5) return "text-orange-400";
  return "text-red-400";
}

export default function RoomMapPage() {
  const supabase = useSupabase();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [taskFilter, setTaskFilter] = useState<"All" | "Pest Control" | "Maintenance" | "Refurbishment" | "Deep Clean" | "Other">("All");
  const [incidentLookback, setIncidentLookback] = useState(90);
  const [highlightHotspots, setHighlightHotspots] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Load demo tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("gvision_tasks");
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch {
        setTasks([]);
      }
    }
  }, []);

  // Generate demo tasks
  useEffect(() => {
    if (tasks.length === 0 && rooms.length > 0) {
      const demoTasks: Task[] = [];
      rooms.forEach((room, idx) => {
        if (room.taskCount > 0) {
          for (let i = 0; i < room.taskCount; i++) {
            const taskTypeIdx = Math.floor(Math.random() * taskTypes.length);
            demoTasks.push({
              id: `task-${room.code}-${i}`,
              roomCode: room.code,
              taskType: taskTypes[taskTypeIdx],
              title: `${taskTypes[taskTypeIdx]} - ${room.code}`,
              priority: Math.random() < 0.3 ? "high" : Math.random() < 0.5 ? "medium" : "low",
              completed: false,
              dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
          }
        }
      });
      if (demoTasks.length > 0) {
        setTasks(demoTasks);
        localStorage.setItem("gvision_tasks", JSON.stringify(demoTasks));
      }
    }
  }, [rooms, tasks.length]);

  useEffect(() => {
    // Try loading real data, fall back to demo
    async function loadRooms() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRooms(generateDemoLayout()); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) { setRooms(generateDemoLayout()); return; }

        // Check if we have real rooms
        const { data: realRooms } = await supabase
          .from("rooms")
          .select("room_code, floor, position, wing")
          .limit(5);

        if (realRooms && realRooms.length > 0) {
          // Load incident counts per room
          const { data: allRooms } = await supabase
            .from("rooms")
            .select("room_code, floor, position, wing")
            .order("floor")
            .order("position");

          const { data: incidentCounts } = await supabase
            .from("incidents")
            .select("room_code");

          const countMap: Record<string, number> = {};
          for (const inc of incidentCounts || []) {
            if (inc.room_code) {
              countMap[inc.room_code] = (countMap[inc.room_code] || 0) + 1;
            }
          }

          const mapped: RoomData[] = (allRooms || []).map((r) => ({
            code: r.room_code,
            floor: r.floor || 0,
            position: r.position || 0,
            wing: (r.wing as "low" | "high") || "low",
            incidentCount: countMap[r.room_code] || 0,
            incidentHistory: [],
            lastIssue: null,
            lastSeverity: null,
            issues: [],
            taskCount: 0,
          }));

          if (mapped.length > 0) {
            setRooms(mapped);
            setIsDemo(false);
            return;
          }
        }
      } catch {
        // Fall through to demo
      }
      setRooms(generateDemoLayout());
    }
    loadRooms();
  }, [supabase]);

  // Get room tasks
  const getRoomTasks = (roomCode: string) => {
    return tasks.filter(t => t.roomCode === roomCode && !t.completed);
  };

  // Get incidents within lookback period
  const getRecentIncidents = (room: RoomData) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - incidentLookback);
    return room.incidentHistory.filter(inc => new Date(inc.date) >= cutoffDate);
  };

  // Group rooms by floor
  const floors = useMemo(() => {
    const map = new Map<number, { low: RoomData[]; high: RoomData[] }>();
    for (const r of rooms) {
      if (!map.has(r.floor)) map.set(r.floor, { low: [], high: [] });
      map.get(r.floor)![r.wing].push(r);
    }
    // Sort floors descending (top floor at top)
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, wings]) => ({
        floor,
        low: wings.low.sort((a, b) => a.position - b.position),
        high: wings.high.sort((a, b) => a.position - b.position),
      }));
  }, [rooms]);

  // Stats
  const stats = useMemo(() => {
    const total = rooms.length;
    const withIncidents = rooms.filter((r) => getRecentIncidents(r).length > 0).length;
    const hotspots = rooms.filter((r) => getRecentIncidents(r).length >= 4).length;
    const totalIncidents = rooms.reduce((sum, r) => sum + getRecentIncidents(r).length, 0);
    const withActiveTasks = rooms.filter((r) => getRoomTasks(r.code).length > 0).length;
    return { total, withIncidents, hotspots, totalIncidents, withActiveTasks };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, incidentLookback, tasks]);

  const _displayRooms = useMemo(() => {
    if (!highlightHotspots) return rooms;
    return rooms; // Hotspots are always shown, this toggle is just visual emphasis
  }, [rooms, highlightHotspots]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Room Intelligence Map</h1>
          <p className="text-night-400 mt-1">
            Reef View Hotel — {stats.total} rooms
            {isDemo ? " (demo data)" : ""}
          </p>
        </div>
      </div>

      {/* ─── Summary Stats Bar ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Total Rooms</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">With Incidents</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.withIncidents}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Hot Spots (4+)</p>
          <p className="text-2xl font-bold text-red-400">{stats.hotspots}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Active Tasks</p>
          <p className="text-2xl font-bold text-blue-400">{stats.withActiveTasks}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Total Incidents</p>
          <p className="text-2xl font-bold text-brand-400">{stats.totalIncidents}</p>
        </div>
      </div>

      {/* ─── Filter Controls ─── */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Task Type Filter */}
          <div>
            <label className="block text-xs text-night-400 mb-2 font-medium">Task Type</label>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value as typeof taskFilter)}
              className="w-full px-3 py-2 bg-night-700 border border-night-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="All">All Tasks</option>
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Incident Lookback Filter */}
          <div>
            <label className="block text-xs text-night-400 mb-2 font-medium">Incident Lookback</label>
            <select
              value={incidentLookback}
              onChange={(e) => setIncidentLookback(Number(e.target.value))}
              className="w-full px-3 py-2 bg-night-700 border border-night-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
            </select>
          </div>

          {/* Highlight Hot Spots Toggle */}
          <div className="flex items-end">
            <button
              onClick={() => setHighlightHotspots(!highlightHotspots)}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                highlightHotspots
                  ? "bg-red-500/20 border border-red-500/40 text-red-400"
                  : "bg-white/5 border border-white/10 text-night-400"
              }`}
            >
              {highlightHotspots ? "Hot Spots Highlighted" : "Highlight Hot Spots"}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-night-400 mb-2">Status Legend</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-night-800 border border-night-700" /> Clean</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/25 border border-orange-500/50" /> High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" /> Critical</span>
          </div>
        </div>
      </div>

      {/* ─── Room Grid with Incident History Overlay ─── */}
      <div className="glass rounded-xl p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Column headers */}
          <div className="flex items-center mb-2 text-[10px] text-night-500">
            <div className="w-12 text-right pr-2">Floor</div>
            <div className="flex-1">
              <div className="flex justify-between px-1">
                <span>Low Side (Marina)</span>
                <span>|</span>
                <span>High Side (Passage Peak)</span>
              </div>
            </div>
          </div>

          {/* Floors */}
          {floors.map(({ floor, low, high }) => (
            <div key={floor} className="flex items-center mb-1">
              <div className="w-12 text-right pr-2 text-xs text-night-500 font-mono">
                F{floor}
              </div>
              <div className="flex-1 flex gap-0.5">
                {/* Low side rooms */}
                <div className="flex gap-0.5 flex-1 justify-end">
                  {low.map((room) => {
                    const recentIncidents = getRecentIncidents(room);
                    const roomTasks = getRoomTasks(room.code);
                    const highPriorityTask = roomTasks.some(t => t.priority === "high");
                    const dimmed = highlightHotspots && recentIncidents.length < 4;
                    return (
                      <div key={room.code} className="relative">
                        <button
                          onClick={() => setSelectedRoom(room)}
                          className={`w-8 h-8 rounded border text-[9px] font-mono flex items-center justify-center transition-all hover:scale-110 hover:z-10 relative ${
                            getRoomStatusColor(recentIncidents.length, roomTasks.length, highPriorityTask ? "high" : undefined)
                          } ${getRoomTextColor(recentIncidents.length, roomTasks.length, highPriorityTask ? "high" : undefined)} ${
                            dimmed ? "opacity-20" : ""
                          } ${
                            selectedRoom?.code === room.code ? "ring-2 ring-brand-500 scale-110 z-10" : ""
                          }`}
                          title={`${room.code}: ${recentIncidents.length} incidents, ${roomTasks.length} tasks`}
                        >
                          {recentIncidents.length > 0 ? recentIncidents.length : ""}
                        </button>
                        {/* Incident count badge */}
                        {recentIncidents.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-red-600 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                            {recentIncidents.length}
                          </div>
                        )}
                        {/* Task indicator dot */}
                        {roomTasks.length > 0 && (
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-blue-600 ${
                            highPriorityTask ? "bg-red-500" : "bg-blue-500"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="w-px bg-white/10 mx-1" />

                {/* High side rooms */}
                <div className="flex gap-0.5 flex-1">
                  {high.map((room) => {
                    const recentIncidents = getRecentIncidents(room);
                    const roomTasks = getRoomTasks(room.code);
                    const highPriorityTask = roomTasks.some(t => t.priority === "high");
                    const dimmed = highlightHotspots && recentIncidents.length < 4;
                    return (
                      <div key={room.code} className="relative">
                        <button
                          onClick={() => setSelectedRoom(room)}
                          className={`w-8 h-8 rounded border text-[9px] font-mono flex items-center justify-center transition-all hover:scale-110 hover:z-10 relative ${
                            getRoomStatusColor(recentIncidents.length, roomTasks.length, highPriorityTask ? "high" : undefined)
                          } ${getRoomTextColor(recentIncidents.length, roomTasks.length, highPriorityTask ? "high" : undefined)} ${
                            dimmed ? "opacity-20" : ""
                          } ${
                            selectedRoom?.code === room.code ? "ring-2 ring-brand-500 scale-110 z-10" : ""
                          }`}
                          title={`${room.code}: ${recentIncidents.length} incidents, ${roomTasks.length} tasks`}
                        >
                          {recentIncidents.length > 0 ? recentIncidents.length : ""}
                        </button>
                        {/* Incident count badge */}
                        {recentIncidents.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-red-600 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                            {recentIncidents.length}
                          </div>
                        )}
                        {/* Task indicator dot */}
                        {roomTasks.length > 0 && (
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-blue-600 ${
                            highPriorityTask ? "bg-red-500" : "bg-blue-500"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Room Detail Panel ─── */}
      {selectedRoom && (
        <div className="glass rounded-xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-semibold text-white">{selectedRoom.code}</h2>
              <p className="text-sm text-night-400 mt-1">
                Floor {selectedRoom.floor} · {selectedRoom.wing === "low" ? "Low Side (Marina)" : "High Side (Passage Peak)"} · Position {selectedRoom.position}
              </p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="text-night-500 hover:text-white text-sm font-medium px-3 py-1 rounded hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Room Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-night-400 mb-1">Recent Incidents</p>
              <p className={`text-2xl font-bold ${getRoomTextColor(getRecentIncidents(selectedRoom).length, getRoomTasks(selectedRoom.code).length)}`}>
                {getRecentIncidents(selectedRoom).length}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-night-400 mb-1">Status</p>
              <p className="text-sm font-medium text-white">
                {getRecentIncidents(selectedRoom).length >= 4 ? "Critical" : getRecentIncidents(selectedRoom).length > 0 ? "Active" : "Clean"}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-night-400 mb-1">Active Tasks</p>
              <p className="text-2xl font-bold text-blue-400">{getRoomTasks(selectedRoom.code).length}</p>
            </div>
          </div>

          {/* Incident History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Incident History (Last {incidentLookback} Days)</h3>
              <span className="text-xs text-night-400">{getRecentIncidents(selectedRoom).length} incidents</span>
            </div>
            {getRecentIncidents(selectedRoom).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getRecentIncidents(selectedRoom).map((incident) => (
                  <div key={incident.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-white">{incident.type}</p>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        incident.severity === "high" ? "bg-red-500/20 text-red-300" :
                        incident.severity === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-green-500/20 text-green-300"
                      }`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-xs text-night-400">{incident.date}</p>
                    <p className="text-xs text-night-300 mt-1">{incident.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-night-400">No incidents in this period</p>
              </div>
            )}
          </div>

          {/* Active Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Active Tasks</h3>
              <span className="text-xs text-night-400">{getRoomTasks(selectedRoom.code).length} tasks</span>
            </div>
            {getRoomTasks(selectedRoom.code).length > 0 ? (
              <div className="space-y-2">
                {getRoomTasks(selectedRoom.code).map((task) => (
                  <div key={task.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="text-xs text-night-400">{task.taskType}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        task.priority === "high" ? "bg-red-500/20 text-red-300" :
                        task.priority === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-blue-500/20 text-blue-300"
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-night-400">Due: {task.dueDate}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-sm text-night-400 mb-3">No active tasks</p>
                <Link
                  href="/dashboard/tasks"
                  className="inline-block px-4 py-2 bg-brand-500/20 border border-brand-500/40 text-brand-300 text-sm font-medium rounded-lg hover:bg-brand-500/30 transition-colors"
                >
                  Add Task
                </Link>
              </div>
            )}
            {getRoomTasks(selectedRoom.code).length > 0 && (
              <div className="mt-3">
                <Link
                  href="/dashboard/tasks"
                  className="inline-block px-4 py-2 bg-brand-500/20 border border-brand-500/40 text-brand-300 text-sm font-medium rounded-lg hover:bg-brand-500/30 transition-colors"
                >
                  Manage Tasks
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
