-- ============================================================
-- COMPENSATION TRACKING
-- ============================================================
-- Tracks all compensation given to guests: credits, refunds,
-- upgrades, complimentary items, vouchers, etc.
-- Linked to incidents so you can see the cost of each issue.
-- ============================================================

CREATE TABLE compensations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    incident_id         UUID REFERENCES incidents(id) ON DELETE SET NULL,

    -- What was given
    compensation_type   TEXT NOT NULL DEFAULT 'credit',
        -- 'credit', 'refund', 'upgrade', 'complimentary', 'voucher', 'other'
    amount              DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency            TEXT NOT NULL DEFAULT 'AUD',

    -- Who received it
    guest_name          TEXT,
    room_code           TEXT,

    -- Quick reference (denormalized from incident for easy querying)
    incident_title      TEXT,
    incident_type       TEXT,

    -- Details
    notes               TEXT,
    approved_by         UUID REFERENCES profiles(id),
    given_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_compensations_org ON compensations(organization_id);
CREATE INDEX idx_compensations_property ON compensations(property_id);
CREATE INDEX idx_compensations_incident ON compensations(incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX idx_compensations_type ON compensations(compensation_type);
CREATE INDEX idx_compensations_date ON compensations(given_at DESC);

-- Row Level Security
ALTER TABLE compensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see compensations" ON compensations
    FOR SELECT USING (organization_id = auth.user_org_id());

CREATE POLICY "Staff create compensations" ON compensations
    FOR INSERT WITH CHECK (
        organization_id = auth.user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Managers update compensations" ON compensations
    FOR UPDATE USING (
        organization_id = auth.user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Auto-update timestamp
CREATE TRIGGER trg_compensations_updated
    BEFORE UPDATE ON compensations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
