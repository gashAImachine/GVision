"use client";

import { useState, useCallback } from "react";

interface RoomLayoutConfig {
  name: string;
  floors: number;
  has_wings: boolean;
  wings: {
    low: { label: string; default_range: [number, number] };
    high: { label: string; default_range: [number, number] };
  };
  floor_overrides: Record<string, { low?: [number, number]; high?: [number, number] }>;
  excluded_floors: number[];
  room_code_format: string;
}

export default function RoomSettingsPage() {
  const [mode, setMode] = useState<"grid" | "csv">("grid");
  const [propertyId, setPropertyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Grid config state
  const [config, setConfig] = useState<RoomLayoutConfig>({
    name: "Main Building",
    floors: 10,
    has_wings: false,
    wings: {
      low: { label: "West Wing", default_range: [1, 10] },
      high: { label: "East Wing", default_range: [11, 20] },
    },
    floor_overrides: {},
    excluded_floors: [],
    room_code_format: "{floor:02d}{position:02d}",
  });

  // CSV upload state
  const [csvRooms, setCsvRooms] = useState<
    Array<{ room_code: string; floor?: number; building?: string }>
  >([]);

  const handleCSVUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      file.text().then((text) => {
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) return;

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const codeIdx = headers.findIndex(
          (h) => h.includes("room") || h.includes("code") || h === "id"
        );
        const floorIdx = headers.findIndex((h) => h.includes("floor"));
        const buildingIdx = headers.findIndex((h) => h.includes("building"));

        if (codeIdx === -1) {
          setMessage("CSV must have a column with 'room' or 'code' in the header.");
          return;
        }

        const rooms = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim());
          return {
            room_code: cols[codeIdx] || "",
            floor: floorIdx >= 0 ? parseInt(cols[floorIdx]) || undefined : undefined,
            building: buildingIdx >= 0 ? cols[buildingIdx] || undefined : undefined,
          };
        }).filter((r) => r.room_code);

        setCsvRooms(rooms);
        setMessage(`Parsed ${rooms.length} rooms from CSV.`);
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!propertyId) {
      setMessage("Please select a property first.");
      return;
    }

    setLoading(true);
    setMessage("Uploading room layout...");

    try {
      const body =
        mode === "grid"
          ? { propertyId, mode: "grid", layoutConfig: config }
          : {
              propertyId,
              mode: "list",
              rooms: csvRooms.map((r) => ({
                room_code: r.room_code,
                floor: r.floor,
                building: r.building,
                room_type: "guest",
              })),
            };

      const response = await fetch("/api/properties/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(
          `Room layout saved. ${result.inserted} rooms created for this property.`
        );
      }
    } catch (err) {
      setMessage(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }

    setLoading(false);
  }, [propertyId, mode, config, csvRooms]);

  const previewRoomCount = () => {
    if (!config.has_wings) {
      const perFloor = config.wings.low.default_range[1] - config.wings.low.default_range[0] + 1;
      return (config.floors - config.excluded_floors.length) * perFloor;
    }
    // Simplified estimate (ignores overrides)
    const lowPerFloor = config.wings.low.default_range[1] - config.wings.low.default_range[0] + 1;
    const highPerFloor = config.wings.high.default_range[1] - config.wings.high.default_range[0] + 1;
    return (config.floors - config.excluded_floors.length) * (lowPerFloor + highPerFloor);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Room Layout</h1>
        <p className="text-night-400 mt-1">
          Configure your property&apos;s room layout for the room intelligence
          map. You can define rooms using a grid pattern or upload a CSV list.
        </p>
      </div>

      {/* Property selector placeholder */}
      <div className="glass rounded-xl p-6">
        <label className="block text-sm font-medium text-night-300 mb-2">
          Property
        </label>
        <input
          type="text"
          placeholder="Property ID (from Settings → Properties)"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("grid")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "grid"
              ? "bg-brand-600 text-white"
              : "bg-white/5 text-night-400 hover:text-white"
          }`}
        >
          Grid Layout
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "csv"
              ? "bg-brand-600 text-white"
              : "bg-white/5 text-night-400 hover:text-white"
          }`}
        >
          Upload Room List
        </button>
      </div>

      {mode === "grid" ? (
        <div className="glass rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-medium text-white">Grid Configuration</h2>
          <p className="text-sm text-night-400">
            Define rooms by floor and position. Works great for tower/wing
            layouts like the Reef View Hotel.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-night-300 mb-1">
                Building Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) =>
                  setConfig({ ...config, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-night-300 mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.floors}
                onChange={(e) =>
                  setConfig({ ...config, floors: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-night-300 mb-1">
              Room Code Format
            </label>
            <input
              type="text"
              value={config.room_code_format}
              onChange={(e) =>
                setConfig({ ...config, room_code_format: e.target.value })
              }
              placeholder="R{floor:02d}{position:02d}"
              className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-night-500 mt-1">
              Use {"{floor:02d}"} for zero-padded floor and {"{position:02d}"} for
              position. Example: R0102 = Floor 1, Room 2
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_wings"
              checked={config.has_wings}
              onChange={(e) =>
                setConfig({ ...config, has_wings: e.target.checked })
              }
              className="rounded bg-night-900 border-white/20"
            />
            <label htmlFor="has_wings" className="text-sm text-night-300">
              This building has two wings/sides
            </label>
          </div>

          {config.has_wings ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm text-night-300">
                  Low Side / West Wing
                </label>
                <input
                  type="text"
                  value={config.wings.low.label}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      wings: {
                        ...config.wings,
                        low: { ...config.wings.low, label: e.target.value },
                      },
                    })
                  }
                  placeholder="Wing label"
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={config.wings.low.default_range[0]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        wings: {
                          ...config.wings,
                          low: {
                            ...config.wings.low,
                            default_range: [
                              parseInt(e.target.value) || 1,
                              config.wings.low.default_range[1],
                            ],
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Start pos"
                  />
                  <input
                    type="number"
                    min={1}
                    value={config.wings.low.default_range[1]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        wings: {
                          ...config.wings,
                          low: {
                            ...config.wings.low,
                            default_range: [
                              config.wings.low.default_range[0],
                              parseInt(e.target.value) || 1,
                            ],
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="End pos"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-night-300">
                  High Side / East Wing
                </label>
                <input
                  type="text"
                  value={config.wings.high.label}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      wings: {
                        ...config.wings,
                        high: { ...config.wings.high, label: e.target.value },
                      },
                    })
                  }
                  placeholder="Wing label"
                  className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={config.wings.high.default_range[0]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        wings: {
                          ...config.wings,
                          high: {
                            ...config.wings.high,
                            default_range: [
                              parseInt(e.target.value) || 1,
                              config.wings.high.default_range[1],
                            ],
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Start pos"
                  />
                  <input
                    type="number"
                    min={1}
                    value={config.wings.high.default_range[1]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        wings: {
                          ...config.wings,
                          high: {
                            ...config.wings.high,
                            default_range: [
                              config.wings.high.default_range[0],
                              parseInt(e.target.value) || 1,
                            ],
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="End pos"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-night-300 mb-1">
                Rooms per Floor
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-night-500 text-sm">Position</span>
                <input
                  type="number"
                  min={1}
                  value={config.wings.low.default_range[0]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      wings: {
                        ...config.wings,
                        low: {
                          ...config.wings.low,
                          default_range: [
                            parseInt(e.target.value) || 1,
                            config.wings.low.default_range[1],
                          ],
                        },
                      },
                    })
                  }
                  className="w-20 px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-night-500 text-sm">to</span>
                <input
                  type="number"
                  min={1}
                  value={config.wings.low.default_range[1]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      wings: {
                        ...config.wings,
                        low: {
                          ...config.wings.low,
                          default_range: [
                            config.wings.low.default_range[0],
                            parseInt(e.target.value) || 1,
                          ],
                        },
                      },
                    })
                  }
                  className="w-20 px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-white/10">
            <p className="text-sm text-night-400">
              Estimated rooms:{" "}
              <span className="text-white font-medium">
                {previewRoomCount()}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium text-white">Upload Room List</h2>
          <p className="text-sm text-night-400">
            Upload a CSV with your room codes. Minimum column: room_code (or
            room, code, id). Optional: floor, building.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="text-sm text-night-400"
          />

          {csvRooms.length > 0 && (
            <div>
              <p className="text-sm text-night-300">
                {csvRooms.length} rooms parsed
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto text-xs font-mono text-night-400">
                {csvRooms.slice(0, 20).map((r, i) => (
                  <div key={i}>
                    {r.room_code}
                    {r.floor ? ` (Floor ${r.floor})` : ""}
                    {r.building ? ` — ${r.building}` : ""}
                  </div>
                ))}
                {csvRooms.length > 20 && (
                  <div className="text-night-500">
                    ...and {csvRooms.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {message && (
        <div className="rounded-lg px-4 py-3 text-sm bg-brand-500/10 text-brand-400 border border-brand-500/20">
          {message}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !propertyId}
        className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium transition-colors"
      >
        {loading ? "Saving..." : "Save Room Layout"}
      </button>
    </div>
  );
}
