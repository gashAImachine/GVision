import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/compensation — list compensation records
 * POST /api/compensation — add a new compensation record
 */

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const type = searchParams.get("type");

  let query = supabase
    .from("compensations")
    .select("*", { count: "exact" })
    .eq("organization_id", profile.organization_id)
    .order("given_at", { ascending: false })
    .limit(limit);

  if (type && type !== "all") {
    query = query.eq("compensation_type", type);
  }

  const { data: rawData, error, count } = await query;
  const data = (rawData ?? []) as any[];

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate totals
  let totalAmount = 0;
  const byType: Record<string, { count: number; amount: number }> = {};
  for (const r of data) {
    totalAmount += r.amount || 0;
    const t = r.compensation_type;
    if (!byType[t]) byType[t] = { count: 0, amount: 0 };
    byType[t].count++;
    byType[t].amount += r.amount || 0;
  }

  return NextResponse.json({
    data,
    count,
    summary: { totalAmount, totalCount: count, byType },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("compensations")
    .insert({
      organization_id: profile.organization_id,
      property_id: body.property_id,
      incident_id: body.incident_id || null,
      compensation_type: body.compensation_type || "credit",
      amount: body.amount || 0,
      currency: body.currency || "AUD",
      guest_name: body.guest_name || null,
      room_code: body.room_code || null,
      incident_title: body.incident_title || null,
      incident_type: body.incident_type || null,
      notes: body.notes || null,
      approved_by: user.id,
      given_at: body.given_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
