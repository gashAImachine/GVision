-- ============================================================
-- SEED: Hamilton Island Enterprises — Default Configuration
-- ============================================================
-- This sets up the first org with all properties, incident types,
-- classification rules, site mappings, and RVH room layout.
-- New hotels get their own version of this.
-- ============================================================

-- 1. Organization
INSERT INTO organizations (id, name, slug, plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Hamilton Island Enterprises', 'hamilton-island', 'professional');

-- 2. Properties
INSERT INTO properties (id, organization_id, name, slug, property_type, code_prefix, timezone, room_count, has_room_map) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Reef View Hotel',          'reef-view-hotel',      'accommodation', 'R',  'Australia/Lindeman', 280, TRUE),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Palm Bungalows',           'palm-bungalows',       'accommodation', 'B',  'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'The Sundays',              'the-sundays',          'accommodation', 'T',  'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Beach Club',               'beach-club',           'accommodation', 'C',  'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Holiday Homes',            'holiday-homes',        'accommodation', NULL, 'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Whitsunday Apartments',    'whitsunday-apartments','accommodation', 'WA', 'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Staff Accommodation',      'staff-accommodation',  'staff',         'SA', 'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Marina & Restaurants',     'marina-restaurants',   'restaurant',    NULL, 'Australia/Lindeman', NULL, FALSE),
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Resort Facilities',        'resort-facilities',    'facility',      NULL, 'Australia/Lindeman', NULL, FALSE);

-- 3. Incident Types (Hamilton Island defaults)
INSERT INTO incident_types (organization_id, name, department, color, icon, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Maintenance',           'Maintenance',   '#f97316', 'wrench',        1),
    ('00000000-0000-0000-0000-000000000001', 'Housekeeping',          'Housekeeping',  '#8b5cf6', 'sparkles',      2),
    ('00000000-0000-0000-0000-000000000001', 'IT',                    'IT',            '#3b82f6', 'wifi',          3),
    ('00000000-0000-0000-0000-000000000001', 'Safety',                'Security',      '#ef4444', 'shield-alert',  4),
    ('00000000-0000-0000-0000-000000000001', 'Alarm',                 'Security',      '#ef4444', 'bell-ring',     5),
    ('00000000-0000-0000-0000-000000000001', 'Noise',                 'Security',      '#eab308', 'volume-x',      6),
    ('00000000-0000-0000-0000-000000000001', 'Guest Behaviour',       'Security',      '#f97316', 'user-x',        7),
    ('00000000-0000-0000-0000-000000000001', 'Transport',             'Transport',     '#22c55e', 'car',           8),
    ('00000000-0000-0000-0000-000000000001', 'Guest dissatisfaction', 'Front Office',  '#ec4899', 'frown',         9),
    ('00000000-0000-0000-0000-000000000001', 'Other',                 'Front Office',  '#6b7280', 'circle-help',   10);

-- 4. RVH Room Layout Configuration
INSERT INTO room_layouts (property_id, name, layout_type, config) VALUES
    ('10000000-0000-0000-0000-000000000001', 'RVH Main', 'grid', '{
        "floors": 19,
        "has_wings": true,
        "wings": {
            "low":  { "label": "Low Side (Marina & Sunset)", "default_range": [1, 11] },
            "high": { "label": "High Side (Passage Peak & Sunrise)", "default_range": [12, 21] }
        },
        "floor_overrides": {
            "17": { "low": [3, 11], "high": [12, 18] },
            "18": { "low": [4, 11], "high": [12, 18] },
            "19": { "low": [4, 11], "high": [12, 18] }
        },
        "excluded_floors": [20],
        "room_code_format": "R{floor:02d}{position:02d}",
        "total_rooms": 280
    }');

-- 5. Generate RVH Rooms (floors 1-19)
-- Floors 1-16: positions 1-21 (low: 1-11, high: 12-21)
DO $$
DECLARE
    f INT;
    p INT;
    low_start INT;
    high_end INT;
    code TEXT;
    w wing_side;
BEGIN
    FOR f IN 1..19 LOOP
        -- Determine range per floor
        IF f <= 16 THEN
            low_start := 1;
            high_end := 21;
        ELSIF f = 17 THEN
            low_start := 3;
            high_end := 18;
        ELSE -- 18, 19
            low_start := 4;
            high_end := 18;
        END IF;

        FOR p IN low_start..high_end LOOP
            code := 'R' || LPAD(f::TEXT, 2, '0') || LPAD(p::TEXT, 2, '0');
            IF p <= 11 THEN
                w := 'low';
            ELSE
                w := 'high';
            END IF;

            INSERT INTO rooms (property_id, room_code, floor, position, wing, building, room_type)
            VALUES (
                '10000000-0000-0000-0000-000000000001',
                code, f, p, w,
                'Reef View Hotel',
                'guest'
            );
        END LOOP;
    END LOOP;
END $$;

-- 6. Site Mappings (room code prefix → property)
INSERT INTO site_mappings (organization_id, property_id, match_type, pattern, priority) VALUES
    -- Prefix matches (room codes)
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'prefix', 'R',    100),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'prefix', 'B',    100),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'prefix', 'T',    100),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'prefix', 'C',    100),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'prefix', 'WA',   100),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'prefix', 'SA',   100),
    -- Text matches (site name in incident description)
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'text', 'Reef View Hotel',         90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'text', 'RVH',                     90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'text', 'Palm Bungalow',           90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'text', 'The Sundays',             90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'text', 'Sundays',                 80),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'text', 'Beach Club',              90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'text', 'Catseye Pool Club',       85),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'text', 'CPC',                     85),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'text', 'Holiday Home',            90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'text', 'Yacht Club Villa',        90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'text', 'Whitsunday Apartment',    90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'text', 'Staff Accommodation',     90),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'text', 'Staff Village',           85),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'text', 'Marina Tavern',           80),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'text', 'Coca Chu',               80),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'text', 'Bommie',                  80),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009', 'text', 'Convention Centre',       80),
    ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000009', 'text', 'Golf Club',              80);

-- 7. Classification Rules (Hamilton Island keyword → category mapping)

-- Incident Type rules (priority = check order, higher first)
INSERT INTO classification_rules (organization_id, rule_type, target_value, keywords, priority) VALUES
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Alarm',
        ARRAY['fire alarm', 'smoke alarm', 'alarm activated', 'alarm trigger', 'evacuate'], 100),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Safety',
        ARRAY['ambulance', 'injury', 'injured', 'medical', 'fall', 'fell', 'bleed', 'assault', 'water leak'], 95),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Maintenance',
        ARRAY['a/c', 'ac unit', 'air con', 'aircon', 'leak', 'power', 'safelock', 'safe lock', 'battery', 'stovetop', 'fridge', 'minibar', 'hot water', 'plumb', 'electr', 'broken', 'fault', 'not working', 'not cooling', 'not function', 'lift', 'elevator', 'toilet', 'blocked', 'flood', 'light', 'bulb', 'door', 'lock', 'key'], 90),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'IT',
        ARRAY['wifi', 'wi-fi', 'internet', 'tv', 'television', 'phone', 'computer', 'network', 'signal', 'connectivity'], 85),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Noise',
        ARRAY['noise', 'loud', 'music', 'party', 'disturb', 'quiet hours'], 80),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Housekeeping',
        ARRAY['towel', 'linen', 'slippers', 'dental', 'toiletries', 'clean', 'housekeeping', 'hsk', 'room not ready', 'smell', 'odour', 'bleach', 'replenish'], 75),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Guest Behaviour',
        ARRAY['intoxicat', 'drunk', 'behaviour', 'aggressive', 'threatening', 'trespass'], 70),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Transport',
        ARRAY['buggy', 'tyre', 'vehicle', 'transport', 'golf cart'], 65),
    ('00000000-0000-0000-0000-000000000001', 'incident_type', 'Guest dissatisfaction',
        ARRAY['complaint', 'dissatisfied', 'unhappy', 'displeased', 'refund', 'compensation'], 60);

-- Severity rules
INSERT INTO classification_rules (organization_id, rule_type, target_value, keywords, priority) VALUES
    ('00000000-0000-0000-0000-000000000001', 'severity', 'high',
        ARRAY['evacuate', 'fire', 'ambulance', 'medical', 'injury', 'bleed', 'no power', 'no hot water', 'relocation', 'relocated', 'flood'], 100),
    ('00000000-0000-0000-0000-000000000001', 'severity', 'medium',
        ARRAY['leak', 'not working', 'not cooling', 'escalated', 'maintenance', 'complaint', 'dissatisfied', 'credit authorised', 'bleach smell'], 50);

-- Root cause rules
INSERT INTO classification_rules (organization_id, rule_type, target_value, keywords, priority) VALUES
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'Equipment',
        ARRAY['battery', 'flat', 'not working', 'faulty', 'broken', 'fault', 'not cooling', 'not function', 'hardware'], 100),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'Plumbing',
        ARRAY['leak', 'flood', 'plumb', 'drain', 'blocked toilet', 'hot water'], 95),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'Human',
        ARRAY['guest reported', 'complaint', 'relocation', 'behaviour', 'left'], 90),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'Medical',
        ARRAY['ambulance', 'medical', 'injury', 'fall', 'bleed'], 85),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'Hygiene',
        ARRAY['smell', 'odour', 'bleach', 'clean'], 80),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'IT',
        ARRAY['wifi', 'internet', 'network', 'connectivity'], 75),
    ('00000000-0000-0000-0000-000000000001', 'root_cause', 'External',
        ARRAY['weather', 'wind', 'rain', 'storm', 'power outage'], 70);
