"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";

interface CompensationRecord {
  id: string;
  incident_id: string;
  compensation_type: string;
  amount: number;
  currency: string;
  notes: string | null;
  given_at: string;
  guest_name: string | null;
  room_code: string | null;
  incident_title: string | null;
  incident_type: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  credit: "Room Credit",
  refund: "Refund",
  upgrade: "Room Upgrade",
  complimentary: "Complimentary",
  voucher: "Voucher",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "bg-blue-500/10 text-blue-400",
  refund: "bg-red-500/10 text-red-400",
  upgrade: "bg-purple-500/10 text-purple-400",
  complimentary: "bg-green-500/10 text-green-400",
  voucher: "bg-yellow-500/10 text-yellow-400",
  other: "bg-night-500/10 text-night-400",
};

// ─── Demo data shown before Supabase is connected ───
const DEMO_RECORDS: CompensationRecord[] = [
  { id: "d1", incident_id: "i1", compensation_type: "credit", amount: 150, currency: "AUD", notes: "Room credit for AC failure overnight", given_at: "2025-12-15T22:30:00Z", guest_name: "Mr. Thompson", room_code: "R0814", incident_title: "AC not cooling", incident_type: "Maintenance" },
  { id: "d2", incident_id: "i2", compensation_type: "refund", amount: 320, currency: "AUD", notes: "Partial refund — noise from renovation", given_at: "2025-12-14T09:15:00Z", guest_name: "Ms. Chen", room_code: "R1205", incident_title: "Construction noise", incident_type: "Noise" },
  { id: "d3", incident_id: "i3", compensation_type: "upgrade", amount: 0, currency: "AUD", notes: "Moved to ocean view suite", given_at: "2025-12-13T20:45:00Z", guest_name: "Mr. & Mrs. Patel", room_code: "R0503", incident_title: "Plumbing leak in bathroom", incident_type: "Maintenance" },
  { id: "d4", incident_id: "i4", compensation_type: "complimentary", amount: 85, currency: "AUD", notes: "Complimentary dinner at Bommie", given_at: "2025-12-12T18:00:00Z", guest_name: "Dr. Wilson", room_code: "R1907", incident_title: "Room not ready at check-in", incident_type: "Housekeeping" },
  { id: "d5", incident_id: "i5", compensation_type: "voucher", amount: 50, currency: "AUD", notes: "Spa voucher for delayed luggage", given_at: "2025-12-11T14:30:00Z", guest_name: "Ms. Garcia", room_code: "R0720", incident_title: "Luggage delivery delay", incident_type: "Transport" },
  { id: "d6", incident_id: "i6", compensation_type: "credit", amount: 200, currency: "AUD", notes: "Late-night room credit — pest issue", given_at: "2025-12-10T23:15:00Z", guest_name: "Mr. Lee", room_code: "R0408", incident_title: "Pest in room", incident_type: "Maintenance" },
  { id: "d7", incident_id: "i7", compensation_type: "refund", amount: 180, currency: "AUD", notes: "One night refund — WiFi outage during work trip", given_at: "2025-12-09T10:00:00Z", guest_name: "Ms. Brown", room_code: "R1102", incident_title: "No WiFi for 8 hours", incident_type: "IT" },
  { id: "d8", incident_id: "i8", compensation_type: "complimentary", amount: 120, currency: "AUD", notes: "Complimentary breakfast for family", given_at: "2025-12-08T07:30:00Z", guest_name: "The Martinez Family", room_code: "R0612", incident_title: "Lift out of service", incident_type: "Safety" },
  { id: "d9", incident_id: "i9", compensation_type: "credit", amount: 75, currency: "AUD", notes: "Mini-bar credit for TV not working", given_at: "2025-12-07T21:00:00Z", guest_name: "Mr. Jones", room_code: "R1518", incident_title: "TV blank screen", incident_type: "IT" },
  { id: "d10", incident_id: "i10", compensation_type: "voucher", amount: 100, currency: "AUD", notes: "Activity voucher — guest complaint about pool hours", given_at: "2025-12-06T16:45:00Z", guest_name: "Ms. Taylor", room_code: "R0315", incident_title: "Pool closed early", incident_type: "Guest dissatisfaction" },
];

export default function CompensationPage() {
  const supabase = useSupabase();
  const [records, setRecords] = useState<CompensationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Stats
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [byType, setByType] = useState<Record<string, { count: number; amount: number }>>({});

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      let query = supabase
        .from("compensations")
        .select(`
          id,
          incident_id,
          compensation_type,
          amount,
          currency,
          notes,
          given_at,
          guest_name,
          room_code,
          incident_title,
          incident_type
        `)
        .eq("organization_id", profile.organization_id)
        .order("given_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("compensation_type", filter);
      }
      if (dateRange.from) {
        query = query.gte("given_at", dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte("given_at", dateRange.to + "T23:59:59");
      }

      const { data, error } = await query;
      // Fall back to demo data if Supabase isn't connected or returns no data
      const items = (error || !data || data.length === 0)
        ? DEMO_RECORDS
        : (data as CompensationRecord[]);
      setRecords(items);

      // Calculate stats
      let total = 0;
      const types: Record<string, { count: number; amount: number }> = {};
      for (const r of items) {
        total += r.amount;
        if (!types[r.compensation_type]) {
          types[r.compensation_type] = { count: 0, amount: 0 };
        }
        types[r.compensation_type].count++;
        types[r.compensation_type].amount += r.amount;
      }
      setTotalAmount(total);
      setTotalCount(items.length);
      setByType(types);
    } catch (err) {
      console.error("Failed to fetch compensations — using demo data:", err);
      // Use demo data when Supabase is not available
      const items = DEMO_RECORDS;
      setRecords(items);
      let total = 0;
      const types: Record<string, { count: number; amount: number }> = {};
      for (const r of items) {
        total += r.amount;
        if (!types[r.compensation_type]) {
          types[r.compensation_type] = { count: 0, amount: 0 };
        }
        types[r.compensation_type].count++;
        types[r.compensation_type].amount += r.amount;
      }
      setTotalAmount(total);
      setTotalCount(items.length);
      setByType(types);
    }
    setLoading(false);
  }, [supabase, filter, dateRange]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Compensation Tracker</h1>
        <p className="text-night-400 mt-1">
          Track all compensation given to guests — credits, refunds, upgrades,
          and more. Linked to incidents automatically.
        </p>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Total Given</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Cases</p>
          <p className="text-2xl font-semibold text-white mt-1">{totalCount}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Average</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {totalCount > 0
              ? formatCurrency(totalAmount / totalCount)
              : "$0.00"}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-night-400">Most Common</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {Object.entries(byType).sort((a, b) => b[1].count - a[1].count)[0]
              ? TYPE_LABELS[
                  Object.entries(byType).sort(
                    (a, b) => b[1].count - a[1].count
                  )[0][0]
                ] || "—"
              : "—"}
          </p>
        </div>
      </div>

      {/* ─── Breakdown by type ─── */}
      {Object.keys(byType).length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-medium text-night-300 mb-3">By Type</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byType).map(([type, stats]) => (
              <div
                key={type}
                className={`px-3 py-2 rounded-lg ${
                  TYPE_COLORS[type] || TYPE_COLORS.other
                }`}
              >
                <span className="font-medium">{TYPE_LABELS[type] || type}</span>
                <span className="ml-2 opacity-75">
                  {stats.count}x = {formatCurrency(stats.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-night-500 mb-1">Type</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-night-500 mb-1">From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-night-500 mb-1">To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* ─── Records Table ─── */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-night-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-night-500">
            No compensation records yet. They&apos;ll show up here when you log
            incidents with compensation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-night-400 font-medium">Date</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Type</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Amount</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Room</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Incident</th>
                  <th className="px-4 py-3 text-night-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-night-200 whitespace-nowrap">
                      {formatDate(r.given_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          TYPE_COLORS[r.compensation_type] || TYPE_COLORS.other
                        }`}
                      >
                        {TYPE_LABELS[r.compensation_type] || r.compensation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-night-300 font-mono text-xs">
                      {r.room_code || "—"}
                    </td>
                    <td className="px-4 py-3 text-night-300 max-w-[200px] truncate">
                      {r.incident_title || r.incident_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-night-400 max-w-[200px] truncate">
                      {r.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
