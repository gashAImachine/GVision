import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  processImportRows,
  HAMILTON_ISLAND_MAPPING,
  type RawRow,
  type ColumnMapping,
} from "@/lib/data-import";
import type { ClassificationRule, SiteMapping } from "@/lib/classification-engine";

/**
 * POST /api/import
 *
 * Accepts JSON body with:
 * - rows: RawRow[] — parsed CSV/Excel rows (client parses the file)
 * - propertyId?: string — default property for unresolved rows
 * - columnMapping?: ColumnMapping — custom column mapping (defaults to Hamilton Island)
 * - autoClassify?: boolean — re-classify even if pre-classified
 *
 * Why client-side parsing?
 * - SheetJS/PapaParse run in the browser = no server file upload needed
 * - Keeps the API simple (just JSON in, records out)
 * - User can preview/map columns before submitting
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Only admin/manager can import
  if (!["admin", "manager"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    rows,
    propertyId,
    columnMapping,
    autoClassify = false,
    fileName = "import",
    fileType = "csv",
  } = body as {
    rows: RawRow[];
    propertyId?: string;
    columnMapping?: ColumnMapping;
    autoClassify?: boolean;
    fileName?: string;
    fileType?: string;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "No rows provided" },
      { status: 400 }
    );
  }

  // Fetch org's classification rules
  const { data: rules } = await supabase
    .from("classification_rules")
    .select("rule_type, target_value, keywords, priority")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true);

  // Fetch org's site mappings
  const { data: siteMappings } = await supabase
    .from("site_mappings")
    .select("property_id, match_type, pattern, priority")
    .eq("organization_id", profile.organization_id);

  // Fetch department map from incident types
  const { data: incidentTypes } = await supabase
    .from("incident_types")
    .select("name, department")
    .eq("organization_id", profile.organization_id);

  const departmentMap: Record<string, string> = {};
  if (incidentTypes) {
    for (const t of incidentTypes) {
      if (t.department) departmentMap[t.name] = t.department;
    }
  }

  // Create import batch record
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      organization_id: profile.organization_id,
      property_id: propertyId || null,
      uploaded_by: user.id,
      file_name: fileName,
      file_type: fileType,
      row_count: rows.length,
      status: "processing",
    })
    .select()
    .single();

  if (batchError) {
    return NextResponse.json(
      { error: "Failed to create import batch" },
      { status: 500 }
    );
  }

  // Process rows
  const result = processImportRows(
    rows,
    columnMapping || HAMILTON_ISLAND_MAPPING,
    (rules as ClassificationRule[]) || [],
    (siteMappings as SiteMapping[]) || [],
    departmentMap,
    {
      organizationId: profile.organization_id,
      defaultPropertyId: propertyId,
      autoClassify,
    }
  );

  // Insert incidents in batches of 500
  let insertErrors = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < result.incidents.length; i += BATCH_SIZE) {
    const chunk = result.incidents.slice(i, i + BATCH_SIZE).map((inc) => ({
      ...inc,
      organization_id: profile.organization_id,
      import_batch_id: batch.id,
    }));

    const { error: insertError } = await supabase
      .from("incidents")
      .insert(chunk);

    if (insertError) {
      insertErrors += chunk.length;
      result.errors.push({
        row: i + 2,
        field: "insert",
        error: insertError.message,
      });
    }
  }

  // Update batch status
  await supabase
    .from("import_batches")
    .update({
      status: result.errors.length > 0 ? "completed" : "completed",
      error_count: result.errors.length,
      errors: result.errors.slice(0, 100), // Cap stored errors at 100
      row_count: result.stats.successful,
    })
    .eq("id", batch.id);

  return NextResponse.json({
    batchId: batch.id,
    stats: {
      ...result.stats,
      insert_errors: insertErrors,
    },
    errors: result.errors.slice(0, 50), // Return first 50 errors to client
  });
}
