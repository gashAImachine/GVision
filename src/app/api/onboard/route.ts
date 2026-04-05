import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/onboard
 *
 * Sets up a new hotel organization with:
 * 1. Organization record
 * 2. Properties (sites/venues)
 * 3. Default incident types (can be customized later)
 * 4. Default classification rules (can be customized later)
 * 5. Links the creating user as admin
 *
 * This is the "new customer" flow. After this, they:
 * - Upload room layout via /api/properties/rooms
 * - Import historical data via /api/import
 * - Start logging incidents
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    organizationName,
    properties,
    timezone = "Australia/Sydney",
    plan = "starter",
    copyRulesFrom, // optional: org ID to copy classification rules from
  } = body as {
    organizationName: string;
    properties: Array<{
      name: string;
      type: "accommodation" | "restaurant" | "bar" | "facility" | "staff";
      codePrefix?: string;
      roomCount?: number;
    }>;
    timezone?: string;
    plan?: "starter" | "professional" | "enterprise";
    copyRulesFrom?: string;
  };

  if (!organizationName || !properties || properties.length === 0) {
    return NextResponse.json(
      { error: "Organization name and at least one property required" },
      { status: 400 }
    );
  }

  // 1. Create organization
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: organizationName, slug, plan })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json(
      { error: `Failed to create org: ${orgError.message}` },
      { status: 500 }
    );
  }

  // 2. Link user as admin
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    organization_id: org.id,
    email: user.email || "",
    role: "admin",
  });

  if (profileError) {
    // Cleanup org if profile fails
    await supabase.from("organizations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: `Failed to create profile: ${profileError.message}` },
      { status: 500 }
    );
  }

  // 3. Create properties
  const propertyRecords = properties.map((p) => ({
    organization_id: org.id,
    name: p.name,
    slug: p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    property_type: p.type,
    code_prefix: p.codePrefix || null,
    timezone,
    room_count: p.roomCount || null,
    has_room_map: false,
  }));

  const { data: createdProperties, error: propError } = await supabase
    .from("properties")
    .insert(propertyRecords)
    .select();

  if (propError) {
    return NextResponse.json(
      { error: `Failed to create properties: ${propError.message}` },
      { status: 500 }
    );
  }

  // 4. Set up default incident types
  const defaultTypes = [
    { name: "Maintenance", department: "Maintenance", color: "#f97316", icon: "wrench", sort_order: 1 },
    { name: "Housekeeping", department: "Housekeeping", color: "#8b5cf6", icon: "sparkles", sort_order: 2 },
    { name: "IT", department: "IT", color: "#3b82f6", icon: "wifi", sort_order: 3 },
    { name: "Safety", department: "Security", color: "#ef4444", icon: "shield-alert", sort_order: 4 },
    { name: "Noise", department: "Security", color: "#eab308", icon: "volume-x", sort_order: 5 },
    { name: "Guest Complaint", department: "Front Office", color: "#ec4899", icon: "frown", sort_order: 6 },
    { name: "Other", department: "Front Office", color: "#6b7280", icon: "circle-help", sort_order: 7 },
  ];

  await supabase.from("incident_types").insert(
    defaultTypes.map((t) => ({ ...t, organization_id: org.id }))
  );

  // 5. Copy or create classification rules
  if (copyRulesFrom) {
    // Copy rules from another org (e.g., Hamilton Island as template)
    const { data: sourceRules } = await supabase
      .from("classification_rules")
      .select("rule_type, target_value, keywords, priority, is_active")
      .eq("organization_id", copyRulesFrom);

    if (sourceRules && sourceRules.length > 0) {
      await supabase.from("classification_rules").insert(
        sourceRules.map((r) => ({ ...r, organization_id: org.id }))
      );
    }
  } else {
    // Insert basic default rules
    const defaultRules = [
      { rule_type: "severity", target_value: "high", keywords: ["fire", "ambulance", "medical", "injury", "flood", "evacuation"], priority: 100 },
      { rule_type: "severity", target_value: "medium", keywords: ["leak", "not working", "escalated", "complaint"], priority: 50 },
    ];

    await supabase.from("classification_rules").insert(
      defaultRules.map((r) => ({ ...r, organization_id: org.id }))
    );
  }

  // 6. Create site mappings for properties with code prefixes
  const siteMappings = createdProperties
    ?.filter((p) => p.code_prefix)
    .map((p) => ({
      organization_id: org.id,
      property_id: p.id,
      match_type: "prefix" as const,
      pattern: p.code_prefix!,
      priority: 100,
    }));

  if (siteMappings && siteMappings.length > 0) {
    await supabase.from("site_mappings").insert(siteMappings);
  }

  // Also add text-based site mappings
  const textMappings = createdProperties?.map((p) => ({
    organization_id: org.id,
    property_id: p.id,
    match_type: "text" as const,
    pattern: p.name,
    priority: 90,
  }));

  if (textMappings && textMappings.length > 0) {
    await supabase.from("site_mappings").insert(textMappings);
  }

  return NextResponse.json({
    organization: org,
    properties: createdProperties,
    message: "Organization created. Next steps: upload room layouts and import incident data.",
    next_steps: {
      upload_rooms: "/api/properties/rooms",
      import_data: "/api/import",
    },
  });
}
