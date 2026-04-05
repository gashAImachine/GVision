"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/hooks/use-supabase";

// ─── RVH Layout (demo: 19 floors, low side 1-11, high side 12-21) ───
interface RoomData {
  code: string;
  floor: number;
  position: number;
  wing: "low" | "high";
  incidentCount: number;
  lastIssue: string | null;
  lastSeverity: string | null;
  issues: string[];
}

// Generate the full RVH room layout with demo data
function generateDemoLayout(): RoomData[] {
  const rooms: RoomData[] = [];

  // Issue types for demo hotspots
  const issuePool = [
    "AC not cooling", "Pest control needed", "WiFi issues", "Safelock battery",
    "Blocked toilet", "TV not working", "Noise complaint", "Fridge leaking",
    "Door lock jammed", "Hot water issue", "Smell complaint", "Towels missing",
  ];

  for (let floor = 1; floor <= 19; floor++) {
    let lowStart = 1, lowEnd = 11, highStart = 12, highEnd = 21;
    if (floor === 17) { lowStart = 3; highEnd = 18; }
    if (floor === 18 || floor === 19) { lowStart = 4; highEnd = 18; }

    for (let pos = lowStart; pos <= lowEnd; pos++) {
      const code = `R${floor.toString().padStart(2, "0")}${pos.toString().padStart(2, "0")}`;
      // Sprinkle demo incidents — some rooms are "hot spots"
      const isHotspot = (floor === 8 && pos >= 10) || (floor === 12 && pos <= 5) || (floor === 3 && pos === 7);
      const isWarm = Math.random() < 0.15;
      const count = isHotspot ? 4 + Math.floor(Math.random() * 5) : isWarm ? 1 + Math.floor(Math.random() * 3) : 0;

      rooms.push({
        code,
        floor,
        position: pos,
        wing: "low",
        incidentCount: count,
        lastIssue: count > 0 ? issuePool[Math.floor(Math.random() * issuePool.length)] : null,
        lastSeverity: count > 3 ? "high" : count > 0 ? "medium" : null,
        issues: count > 0 ? Array.from({ length: Math.min(count, 3) }, () => issuePool[Math.floor(Math.random() * issuePool.length)]) : [],
      });
    }

    for (let pos = highStart; pos <= highEnd; pos++) {
      const code = `R${floor.toString().padStart(2, "0")}${pos.toString().padStart(2, "0")}`;
      const isHotspot = (floor === 5 && pos >= 17) || (floor === 14 && pos === 15);
      const isWarm = Math.random() < 0.12;
      const count = isHotspot ? 4 + Math.floor(Math.random() * 4) : isWarm ? 1 + Math.floor(Math.random() * 2) : 0;

      rooms.push({
        code,
        floor,
        position: pos,
        wing: "high",
        incidentCount: count,
        lastIssue: count > 0 ? issuePool[Math.floor(Math.random() * issuePool.length)] : null,
        lastSeverity: count > 3 ? "high" : count > 0 ? "medium" : null,
        issues: count > 0 ? Array.from({ length: Math.min(count, 3) }, () => issuePool[Math.floor(Math.random() * issuePool.length)]) : [],
      });
    }
  }

  return rooms;
}

function getRoomColor(count: number): string {
  if (count === 0) return "bg-night-800 border-night-700";
  if (count <= 1) return "bg-green-500/20 border-green-500/40";
  if (count <= 3) return "bg-yellow-500/20 border-yellow-500/40";
  if (count <= 5) return "bg-orange-500/25 border-orange-500/50";
  return "bg-red-500/30 border-red-500/50"; // hotspot
}

function getRoomTextColor(count: number): string {
  if (count === 0) return "text-night-500";
  if (count <= 1) return "text-green-400";
  if (count <= 3) return "text-yellow-400";
  if (count <= 5) return "text-orange-400";
  return "text-red-400";
}

export default function RoomMapPage() {
  const supabase = useSupabase();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [_filterIssue, _setFilterIssue] = useState("all");
  const [highlightHotspots, setHighlightHotspots] = useState(false);

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
            lastIssue: null,
            lastSeverity: null,
            issues: [],
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
    const withIncidents = rooms.filter((r) => r.incidentCount > 0).length;
    const hotspots = rooms.filter((r) => r.incidentCount >= 4).length;
    const totalIncidents = rooms.reduce((sum, r) => sum + r.incidentCount, 0);
    return { total, withIncidents, hotspots, totalIncidents };
  }, [rooms]);

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

      {/* ─── Stats bar ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Total Rooms</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Rooms with Issues</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.withIncidents}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Hot Spots (4+)</p>
          <p className="text-2xl font-bold text-red-400">{stats.hotspots}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-night-400">Total Incidents</p>
          <p className="text-2xl font-bold text-brand-400">{stats.totalIncidents}</p>
        </div>
      </div>

      {/* ─── Legend + Controls ─── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-night-800 border border-night-700" /> Clean</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" /> 1</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40" /> 2-3</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/25 border border-orange-500/50" /> 4-5</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" /> 6+</span>
        </div>
        <button
          onClick={() => setHighlightHotspots(!highlightHotspots)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            highlightHotspots
              ? "bg-red-500/20 border border-red-500/40 text-red-400"
              : "bg-white/5 border border-white/10 text-night-400"
          }`}
        >
          {highlightHotspots ? "Showing Hot Spots" : "Highlight Hot Spots"}
        </button>
      </div>

      {/* ─── Room Grid ─── */}
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
                    const dimmed = highlightHotspots && room.incidentCount < 4;
                    return (
                      <button
                        key={room.code}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-7 h-7 rounded border text-[9px] font-mono flex items-center justify-center transition-all hover:scale-110 hover:z-10 ${
                          getRoomColor(room.incidentCount)
                        } ${getRoomTextColor(room.incidentCount)} ${
                          dimmed ? "opacity-20" : ""
                        } ${
                          selectedRoom?.code === room.code ? "ring-2 ring-brand-500 scale-110 z-10" : ""
                        }`}
                        title={`${room.code}: ${room.incidentCount} incidents`}
                      >
                        {room.incidentCount > 0 ? room.incidentCount : ""}
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="w-px bg-white/10 mx-1" />

                {/* High side rooms */}
                <div className="flex gap-0.5 flex-1">
                  {high.map((room) => {
                    const dimmed = highlightHotspots && room.incidentCount < 4;
                    return (
                      <button
                        key={room.code}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-7 h-7 rounded border text-[9px] font-mono flex items-center justify-center transition-all hover:scale-110 hover:z-10 ${
                          getRoomColor(room.incidentCount)
                        } ${getRoomTextColor(room.incidentCount)} ${
                          dimmed ? "opacity-20" : ""
                        } ${
                          selectedRoom?.code === room.code ? "ring-2 ring-brand-500 scale-110 z-10" : ""
                        }`}
                        title={`${room.code}: ${room.incidentCount} incidents`}
                      >
                        {room.incidentCount > 0 ? room.incidentCount : ""}
                      </button>
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
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{selectedRoom.code}</h2>
              <p className="text-sm text-night-400">
                Floor {selectedRoom.floor} · {selectedRoom.wing === "low" ? "Low Side (Marina)" : "High Side (Passage Peak)"} · Position {selectedRoom.position}
              </p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="text-night-500 hover:text-white text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-night-400">Total Incidents</p>
              <p className={`text-2xl font-bold ${getRoomTextColor(selectedRoom.incidentCount)}`}>
                {selectedRoom.incidentCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-night-400">Status</p>
              <p className="text-lg font-medium text-white">
                {selectedRoom.incidentCount >= 4 ? "🔴 Hot Spot" : selectedRoom.incidentCount > 0 ? "🟡 Active" : "🟢 Clean"}
              </p>
            </div>
            <div>
              <p className="text-xs text-night-400">Last Issue</p>
              <p className="text-sm text-night-200">{selectedRoom.lastIssue || "None"}</p>
            </div>
          </div>

          {selectedRoom.issues.length > 0 && (
            <div>
              <p className="text-xs text-night-400 mb-2">Recent Issues</p>
              <div className="space-y-1">
                {selectedRoom.issues.map((issue, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-night-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-night-500" />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
