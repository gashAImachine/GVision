-- ============================================================
-- G-Vision — Initial Database Schema
-- ============================================================
-- Multi-tenant operational intelligence platform for hotels.
-- Designed so onboarding a new hotel = create org + property +
-- upload room layout + import incident data.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_type AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'viewer');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE task_status AS ENUM ('pending', 'done', 'cancelled');
CREATE TYPE controllability AS ENUM ('yes', 'partial', 'no');
CREATE TYPE primary_impact AS ENUM ('safety', 'operations', 'guest');
CREATE TYPE property_type AS ENUM ('accommodation', 'restaurant', 'bar', 'facility', 'staff');
CREATE TYPE wing_side AS ENUM ('low', 'high');

-- ============================================================
-- 1. ORGANIZATIONS (tenants)
-- ============================================================
-- Each hotel group / resort is one organization.

CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        plan_type NOT NULL DEFAULT 'starter',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES (users, linked to Supabase Auth)
-- ============================================================

CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    full_name       TEXT,
    role            user_role NOT NULL DEFAULT 'staff',
    department      TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);

-- ============================================================
-- 3. PROPERTIES (individual sites/venues within an org)
-- ============================================================
-- e.g., Reef View Hotel, Palm Bungalows, Beach Club, etc.

CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    property_type   property_type NOT NULL DEFAULT 'accommodation',
    code_prefix     TEXT,          -- e.g., 'R' for Reef View, 'B' for Bungalows
    address         TEXT,
    timezone        TEXT NOT NULL DEFAULT 'Australia/Lindeman',
    room_count      INT,
    has_room_map    BOOLEAN NOT NULL DEFAULT FALSE,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_properties_org ON properties(organization_id);

-- ============================================================
-- 4. ROOMS (room definitions for properties with room maps)
-- ============================================================
-- Flexible: works for RVH's floor/wing layout or any other
-- hotel's room structure. New hotel = just INSERT their rooms.

CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_code       TEXT NOT NULL,       -- e.g., 'R0102', '201A'
    floor           INT,                 -- floor number
    position        INT,                 -- position on floor
    wing            wing_side,           -- low (west) / high (east) — nullable for hotels without wings
    building        TEXT,                -- building name if multi-building
    room_type       TEXT,                -- 'guest', 'suite', 'staff', 'plant'
    capacity        INT,
    metadata        JSONB NOT NULL DEFAULT '{}',  -- flexible extra fields per hotel
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(property_id, room_code)
);

CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_code ON rooms(room_code);

-- ============================================================
-- 5. INCIDENT TYPES (configurable per organization)
-- ============================================================
-- Default set matches Hamilton Island, but each hotel can
-- customize their categories.

CREATE TABLE incident_types (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,        -- e.g., 'Maintenance', 'Noise'
    department      TEXT,                 -- default department assignment
    color           TEXT,                 -- hex color for UI
    icon            TEXT,                 -- lucide icon name
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(organization_id, name)
);

-- ============================================================
-- 6. INCIDENTS (the core data)
-- ============================================================
-- Every incident from every property, all in one table with
-- org/property scoping via RLS.

CREATE TABLE incidents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reported_by         UUID REFERENCES profiles(id),

    -- When
    incident_date       DATE NOT NULL,
    incident_time       TEXT,                -- 'HHMM' format (e.g., '2330')

    -- What
    incident_type       TEXT NOT NULL,        -- matches incident_types.name
    title               TEXT NOT NULL,        -- short summary (was "Issue (max 3 words)")
    description         TEXT,                 -- full detail text

    -- Where
    room_code           TEXT,                 -- links to rooms.room_code
    site                TEXT,                 -- venue/site name for text-based matching
    location            TEXT,                 -- free-text location detail

    -- Classification
    severity            severity_level NOT NULL DEFAULT 'low',
    primary_impact      primary_impact NOT NULL DEFAULT 'guest',
    status              incident_status NOT NULL DEFAULT 'open',
    primary_department  TEXT,                 -- department responsible

    -- Escalation
    is_escalated        BOOLEAN NOT NULL DEFAULT FALSE,
    escalated_to        TEXT,                 -- who it was escalated to

    -- Analysis
    controllable_by_rdm controllability NOT NULL DEFAULT 'yes',
    root_cause          TEXT,                 -- Equipment, Plumbing, Human, etc.

    -- Import tracking
    source              TEXT DEFAULT 'manual', -- 'manual', 'import', 'docx_extract'
    import_batch_id     UUID,                 -- links incidents from same import

    -- Timestamps
    reported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_property ON incidents(property_id);
CREATE INDEX idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_room ON incidents(room_code);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_batch ON incidents(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX idx_incidents_org_date ON incidents(organization_id, incident_date DESC);
CREATE INDEX idx_incidents_property_date ON incidents(property_id, incident_date DESC);

-- ============================================================
-- 7. ROOM TASKS (maintenance, pest control, deep clean, etc.)
-- ============================================================
-- Tracks actionable tasks tied to rooms — the operations side.

CREATE TABLE room_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_code       TEXT NOT NULL,
    task_type       TEXT NOT NULL,         -- 'pest_control', 'maintenance', 'refurbishment', 'deep_clean', 'other'
    description     TEXT,
    assigned_to     TEXT,                  -- department or person name
    status          task_status NOT NULL DEFAULT 'pending',
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_tasks_property ON room_tasks(property_id);
CREATE INDEX idx_room_tasks_room ON room_tasks(room_code);
CREATE INDEX idx_room_tasks_status ON room_tasks(status) WHERE status = 'pending';

-- ============================================================
-- 8. IMPORT BATCHES (track data imports)
-- ============================================================
-- Every time someone uploads a CSV/Excel/DOCX, we log it.

CREATE TABLE import_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id     UUID REFERENCES properties(id),
    uploaded_by     UUID REFERENCES profiles(id),
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL,         -- 'csv', 'xlsx', 'docx'
    row_count       INT,
    error_count     INT DEFAULT 0,
    errors          JSONB DEFAULT '[]',    -- [{row: 5, error: "missing date"}, ...]
    status          TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. ROOM LAYOUTS (visual configuration for room maps)
-- ============================================================
-- Stores the visual layout config for each property's room map.
-- Each hotel can define their own floor plans, room positions,
-- and visual groupings.

CREATE TABLE room_layouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Default',
    layout_type     TEXT NOT NULL DEFAULT 'grid',  -- 'grid', 'freeform', 'floor_plan'

    -- Grid layout config (like RVH: floors × positions with wings)
    config          JSONB NOT NULL DEFAULT '{}',
    -- Example RVH config:
    -- {
    --   "floors": 19,
    --   "has_wings": true,
    --   "wings": { "low": { "label": "Low Side (Marina)", "positions": [1,11] },
    --              "high": { "label": "High Side (Passage Peak)", "positions": [12,21] } },
    --   "floor_overrides": {
    --     "17": { "low": [3,11], "high": [12,18] },
    --     "18": { "low": [4,11], "high": [12,18] },
    --     "19": { "low": [4,11], "high": [12,18] }
    --   },
    --   "excluded_floors": [20],
    --   "room_code_format": "R{floor:02d}{position:02d}"
    -- }

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(property_id, name)
);

-- ============================================================
-- 10. CLASSIFICATION RULES (keyword → type/severity mapping)
-- ============================================================
-- Stores the extraction rules per org so each hotel can
-- customize how incidents get auto-classified.

CREATE TABLE classification_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule_type       TEXT NOT NULL,         -- 'incident_type', 'severity', 'root_cause', 'impact', 'site'
    target_value    TEXT NOT NULL,         -- the category value to assign
    keywords        TEXT[] NOT NULL,       -- array of keywords to match
    priority        INT NOT NULL DEFAULT 0, -- higher = checked first
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(organization_id, rule_type, target_value)
);

-- ============================================================
-- 11. SITE MAPPINGS (room code prefix → property)
-- ============================================================
-- Maps room code prefixes and text patterns to properties.
-- Used during data import to auto-assign incidents to properties.

CREATE TABLE site_mappings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    match_type      TEXT NOT NULL,         -- 'prefix' (room code) or 'text' (site name)
    pattern         TEXT NOT NULL,         -- 'R' for prefix, 'Reef View Hotel' for text
    priority        INT NOT NULL DEFAULT 0,

    UNIQUE(organization_id, match_type, pattern)
);

-- ============================================================
-- ROW LEVEL SECURITY (multi-tenant isolation)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_mappings ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's organization_id
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Organizations: users can only see their own org
CREATE POLICY "Users see own org" ON organizations
    FOR SELECT USING (id = auth.user_org_id());

-- Profiles: users see people in their org
CREATE POLICY "Users see org profiles" ON profiles
    FOR SELECT USING (organization_id = auth.user_org_id());

CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Properties: scoped to org
CREATE POLICY "Org members see properties" ON properties
    FOR SELECT USING (organization_id = auth.user_org_id());

CREATE POLICY "Admins manage properties" ON properties
    FOR ALL USING (
        organization_id = auth.user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Rooms: scoped via property → org
CREATE POLICY "Org members see rooms" ON rooms
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE organization_id = auth.user_org_id()
        )
    );

-- Incidents: scoped to org
CREATE POLICY "Org members see incidents" ON incidents
    FOR SELECT USING (organization_id = auth.user_org_id());

CREATE POLICY "Org members create incidents" ON incidents
    FOR INSERT WITH CHECK (organization_id = auth.user_org_id());

CREATE POLICY "Staff update incidents" ON incidents
    FOR UPDATE USING (
        organization_id = auth.user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
        )
    );

-- Incident Types: scoped to org
CREATE POLICY "Org members see types" ON incident_types
    FOR SELECT USING (organization_id = auth.user_org_id());

-- Room Tasks: scoped via property → org
CREATE POLICY "Org members see tasks" ON room_tasks
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE organization_id = auth.user_org_id()
        )
    );

CREATE POLICY "Staff manage tasks" ON room_tasks
    FOR ALL USING (
        property_id IN (
            SELECT id FROM properties WHERE organization_id = auth.user_org_id()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
        )
    );

-- Import Batches: scoped to org
CREATE POLICY "Org members see imports" ON import_batches
    FOR SELECT USING (organization_id = auth.user_org_id());

-- Room Layouts: scoped via property → org
CREATE POLICY "Org members see layouts" ON room_layouts
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE organization_id = auth.user_org_id()
        )
    );

-- Classification Rules: scoped to org
CREATE POLICY "Org members see rules" ON classification_rules
    FOR SELECT USING (organization_id = auth.user_org_id());

-- Site Mappings: scoped to org
CREATE POLICY "Org members see mappings" ON site_mappings
    FOR SELECT USING (organization_id = auth.user_org_id());

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_incidents_updated
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_room_tasks_updated
    BEFORE UPDATE ON room_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_room_layouts_updated
    BEFORE UPDATE ON room_layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
