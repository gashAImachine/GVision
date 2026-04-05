/**
 * Data Import Engine
 * ==================
 * Parses CSV/Excel files and maps rows to the incidents schema.
 * Handles the column mapping from Hamilton Island format (and
 * extensible for any hotel's export format).
 *
 * Flow:
 * 1. Parse file → raw rows
 * 2. Map columns → normalized incident objects
 * 3. Auto-classify using classification engine
 * 4. Resolve properties using site mappings
 * 5. Validate and return ready-to-insert records + errors
 */

import {
  classifyIncident,
  detectEscalation,
  assessControllability,
  extractRoomCode,
  resolveProperty,
  type ClassificationRule,
  type SiteMapping,
} from "./classification-engine";

// ============================================================
// Types
// ============================================================

/** Raw row from CSV/Excel — column names as keys */
export type RawRow = Record<string, string>;

/** Column mapping: maps source column names → our schema fields */
export interface ColumnMapping {
  date: string;           // source column for incident date
  time?: string;          // source column for time (HHMM)
  site?: string;          // source column for site/venue
  room_number?: string;   // source column for room code
  incident_type?: string; // source column for pre-classified type
  title: string;          // source column for short summary
  description?: string;   // source column for full detail
  department?: string;    // source column for department
  escalation?: string;    // source column for escalation flag
  escalated_to?: string;  // source column for escalation target
  severity?: string;      // source column for pre-classified severity
  impact?: string;        // source column for primary impact
  controllable?: string;  // source column for controllability
  root_cause?: string;    // source column for root cause
}

/** Hamilton Island default column mapping (matches their Excel export) */
export const HAMILTON_ISLAND_MAPPING: ColumnMapping = {
  date: "Date",
  time: "Time",
  site: "Site",
  room_number: "Room Number",
  incident_type: "Incident Type",
  title: "Issue (max 3 words)",
  department: "Primary Department",
  escalation: "Escalation (Yes/No)",
  escalated_to: "Escalated To",
  severity: "Severity (Low/Medium/High)",
  impact: "Primary Impact",
  controllable: "Controllable by RDM (Yes/Partial/No)",
  root_cause: "Likely Root Cause",
};

/** Processed incident ready for Supabase insert */
export interface ProcessedIncident {
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  title: string;
  description: string | null;
  room_code: string | null;
  site: string | null;
  severity: "low" | "medium" | "high";
  primary_impact: "safety" | "operations" | "guest";
  primary_department: string | null;
  is_escalated: boolean;
  escalated_to: string | null;
  controllable_by_rdm: "yes" | "partial" | "no";
  root_cause: string | null;
  property_id: string | null;
  source: "import";
  status: "closed"; // imported data = historical = closed
}

export interface ImportError {
  row: number;
  field: string;
  error: string;
  raw?: string;
}

export interface ImportResult {
  incidents: ProcessedIncident[];
  errors: ImportError[];
  stats: {
    total_rows: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

// ============================================================
// Main Import Function
// ============================================================

/**
 * Process raw CSV/Excel rows into validated incidents.
 *
 * @param rows - Raw parsed rows from file
 * @param mapping - Column name mapping
 * @param rules - Classification rules from Supabase
 * @param siteMappings - Site/property mappings from Supabase
 * @param departmentMap - Incident type → department lookup
 * @param options - Import options
 */
export function processImportRows(
  rows: RawRow[],
  mapping: ColumnMapping,
  rules: ClassificationRule[],
  siteMappings: SiteMapping[],
  departmentMap: Record<string, string>,
  options: {
    organizationId: string;
    defaultPropertyId?: string;
    autoClassify?: boolean; // re-classify even if pre-classified
  }
): ImportResult {
  const incidents: ProcessedIncident[] = [];
  const errors: ImportError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row + 1-based index

    try {
      // 1. Extract date (required)
      const dateStr = getField(row, mapping.date)?.trim();
      if (!dateStr) {
        errors.push({ row: rowNum, field: "date", error: "Missing date" });
        continue;
      }

      const parsedDate = parseDate(dateStr);
      if (!parsedDate) {
        errors.push({
          row: rowNum,
          field: "date",
          error: `Invalid date: ${dateStr}`,
        });
        continue;
      }

      // 2. Extract title (required)
      const title = getField(row, mapping.title)?.trim();
      if (!title) {
        skipped++;
        continue; // Skip rows with no issue description
      }

      // 3. Extract optional fields
      const time = getField(row, mapping.time)?.trim() || null;
      const site = getField(row, mapping.site)?.trim() || null;
      const roomRaw = getField(row, mapping.room_number)?.trim() || null;
      const description = getField(row, mapping.description)?.trim() || null;

      // 4. Room code extraction
      const roomCode = roomRaw
        ? extractRoomCode(roomRaw) || roomRaw.toUpperCase()
        : null;

      // 5. Classification
      let incidentType = getField(row, mapping.incident_type)?.trim() || null;
      let severity = normalizeSeverity(getField(row, mapping.severity));
      let rootCause = getField(row, mapping.root_cause)?.trim() || null;
      let impact = normalizeImpact(getField(row, mapping.impact));
      let department = getField(row, mapping.department)?.trim() || null;

      // Auto-classify if no pre-classification or forced
      if (options.autoClassify || !incidentType) {
        const classText = [title, description, site].filter(Boolean).join(" ");
        const classification = classifyIncident(classText, rules, departmentMap);
        incidentType = incidentType || classification.incident_type || "Other";
        severity = severity || classification.severity;
        rootCause = rootCause || classification.root_cause;
        impact = impact || classification.primary_impact;
        department = department || classification.primary_department;
      }

      // 6. Escalation
      let isEscalated = false;
      let escalatedTo = getField(row, mapping.escalated_to)?.trim() || null;

      const escFlag = getField(row, mapping.escalation)?.trim()?.toLowerCase();
      if (escFlag === "yes" || escFlag === "true" || escFlag === "1") {
        isEscalated = true;
      } else if (description) {
        const esc = detectEscalation(description);
        isEscalated = esc.isEscalated;
        escalatedTo = escalatedTo || esc.escalatedTo;
      }

      // 7. Controllability
      let controllable = normalizeControllability(
        getField(row, mapping.controllable)
      );
      if (!controllable) {
        const controlText = [title, description].filter(Boolean).join(" ");
        controllable = assessControllability(
          controlText,
          incidentType || "Other",
          isEscalated
        );
      }

      // 8. Resolve property
      const propertyId =
        resolveProperty(roomCode, site, siteMappings) ||
        options.defaultPropertyId ||
        null;

      // 9. Build the incident
      incidents.push({
        incident_date: parsedDate,
        incident_time: normalizeTime(time),
        incident_type: incidentType || "Other",
        title,
        description,
        room_code: roomCode,
        site,
        severity: severity || "low",
        primary_impact: impact || "guest",
        primary_department: department,
        is_escalated: isEscalated,
        escalated_to: escalatedTo,
        controllable_by_rdm: controllable || "yes",
        root_cause: rootCause,
        property_id: propertyId,
        source: "import",
        status: "closed",
      });
    } catch (err) {
      errors.push({
        row: rowNum,
        field: "unknown",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    incidents,
    errors,
    stats: {
      total_rows: rows.length,
      successful: incidents.length,
      failed: errors.length,
      skipped,
    },
  };
}

// ============================================================
// Helpers
// ============================================================

/** Get a field value by column name (case-insensitive match) */
function getField(row: RawRow, columnName?: string): string | undefined {
  if (!columnName) return undefined;
  // Exact match first
  if (row[columnName] !== undefined) return row[columnName];
  // Case-insensitive fallback
  const lower = columnName.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key];
  }
  return undefined;
}

/** Parse various date formats into YYYY-MM-DD */
function parseDate(str: string): string | null {
  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY (Australian format)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD/MM/YY
  const dmyShort = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (dmyShort) {
    const [, d, m, y] = dmyShort;
    const year = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try native parsing as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/** Normalize time to HHMM format */
function normalizeTime(time: string | null): string | null {
  if (!time) return null;
  // Already HHMM
  if (/^\d{4}$/.test(time)) return time;
  // HH:MM
  const hmMatch = time.match(/^(\d{1,2}):(\d{2})/);
  if (hmMatch) {
    return hmMatch[1].padStart(2, "0") + hmMatch[2];
  }
  return time;
}

/** Normalize severity string */
function normalizeSeverity(
  s: string | undefined
): "low" | "medium" | "high" | null {
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower === "high") return "high";
  if (lower === "medium") return "medium";
  if (lower === "low") return "low";
  return null;
}

/** Normalize impact string */
function normalizeImpact(
  s: string | undefined
): "safety" | "operations" | "guest" | null {
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower === "safety") return "safety";
  if (lower === "operations") return "operations";
  if (lower === "guest") return "guest";
  return null;
}

/** Normalize controllability string */
function normalizeControllability(
  s: string | undefined
): "yes" | "partial" | "no" | null {
  if (!s) return null;
  const lower = s.toLowerCase().trim();
  if (lower === "yes") return "yes";
  if (lower === "partial") return "partial";
  if (lower === "no") return "no";
  return null;
}
