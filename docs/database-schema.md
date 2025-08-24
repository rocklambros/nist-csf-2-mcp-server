# Database Schema Documentation

This document provides comprehensive documentation for the NIST CSF 2.0 MCP Server SQLite database schema, including table structures, relationships, indexes, and usage patterns.

## Overview

The database uses SQLite 3 with a normalized schema designed for:
- **High Performance**: Optimized indexes for common query patterns
- **Data Integrity**: Foreign key constraints and validation rules
- **Scalability**: Efficient storage and retrieval for large organizations
- **Audit Trail**: Comprehensive tracking of changes and updates
- **Flexibility**: Support for multiple assessment profiles and comparison analysis

## Schema Architecture

### Core Components

1. **Framework Reference Tables**: Static NIST CSF 2.0 data
2. **Organizational Data**: Dynamic organization and profile information  
3. **Assessment Data**: Implementation status and maturity scores
4. **Analysis Results**: Gap analysis, risk scores, and priority matrices
5. **Planning Data**: Implementation plans, cost estimates, and timelines
6. **Progress Tracking**: Status updates, milestones, and completion tracking
7. **Reporting Data**: Generated reports and exported data

## Framework Reference Tables

### functions

Core NIST CSF 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover).

```sql
CREATE TABLE IF NOT EXISTS functions (
  id TEXT PRIMARY KEY,                    -- Function ID (GV, ID, PR, DE, RS, RC)
  name TEXT NOT NULL,                     -- Function name (e.g., "Govern")
  description TEXT NOT NULL,              -- Detailed description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO functions (id, name, description) VALUES 
('GV', 'Govern', 'Develop and implement the organizational governance framework'),
('ID', 'Identify', 'Develop organizational understanding of cybersecurity risks'),
('PR', 'Protect', 'Develop and implement safeguards to ensure delivery of services'),
('DE', 'Detect', 'Develop and implement activities to identify cybersecurity events'),
('RS', 'Respond', 'Develop and implement appropriate activities regarding cybersecurity incidents'),
('RC', 'Recover', 'Develop and implement activities to maintain resilience plans');
```

**Indexes:**
```sql
CREATE INDEX idx_functions_name ON functions(name);
```

### categories

Categories within each function (e.g., GV.OC - Organizational Context).

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,                    -- Category ID (e.g., GV.OC)
  function_id TEXT NOT NULL,              -- Foreign key to functions.id
  name TEXT NOT NULL,                     -- Category name
  description TEXT NOT NULL,              -- Detailed description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (function_id) REFERENCES functions (id)
);

-- Sample data
INSERT INTO categories (id, function_id, name, description) VALUES
('GV.OC', 'GV', 'Organizational Context', 'The organizational mission, objectives, stakeholders, and activities are understood'),
('GV.RM', 'GV', 'Risk Management Strategy', 'The organization establishes and communicates its cybersecurity risk management strategy');
```

**Indexes:**
```sql
CREATE INDEX idx_categories_function_id ON categories(function_id);
CREATE INDEX idx_categories_name ON categories(name);
```

### subcategories

Detailed subcategories with implementation guidance (e.g., GV.OC-01).

```sql
CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY,                    -- Subcategory ID (e.g., GV.OC-01)
  category_id TEXT NOT NULL,              -- Foreign key to categories.id
  function_id TEXT NOT NULL,              -- Denormalized function reference
  name TEXT NOT NULL,                     -- Subcategory name
  description TEXT NOT NULL,              -- Detailed description
  implementation_guidance TEXT,           -- Implementation guidance
  outcomes TEXT,                          -- Expected outcomes (JSON array)
  implementation_examples TEXT,           -- Examples (JSON array)
  references TEXT,                        -- Related standards/frameworks (JSON array)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id),
  FOREIGN KEY (function_id) REFERENCES functions (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_function_id ON subcategories(function_id);
CREATE INDEX idx_subcategories_name ON subcategories(name);
CREATE INDEX idx_subcategories_search ON subcategories(name, description);
```

## Organizational Data Tables

### organization_profiles

Organization information and metadata.

```sql
CREATE TABLE IF NOT EXISTS organization_profiles (
  id TEXT PRIMARY KEY,                    -- Organization ID
  name TEXT NOT NULL UNIQUE,              -- Organization name
  sector TEXT NOT NULL,                   -- Industry sector
  size TEXT NOT NULL,                     -- Organization size (small, medium, large, enterprise)
  description TEXT,                       -- Organization description
  contact_info TEXT,                      -- Contact information (JSON)
  metadata TEXT,                          -- Additional metadata (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_org_profiles_name ON organization_profiles(name);
CREATE INDEX idx_org_profiles_sector ON organization_profiles(sector);
CREATE INDEX idx_org_profiles_size ON organization_profiles(size);
```

### profiles

Assessment profiles for tracking different states (current, target, comparative).

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                    -- Profile ID
  org_id TEXT NOT NULL,                   -- Foreign key to organization_profiles.id
  profile_name TEXT NOT NULL,             -- Profile name
  profile_type TEXT NOT NULL,             -- Type: current, target, comparative
  description TEXT,                       -- Profile description
  metadata TEXT,                          -- Additional metadata (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organization_profiles (id),
  UNIQUE(org_id, profile_name)
);
```

**Indexes:**
```sql
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_type ON profiles(profile_type);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
```

### profile_assessments

Individual subcategory assessments and ratings.

```sql
CREATE TABLE IF NOT EXISTS profile_assessments (
  id TEXT PRIMARY KEY,                    -- Assessment ID
  profile_id TEXT NOT NULL,               -- Foreign key to profiles.id
  subcategory_id TEXT NOT NULL,           -- Foreign key to subcategories.id
  implementation_level TEXT NOT NULL,     -- not_implemented, partially_implemented, largely_implemented, fully_implemented
  maturity_score INTEGER DEFAULT 0,      -- Maturity score (0-5)
  implementation_notes TEXT,              -- Implementation notes
  evidence_links TEXT,                    -- Evidence links (JSON array)
  assessed_by TEXT,                       -- Assessor name/ID
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  confidence_level TEXT,                  -- high, medium, low
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id),
  FOREIGN KEY (subcategory_id) REFERENCES subcategories (id),
  UNIQUE(profile_id, subcategory_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_assessments_profile_id ON profile_assessments(profile_id);
CREATE INDEX idx_assessments_subcategory_id ON profile_assessments(subcategory_id);
CREATE INDEX idx_assessments_implementation_level ON profile_assessments(implementation_level);
CREATE INDEX idx_assessments_maturity_score ON profile_assessments(maturity_score);
CREATE INDEX idx_assessments_assessment_date ON profile_assessments(assessment_date);
CREATE INDEX idx_assessments_composite ON profile_assessments(profile_id, implementation_level, maturity_score);
```

## Analysis Results Tables

### gap_analyses

Gap analysis results between current and target states.

```sql
CREATE TABLE IF NOT EXISTS gap_analyses (
  id TEXT PRIMARY KEY,                    -- Gap analysis ID
  analysis_name TEXT NOT NULL,            -- Analysis name
  current_profile_id TEXT NOT NULL,      -- Current state profile
  target_profile_id TEXT,                -- Target state profile (optional)
  total_gaps INTEGER DEFAULT 0,          -- Total number of gaps identified
  critical_gaps INTEGER DEFAULT 0,       -- Critical gaps (score >= 4)
  major_gaps INTEGER DEFAULT 0,          -- Major gaps (score 3-3.9)
  moderate_gaps INTEGER DEFAULT 0,       -- Moderate gaps (score 2-2.9)
  minor_gaps INTEGER DEFAULT 0,          -- Minor gaps (score 1-1.9)
  average_gap_score REAL DEFAULT 0,      -- Average gap score
  analysis_results TEXT,                 -- Detailed results (JSON)
  recommendations TEXT,                  -- Recommendations (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (current_profile_id) REFERENCES profiles (id),
  FOREIGN KEY (target_profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_gap_analyses_current_profile ON gap_analyses(current_profile_id);
CREATE INDEX idx_gap_analyses_target_profile ON gap_analyses(target_profile_id);
CREATE INDEX idx_gap_analyses_created_at ON gap_analyses(created_at);
CREATE INDEX idx_gap_analyses_gap_score ON gap_analyses(average_gap_score);
```

### priority_matrices

Implementation priority rankings and resource estimates.

```sql
CREATE TABLE IF NOT EXISTS priority_matrices (
  id TEXT PRIMARY KEY,                    -- Priority matrix ID
  profile_id TEXT NOT NULL,               -- Source profile
  matrix_type TEXT NOT NULL,              -- effort_impact, risk_resource, custom
  matrix_configuration TEXT NOT NULL,    -- Matrix configuration (JSON)
  quadrants_data TEXT NOT NULL,          -- Quadrant data (JSON)
  summary_statistics TEXT,               -- Summary stats (JSON)
  recommendations TEXT,                  -- Recommendations (JSON)
  resource_estimates TEXT,               -- Resource estimates (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_priority_matrices_profile_id ON priority_matrices(profile_id);
CREATE INDEX idx_priority_matrices_type ON priority_matrices(matrix_type);
CREATE INDEX idx_priority_matrices_created_at ON priority_matrices(created_at);
```

### risk_assessments

Risk scores and assessments based on implementation gaps.

```sql
CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,                    -- Risk assessment ID
  profile_id TEXT NOT NULL,               -- Target profile
  overall_risk_score REAL NOT NULL,      -- Overall risk score (0-100)
  risk_level TEXT NOT NULL,               -- Low, Medium, High, Critical
  threat_weights TEXT,                    -- Custom threat weights (JSON)
  function_risks TEXT NOT NULL,           -- Function-level risks (JSON)
  risk_summary TEXT NOT NULL,             -- Risk summary statistics (JSON)
  heat_map_data TEXT,                     -- Heat map visualization data (JSON)
  recommendations TEXT,                   -- Risk mitigation recommendations (JSON)
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_risk_assessments_profile_id ON risk_assessments(profile_id);
CREATE INDEX idx_risk_assessments_risk_score ON risk_assessments(overall_risk_score);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_assessment_date ON risk_assessments(assessment_date);
```

## Planning Data Tables

### implementation_plans

Detailed implementation roadmaps and timelines.

```sql
CREATE TABLE IF NOT EXISTS implementation_plans (
  id TEXT PRIMARY KEY,                    -- Implementation plan ID
  plan_name TEXT NOT NULL,                -- Plan name
  profile_id TEXT NOT NULL,               -- Source profile
  gap_analysis_id TEXT,                   -- Source gap analysis (optional)
  timeline_months INTEGER NOT NULL,      -- Total timeline in months
  available_resources INTEGER NOT NULL,  -- Available FTE resources
  total_phases INTEGER NOT NULL,          -- Number of phases
  total_effort_hours INTEGER DEFAULT 0,  -- Total effort estimate (hours)
  estimated_cost REAL DEFAULT 0,         -- Total cost estimate
  phases_data TEXT NOT NULL,              -- Phase details (JSON)
  dependency_graph TEXT,                 -- Dependencies (JSON)
  milestones TEXT,                       -- Milestones (JSON)
  resource_allocation TEXT,              -- Resource allocation (JSON)
  risk_assessment TEXT,                  -- Plan risks (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id),
  FOREIGN KEY (gap_analysis_id) REFERENCES gap_analyses (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_implementation_plans_profile_id ON implementation_plans(profile_id);
CREATE INDEX idx_implementation_plans_gap_analysis_id ON implementation_plans(gap_analysis_id);
CREATE INDEX idx_implementation_plans_timeline ON implementation_plans(timeline_months);
CREATE INDEX idx_implementation_plans_created_at ON implementation_plans(created_at);
```

### cost_estimates

Financial projections for cybersecurity implementations.

```sql
CREATE TABLE IF NOT EXISTS cost_estimates (
  id TEXT PRIMARY KEY,                    -- Cost estimate ID
  organization_size TEXT NOT NULL,        -- Organization size
  subcategory_ids TEXT NOT NULL,          -- Subcategories estimated (JSON array)
  currency TEXT NOT NULL DEFAULT 'USD',  -- Currency code
  cost_model TEXT NOT NULL,               -- conservative, realistic, aggressive
  total_cost REAL NOT NULL,               -- Total cost estimate
  cost_breakdown TEXT NOT NULL,           -- Detailed cost breakdown (JSON)
  cost_factors TEXT NOT NULL,             -- Cost factors used (JSON)
  recommendations TEXT,                   -- Cost optimization recommendations (JSON)
  estimation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_cost_estimates_org_size ON cost_estimates(organization_size);
CREATE INDEX idx_cost_estimates_currency ON cost_estimates(currency);
CREATE INDEX idx_cost_estimates_total_cost ON cost_estimates(total_cost);
CREATE INDEX idx_cost_estimates_estimation_date ON cost_estimates(estimation_date);
```

## Progress Tracking Tables

### progress_tracking

Implementation progress updates and milestone tracking.

```sql
CREATE TABLE IF NOT EXISTS progress_tracking (
  id TEXT PRIMARY KEY,                    -- Progress tracking ID
  profile_id TEXT NOT NULL,               -- Target profile
  subcategory_id TEXT NOT NULL,           -- Subcategory being tracked
  status TEXT NOT NULL,                   -- on_track, at_risk, behind, blocked, completed
  current_implementation TEXT NOT NULL,  -- Current implementation level
  current_maturity INTEGER DEFAULT 0,    -- Current maturity score (0-5)
  completion_percentage INTEGER DEFAULT 0, -- Completion percentage (0-100)
  target_completion_date DATE,           -- Target completion date
  assigned_to TEXT,                      -- Person/team assigned
  blockers TEXT,                         -- Current blockers (JSON array)
  notes TEXT,                            -- Progress notes
  evidence_links TEXT,                   -- Evidence of progress (JSON array)
  updated_by TEXT NOT NULL,              -- Who made the update
  update_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id),
  FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_progress_tracking_profile_id ON progress_tracking(profile_id);
CREATE INDEX idx_progress_tracking_subcategory_id ON progress_tracking(subcategory_id);
CREATE INDEX idx_progress_tracking_status ON progress_tracking(status);
CREATE INDEX idx_progress_tracking_completion ON progress_tracking(completion_percentage);
CREATE INDEX idx_progress_tracking_target_date ON progress_tracking(target_completion_date);
CREATE INDEX idx_progress_tracking_update_date ON progress_tracking(update_date);
CREATE INDEX idx_progress_composite ON progress_tracking(profile_id, status, completion_percentage);
```

### milestones

Project milestones and achievement tracking.

```sql
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,                    -- Milestone ID
  implementation_plan_id TEXT,           -- Related implementation plan (optional)
  profile_id TEXT NOT NULL,               -- Target profile
  milestone_name TEXT NOT NULL,           -- Milestone name
  description TEXT,                       -- Milestone description
  target_date DATE NOT NULL,              -- Target achievement date
  actual_completion_date DATE,           -- Actual completion date
  success_criteria TEXT NOT NULL,        -- Success criteria (JSON array)
  deliverables TEXT,                     -- Expected deliverables (JSON array)
  status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, delayed, at_risk
  completion_percentage INTEGER DEFAULT 0, -- Completion percentage
  notes TEXT,                            -- Progress notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (implementation_plan_id) REFERENCES implementation_plans (id),
  FOREIGN KEY (profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_milestones_plan_id ON milestones(implementation_plan_id);
CREATE INDEX idx_milestones_profile_id ON milestones(profile_id);
CREATE INDEX idx_milestones_target_date ON milestones(target_date);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_completion ON milestones(completion_percentage);
```

## Reporting Data Tables

### reports

Generated reports and executive summaries.

```sql
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,                    -- Report ID
  profile_id TEXT NOT NULL,               -- Source profile
  report_type TEXT NOT NULL,              -- executive, technical, compliance, progress
  report_format TEXT NOT NULL,            -- json, html, pdf, markdown
  report_name TEXT NOT NULL,              -- Report name/title
  file_path TEXT,                        -- File system path (for file reports)
  content TEXT,                          -- Report content (for content reports)
  metadata TEXT NOT NULL,                -- Report metadata (JSON)
  report_summary TEXT,                   -- Key findings summary (JSON)
  generated_by TEXT,                     -- Report generator
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_reports_profile_id ON reports(profile_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_format ON reports(report_format);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);
```

### data_exports

Exported data tracking and metadata.

```sql
CREATE TABLE IF NOT EXISTS data_exports (
  id TEXT PRIMARY KEY,                    -- Export ID
  profile_id TEXT NOT NULL,               -- Source profile
  export_format TEXT NOT NULL,           -- json, csv, xlsx, xml
  export_template TEXT NOT NULL,         -- standard, compliance_audit, vendor_assessment
  file_path TEXT,                        -- Export file path
  record_count INTEGER DEFAULT 0,        -- Number of records exported
  file_size INTEGER DEFAULT 0,           -- File size in bytes
  included_sections TEXT NOT NULL,       -- Sections included (JSON array)
  data_filters TEXT,                     -- Applied filters (JSON)
  export_summary TEXT NOT NULL,          -- Export statistics (JSON)
  exported_by TEXT,                      -- Who performed the export
  exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles (id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_data_exports_profile_id ON data_exports(profile_id);
CREATE INDEX idx_data_exports_format ON data_exports(export_format);
CREATE INDEX idx_data_exports_template ON data_exports(export_template);
CREATE INDEX idx_data_exports_exported_at ON data_exports(exported_at);
```

## Audit and System Tables

### audit_logs

Security audit trail and change tracking.

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,                    -- Audit log ID
  table_name TEXT NOT NULL,               -- Affected table
  record_id TEXT NOT NULL,                -- Affected record ID
  operation TEXT NOT NULL,                -- INSERT, UPDATE, DELETE
  old_values TEXT,                       -- Previous values (JSON)
  new_values TEXT,                       -- New values (JSON)
  user_id TEXT,                          -- User who made the change
  ip_address TEXT,                       -- Source IP address
  user_agent TEXT,                       -- User agent string
  session_id TEXT,                       -- Session identifier
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_composite ON audit_logs(table_name, record_id, timestamp);
```

### system_metadata

System configuration and metadata.

```sql
CREATE TABLE IF NOT EXISTS system_metadata (
  key TEXT PRIMARY KEY,                   -- Metadata key
  value TEXT NOT NULL,                    -- Metadata value
  data_type TEXT NOT NULL,                -- string, number, boolean, json
  description TEXT,                       -- Key description
  category TEXT,                         -- Metadata category
  is_system BOOLEAN DEFAULT 1,           -- System vs user metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize system metadata
INSERT OR IGNORE INTO system_metadata (key, value, data_type, description, category) VALUES
('schema_version', '2.0.0', 'string', 'Database schema version', 'system'),
('framework_version', '2.0', 'string', 'NIST CSF framework version', 'framework'),
('last_framework_update', datetime('now'), 'string', 'Last framework data update', 'framework'),
('installation_date', datetime('now'), 'string', 'System installation date', 'system');
```

**Indexes:**
```sql
CREATE INDEX idx_system_metadata_category ON system_metadata(category);
CREATE INDEX idx_system_metadata_is_system ON system_metadata(is_system);
```

## Views and Common Queries

### Materialized Views (Implemented as Tables with Triggers)

#### assessment_summary_view

```sql
CREATE VIEW assessment_summary_view AS
SELECT 
  p.id as profile_id,
  p.profile_name,
  p.profile_type,
  op.name as organization_name,
  op.sector,
  op.size,
  COUNT(pa.id) as total_assessments,
  AVG(pa.maturity_score) as average_maturity,
  COUNT(CASE WHEN pa.implementation_level = 'fully_implemented' THEN 1 END) as fully_implemented_count,
  COUNT(CASE WHEN pa.implementation_level = 'largely_implemented' THEN 1 END) as largely_implemented_count,
  COUNT(CASE WHEN pa.implementation_level = 'partially_implemented' THEN 1 END) as partially_implemented_count,
  COUNT(CASE WHEN pa.implementation_level = 'not_implemented' THEN 1 END) as not_implemented_count,
  ROUND(
    (COUNT(CASE WHEN pa.implementation_level IN ('fully_implemented', 'largely_implemented') THEN 1 END) * 100.0) / 
    COUNT(pa.id), 2
  ) as implementation_percentage
FROM profiles p
JOIN organization_profiles op ON p.org_id = op.id
LEFT JOIN profile_assessments pa ON p.id = pa.profile_id
GROUP BY p.id, p.profile_name, p.profile_type, op.name, op.sector, op.size;
```

#### function_maturity_view

```sql
CREATE VIEW function_maturity_view AS
SELECT 
  p.id as profile_id,
  s.function_id,
  f.name as function_name,
  COUNT(pa.id) as assessed_subcategories,
  AVG(pa.maturity_score) as average_maturity_score,
  COUNT(CASE WHEN pa.implementation_level = 'fully_implemented' THEN 1 END) as fully_implemented,
  COUNT(CASE WHEN pa.implementation_level = 'largely_implemented' THEN 1 END) as largely_implemented,
  COUNT(CASE WHEN pa.implementation_level = 'partially_implemented' THEN 1 END) as partially_implemented,
  COUNT(CASE WHEN pa.implementation_level = 'not_implemented' THEN 1 END) as not_implemented,
  ROUND(
    (COUNT(CASE WHEN pa.implementation_level IN ('fully_implemented', 'largely_implemented') THEN 1 END) * 100.0) / 
    COUNT(pa.id), 2
  ) as function_completion_percentage
FROM profiles p
CROSS JOIN functions f
LEFT JOIN subcategories s ON s.function_id = f.id
LEFT JOIN profile_assessments pa ON pa.profile_id = p.id AND pa.subcategory_id = s.id
GROUP BY p.id, s.function_id, f.name;
```

### Common Query Patterns

#### Get Complete Profile Assessment Data
```sql
-- Optimized query for retrieving complete profile assessment data
SELECT 
  p.id as profile_id,
  p.profile_name,
  op.name as organization_name,
  s.id as subcategory_id,
  s.name as subcategory_name,
  s.function_id,
  f.name as function_name,
  c.id as category_id,
  c.name as category_name,
  pa.implementation_level,
  pa.maturity_score,
  pa.assessment_date,
  pa.assessed_by,
  pt.status as progress_status,
  pt.completion_percentage,
  pt.target_completion_date
FROM profiles p
JOIN organization_profiles op ON p.org_id = op.id
JOIN profile_assessments pa ON pa.profile_id = p.id
JOIN subcategories s ON s.id = pa.subcategory_id
JOIN categories c ON c.id = s.category_id
JOIN functions f ON f.id = s.function_id
LEFT JOIN progress_tracking pt ON pt.profile_id = p.id AND pt.subcategory_id = s.id
WHERE p.id = ?
ORDER BY s.function_id, s.category_id, s.id;
```

#### Risk Score Calculation Query
```sql
-- Complex query for calculating risk scores by function
SELECT 
  p.id as profile_id,
  s.function_id,
  f.name as function_name,
  COUNT(pa.id) as subcategory_count,
  COUNT(CASE WHEN pa.implementation_level = 'not_implemented' THEN 1 END) as high_risk_count,
  AVG(
    CASE pa.implementation_level
      WHEN 'not_implemented' THEN 100
      WHEN 'partially_implemented' THEN 60
      WHEN 'largely_implemented' THEN 30
      WHEN 'fully_implemented' THEN 0
    END + (5 - COALESCE(pa.maturity_score, 0)) * 10
  ) as raw_risk_score,
  MAX(
    CASE pa.implementation_level
      WHEN 'not_implemented' THEN 100
      WHEN 'partially_implemented' THEN 60  
      WHEN 'largely_implemented' THEN 30
      WHEN 'fully_implemented' THEN 0
    END + (5 - COALESCE(pa.maturity_score, 0)) * 10
  ) as max_risk
FROM profiles p
JOIN profile_assessments pa ON pa.profile_id = p.id
JOIN subcategories s ON s.id = pa.subcategory_id
JOIN functions f ON f.id = s.function_id
WHERE p.id = ?
GROUP BY p.id, s.function_id, f.name
ORDER BY raw_risk_score DESC;
```

## Performance Optimization

### Query Performance Guidelines

1. **Use Appropriate Indexes**: All foreign keys and commonly queried columns are indexed
2. **Limit Result Sets**: Use LIMIT clauses for large datasets
3. **Optimize JOINs**: Use proper JOIN order and conditions
4. **Use Views**: Leverage predefined views for complex aggregations
5. **Batch Operations**: Use transactions for multiple related operations

### Index Maintenance

```sql
-- Analyze tables to update query planner statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX;

-- Check index usage
EXPLAIN QUERY PLAN SELECT * FROM profile_assessments WHERE profile_id = 'PROF-123';
```

### Database Maintenance

```sql
-- Vacuum database to reclaim space and optimize
VACUUM;

-- Check database integrity
PRAGMA integrity_check;

-- Check foreign key constraints
PRAGMA foreign_key_check;

-- Database size analysis
SELECT 
  name,
  COUNT(*) as row_count,
  ROUND(SUM(pgsize) / 1024.0 / 1024.0, 2) as size_mb
FROM dbstat 
GROUP BY name 
ORDER BY size_mb DESC;
```

## Data Migration and Versioning

### Schema Version Management

```sql
-- Check current schema version
SELECT value FROM system_metadata WHERE key = 'schema_version';

-- Update schema version after migrations
UPDATE system_metadata 
SET value = '2.1.0', updated_at = CURRENT_TIMESTAMP 
WHERE key = 'schema_version';
```

### Migration Scripts

Migration scripts are stored in `/migrations/` directory and follow the naming convention:
- `001_initial_schema.sql`
- `002_add_progress_tracking.sql`
- `003_add_audit_logs.sql`

## Security Considerations

### Data Protection

1. **Parameterized Queries**: All queries use parameter binding to prevent SQL injection
2. **Input Validation**: Zod schemas validate all input data
3. **Access Control**: Application-level access control with role-based permissions
4. **Audit Trail**: Complete audit logging of all data modifications
5. **Data Encryption**: Sensitive data encrypted at rest and in transit

### Backup and Recovery

```sql
-- Create backup
.backup backup_20240312.db

-- Restore from backup  
.restore backup_20240312.db

-- Export specific tables
.mode csv
.output assessments_backup.csv
SELECT * FROM profile_assessments;
```

This comprehensive schema supports the full lifecycle of cybersecurity assessments from initial evaluation through implementation planning, progress tracking, and compliance reporting.