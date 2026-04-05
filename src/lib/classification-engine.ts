/**
 * Classification Engine
 * ====================
 * Matches incident text against keyword rules stored in Supabase.
 * Each org has their own rules — no hardcoded categories.
 *
 * Used during:
 * - CSV/Excel bulk import
 * - Manual incident creation (auto-suggest)
 * - DOCX extraction (future)
 */

export interface ClassificationRule {
  rule_type: string;
  target_value: string;
  keywords: string[];
  priority: number;
}

export interface ClassificationResult {
  incident_type: string | null;
  severity: "low" | "medium" | "high";
  root_cause: string | null;
  primary_impact: "safety" | "operations" | "guest";
  primary_department: string | null;
}

/**
 * Classify an incident based on its text content and org-specific rules.
 * Rules are fetched once from Supabase and passed in (not fetched per-call).
 */
export function classifyIncident(
  text: string,
  rules: ClassificationRule[],
  departmentMap?: Record<string, string>
): ClassificationResult {
  const lower = text.toLowerCase();

  const result: ClassificationResult = {
    incident_type: null,
    severity: "low",
    root_cause: null,
    primary_impact: "guest",
    primary_department: null,
  };

  // Group rules by type, sorted by priority desc
  const rulesByType = groupAndSort(rules);

  // 1. Incident Type (first match wins)
  result.incident_type = matchFirst(lower, rulesByType["incident_type"]) || "Other";

  // 2. Severity (first match wins, default 'low')
  const severityMatch = matchFirst(lower, rulesByType["severity"]);
  if (severityMatch === "high" || severityMatch === "medium") {
    result.severity = severityMatch;
  }

  // 3. Root Cause
  result.root_cause = matchFirst(lower, rulesByType["root_cause"]) || inferRootCause(result.incident_type);

  // 4. Primary Impact
  result.primary_impact = inferImpact(result.incident_type, lower);

  // 5. Department (from incident_types table or departmentMap)
  if (departmentMap && result.incident_type) {
    result.primary_department = departmentMap[result.incident_type] || "Front Office";
  }

  return result;
}

/** Match text against rules, return first (highest priority) match */
function matchFirst(
  text: string,
  rules: ClassificationRule[] | undefined
): string | null {
  if (!rules) return null;

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return rule.target_value;
      }
    }
  }
  return null;
}

/** Group rules by type and sort by priority descending */
function groupAndSort(
  rules: ClassificationRule[]
): Record<string, ClassificationRule[]> {
  const grouped: Record<string, ClassificationRule[]> = {};
  for (const rule of rules) {
    if (!grouped[rule.rule_type]) grouped[rule.rule_type] = [];
    grouped[rule.rule_type].push(rule);
  }
  // Sort each group by priority desc
  for (const type of Object.keys(grouped)) {
    grouped[type].sort((a, b) => b.priority - a.priority);
  }
  return grouped;
}

/** Infer root cause from incident type when no keyword match */
function inferRootCause(type: string): string {
  const map: Record<string, string> = {
    Maintenance: "Equipment",
    "Guest Behaviour": "Human",
    "Guest dissatisfaction": "Human",
    Noise: "Human",
    IT: "IT",
    Housekeeping: "Human",
  };
  return map[type] || "Unknown";
}

/** Infer primary impact from incident type and text */
function inferImpact(
  type: string,
  text: string
): "safety" | "operations" | "guest" {
  // Safety-related types
  if (["Safety", "Alarm"].includes(type)) return "safety";

  // Safety keywords in any type
  const safetyKeywords = [
    "medical",
    "injury",
    "fire",
    "flood",
    "evacuation",
    "ambulance",
  ];
  if (safetyKeywords.some((k) => text.includes(k))) return "safety";

  // Operations keywords
  const opsKeywords = ["boh", "power", "generator", "staff", "plant"];
  if (opsKeywords.some((k) => text.includes(k))) return "operations";

  return "guest";
}

/**
 * Detect escalation from incident text.
 */
export function detectEscalation(text: string): {
  isEscalated: boolean;
  escalatedTo: string | null;
} {
  const lower = text.toLowerCase();
  const triggers = [
    "escalated to",
    "notified",
    "called",
    "contacted",
    "paged",
    "attended",
    "ah maintenance",
    "ah security",
  ];

  const isEscalated = triggers.some((t) => lower.includes(t));
  let escalatedTo: string | null = null;

  if (isEscalated) {
    // Try to extract who it was escalated to
    const patterns = [
      "ah maintenance",
      "ah security",
      "ah manager",
      "ah front office",
      "general manager",
      "gm",
      "security",
      "maintenance manager",
      "engineering",
      "medical",
      "emergency services",
      "police",
    ];
    for (const p of patterns) {
      if (lower.includes(p)) {
        escalatedTo = p
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        break;
      }
    }
  }

  return { isEscalated, escalatedTo };
}

/**
 * Determine controllability by RDM.
 */
export function assessControllability(
  text: string,
  incidentType: string,
  isEscalated: boolean
): "yes" | "partial" | "no" {
  const lower = text.toLowerCase();

  // Never controllable
  if (["Safety"].includes(incidentType)) return "no";
  if (
    ["ambulance", "medical", "injury", "fire"].some((k) => lower.includes(k))
  )
    return "no";

  // Fully controllable
  const resolvedPatterns = [
    "rdm replaced",
    "rdm resolved",
    "rdm arranged",
    "rdm provided",
    "issue resolved",
    "rdm attended",
  ];
  if (resolvedPatterns.some((p) => lower.includes(p))) return "yes";

  // Partial
  if (isEscalated) return "partial";
  if (
    incidentType === "Maintenance" &&
    lower.includes("follow-up required")
  )
    return "partial";

  return "yes";
}

/**
 * Extract room code from text.
 * Matches patterns like R0820, B0043, T0214, C0103, WA105, etc.
 */
export function extractRoomCode(text: string): string | null {
  const match = text.match(/\b([RBTC]\d{4}|WA\d{3,4}|HYCV\d+|SA\d+|LOT\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Resolve a site name to a property using site_mappings.
 * Pass in the mappings from Supabase (fetched once per import).
 */
export interface SiteMapping {
  property_id: string;
  match_type: "prefix" | "text";
  pattern: string;
  priority: number;
}

export function resolveProperty(
  roomCode: string | null,
  siteText: string | null,
  mappings: SiteMapping[]
): string | null {
  // Sort by priority desc
  const sorted = [...mappings].sort((a, b) => b.priority - a.priority);

  // First try room code prefix
  if (roomCode) {
    for (const m of sorted) {
      if (m.match_type === "prefix" && roomCode.startsWith(m.pattern)) {
        return m.property_id;
      }
    }
  }

  // Then try text match on site name
  if (siteText) {
    const lower = siteText.toLowerCase();
    for (const m of sorted) {
      if (m.match_type === "text" && lower.includes(m.pattern.toLowerCase())) {
        return m.property_id;
      }
    }
  }

  return null;
}
