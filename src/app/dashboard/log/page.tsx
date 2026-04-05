"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/use-supabase";

// ─── Types matching Hamilton Island categories ───
const INCIDENT_TYPES = [
  { value: "Maintenance", label: "Maintenance", icon: "🔧" },
  { value: "Housekeeping", label: "Housekeeping", icon: "✨" },
  { value: "IT", label: "IT / WiFi / TV", icon: "📶" },
  { value: "Safety", label: "Safety", icon: "🛡️" },
  { value: "Alarm", label: "Alarm", icon: "🔔" },
  { value: "Noise", label: "Noise", icon: "🔇" },
  { value: "Guest Behaviour", label: "Guest Behaviour", icon: "👤" },
  { value: "Transport", label: "Transport", icon: "🚗" },
  { value: "Guest dissatisfaction", label: "Guest Complaint", icon: "😟" },
  { value: "Other", label: "Other", icon: "📋" },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "high", label: "High", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const DEPARTMENTS = [
  "Maintenance", "Housekeeping", "IT", "Security", "Front Office", "Transport",
];

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function LogIncidentPage() {
  const supabase = useSupabase();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ─── Form fields ───
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("low");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [site, setSite] = useState("");
  const [department, setDepartment] = useState("");
  const [isEscalated, setIsEscalated] = useState(false);
  const [escalatedTo, setEscalatedTo] = useState("");

  // ─── Guest info ───
  const [guestName, setGuestName] = useState("");

  // ─── Compensation fields (optional, right on the form) ───
  const [hasCompensation, setHasCompensation] = useState(false);
  const [compType, setCompType] = useState("credit");
  const [compAmount, setCompAmount] = useState("");
  const [compNotes, setCompNotes] = useState("");

  // Auto-fill date and time
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");

  useEffect(() => {
    const now = new Date();
    setIncidentDate(now.toISOString().split("T")[0]);
    setIncidentTime(
      now.getHours().toString().padStart(2, "0") +
        now.getMinutes().toString().padStart(2, "0")
    );
  }, []);

  const resetForm = () => {
    setIncidentType("");
    setSeverity("low");
    setTitle("");
    setDescription("");
    setRoomCode("");
    setSite("");
    setDepartment("");
    setIsEscalated(false);
    setEscalatedTo("");
    setGuestName("");
    setHasCompensation(false);
    setCompType("credit");
    setCompAmount("");
    setCompNotes("");
    const now = new Date();
    setIncidentDate(now.toISOString().split("T")[0]);
    setIncidentTime(
      now.getHours().toString().padStart(2, "0") +
        now.getMinutes().toString().padStart(2, "0")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    if (!incidentType || !title) {
      setErrorMsg("Please select an incident type and add a short summary.");
      setStatus("error");
      return;
    }

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("You need to be signed in.");
        setStatus("error");
        return;
      }

      // Get user's org and default property
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setErrorMsg("Profile not found. Contact your admin.");
        setStatus("error");
        return;
      }

      // Find property by room code prefix or use first property
      let propertyId: string | null = null;
      if (roomCode) {
        const prefix = roomCode.charAt(0).toUpperCase();
        const { data: mapping } = await supabase
          .from("site_mappings")
          .select("property_id")
          .eq("organization_id", profile.organization_id)
          .eq("match_type", "prefix")
          .eq("pattern", prefix)
          .single();
        if (mapping) propertyId = mapping.property_id;
      }

      if (!propertyId) {
        const { data: firstProp } = await supabase
          .from("properties")
          .select("id")
          .eq("organization_id", profile.organization_id)
          .limit(1)
          .single();
        propertyId = firstProp?.id || null;
      }

      // Insert incident
      const { data: incident, error: incErr } = await supabase
        .from("incidents")
        .insert({
          organization_id: profile.organization_id,
          property_id: propertyId!,
          reported_by: user.id,
          incident_date: incidentDate,
          incident_time: incidentTime,
          incident_type: incidentType,
          title: title,
          description: description || null,
          room_code: roomCode.toUpperCase() || null,
          site: site || null,
          severity: severity as "low" | "medium" | "high",
          primary_impact: "guest" as const,
          primary_department: department || null,
          is_escalated: isEscalated,
          escalated_to: isEscalated ? escalatedTo || null : null,
          controllable_by_rdm: "yes" as const,
          root_cause: null,
          source: "manual",
          status: "open" as const,
          reported_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (incErr) throw incErr;

      // Insert compensation if provided
      if (hasCompensation && compAmount && incident) {
        const { error: compErr } = await supabase
          .from("compensations")
          .insert({
            organization_id: profile.organization_id,
            incident_id: incident.id,
            property_id: propertyId!,
            compensation_type: compType,
            amount: parseFloat(compAmount) || 0,
            currency: "AUD",
            guest_name: guestName || null,
            room_code: roomCode.toUpperCase() || null,
            notes: compNotes || null,
            approved_by: user.id,
            given_at: new Date().toISOString(),
          });

        if (compErr) {
          console.error("Compensation save failed:", compErr);
          // Don't block — incident was saved successfully
        }
      }

      setStatus("success");
      setTimeout(() => {
        resetForm();
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Log Incident</h1>
        <p className="text-night-400 mt-1">
          Record what happened. This goes straight into the dashboard.
        </p>
      </div>

      {/* Success message */}
      {status === "success" && (
        <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
          <p className="text-green-400 font-medium text-lg">Incident logged!</p>
          <p className="text-green-400/70 text-sm mt-1">Preparing next entry...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Incident Type (big tap targets for mobile) ─── */}
        <div className="glass rounded-xl p-5">
          <label className="block text-sm font-medium text-night-300 mb-3">
            What happened? *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INCIDENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setIncidentType(type.value)}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                  incidentType === type.value
                    ? "bg-brand-600/20 border-brand-500 text-brand-300"
                    : "bg-white/5 border-white/10 text-night-300 hover:border-white/20"
                }`}
              >
                <span className="text-lg">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Quick Details ─── */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-1.5">
              Short summary *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AC not cooling, Noise complaint Floor 8"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-night-300 mb-1.5">
                Room / Unit
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="e.g., R0820"
                className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-night-300 mb-1.5">
                Site / Venue
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g., Reef View Hotel"
                className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-night-300 mb-1.5">
              Guest name (optional)
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g., Mr. Smith, Room 820"
              className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-night-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-night-300 mb-1.5">
                Time (24hr)
              </label>
              <input
                type="text"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2330"
                maxLength={4}
                className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-night-300 mb-1.5">
              Full details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, what you did, any follow-up needed..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* ─── Severity ─── */}
        <div className="glass rounded-xl p-5">
          <label className="block text-sm font-medium text-night-300 mb-3">
            Severity
          </label>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSeverity(opt.value)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  severity === opt.value
                    ? opt.color
                    : "bg-white/5 border-white/10 text-night-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Department & Escalation ─── */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-night-300 mb-1.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Auto-detect</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="escalated"
              checked={isEscalated}
              onChange={(e) => setIsEscalated(e.target.checked)}
              className="rounded bg-night-900 border-white/20 w-4 h-4"
            />
            <label htmlFor="escalated" className="text-sm text-night-300">
              Escalated to someone?
            </label>
          </div>

          {isEscalated && (
            <input
              type="text"
              value={escalatedTo}
              onChange={(e) => setEscalatedTo(e.target.value)}
              placeholder="e.g., AH Maintenance, GM, Security"
              className="w-full px-3 py-2.5 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>

        {/* ─── Compensation (expandable) ─── */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has-comp"
              checked={hasCompensation}
              onChange={(e) => setHasCompensation(e.target.checked)}
              className="rounded bg-night-900 border-white/20 w-4 h-4"
            />
            <label htmlFor="has-comp" className="text-sm font-medium text-night-300">
              Compensation given?
            </label>
          </div>

          {hasCompensation && (
            <div className="space-y-3 pl-7">
              <div>
                <label className="block text-sm text-night-400 mb-1">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "credit", label: "Room Credit" },
                    { value: "refund", label: "Refund" },
                    { value: "upgrade", label: "Room Upgrade" },
                    { value: "complimentary", label: "Complimentary" },
                    { value: "voucher", label: "Voucher" },
                    { value: "other", label: "Other" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCompType(opt.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        compType === opt.value
                          ? "bg-brand-600/20 border-brand-500 text-brand-300"
                          : "bg-white/5 border-white/10 text-night-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-night-400 mb-1">
                    Amount (AUD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compAmount}
                    onChange={(e) => setCompAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-night-400 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={compNotes}
                    onChange={(e) => setCompNotes(e.target.value)}
                    placeholder="e.g., Late dinner voucher"
                    className="w-full px-3 py-2 rounded-lg bg-night-900 border border-white/10 text-white placeholder:text-night-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Error ─── */}
        {status === "error" && errorMsg && (
          <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        {/* ─── Submit ─── */}
        <button
          type="submit"
          disabled={status === "submitting" || status === "success"}
          className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-base transition-colors glow-brand"
        >
          {status === "submitting"
            ? "Saving..."
            : status === "success"
            ? "Logged!"
            : "Log Incident"}
        </button>
      </form>
    </div>
  );
}
