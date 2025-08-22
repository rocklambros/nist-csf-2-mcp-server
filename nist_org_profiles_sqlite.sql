-- Run this in SQLite or as a .sql file

-- Organizations table
CREATE TABLE organizations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    sector TEXT,
    size TEXT CHECK(size IN ('small', 'medium', 'large', 'enterprise')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('current', 'target', 'baseline')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Assessments table
CREATE TABLE assessments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    profile_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    implementation_tier TEXT CHECK(implementation_tier IN ('Partial', 'Risk-Informed', 'Repeatable', 'Adaptive')),
    score REAL CHECK(score >= 0 AND score <= 100),
    notes TEXT,
    evidence TEXT,
    assessed_by TEXT,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Gap Analysis table
CREATE TABLE gap_analysis (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    current_profile_id TEXT NOT NULL,
    target_profile_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    current_tier TEXT,
    target_tier TEXT,
    gap_score REAL,
    priority TEXT CHECK(priority IN ('critical', 'high', 'medium', 'low')),
    estimated_effort INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (current_profile_id) REFERENCES profiles(id),
    FOREIGN KEY (target_profile_id) REFERENCES profiles(id)
);

-- Progress Tracking table
CREATE TABLE progress_tracking (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('not_started', 'in_progress', 'completed', 'blocked')),
    completion_percentage INTEGER CHECK(completion_percentage >= 0 AND completion_percentage <= 100),
    start_date DATE,
    target_date DATE,
    actual_completion_date DATE,
    assigned_to TEXT,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Compliance Mappings table
CREATE TABLE compliance_mappings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    external_framework TEXT NOT NULL,
    external_control_id TEXT NOT NULL,
    mapping_type TEXT CHECK(mapping_type IN ('direct', 'partial', 'related')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Implementation Plans table
CREATE TABLE implementation_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    phase INTEGER,
    timeline_weeks INTEGER,
    resources_required TEXT,
    dependencies TEXT,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Audit Evidence table
CREATE TABLE audit_evidence (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    assessment_id TEXT NOT NULL,
    evidence_type TEXT,
    evidence_path TEXT,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_assessments_profile ON assessments(profile_id);
CREATE INDEX idx_assessments_subcategory ON assessments(subcategory_id);
CREATE INDEX idx_gap_analysis_org ON gap_analysis(org_id);
CREATE INDEX idx_progress_org_subcategory ON progress_tracking(org_id, subcategory_id);
CREATE INDEX idx_compliance_org ON compliance_mappings(org_id);

-- Create views for common queries
CREATE VIEW current_maturity AS
SELECT 
    p.org_id,
    a.subcategory_id,
    a.implementation_tier,
    a.score,
    a.assessed_at
FROM assessments a
JOIN profiles p ON a.profile_id = p.id
WHERE p.type = 'current'
ORDER BY a.assessed_at DESC;

CREATE VIEW maturity_summary AS
SELECT 
    org_id,
    COUNT(DISTINCT subcategory_id) as assessed_subcategories,
    AVG(score) as average_score,
    COUNT(CASE WHEN implementation_tier = 'Adaptive' THEN 1 END) as adaptive_count,
    COUNT(CASE WHEN implementation_tier = 'Repeatable' THEN 1 END) as repeatable_count,
    COUNT(CASE WHEN implementation_tier = 'Risk-Informed' THEN 1 END) as risk_informed_count,
    COUNT(CASE WHEN implementation_tier = 'Partial' THEN 1 END) as partial_count
FROM current_maturity
GROUP BY org_id;

.exit