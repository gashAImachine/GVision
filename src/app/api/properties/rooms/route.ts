import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/properties/rooms
 *
 * Bulk upload rooms for a property.
 * Accepts either:
 * - A room layout config (generates rooms automatically from a grid pattern)
 * - A list of room objects (for non-grid layouts)
 *
 * This is the key endpoint for onboarding a new hotel's room map.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { propertyId, mode, rooms, layoutConfig } = body as {
    propertyId: string;
    mode: "list" | "grid";
    rooms?: Array<{
      room_code: string;
      floor?: number;
      position?: number;
      wing?: "low" | "high";
      building?: string;
      room_type?: string;
      capacity?: number;
      metadata?: Record<string, unknown>;
    }>;
    layoutConfig?: {
      name?: string;
      floors: number;
      has_wings: boolean;
      wings?: {
        low?: { label: string; default_range: [number, number] };
        high?: { label: string; default_range: [number, number] };
      };
      floor_overrides?: Record<
        string,
        { low?: [number, number]; high?: [number, number] }
      >;
      excluded_floors?: number[];
      room_code_format: string; // e.g., "R{floor:02d}{position:02d}"
    };
  };

  // Verify property belongs to user's org
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  let roomRecords: Array<{
    property_id: string;
    room_code: string;
    floor: number | null;
    position: number | null;
    wing: "low" | "high" | null;
    building: string | null;
    room_type: string;
    capacity: number | null;
    metadata: Record<string, unknown>;
  }> = [];

  if (mode === "grid" && layoutConfig) {
    // Generate rooms from grid layout config
    roomRecords = generateGridRooms(propertyId, layoutConfig);

    // Save the layout config
    await supabase.from("room_layouts").upsert(
      {
        property_id: propertyId,
        name: layoutConfig.name || "Default",
        layout_type: "grid",
        config: layoutConfig,
        is_active: true,
      },
      { onConflict: "property_id,name" }
    );

    // Mark property as having a room map
    await supabase
      .from("properties")
      .update({ has_room_map: true, room_count: roomRecords.length })
      .eq("id", propertyId);
  } else if (mode === "list" && rooms) {
    // Direct room list upload (e.g., from CSV)
    roomRecords = rooms.map((r) => ({
      property_id: propertyId,
      room_code: r.room_code,
      floor: r.floor || null,
      position: r.position || null,
      wing: r.wing || null,
      building: r.building || null,
      room_type: r.room_type || "guest",
      capacity: r.capacity || null,
      metadata: r.metadata || {},
    }));

    await supabase
      .from("properties")
      .update({ has_room_map: true, room_count: roomRecords.length })
      .eq("id", propertyId);
  } else {
    return NextResponse.json(
      { error: "Provide either mode='grid' with layoutConfig or mode='list' with rooms" },
      { status: 400 }
    );
  }

  // Delete existing rooms for this property (full replace)
  await supabase.from("rooms").delete().eq("property_id", propertyId);

  // Insert in batches
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors: string[] = [];

  for (let i = 0; i < roomRecords.length; i += BATCH_SIZE) {
    const chunk = roomRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("rooms").insert(chunk);
    if (error) {
      errors.push(error.message);
    } else {
      inserted += chunk.length;
    }
  }

  return NextResponse.json({
    inserted,
    total: roomRecords.length,
    errors,
  });
}

/**
 * Generate room records from a grid layout config.
 * Handles wing splits, floor overrides, and custom room code formats.
 */
function generateGridRooms(
  propertyId: string,
  config: {
    floors: number;
    has_wings: boolean;
    wings?: {
      low?: { label: string; default_range: [number, number] };
      high?: { label: string; default_range: [number, number] };
    };
    floor_overrides?: Record<
      string,
      { low?: [number, number]; high?: [number, number] }
    >;
    excluded_floors?: number[];
    room_code_format: string;
  }
) {
  const rooms: Array<{
    property_id: string;
    room_code: string;
    floor: number | null;
    position: number | null;
    wing: "low" | "high" | null;
    building: string | null;
    room_type: string;
    capacity: number | null;
    metadata: Record<string, unknown>;
  }> = [];

  const excluded = new Set(config.excluded_floors || []);

  for (let floor = 1; floor <= config.floors; floor++) {
    if (excluded.has(floor)) continue;

    const floorStr = floor.toString();
    const override = config.floor_overrides?.[floorStr];

    if (config.has_wings && config.wings) {
      // Generate rooms for each wing
      for (const [wingKey, wingConfig] of Object.entries(config.wings)) {
        if (!wingConfig) continue;
        const wing = wingKey as "low" | "high";

        // Use override range if available, otherwise default
        const overrideRange = override?.[wing];
        const range = overrideRange || wingConfig.default_range;
        const [start, end] = range;

        for (let pos = start; pos <= end; pos++) {
          const code = formatRoomCode(config.room_code_format, floor, pos);
          rooms.push({
            property_id: propertyId,
            room_code: code,
            floor,
            position: pos,
            wing,
            building: null,
            room_type: "guest",
            capacity: null,
            metadata: {},
          });
        }
      }
    } else {
      // No wings — just positions 1..N per floor
      const defaultEnd = config.wings?.low?.default_range[1] || 10;
      for (let pos = 1; pos <= defaultEnd; pos++) {
        const code = formatRoomCode(config.room_code_format, floor, pos);
        rooms.push({
          property_id: propertyId,
          room_code: code,
          floor,
          position: pos,
          wing: null,
          building: null,
          room_type: "guest",
          capacity: null,
          metadata: {},
        });
      }
    }
  }

  return rooms;
}

/**
 * Format a room code using a template like "R{floor:02d}{position:02d}"
 */
function formatRoomCode(format: string, floor: number, position: number): string {
  return format
    .replace(
      /\{floor:0?(\d+)d\}/,
      (_, width) => floor.toString().padStart(parseInt(width), "0")
    )
    .replace(
      /\{position:0?(\d+)d\}/,
      (_, width) => position.toString().padStart(parseInt(width), "0")
    );
}
