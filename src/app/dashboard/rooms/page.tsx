'use client';

import { useState, useEffect } from 'react';
import { loadIncidents, Incident, SEVERITY_BADGE, formatTime } from '@/lib/incidents-data';

type IncidentsByRoom = {
  [key: string]: Incident[];
};

const FLOOR_COUNT = 19;
const ROOMS_PER_FLOOR = {
  low: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  high: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
};
const ROOMS_17_19 = {
  low: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  high: [12, 13, 14, 15, 16, 17, 18],
};

function getFloorRooms(floor: number): string[] {
  if (floor >= 17) {
    return [
      ...ROOMS_17_19.low.map((n) => `R${String(floor).padStart(2, '0')}${String(n).padStart(2, '0')}`),
      ...ROOMS_17_19.high.map((n) => `R${String(floor).padStart(2, '0')}${String(n).padStart(2, '0')}`),
    ];
  }
  return [
    ...ROOMS_PER_FLOOR.low.map((n) => `R${String(floor).padStart(2, '0')}${String(n).padStart(2, '0')}`),
    ...ROOMS_PER_FLOOR.high.map((n) => `R${String(floor).padStart(2, '0')}${String(n).padStart(2, '0')}`),
  ];
}

function getIncidentColor(count: number): string {
  if (count === 0) return '#1e293b'; // dark gray
  if (count <= 2) return '#0d2b0d'; // muted green
  if (count <= 4) return '#2d1f00'; // amber
  return '#2d0a0a'; // red
}

export default function RoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsByRoom, setIncidentsByRoom] = useState<IncidentsByRoom>({});
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await loadIncidents();
      const rvhIncidents = data.filter((inc) => inc.site === 'Reef View Hotel');
      setIncidents(rvhIncidents);

      const byRoom: IncidentsByRoom = {};
      rvhIncidents.forEach((inc) => {
        if (!byRoom[inc.room_number]) {
          byRoom[inc.room_number] = [];
        }
        byRoom[inc.room_number].push(inc);
      });
      setIncidentsByRoom(byRoom);
      setLoading(false);
    };

    loadData();
  }, []);

  const floorRooms = getFloorRooms(selectedFloor);
  const selectedRoomData = selectedRoom ? incidentsByRoom[selectedRoom] || [] : [];

  const totalRooms = Array.from({ length: 19 }, (_, i) => i + 1).reduce(
    (sum, floor) => sum + getFloorRooms(floor).length,
    0
  );
  const roomsWithIncidents = Object.keys(incidentsByRoom).length;
  const topProblems = Object.entries(incidentsByRoom)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  if (loading) {
    return <div className="p-8 text-night-300">Loading incidents...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-night-50">Room Map - Reef View Hotel</h1>
        <p className="mt-2 text-night-400">Incident Distribution by Room</p>
      </div>

      {/* Legend */}
      <div className="rounded-lg bg-night-900/50 border border-night-700 p-6">
        <h3 className="mb-4 text-sm font-semibold text-night-300">Incident Count Legend</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded" style={{ backgroundColor: '#1e293b' }}></div>
            <span className="text-sm text-night-300">0 incidents</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded" style={{ backgroundColor: '#0d2b0d' }}></div>
            <span className="text-sm text-night-300">1-2 incidents</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded" style={{ backgroundColor: '#2d1f00' }}></div>
            <span className="text-sm text-night-300">3-4 incidents</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded" style={{ backgroundColor: '#2d0a0a' }}></div>
            <span className="text-sm text-night-300">5+ incidents</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Total Rooms</div>
          <div className="text-2xl font-bold text-night-50">{totalRooms}</div>
        </div>
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Rooms with Incidents</div>
          <div className="text-2xl font-bold text-night-50">{roomsWithIncidents}</div>
        </div>
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-4">
          <div className="text-sm text-night-400">Total Incidents</div>
          <div className="text-2xl font-bold text-night-50">{incidents.length}</div>
        </div>
      </div>

      {/* Top 5 Problem Rooms */}
      <div className="rounded-lg bg-night-900/50 border border-night-700 p-6">
        <h3 className="mb-4 text-sm font-semibold text-night-300">Top 5 Problem Rooms</h3>
        <div className="space-y-2">
          {topProblems.length > 0 ? (
            topProblems.map(([room, roomIncidents], idx) => (
              <div key={room} className="flex items-center justify-between text-sm">
                <span className="text-night-300">
                  {idx + 1}. {room}
                </span>
                <span className="font-semibold text-night-50">{roomIncidents.length} incidents</span>
              </div>
            ))
          ) : (
            <p className="text-night-400">No incidents recorded</p>
          )}
        </div>
      </div>

      {/* Floor Selector */}
      <div className="rounded-lg bg-night-900/50 border border-night-700 p-6">
        <h3 className="mb-4 text-sm font-semibold text-night-300">Select Floor</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: FLOOR_COUNT }, (_, i) => i + 1).map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                selectedFloor === floor
                  ? 'bg-brand-500 text-night-900'
                  : 'bg-night-800 text-night-300 hover:bg-night-700'
              }`}
            >
              L{String(floor).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      <div className="rounded-lg bg-night-900/50 border border-night-700 p-6">
        <h3 className="mb-6 text-sm font-semibold text-night-300">
          Floor L{String(selectedFloor).padStart(2, '0')} - {floorRooms.length} rooms
        </h3>
        <div className="grid auto-fit gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))' }}>
          {floorRooms.map((room) => {
            const roomIncidents = incidentsByRoom[room] || [];
            const color = getIncidentColor(roomIncidents.length);
            const isSelected = selectedRoom === room;

            return (
              <button
                key={room}
                onClick={() => setSelectedRoom(isSelected ? null : room)}
                className={`aspect-square rounded font-mono text-sm font-bold transition-all border-2 ${
                  isSelected ? 'border-brand-500 ring-2 ring-brand-500/50' : 'border-transparent'
                }`}
                style={{
                  backgroundColor: color,
                  color: roomIncidents.length > 0 ? '#fff' : '#94a3b8',
                }}
                title={`${room}: ${roomIncidents.length} incidents`}
              >
                {room.slice(3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRoom && (
        <div className="rounded-lg bg-night-900/50 border border-night-700 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-night-50">{selectedRoom}</h3>
              <p className="text-sm text-night-400">
                {selectedRoomData.length} incident{selectedRoomData.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="text-night-400 hover:text-night-50 transition-colors"
            >
              â
            </button>
          </div>

          {selectedRoomData.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedRoomData.map((inc, idx) => (
                <div key={idx} className="border-l-2 border-brand-500 bg-night-800/50 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-night-400">
                      {inc.date} at {formatTime(inc.time)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERITY_BADGE[inc.severity as keyof typeof SEVERITY_BADGE]}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-night-300 mb-2">
                    <span className="font-semibold text-night-50">{inc.incident_type}</span>
                  </p>
                  <p className="text.xs text-night-400">{inc.issue_summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-night-400">No incidents for this room</p>
          )}
        </div>
      )}
    </div>
  );
}
