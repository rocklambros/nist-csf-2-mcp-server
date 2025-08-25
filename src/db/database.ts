/**
 * Database connection and query wrapper for NIST CSF MCP Server
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import type { 
  OrganizationProfile, 
  SubcategoryImplementation, 
  RiskAssessment, 
  GapAnalysis 
} from '../types/index.js';
import path from 'path';

export class CSFDatabase {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath?: string) {
    // Default to nist_csf.db in project root
    this.dbPath = dbPath || path.join(process.cwd(), 'nist_csf.db');
    
    try {
      this.db = new Database(this.dbPath, { 
        readonly: false,
        fileMustExist: false
      });
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Initialize schema if needed
      this.initializeSchema();
      
      logger.info(`Database connected: ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Initialize database schema if tables don't exist
   */
  private initializeSchema(): void {
    try {
      // Check if tables exist
      const tableExists = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='organization_profiles'"
      ).get();

      if (!tableExists) {
        logger.info('Initializing database schema...');
        this.createTables();
      }
    } catch (error) {
      logger.error('Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    const schema = `
      -- Organization profiles table
      CREATE TABLE IF NOT EXISTS organization_profiles (
        org_id TEXT PRIMARY KEY,
        org_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        size TEXT NOT NULL,
        current_tier TEXT,
        target_tier TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- CSF Framework reference tables
      CREATE TABLE IF NOT EXISTS functions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        function_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (function_id) REFERENCES functions(id)
      );

      CREATE TABLE IF NOT EXISTS subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        implementation_guidance TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- Subcategory implementations table
      CREATE TABLE IF NOT EXISTS subcategory_implementations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_status TEXT NOT NULL,
        maturity_level INTEGER CHECK (maturity_level >= 0 AND maturity_level <= 5),
        notes TEXT,
        evidence TEXT, /* JSON array stored as text */
        last_assessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        assessed_by TEXT,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, subcategory_id)
      );

      -- Risk assessments table
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        element_id TEXT NOT NULL,
        risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
        likelihood INTEGER CHECK (likelihood >= 1 AND likelihood <= 5),
        impact INTEGER CHECK (impact >= 1 AND impact <= 5),
        risk_score REAL,
        mitigation_status TEXT,
        mitigation_plan TEXT,
        assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        next_review_date DATETIME,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, element_id)
      );

      -- Gap analysis table
      CREATE TABLE IF NOT EXISTS gap_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        current_score REAL CHECK (current_score >= 0 AND current_score <= 5),
        target_score REAL CHECK (target_score >= 0 AND target_score <= 5),
        gap_score REAL,
        priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
        estimated_effort TEXT,
        target_date DATETIME,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, category_id)
      );

      -- Profiles table (separate from organizations for versioning)
      CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        profile_name TEXT NOT NULL,
        profile_type TEXT NOT NULL CHECK (profile_type IN ('baseline', 'target', 'current', 'custom')),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        is_active BOOLEAN DEFAULT 1,
        parent_profile_id TEXT,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        FOREIGN KEY (parent_profile_id) REFERENCES profiles(profile_id)
      );

      -- Assessments table (links profiles to evaluated subcategories)
      CREATE TABLE IF NOT EXISTS assessments (
        assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_level TEXT CHECK (implementation_level IN ('not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented')),
        maturity_score INTEGER CHECK (maturity_score >= 0 AND maturity_score <= 5),
        confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
        notes TEXT,
        evidence TEXT,
        assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assessed_by TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        UNIQUE(profile_id, subcategory_id)
      );

      -- Implementation Plans table
      CREATE TABLE IF NOT EXISTS implementation_plans (
        id TEXT PRIMARY KEY,
        gap_analysis_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        timeline_months INTEGER NOT NULL,
        available_resources INTEGER NOT NULL,
        total_phases INTEGER NOT NULL,
        total_effort_hours INTEGER NOT NULL,
        estimated_cost REAL,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      -- Implementation Plan Phases table
      CREATE TABLE IF NOT EXISTS implementation_phases (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        phase_number INTEGER NOT NULL,
        phase_name TEXT NOT NULL,
        start_month INTEGER NOT NULL,
        end_month INTEGER NOT NULL,
        effort_hours INTEGER NOT NULL,
        resource_count INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (plan_id) REFERENCES implementation_plans(id)
      );

      -- Implementation Plan Items table
      CREATE TABLE IF NOT EXISTS implementation_items (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        priority_rank INTEGER NOT NULL,
        effort_hours INTEGER NOT NULL,
        dependencies TEXT,
        status TEXT DEFAULT 'pending',
        completion_percentage INTEGER DEFAULT 0,
        FOREIGN KEY (phase_id) REFERENCES implementation_phases(id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      );

      -- Subcategory Dependencies table
      CREATE TABLE IF NOT EXISTS subcategory_dependencies (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        depends_on_subcategory_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL,
        dependency_strength INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
        FOREIGN KEY (depends_on_subcategory_id) REFERENCES subcategories(id)
      );

      -- Cost Estimates table
      CREATE TABLE IF NOT EXISTS cost_estimates (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        organization_size TEXT NOT NULL,
        labor_cost REAL NOT NULL,
        tools_cost REAL NOT NULL,
        training_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        effort_hours INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      );

      -- Progress Tracking table
      CREATE TABLE IF NOT EXISTS progress_tracking (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        baseline_implementation TEXT,
        current_implementation TEXT,
        target_implementation TEXT,
        baseline_maturity INTEGER,
        current_maturity INTEGER,
        target_maturity INTEGER,
        completion_percentage INTEGER DEFAULT 0,
        status TEXT DEFAULT 'on_track',
        is_blocked BOOLEAN DEFAULT 0,
        blocking_reason TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        days_since_update INTEGER DEFAULT 0,
        trend TEXT DEFAULT 'stable',
        notes TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
        UNIQUE(profile_id, subcategory_id)
      );

      -- Progress Milestones table
      CREATE TABLE IF NOT EXISTS progress_milestones (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        milestone_name TEXT NOT NULL,
        target_date DATE,
        completion_date DATE,
        status TEXT DEFAULT 'pending',
        completion_percentage INTEGER DEFAULT 0,
        subcategories_involved TEXT,
        success_criteria TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_categories_function ON categories(function_id);
      CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
      CREATE INDEX IF NOT EXISTS idx_implementations_org ON subcategory_implementations(org_id);
      CREATE INDEX IF NOT EXISTS idx_implementations_subcategory ON subcategory_implementations(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_assessments(org_id);
      CREATE INDEX IF NOT EXISTS idx_risk_element ON risk_assessments(element_id);
      CREATE INDEX IF NOT EXISTS idx_gap_org ON gap_analysis(org_id);
      CREATE INDEX IF NOT EXISTS idx_gap_category ON gap_analysis(category_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(org_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_profile ON assessments(profile_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_subcategory ON assessments(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_impl_plans_gap ON implementation_plans(gap_analysis_id);
      CREATE INDEX IF NOT EXISTS idx_impl_phases_plan ON implementation_phases(plan_id);
      CREATE INDEX IF NOT EXISTS idx_impl_items_phase ON implementation_items(phase_id);
      CREATE INDEX IF NOT EXISTS idx_dependencies_subcategory ON subcategory_dependencies(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_cost_estimates_subcategory ON cost_estimates(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress_tracking(profile_id);
      CREATE INDEX IF NOT EXISTS idx_progress_subcategory ON progress_tracking(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_progress_status ON progress_tracking(status);
      CREATE INDEX IF NOT EXISTS idx_milestones_profile ON progress_milestones(profile_id);
      CREATE INDEX IF NOT EXISTS idx_milestones_status ON progress_milestones(status);

      -- Industry benchmark data
      CREATE TABLE IF NOT EXISTS industry_benchmarks (
        id TEXT PRIMARY KEY,
        industry TEXT NOT NULL,
        organization_size TEXT NOT NULL,
        csf_function TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        percentile_25 REAL,
        percentile_50 REAL,
        percentile_75 REAL,
        percentile_90 REAL,
        average_score REAL,
        sample_size INTEGER,
        data_year INTEGER,
        source TEXT,
        notes TEXT,
        UNIQUE(industry, organization_size, csf_function, metric_name, data_year)
      );

      CREATE INDEX IF NOT EXISTS idx_benchmarks_industry ON industry_benchmarks(industry, organization_size);

      -- Audit Evidence Table for storing assessment evidence files
      CREATE TABLE IF NOT EXISTS audit_evidence (
        evidence_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        assessment_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash TEXT NOT NULL,
        upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
        uploaded_by TEXT,
        evidence_type TEXT, -- screenshot, document, log, report, config
        description TEXT,
        validation_status TEXT DEFAULT 'pending', -- pending, validated, rejected
        validation_notes TEXT,
        validated_by TEXT,
        validated_at TEXT,
        tags TEXT, -- JSON array of tags
        metadata TEXT, -- JSON object with additional metadata
        FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id),
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      );

      CREATE INDEX IF NOT EXISTS idx_evidence_assessment ON audit_evidence(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_profile ON audit_evidence(profile_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_subcategory ON audit_evidence(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_validation ON audit_evidence(validation_status);

      -- ============================================================================
      -- QUESTION BANK TABLES
      -- ============================================================================

      -- Question Bank table for storing assessment questions
      CREATE TABLE IF NOT EXISTS question_bank (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL CHECK (question_type IN ('maturity_rating', 'implementation_status', 'yes_no', 'multiple_choice')),
        help_text TEXT,
        organization_size TEXT, /* 'small', 'medium', 'large', 'enterprise', or NULL for all sizes */
        sector TEXT, /* 'technology', 'healthcare', 'finance', 'government', 'other', or NULL for all sectors */
        weight REAL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 2.0),
        required BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      );

      -- Question Options table for multiple choice and rating questions
      CREATE TABLE IF NOT EXISTS question_options (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        option_value INTEGER NOT NULL,
        option_label TEXT NOT NULL,
        option_description TEXT,
        weight REAL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1.0),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
        UNIQUE(question_id, option_value)
      );

      -- Question Examples table for implementation examples
      CREATE TABLE IF NOT EXISTS question_examples (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        example_text TEXT NOT NULL,
        example_type TEXT DEFAULT 'implementation' CHECK (example_type IN ('implementation', 'evidence', 'reference')),
        organization_size TEXT, /* Size-specific examples */
        sector TEXT, /* Sector-specific examples */
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
      );

      -- Question Context table for additional guidance
      CREATE TABLE IF NOT EXISTS question_context (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        risk_factors TEXT, /* JSON array of risk factors */
        best_practices TEXT, /* JSON array of best practices */
        common_challenges TEXT, /* JSON array of common challenges */
        sector_guidance TEXT, /* JSON object with sector-specific guidance */
        implementation_roadmap TEXT, /* JSON array of implementation steps */
        related_subcategories TEXT, /* JSON array of related subcategory IDs */
        reference_materials TEXT, /* JSON array of reference materials */
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
        UNIQUE(subcategory_id)
      );

      -- Question Responses table for storing assessment responses
      CREATE TABLE IF NOT EXISTS question_responses (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        response_value INTEGER,
        response_text TEXT,
        confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
        notes TEXT,
        evidence TEXT, /* JSON array of evidence items */
        responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_by TEXT,
        validated BOOLEAN DEFAULT 0,
        validation_notes TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        FOREIGN KEY (question_id) REFERENCES question_bank(id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
        UNIQUE(profile_id, question_id)
      );

      -- Question Validation Rules table for conditional logic
      CREATE TABLE IF NOT EXISTS question_validation_rules (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        rule_type TEXT NOT NULL CHECK (rule_type IN ('required_if', 'skip_if', 'show_if', 'validate_range')),
        condition_field TEXT, /* Field to check condition against */
        condition_operator TEXT CHECK (condition_operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in_list')),
        condition_value TEXT, /* Value to compare against */
        rule_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
      );

      -- Question Bank Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_question_bank_subcategory ON question_bank(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(question_type);
      CREATE INDEX IF NOT EXISTS idx_question_bank_size ON question_bank(organization_size);
      CREATE INDEX IF NOT EXISTS idx_question_bank_sector ON question_bank(sector);
      CREATE INDEX IF NOT EXISTS idx_question_bank_required ON question_bank(required);
      CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
      CREATE INDEX IF NOT EXISTS idx_question_examples_question ON question_examples(question_id);
      CREATE INDEX IF NOT EXISTS idx_question_context_subcategory ON question_context(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_question_responses_profile ON question_responses(profile_id);
      CREATE INDEX IF NOT EXISTS idx_question_responses_question ON question_responses(question_id);
      CREATE INDEX IF NOT EXISTS idx_question_responses_subcategory ON question_responses(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_question_validation_question ON question_validation_rules(question_id);

      -- Milestones table for project milestones
      CREATE TABLE IF NOT EXISTS milestones (
        milestone_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        milestone_type TEXT NOT NULL CHECK (milestone_type IN ('assessment', 'implementation', 'review', 'audit', 'custom')),
        title TEXT NOT NULL,
        description TEXT,
        target_date TEXT NOT NULL,
        priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
        assigned_to TEXT,
        status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'overdue')),
        progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        dependencies TEXT, -- JSON array
        success_criteria TEXT, -- JSON array
        estimated_effort_hours INTEGER,
        budget_estimate REAL,
        stakeholders TEXT, -- JSON array
        deliverables TEXT, -- JSON array
        subcategory_scope TEXT, -- JSON array
        function_scope TEXT,
        created_date TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      -- Audit Trail table for tracking all system activities
      CREATE TABLE IF NOT EXISTS audit_trail (
        audit_id TEXT PRIMARY KEY,
        profile_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL CHECK (resource_type IN ('profile', 'assessment', 'evidence', 'report', 'user', 'system', 'test')),
        resource_id TEXT,
        performed_by TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,
        authentication_method TEXT,
        before_state TEXT, -- JSON
        after_state TEXT, -- JSON
        modification_reason TEXT,
        bulk_operation BOOLEAN DEFAULT 0,
        affected_resources TEXT, -- JSON array
        batch_size INTEGER,
        details TEXT, -- JSON
        timestamp TEXT NOT NULL,
        success BOOLEAN DEFAULT 1,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      -- Organizations table (alias/view for organization_profiles for compatibility)
      CREATE VIEW IF NOT EXISTS organizations AS 
      SELECT org_id, org_name, industry, size, current_tier, target_tier, created_at, updated_at 
      FROM organization_profiles;

      -- Indexes for new tables
      CREATE INDEX IF NOT EXISTS idx_milestones_profile ON milestones(profile_id);
      CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
      CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_profile ON audit_trail(profile_id);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
      CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
    `;

    this.db.exec(schema);
    logger.info('Database schema created successfully');
  }

  // ============================================================================
  // ORGANIZATION PROFILES
  // ============================================================================

  getOrganization(orgId: string): OrganizationProfile | undefined {
    const stmt = this.db.prepare('SELECT * FROM organization_profiles WHERE org_id = ?');
    return stmt.get(orgId) as OrganizationProfile | undefined;
  }

  createOrganization(org: Omit<OrganizationProfile, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO organization_profiles (org_id, org_name, industry, size, current_tier, target_tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(org.org_id, org.org_name, org.industry, org.size, org.current_tier, org.target_tier);
  }

  updateOrganization(orgId: string, updates: Partial<OrganizationProfile>): void {
    const fields = Object.keys(updates)
      .filter(key => key !== 'org_id' && key !== 'created_at')
      .map(key => `${key} = ?`);
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    const values = Object.values(updates).filter((_, idx) => {
      const key = Object.keys(updates)[idx];
      return key !== 'org_id' && key !== 'created_at';
    });
    values.push(orgId);
    
    const stmt = this.db.prepare(`
      UPDATE organization_profiles 
      SET ${fields.join(', ')}
      WHERE org_id = ?
    `);
    
    stmt.run(...values);
  }

  // ============================================================================
  // SUBCATEGORY IMPLEMENTATIONS
  // ============================================================================

  getImplementations(orgId: string): SubcategoryImplementation[] {
    const stmt = this.db.prepare('SELECT * FROM subcategory_implementations WHERE org_id = ?');
    const results = stmt.all(orgId) as any[];
    
    // Parse evidence JSON
    return results.map(row => ({
      ...row,
      evidence: row.evidence ? JSON.parse(row.evidence) : []
    }));
  }

  getImplementation(orgId: string, subcategoryId: string): SubcategoryImplementation | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM subcategory_implementations WHERE org_id = ? AND subcategory_id = ?'
    );
    const result = stmt.get(orgId, subcategoryId) as any;
    
    if (result) {
      result.evidence = result.evidence ? JSON.parse(result.evidence) : [];
    }
    
    return result;
  }

  upsertImplementation(impl: SubcategoryImplementation): void {
    const evidenceJson = impl.evidence ? JSON.stringify(impl.evidence) : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO subcategory_implementations (
        org_id, subcategory_id, implementation_status, maturity_level, 
        notes, evidence, assessed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, subcategory_id) DO UPDATE SET
        implementation_status = excluded.implementation_status,
        maturity_level = excluded.maturity_level,
        notes = excluded.notes,
        evidence = excluded.evidence,
        last_assessed = CURRENT_TIMESTAMP,
        assessed_by = excluded.assessed_by
    `);
    
    stmt.run(
      impl.org_id,
      impl.subcategory_id,
      impl.implementation_status,
      impl.maturity_level,
      impl.notes,
      evidenceJson,
      impl.assessed_by
    );
  }

  // ============================================================================
  // RISK ASSESSMENTS
  // ============================================================================

  getRiskAssessments(orgId: string): RiskAssessment[] {
    const stmt = this.db.prepare('SELECT * FROM risk_assessments WHERE org_id = ?');
    return stmt.all(orgId) as RiskAssessment[];
  }

  getRiskAssessment(orgId: string, elementId: string): RiskAssessment | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM risk_assessments WHERE org_id = ? AND element_id = ?'
    );
    return stmt.get(orgId, elementId) as RiskAssessment | undefined;
  }

  upsertRiskAssessment(risk: RiskAssessment): void {
    const stmt = this.db.prepare(`
      INSERT INTO risk_assessments (
        org_id, element_id, risk_level, likelihood, impact, 
        risk_score, mitigation_status, mitigation_plan, next_review_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, element_id) DO UPDATE SET
        risk_level = excluded.risk_level,
        likelihood = excluded.likelihood,
        impact = excluded.impact,
        risk_score = excluded.risk_score,
        mitigation_status = excluded.mitigation_status,
        mitigation_plan = excluded.mitigation_plan,
        assessment_date = CURRENT_TIMESTAMP,
        next_review_date = excluded.next_review_date
    `);
    
    const riskScore = (risk.likelihood * risk.impact) / 5.0;
    
    stmt.run(
      risk.org_id,
      risk.element_id,
      risk.risk_level,
      risk.likelihood,
      risk.impact,
      riskScore,
      risk.mitigation_status,
      risk.mitigation_plan,
      risk.next_review_date
    );
  }

  // ============================================================================
  // GAP ANALYSIS
  // ============================================================================

  getGapAnalyses(orgId: string): GapAnalysis[] {
    const stmt = this.db.prepare('SELECT * FROM gap_analysis WHERE org_id = ?');
    return stmt.all(orgId) as GapAnalysis[];
  }

  getGapAnalysis(orgId: string, categoryId: string): GapAnalysis | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM gap_analysis WHERE org_id = ? AND category_id = ?'
    );
    return stmt.get(orgId, categoryId) as GapAnalysis | undefined;
  }

  upsertGapAnalysis(gap: GapAnalysis): void {
    const gapScore = gap.target_score - gap.current_score;
    
    const stmt = this.db.prepare(`
      INSERT INTO gap_analysis (
        org_id, category_id, current_score, target_score, 
        gap_score, priority, estimated_effort, target_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, category_id) DO UPDATE SET
        current_score = excluded.current_score,
        target_score = excluded.target_score,
        gap_score = excluded.gap_score,
        priority = excluded.priority,
        estimated_effort = excluded.estimated_effort,
        target_date = excluded.target_date,
        analysis_date = CURRENT_TIMESTAMP
    `);
    
    stmt.run(
      gap.org_id,
      gap.category_id,
      gap.current_score,
      gap.target_score,
      gapScore,
      gap.priority,
      gap.estimated_effort,
      gap.target_date
    );
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  createProfile(profile: {
    profile_id: string;
    org_id: string;
    profile_name: string;
    profile_type: 'baseline' | 'target' | 'current' | 'custom';
    description?: string;
    created_by?: string;
    parent_profile_id?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO profiles (
        profile_id, org_id, profile_name, profile_type, 
        description, created_by, parent_profile_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      profile.profile_id,
      profile.org_id,
      profile.profile_name,
      profile.profile_type,
      profile.description || null,
      profile.created_by || null,
      profile.parent_profile_id || null
    );
  }

  getProfile(profileId: string): any {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE profile_id = ?');
    return stmt.get(profileId);
  }

  getOrganizationProfiles(orgId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE org_id = ? AND is_active = 1');
    return stmt.all(orgId);
  }

  cloneProfile(sourceProfileId: string, newProfileId: string, newName: string): void {
    // Clone the profile
    const cloneProfileStmt = this.db.prepare(`
      INSERT INTO profiles (profile_id, org_id, profile_name, profile_type, description, created_by, parent_profile_id)
      SELECT ?, org_id, ?, profile_type, description, created_by, ?
      FROM profiles WHERE profile_id = ?
    `);
    
    cloneProfileStmt.run(newProfileId, newName, sourceProfileId, sourceProfileId);
    
    // Clone all assessments
    const cloneAssessmentsStmt = this.db.prepare(`
      INSERT INTO assessments (
        profile_id, subcategory_id, implementation_level, 
        maturity_score, confidence_level, notes, evidence, assessed_by
      )
      SELECT ?, subcategory_id, implementation_level, 
             maturity_score, confidence_level, notes, evidence, assessed_by
      FROM assessments WHERE profile_id = ?
    `);
    
    cloneAssessmentsStmt.run(newProfileId, sourceProfileId);
  }

  // ============================================================================
  // ASSESSMENT MANAGEMENT
  // ============================================================================

  createAssessment(assessment: {
    profile_id: string;
    subcategory_id: string;
    implementation_level: 'not_implemented' | 'partially_implemented' | 'largely_implemented' | 'fully_implemented';
    maturity_score: number;
    confidence_level?: 'low' | 'medium' | 'high';
    notes?: string;
    evidence?: string;
    assessed_by?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO assessments (
        profile_id, subcategory_id, implementation_level,
        maturity_score, confidence_level, notes, evidence, assessed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, subcategory_id) DO UPDATE SET
        implementation_level = excluded.implementation_level,
        maturity_score = excluded.maturity_score,
        confidence_level = excluded.confidence_level,
        notes = excluded.notes,
        evidence = excluded.evidence,
        assessed_by = excluded.assessed_by,
        assessed_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(
      assessment.profile_id,
      assessment.subcategory_id,
      assessment.implementation_level,
      assessment.maturity_score,
      assessment.confidence_level || 'medium',
      assessment.notes || null,
      assessment.evidence || null,
      assessment.assessed_by || null
    );
  }

  createBulkAssessments(profileId: string, assessments: any[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO assessments (
        profile_id, subcategory_id, implementation_level,
        maturity_score, confidence_level, notes, evidence, assessed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, subcategory_id) DO UPDATE SET
        implementation_level = excluded.implementation_level,
        maturity_score = excluded.maturity_score,
        confidence_level = excluded.confidence_level,
        notes = excluded.notes,
        evidence = excluded.evidence,
        assessed_by = excluded.assessed_by,
        assessed_at = CURRENT_TIMESTAMP
    `);
    
    const insertMany = this.db.transaction((assessments: any[]) => {
      for (const assessment of assessments) {
        stmt.run(
          profileId,
          assessment.subcategory_id,
          assessment.implementation_level,
          assessment.maturity_score,
          assessment.confidence_level || 'medium',
          assessment.notes || null,
          assessment.evidence || null,
          assessment.assessed_by || null
        );
      }
    });
    
    insertMany(assessments);
  }

  getProfileAssessments(profileId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM assessments WHERE profile_id = ?');
    return stmt.all(profileId);
  }

  getAssessmentsBySubcategory(profileId: string, subcategoryId: string): any {
    const stmt = this.db.prepare(
      'SELECT * FROM assessments WHERE profile_id = ? AND subcategory_id = ?'
    );
    return stmt.get(profileId, subcategoryId);
  }

  // ============================================================================
  // GAP ANALYSIS OPERATIONS
  // ============================================================================

  generateGapAnalysis(currentProfileId: string, targetProfileId: string, analysisId: string): any {
    // Complex SQL to compare profiles and generate gap analysis
    const sql = `
      WITH current_assessments AS (
        SELECT 
          subcategory_id,
          implementation_level,
          maturity_score,
          confidence_level
        FROM assessments
        WHERE profile_id = ?
      ),
      target_assessments AS (
        SELECT 
          subcategory_id,
          implementation_level,
          maturity_score,
          confidence_level
        FROM assessments
        WHERE profile_id = ?
      ),
      gap_calculations AS (
        SELECT 
          COALESCE(c.subcategory_id, t.subcategory_id) as subcategory_id,
          SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2) as function_id,
          SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 5) as category_id,
          COALESCE(c.maturity_score, 0) as current_score,
          COALESCE(t.maturity_score, 5) as target_score,
          COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) as gap_score,
          CASE 
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 3 THEN 'Critical'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 2 THEN 'High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 1 THEN 'Medium'
            ELSE 'Low'
          END as priority,
          -- Estimate effort based on gap size and current state
          CASE 
            WHEN COALESCE(c.maturity_score, 0) = 0 THEN 'Very High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 3 THEN 'High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 2 THEN 'Medium'
            ELSE 'Low'
          END as estimated_effort,
          -- Calculate risk impact
          CASE SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2)
            WHEN 'GV' THEN 1.5
            WHEN 'ID' THEN 1.3
            WHEN 'PR' THEN 1.4
            WHEN 'DE' THEN 1.2
            WHEN 'RS' THEN 1.1
            WHEN 'RC' THEN 1.0
            ELSE 1.0
          END * (COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0)) as risk_weighted_gap,
          c.implementation_level as current_implementation,
          t.implementation_level as target_implementation,
          COALESCE(c.confidence_level, 'low') as current_confidence,
          COALESCE(t.confidence_level, 'high') as target_confidence
        FROM current_assessments c
        FULL OUTER JOIN target_assessments t 
          ON c.subcategory_id = t.subcategory_id
      ),
      ranked_gaps AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (ORDER BY risk_weighted_gap DESC) as risk_rank,
          ROW_NUMBER() OVER (PARTITION BY function_id ORDER BY gap_score DESC) as function_rank,
          ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY gap_score DESC) as category_rank
        FROM gap_calculations
        WHERE gap_score > 0
      )
      INSERT INTO gap_analysis (
        id, org_id, category_id, current_score, target_score, 
        gap_score, priority, estimated_effort, target_date, analysis_date
      )
      SELECT 
        ? || '_' || category_id,
        (SELECT org_id FROM profiles WHERE profile_id = ?),
        category_id,
        AVG(current_score),
        AVG(target_score),
        AVG(gap_score),
        CASE 
          WHEN AVG(gap_score) >= 3 THEN 'Critical'
          WHEN AVG(gap_score) >= 2 THEN 'High'
          WHEN AVG(gap_score) >= 1 THEN 'Medium'
          ELSE 'Low'
        END,
        CASE 
          WHEN MAX(estimated_effort = 'Very High') THEN 'Very High'
          WHEN MAX(estimated_effort = 'High') THEN 'High'
          WHEN MAX(estimated_effort = 'Medium') THEN 'Medium'
          ELSE 'Low'
        END,
        DATE('now', '+90 days'),
        CURRENT_TIMESTAMP
      FROM ranked_gaps
      GROUP BY category_id;
    `;
    
    // Execute the insert
    this.db.prepare(sql).run(
      currentProfileId,
      targetProfileId,
      analysisId,
      currentProfileId
    );
    
    // Return the detailed gap analysis
    const detailSql = `
      WITH current_assessments AS (
        SELECT 
          subcategory_id,
          implementation_level,
          maturity_score,
          confidence_level
        FROM assessments
        WHERE profile_id = ?
      ),
      target_assessments AS (
        SELECT 
          subcategory_id,
          implementation_level,
          maturity_score,
          confidence_level
        FROM assessments
        WHERE profile_id = ?
      ),
      gap_calculations AS (
        SELECT 
          COALESCE(c.subcategory_id, t.subcategory_id) as subcategory_id,
          SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2) as function_id,
          SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 5) as category_id,
          COALESCE(c.maturity_score, 0) as current_score,
          COALESCE(t.maturity_score, 5) as target_score,
          COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) as gap_score,
          CASE 
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 3 THEN 'Critical'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 2 THEN 'High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 1 THEN 'Medium'
            ELSE 'Low'
          END as priority,
          CASE 
            WHEN COALESCE(c.maturity_score, 0) = 0 THEN 'Very High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 3 THEN 'High'
            WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 2 THEN 'Medium'
            ELSE 'Low'
          END as estimated_effort,
          CASE SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2)
            WHEN 'GV' THEN 1.5
            WHEN 'ID' THEN 1.3
            WHEN 'PR' THEN 1.4
            WHEN 'DE' THEN 1.2
            WHEN 'RS' THEN 1.1
            WHEN 'RC' THEN 1.0
            ELSE 1.0
          END * (COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0)) as risk_weighted_gap,
          c.implementation_level as current_implementation,
          t.implementation_level as target_implementation
        FROM current_assessments c
        FULL OUTER JOIN target_assessments t 
          ON c.subcategory_id = t.subcategory_id
      )
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY risk_weighted_gap DESC) as risk_rank,
        ROW_NUMBER() OVER (PARTITION BY function_id ORDER BY gap_score DESC) as function_rank
      FROM gap_calculations
      WHERE gap_score > 0
      ORDER BY risk_weighted_gap DESC
    `;
    
    return this.db.prepare(detailSql).all(currentProfileId, targetProfileId);
  }

  getGapAnalysisDetails(analysisId: string): any {
    const sql = `
      SELECT 
        g.*,
        p.org_name,
        p.industry,
        p.size,
        COUNT(DISTINCT g.category_id) as total_categories,
        AVG(g.gap_score) as avg_gap_score,
        SUM(CASE WHEN g.priority = 'Critical' THEN 1 ELSE 0 END) as critical_gaps,
        SUM(CASE WHEN g.priority = 'High' THEN 1 ELSE 0 END) as high_gaps
      FROM gap_analysis g
      JOIN organization_profiles p ON g.org_id = p.org_id
      WHERE g.id LIKE ? || '%'
      GROUP BY g.org_id
    `;
    
    return this.db.prepare(sql).all(analysisId);
  }

  getPriorityMatrix(analysisId: string): any {
    // Get gap analysis with effort-impact calculations
    const sql = `
      WITH gap_data AS (
        SELECT 
          category_id,
          gap_score,
          priority,
          estimated_effort,
          current_score,
          target_score,
          -- Calculate impact score (normalized 0-10)
          MIN(10, gap_score * 2) as impact_score,
          -- Calculate effort score (normalized 0-10)
          CASE estimated_effort
            WHEN 'Low' THEN 2
            WHEN 'Medium' THEN 5
            WHEN 'High' THEN 8
            WHEN 'Very High' THEN 10
            ELSE 5
          END as effort_score
        FROM gap_analysis
        WHERE id LIKE ? || '%'
      ),
      matrix_classification AS (
        SELECT 
          *,
          CASE 
            WHEN impact_score >= 5 AND effort_score <= 5 THEN 'Quick Win'
            WHEN impact_score >= 5 AND effort_score > 5 THEN 'Strategic Initiative'
            WHEN impact_score < 5 AND effort_score <= 5 THEN 'Fill In'
            ELSE 'Low Priority'
          END as matrix_quadrant,
          ROW_NUMBER() OVER (PARTITION BY 
            CASE 
              WHEN impact_score >= 5 AND effort_score <= 5 THEN 'Quick Win'
              WHEN impact_score >= 5 AND effort_score > 5 THEN 'Strategic Initiative'
              WHEN impact_score < 5 AND effort_score <= 5 THEN 'Fill In'
              ELSE 'Low Priority'
            END 
            ORDER BY impact_score DESC, effort_score ASC
          ) as quadrant_rank
        FROM gap_data
      )
      SELECT 
        category_id,
        gap_score,
        priority,
        estimated_effort,
        current_score,
        target_score,
        ROUND(impact_score, 2) as impact_score,
        ROUND(effort_score, 2) as effort_score,
        matrix_quadrant,
        quadrant_rank
      FROM matrix_classification
      ORDER BY 
        CASE matrix_quadrant
          WHEN 'Quick Win' THEN 1
          WHEN 'Strategic Initiative' THEN 2
          WHEN 'Fill In' THEN 3
          ELSE 4
        END,
        quadrant_rank
    `;
    
    return this.db.prepare(sql).all(analysisId);
  }

  getPriorityMatrixFromAssessments(profileId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        a.subcategory_id,
        s.name as subcategory_name,
        a.implementation_level as current_implementation,
        'fully_implemented' as target_implementation,
        a.maturity_score as current_maturity,
        5 as target_maturity,
        CASE 
          WHEN a.implementation_level = 'not_implemented' THEN 100
          WHEN a.implementation_level = 'partially_implemented' THEN 60
          WHEN a.implementation_level = 'largely_implemented' THEN 30
          ELSE 0
        END as gap_score,
        a.confidence_score,
        CASE 
          WHEN a.implementation_level = 'not_implemented' THEN 8
          WHEN a.implementation_level = 'partially_implemented' THEN 5
          WHEN a.implementation_level = 'largely_implemented' THEN 3
          ELSE 1
        END as effort_score,
        CASE 
          WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('GV', 'PR') THEN 8
          WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('ID', 'DE') THEN 7
          ELSE 6
        END as impact_score,
        CASE 
          WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('GV', 'PR') THEN 9
          WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('ID', 'DE') THEN 7
          ELSE 5
        END as risk_score
      FROM assessments a
      JOIN subcategories s ON a.subcategory_id = s.id
      WHERE a.profile_id = ?
        AND a.implementation_level != 'fully_implemented'
      ORDER BY gap_score DESC
    `);
    
    return stmt.all(profileId);
  }

  // ============================================================================
  // ADVANCED MATURITY CALCULATIONS
  // ============================================================================

  getMaturityByFunction(profileId: string): any[] {
    // Complex SQL with CTEs to calculate maturity by function
    const sql = `
      WITH function_subcategories AS (
        SELECT 
          SUBSTR(subcategory_id, 1, 2) as function_id,
          subcategory_id,
          implementation_level,
          maturity_score,
          confidence_level
        FROM assessments
        WHERE profile_id = ?
      ),
      function_stats AS (
        SELECT 
          function_id,
          COUNT(*) as total_subcategories,
          SUM(CASE 
            WHEN implementation_level IN ('largely_implemented', 'fully_implemented') 
            THEN 1 ELSE 0 
          END) as implemented_count,
          AVG(maturity_score) as avg_maturity,
          MIN(maturity_score) as min_maturity,
          MAX(maturity_score) as max_maturity,
          SUM(CASE 
            WHEN confidence_level = 'high' THEN 3
            WHEN confidence_level = 'medium' THEN 2
            WHEN confidence_level = 'low' THEN 1
            ELSE 0
          END) * 1.0 / COUNT(*) as avg_confidence
        FROM function_subcategories
        GROUP BY function_id
      )
      SELECT 
        function_id,
        total_subcategories,
        implemented_count,
        ROUND((implemented_count * 100.0 / total_subcategories), 2) as implementation_percentage,
        ROUND(avg_maturity, 2) as avg_maturity,
        min_maturity,
        max_maturity,
        ROUND(avg_confidence, 2) as avg_confidence,
        CASE 
          WHEN (implemented_count * 100.0 / total_subcategories) <= 25 THEN 'Partial'
          WHEN (implemented_count * 100.0 / total_subcategories) <= 50 THEN 'Risk-Informed'
          WHEN (implemented_count * 100.0 / total_subcategories) <= 75 THEN 'Repeatable'
          ELSE 'Adaptive'
        END as maturity_tier
      FROM function_stats
      ORDER BY function_id
    `;
    
    return this.db.prepare(sql).all(profileId);
  }

  getRiskScoreData(profileId: string): any {
    // Calculate risk score based on gaps and criticality
    const sql = `
      WITH subcategory_risks AS (
        SELECT 
          a.subcategory_id,
          a.implementation_level,
          a.maturity_score,
          SUBSTR(a.subcategory_id, 1, 2) as function_id,
          CASE 
            WHEN a.implementation_level = 'not_implemented' THEN 100
            WHEN a.implementation_level = 'partially_implemented' THEN 60
            WHEN a.implementation_level = 'largely_implemented' THEN 30
            ELSE 0
          END as base_risk,
          -- Weight by function criticality
          CASE SUBSTR(a.subcategory_id, 1, 2)
            WHEN 'GV' THEN 1.5  -- Govern is critical
            WHEN 'ID' THEN 1.3  -- Identify is very important
            WHEN 'PR' THEN 1.4  -- Protect is very important
            WHEN 'DE' THEN 1.2  -- Detect is important
            WHEN 'RS' THEN 1.1  -- Respond is important
            WHEN 'RC' THEN 1.0  -- Recover is standard
            ELSE 1.0
          END as function_weight
        FROM assessments a
        WHERE a.profile_id = ?
      ),
      function_risks AS (
        SELECT 
          function_id,
          COUNT(*) as subcategory_count,
          AVG(base_risk * function_weight) as weighted_risk,
          MAX(base_risk) as max_risk,
          SUM(CASE WHEN base_risk > 50 THEN 1 ELSE 0 END) as high_risk_count
        FROM subcategory_risks
        GROUP BY function_id
      )
      SELECT 
        function_id,
        subcategory_count,
        ROUND(weighted_risk, 2) as weighted_risk_score,
        max_risk,
        high_risk_count,
        CASE 
          WHEN weighted_risk >= 75 THEN 'Critical'
          WHEN weighted_risk >= 50 THEN 'High'
          WHEN weighted_risk >= 25 THEN 'Medium'
          ELSE 'Low'
        END as risk_level
      FROM function_risks
      ORDER BY weighted_risk DESC
    `;
    
    const functionRisks = this.db.prepare(sql).all(profileId);
    
    // Calculate overall risk score
    const overallSql = `
      SELECT 
        AVG(
          CASE 
            WHEN implementation_level = 'not_implemented' THEN 100
            WHEN implementation_level = 'partially_implemented' THEN 60
            WHEN implementation_level = 'largely_implemented' THEN 30
            ELSE 0
          END * 
          CASE SUBSTR(subcategory_id, 1, 2)
            WHEN 'GV' THEN 1.5
            WHEN 'ID' THEN 1.3
            WHEN 'PR' THEN 1.4
            WHEN 'DE' THEN 1.2
            WHEN 'RS' THEN 1.1
            WHEN 'RC' THEN 1.0
            ELSE 1.0
          END
        ) as overall_risk_score
      FROM assessments
      WHERE profile_id = ?
    `;
    
    const overall = this.db.prepare(overallSql).get(profileId) as any;
    
    return {
      overall_risk_score: overall?.overall_risk_score || 0,
      function_risks: functionRisks
    };
  }

  getMaturityTrend(profileId: string, startDate?: string, endDate?: string): any[] {
    // Get historical maturity data with window functions
    const sql = `
      WITH RECURSIVE dates AS (
        SELECT 
          DATE(MIN(assessed_at)) as date
        FROM assessments 
        WHERE profile_id = ?
        UNION ALL
        SELECT 
          DATE(date, '+1 day')
        FROM dates
        WHERE date < DATE(COALESCE(?, 'now'))
      ),
      daily_assessments AS (
        SELECT 
          DATE(assessed_at) as assessment_date,
          SUBSTR(subcategory_id, 1, 2) as function_id,
          AVG(maturity_score) as avg_maturity,
          COUNT(*) as assessment_count
        FROM assessments
        WHERE profile_id = ?
          AND DATE(assessed_at) >= COALESCE(?, DATE('now', '-90 days'))
          AND DATE(assessed_at) <= COALESCE(?, DATE('now'))
        GROUP BY DATE(assessed_at), SUBSTR(subcategory_id, 1, 2)
      ),
      trend_data AS (
        SELECT 
          assessment_date,
          function_id,
          avg_maturity,
          assessment_count,
          AVG(avg_maturity) OVER (
            PARTITION BY function_id 
            ORDER BY assessment_date 
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
          ) as moving_avg_7d,
          LAG(avg_maturity, 1) OVER (
            PARTITION BY function_id 
            ORDER BY assessment_date
          ) as prev_maturity,
          FIRST_VALUE(avg_maturity) OVER (
            PARTITION BY function_id 
            ORDER BY assessment_date
          ) as initial_maturity
        FROM daily_assessments
      )
      SELECT 
        assessment_date,
        function_id,
        ROUND(avg_maturity, 2) as maturity_score,
        ROUND(moving_avg_7d, 2) as moving_avg_7d,
        ROUND(avg_maturity - COALESCE(prev_maturity, avg_maturity), 2) as daily_change,
        ROUND(avg_maturity - initial_maturity, 2) as total_change,
        ROUND(
          CASE 
            WHEN prev_maturity IS NOT NULL AND prev_maturity != 0 
            THEN ((avg_maturity - prev_maturity) / prev_maturity) * 100
            ELSE 0
          END, 2
        ) as change_percentage,
        assessment_count
      FROM trend_data
      ORDER BY assessment_date, function_id
    `;
    
    return this.db.prepare(sql).all(
      profileId,
      endDate,
      profileId,
      startDate,
      endDate
    );
  }

  getComprehensiveMaturityAnalysis(profileId: string): any {
    // Comprehensive analysis combining multiple metrics
    const sql = `
      WITH assessment_data AS (
        SELECT 
          subcategory_id,
          SUBSTR(subcategory_id, 1, 2) as function_id,
          implementation_level,
          maturity_score,
          confidence_level,
          assessed_at
        FROM assessments
        WHERE profile_id = ?
      ),
      function_analysis AS (
        SELECT 
          function_id,
          COUNT(*) as total_subcategories,
          AVG(maturity_score) as avg_maturity,
          STDEV(maturity_score) as maturity_std_dev,
          MIN(maturity_score) as min_maturity,
          MAX(maturity_score) as max_maturity,
          SUM(CASE WHEN maturity_score >= 3 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as mature_percentage,
          GROUP_CONCAT(
            CASE WHEN maturity_score < 2 
            THEN subcategory_id 
            ELSE NULL END
          ) as weak_subcategories
        FROM assessment_data
        GROUP BY function_id
      ),
      overall_stats AS (
        SELECT 
          AVG(maturity_score) as overall_avg,
          MIN(maturity_score) as overall_min,
          MAX(maturity_score) as overall_max,
          COUNT(DISTINCT function_id) as functions_assessed,
          COUNT(*) as total_assessments
        FROM assessment_data
      )
      SELECT 
        f.*,
        o.overall_avg,
        o.overall_min,
        o.overall_max,
        o.functions_assessed,
        o.total_assessments
      FROM function_analysis f
      CROSS JOIN overall_stats o
    `;
    
    return this.db.prepare(sql).all(profileId);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  close(): void {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  // Transaction wrapper
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // Get database stats
  getStats() {
    const stats = {
      organizations: this.db.prepare('SELECT COUNT(*) as count FROM organization_profiles').get(),
      profiles: this.db.prepare('SELECT COUNT(*) as count FROM profiles').get(),
      assessments: this.db.prepare('SELECT COUNT(*) as count FROM assessments').get(),
      implementations: this.db.prepare('SELECT COUNT(*) as count FROM subcategory_implementations').get(),
      risk_assessments: this.db.prepare('SELECT COUNT(*) as count FROM risk_assessments').get(),
      gaps: this.db.prepare('SELECT COUNT(*) as count FROM gap_analysis').get()
    };
    return stats;
  }

  // ============================================================================
  // IMPLEMENTATION PLANNING
  // ============================================================================

  createImplementationPlan(plan: any): string {
    const planId = plan.id;
    
    // Insert main plan
    const planStmt = this.db.prepare(`
      INSERT INTO implementation_plans (
        id, gap_analysis_id, profile_id, plan_name, timeline_months,
        available_resources, total_phases, total_effort_hours, estimated_cost, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    planStmt.run(
      planId,
      plan.gap_analysis_id,
      plan.profile_id,
      plan.plan_name,
      plan.timeline_months,
      plan.available_resources,
      plan.total_phases,
      plan.total_effort_hours,
      plan.estimated_cost,
      plan.status || 'draft'
    );
    
    return planId;
  }

  createImplementationPhase(phase: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO implementation_phases (
        id, plan_id, phase_number, phase_name, start_month,
        end_month, effort_hours, resource_count, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      phase.id,
      phase.plan_id,
      phase.phase_number,
      phase.phase_name,
      phase.start_month,
      phase.end_month,
      phase.effort_hours,
      phase.resource_count,
      phase.status || 'pending'
    );
  }

  createImplementationItem(item: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO implementation_items (
        id, phase_id, subcategory_id, priority_rank,
        effort_hours, dependencies, status, completion_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      item.id,
      item.phase_id,
      item.subcategory_id,
      item.priority_rank,
      item.effort_hours,
      item.dependencies,
      item.status || 'pending',
      item.completion_percentage || 0
    );
  }

  getImplementationPlan(planId: string): any {
    const plan = this.db.prepare(`
      SELECT * FROM implementation_plans WHERE id = ?
    `).get(planId);
    
    if (!plan) return null;
    
    const phases = this.db.prepare(`
      SELECT * FROM implementation_phases 
      WHERE plan_id = ? 
      ORDER BY phase_number
    `).all(planId);
    
    for (const phase of phases as any[]) {
      phase.items = this.db.prepare(`
        SELECT 
          ii.*,
          s.name as subcategory_name,
          s.description as subcategory_description
        FROM implementation_items ii
        JOIN subcategories s ON ii.subcategory_id = s.id
        WHERE ii.phase_id = ?
        ORDER BY ii.priority_rank
      `).all(phase.id);
    }
    
    (plan as any).phases = phases;
    return plan;
  }

  getSubcategoryDependencies(subcategoryId: string): any[] {
    return this.db.prepare(`
      SELECT 
        sd.*,
        s.name as depends_on_name,
        s.description as depends_on_description
      FROM subcategory_dependencies sd
      JOIN subcategories s ON sd.depends_on_subcategory_id = s.id
      WHERE sd.subcategory_id = ?
      ORDER BY sd.dependency_strength DESC
    `).all(subcategoryId);
  }

  createSubcategoryDependency(dep: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO subcategory_dependencies (
        id, subcategory_id, depends_on_subcategory_id,
        dependency_type, dependency_strength
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      dep.id,
      dep.subcategory_id,
      dep.depends_on_subcategory_id,
      dep.dependency_type,
      dep.dependency_strength || 5
    );
  }

  getCostEstimate(subcategoryId: string, organizationSize: string): any {
    return this.db.prepare(`
      SELECT * FROM cost_estimates 
      WHERE subcategory_id = ? AND organization_size = ?
    `).get(subcategoryId, organizationSize);
  }

  createCostEstimate(estimate: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO cost_estimates (
        id, subcategory_id, organization_size, labor_cost,
        tools_cost, training_cost, total_cost, effort_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      estimate.id,
      estimate.subcategory_id,
      estimate.organization_size,
      estimate.labor_cost,
      estimate.tools_cost,
      estimate.training_cost,
      estimate.total_cost,
      estimate.effort_hours
    );
  }

  getSuggestedActions(profileId: string, capacityHours: number): any[] {
    const sql = `
      WITH current_state AS (
        SELECT 
          a.subcategory_id,
          a.implementation_level,
          a.maturity_score,
          s.name as subcategory_name,
          SUBSTR(a.subcategory_id, 1, 2) as function_id,
          CASE 
            WHEN a.implementation_level = 'not_implemented' THEN 100
            WHEN a.implementation_level = 'partially_implemented' THEN 60
            WHEN a.implementation_level = 'largely_implemented' THEN 30
            ELSE 0
          END as gap_score,
          CASE 
            WHEN a.implementation_level = 'not_implemented' THEN 40
            WHEN a.implementation_level = 'partially_implemented' THEN 20
            WHEN a.implementation_level = 'largely_implemented' THEN 10
            ELSE 5
          END as estimated_hours,
          CASE 
            WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('GV', 'ID') THEN 10
            WHEN SUBSTR(a.subcategory_id, 1, 2) IN ('PR', 'DE') THEN 8
            ELSE 6
          END as priority_weight
        FROM assessments a
        JOIN subcategories s ON a.subcategory_id = s.id
        WHERE a.profile_id = ?
          AND a.implementation_level != 'fully_implemented'
      ),
      dependencies AS (
        SELECT 
          cs.subcategory_id,
          COUNT(sd.depends_on_subcategory_id) as dependency_count,
          MAX(CASE 
            WHEN dep_a.implementation_level = 'not_implemented' THEN 1
            ELSE 0
          END) as has_blocking_dependency
        FROM current_state cs
        LEFT JOIN subcategory_dependencies sd ON cs.subcategory_id = sd.subcategory_id
        LEFT JOIN assessments dep_a ON sd.depends_on_subcategory_id = dep_a.subcategory_id
          AND dep_a.profile_id = ?
        GROUP BY cs.subcategory_id
      ),
      prioritized AS (
        SELECT 
          cs.*,
          d.dependency_count,
          d.has_blocking_dependency,
          (cs.gap_score * cs.priority_weight / 10.0) / (cs.estimated_hours + 1) as roi_score,
          SUM(cs.estimated_hours) OVER (ORDER BY 
            d.has_blocking_dependency ASC,
            (cs.gap_score * cs.priority_weight / 10.0) / (cs.estimated_hours + 1) DESC
          ) as cumulative_hours
        FROM current_state cs
        LEFT JOIN dependencies d ON cs.subcategory_id = d.subcategory_id
      )
      SELECT 
        subcategory_id,
        subcategory_name,
        function_id,
        implementation_level,
        gap_score,
        estimated_hours,
        dependency_count,
        has_blocking_dependency,
        ROUND(roi_score, 2) as roi_score,
        cumulative_hours,
        CASE 
          WHEN has_blocking_dependency = 1 THEN 'Address dependencies first'
          WHEN gap_score >= 80 THEN 'Critical gap - high priority'
          WHEN roi_score > 2 THEN 'High ROI - quick win'
          WHEN function_id IN ('GV', 'ID') THEN 'Foundational control'
          ELSE 'Standard priority'
        END as justification
      FROM prioritized
      WHERE cumulative_hours <= ?
        OR cumulative_hours - estimated_hours < ?
      ORDER BY 
        has_blocking_dependency ASC,
        roi_score DESC
      LIMIT 5
    `;
    
    return this.db.prepare(sql).all(profileId, profileId, capacityHours, capacityHours);
  }

  getGapAnalysisItems(gapAnalysisId: string): any[] {
    return this.db.prepare(`
      SELECT 
        g.*,
        s.name as subcategory_name,
        s.description as subcategory_description
      FROM gap_analysis g
      JOIN subcategories s ON g.subcategory_id = s.id
      WHERE g.id LIKE ? || '%'
      ORDER BY g.priority_rank
    `).all(gapAnalysisId);
  }

  calculateDependencyGraph(subcategoryIds: string[]): any {
    const placeholders = subcategoryIds.map(() => '?').join(',');
    
    const dependencies = this.db.prepare(`
      SELECT 
        sd.subcategory_id as from_id,
        sd.depends_on_subcategory_id as to_id,
        sd.dependency_type,
        sd.dependency_strength,
        s1.name as from_name,
        s2.name as to_name
      FROM subcategory_dependencies sd
      JOIN subcategories s1 ON sd.subcategory_id = s1.id
      JOIN subcategories s2 ON sd.depends_on_subcategory_id = s2.id
      WHERE sd.subcategory_id IN (${placeholders})
         OR sd.depends_on_subcategory_id IN (${placeholders})
    `).all(...subcategoryIds, ...subcategoryIds);
    
    // Build adjacency list
    const graph: Record<string, any[]> = {};
    const inDegree: Record<string, number> = {};
    
    for (const id of subcategoryIds) {
      graph[id] = [];
      inDegree[id] = 0;
    }
    
    for (const dep of dependencies as any[]) {
      if (!graph[dep.from_id]) graph[dep.from_id] = [];
      graph[dep.from_id]!.push(dep);
      
      if (subcategoryIds.includes(dep.from_id)) {
        inDegree[dep.from_id] = (inDegree[dep.from_id] || 0) + 1;
      }
    }
    
    // Topological sort for dependency order
    const queue: string[] = [];
    const sorted: string[] = [];
    
    for (const id of subcategoryIds) {
      if (inDegree[id] === 0) {
        queue.push(id);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      
      for (const dep of (graph[current] || []) as any[]) {
        if (inDegree[dep.to_id] !== undefined) {
          inDegree[dep.to_id]!--;
          if (inDegree[dep.to_id] === 0) {
            queue.push(dep.to_id);
          }
        }
      }
    }
    
    return {
      dependencies,
      graph,
      topologicalOrder: sorted,
      hasCycle: sorted.length !== subcategoryIds.length
    };
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  upsertProgressTracking(progress: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO progress_tracking (
        id, profile_id, subcategory_id, baseline_implementation,
        current_implementation, target_implementation, baseline_maturity,
        current_maturity, target_maturity, completion_percentage,
        status, is_blocked, blocking_reason, last_updated, trend, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
      ON CONFLICT(profile_id, subcategory_id) DO UPDATE SET
        current_implementation = excluded.current_implementation,
        current_maturity = excluded.current_maturity,
        completion_percentage = excluded.completion_percentage,
        status = excluded.status,
        is_blocked = excluded.is_blocked,
        blocking_reason = excluded.blocking_reason,
        last_updated = datetime('now'),
        days_since_update = 0,
        trend = excluded.trend,
        notes = excluded.notes
    `);
    
    stmt.run(
      progress.id,
      progress.profile_id,
      progress.subcategory_id,
      progress.baseline_implementation,
      progress.current_implementation,
      progress.target_implementation,
      progress.baseline_maturity,
      progress.current_maturity,
      progress.target_maturity,
      progress.completion_percentage,
      progress.status,
      progress.is_blocked ? 1 : 0,
      progress.blocking_reason,
      progress.trend,
      progress.notes
    );
  }

  getProgressTracking(profileId: string): any[] {
    return this.db.prepare(`
      SELECT 
        pt.*,
        s.name as subcategory_name,
        s.description as subcategory_description,
        SUBSTR(pt.subcategory_id, 1, 2) as function_id,
        SUBSTR(pt.subcategory_id, 1, 5) as category_id,
        julianday('now') - julianday(pt.last_updated) as days_since_update
      FROM progress_tracking pt
      JOIN subcategories s ON pt.subcategory_id = s.id
      WHERE pt.profile_id = ?
      ORDER BY pt.subcategory_id
    `).all(profileId);
  }

  getProgressSummary(profileId: string): any {
    const sql = `
      WITH progress_stats AS (
        SELECT 
          COUNT(*) as total_subcategories,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN status = 'on_track' THEN 1 ELSE 0 END) as on_track_count,
          SUM(CASE WHEN status = 'at_risk' THEN 1 ELSE 0 END) as at_risk_count,
          SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
          SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_count,
          AVG(completion_percentage) as avg_completion,
          MIN(completion_percentage) as min_completion,
          MAX(completion_percentage) as max_completion,
          AVG(julianday('now') - julianday(last_updated)) as avg_days_since_update
        FROM progress_tracking
        WHERE profile_id = ?
      ),
      function_progress AS (
        SELECT 
          SUBSTR(subcategory_id, 1, 2) as function_id,
          COUNT(*) as subcategory_count,
          AVG(completion_percentage) as avg_completion,
          SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_count
        FROM progress_tracking
        WHERE profile_id = ?
        GROUP BY SUBSTR(subcategory_id, 1, 2)
      )
      SELECT 
        ps.*,
        (SELECT json_group_array(json_object(
          'function_id', function_id,
          'subcategory_count', subcategory_count,
          'avg_completion', ROUND(avg_completion, 2),
          'blocked_count', blocked_count
        )) FROM function_progress) as function_breakdown
      FROM progress_stats ps
    `;
    
    return this.db.prepare(sql).get(profileId, profileId);
  }
  updateProgressTrend(profileId: string): void {
    const sql = `
      UPDATE progress_tracking
      SET trend = CASE 
        WHEN completion_percentage > (
          SELECT AVG(completion_percentage) 
          FROM progress_tracking 
          WHERE profile_id = ? 
            AND last_updated < datetime('now', '-7 days')
        ) THEN 'improving'
        WHEN completion_percentage < (
          SELECT AVG(completion_percentage) 
          FROM progress_tracking 
          WHERE profile_id = ? 
            AND last_updated < datetime('now', '-7 days')
        ) THEN 'declining'
        ELSE 'stable'
      END,
      days_since_update = julianday('now') - julianday(last_updated)
      WHERE profile_id = ?
    `;
    
    this.db.prepare(sql).run(profileId, profileId, profileId);
  }

  createProgressMilestone(milestone: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO progress_milestones (
        id, profile_id, milestone_name, target_date, completion_date,
        status, completion_percentage, subcategories_involved, success_criteria
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      milestone.id,
      milestone.profile_id,
      milestone.milestone_name,
      milestone.target_date,
      milestone.completion_date,
      milestone.status || 'pending',
      milestone.completion_percentage || 0,
      milestone.subcategories_involved,
      milestone.success_criteria
    );
  }

  getProgressMilestones(profileId: string): any[] {
    return this.db.prepare(`
      SELECT 
        *,
        CASE 
          WHEN status = 'completed' THEN 0
          WHEN status = 'in_progress' THEN 1
          WHEN status = 'pending' THEN 2
          ELSE 3
        END as status_order,
        julianday(target_date) - julianday('now') as days_until_target
      FROM progress_milestones
      WHERE profile_id = ?
      ORDER BY status_order, target_date
    `).all(profileId);
  }

  calculateVelocity(profileId: string, daysBack: number = 30): any {
    const sql = `
      WITH velocity_data AS (
        SELECT 
          DATE(last_updated) as update_date,
          AVG(completion_percentage) as daily_avg_completion,
          COUNT(DISTINCT subcategory_id) as items_updated
        FROM progress_tracking
        WHERE profile_id = ?
          AND last_updated >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(last_updated)
      ),
      velocity_stats AS (
        SELECT 
          AVG(daily_avg_completion) as avg_daily_progress,
          MAX(daily_avg_completion) as max_daily_progress,
          MIN(daily_avg_completion) as min_daily_progress,
          COUNT(*) as active_days,
          SUM(items_updated) as total_items_updated
        FROM velocity_data
      ),
      current_stats AS (
        SELECT 
          AVG(completion_percentage) as current_avg_completion,
          COUNT(*) as total_items
        FROM progress_tracking
        WHERE profile_id = ?
      )
      SELECT 
        v.*,
        c.current_avg_completion,
        c.total_items,
        CASE 
          WHEN v.avg_daily_progress > 0 THEN 
            (100 - c.current_avg_completion) / v.avg_daily_progress
          ELSE NULL
        END as estimated_days_to_completion
      FROM velocity_stats v
      CROSS JOIN current_stats c
    `;
    
    return this.db.prepare(sql).get(profileId, daysBack, profileId);
  }

  // ============================================================================
  // COMPLIANCE MAPPING METHODS
  // ============================================================================
  // ============================================================================
  // INDUSTRY BENCHMARK METHODS
  // ============================================================================

  upsertIndustryBenchmark(benchmark: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO industry_benchmarks (
        id, industry, organization_size, csf_function, metric_name,
        percentile_25, percentile_50, percentile_75, percentile_90,
        average_score, sample_size, data_year, source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(industry, organization_size, csf_function, metric_name, data_year) DO UPDATE SET
        percentile_25 = excluded.percentile_25,
        percentile_50 = excluded.percentile_50,
        percentile_75 = excluded.percentile_75,
        percentile_90 = excluded.percentile_90,
        average_score = excluded.average_score,
        sample_size = excluded.sample_size,
        source = excluded.source,
        notes = excluded.notes
    `);
    
    stmt.run(
      benchmark.id || `${benchmark.industry}_${benchmark.organization_size}_${benchmark.csf_function}_${benchmark.metric_name}_${benchmark.data_year}`,
      benchmark.industry,
      benchmark.organization_size,
      benchmark.csf_function,
      benchmark.metric_name,
      benchmark.percentile_25,
      benchmark.percentile_50,
      benchmark.percentile_75,
      benchmark.percentile_90,
      benchmark.average_score,
      benchmark.sample_size,
      benchmark.data_year,
      benchmark.source,
      benchmark.notes
    );
  }

  getIndustryBenchmarks(industry: string, organizationSize: string): any[] {
    return this.db.prepare(`
      SELECT * FROM industry_benchmarks
      WHERE industry = ? AND organization_size = ?
      ORDER BY csf_function, metric_name
    `).all(industry, organizationSize);
  }

  compareProfileToBenchmark(profileId: string, industry: string, organizationSize: string): any {
    const sql = `
      WITH profile_scores AS (
        SELECT 
          SUBSTR(a.subcategory_id, 1, 2) as function_id,
          AVG(a.maturity_score) as avg_maturity,
          COUNT(DISTINCT a.subcategory_id) as assessed_subcategories
        FROM assessments a
        WHERE a.profile_id = ?
        GROUP BY SUBSTR(a.subcategory_id, 1, 2)
      ),
      benchmark_data AS (
        SELECT 
          csf_function,
          metric_name,
          percentile_25,
          percentile_50,
          percentile_75,
          percentile_90,
          average_score
        FROM industry_benchmarks
        WHERE industry = ? 
          AND organization_size = ?
          AND metric_name = 'maturity_score'
          AND data_year = (SELECT MAX(data_year) FROM industry_benchmarks WHERE industry = ? AND organization_size = ?)
      )
      SELECT 
        ps.function_id,
        ps.avg_maturity as organization_score,
        bd.average_score as industry_average,
        bd.percentile_50 as industry_median,
        CASE 
          WHEN ps.avg_maturity >= bd.percentile_90 THEN 'Top 10%'
          WHEN ps.avg_maturity >= bd.percentile_75 THEN 'Top 25%'
          WHEN ps.avg_maturity >= bd.percentile_50 THEN 'Above Average'
          WHEN ps.avg_maturity >= bd.percentile_25 THEN 'Below Average'
          ELSE 'Bottom 25%'
        END as percentile_ranking,
        ps.avg_maturity - bd.average_score as variance_from_average
      FROM profile_scores ps
      LEFT JOIN benchmark_data bd ON ps.function_id = bd.csf_function
      ORDER BY ps.function_id
    `;
    
    return this.db.prepare(sql).all(profileId, industry, organizationSize, industry, organizationSize);
  }
  // ============================================================================
  // REPORTING METHODS
  // ============================================================================

  getExecutiveReportData(profileId: string): any {
    const sql = `
      WITH function_scores AS (
        SELECT 
          SUBSTR(a.subcategory_id, 1, 2) as function_id,
          f.name as function_name,
          AVG(a.maturity_score) as avg_maturity,
          COUNT(DISTINCT a.subcategory_id) as subcategories_assessed,
          SUM(CASE WHEN a.maturity_score >= 3 THEN 1 ELSE 0 END) as mature_subcategories
        FROM assessments a
        JOIN functions f ON SUBSTR(a.subcategory_id, 1, 2) = f.id
        WHERE a.profile_id = ?
        GROUP BY SUBSTR(a.subcategory_id, 1, 2), f.name
      ),
      risk_summary AS (
        SELECT 
          COUNT(*) as total_risks,
          SUM(CASE WHEN risk_level = 'Critical' THEN 1 ELSE 0 END) as critical_risks,
          SUM(CASE WHEN risk_level = 'High' THEN 1 ELSE 0 END) as high_risks,
          AVG(risk_score) as avg_risk_score
        FROM risk_assessments r
        JOIN profiles p ON p.org_id = r.org_id
        WHERE p.id = ?
      ),
      gap_summary AS (
        SELECT 
          COUNT(*) as total_gaps,
          AVG(gap_score) as avg_gap_score,
          SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical_gaps
        FROM gap_analysis g
        JOIN profiles p ON p.org_id = g.org_id
        WHERE p.id = ?
      ),
      profile_info AS (
        SELECT 
          p.*,
          o.org_name,
          o.industry,
          o.size
        FROM profiles p
        JOIN organizations o ON p.org_id = o.org_id
        WHERE p.id = ?
      )
      SELECT 
        pi.*,
        (SELECT json_group_array(json_object(
          'function_id', function_id,
          'function_name', function_name,
          'avg_maturity', ROUND(avg_maturity, 2),
          'subcategories_assessed', subcategories_assessed,
          'mature_subcategories', mature_subcategories,
          'maturity_percentage', ROUND(mature_subcategories * 100.0 / subcategories_assessed, 1)
        )) FROM function_scores) as function_summary,
        rs.total_risks,
        rs.critical_risks,
        rs.high_risks,
        ROUND(rs.avg_risk_score, 2) as avg_risk_score,
        gs.total_gaps,
        ROUND(gs.avg_gap_score, 2) as avg_gap_score,
        gs.critical_gaps
      FROM profile_info pi
      CROSS JOIN risk_summary rs
      CROSS JOIN gap_summary gs
    `;
    
    return this.db.prepare(sql).get(profileId, profileId, profileId, profileId);
  }

  getTechnicalReportData(profileId: string): any {
    const sql = `
      WITH subcategory_details AS (
        SELECT 
          a.subcategory_id,
          s.name as subcategory_name,
          s.description,
          c.name as category_name,
          f.name as function_name,
          a.implementation_level,
          a.maturity_score,
          a.notes,
          a.assessed_at
        FROM assessments a
        JOIN subcategories s ON a.subcategory_id = s.id
        JOIN categories c ON SUBSTR(s.id, 1, 5) = c.id
        JOIN functions f ON SUBSTR(s.id, 1, 2) = f.id
        WHERE a.profile_id = ?
        ORDER BY a.subcategory_id
      ),
      implementation_details AS (
        SELECT 
          subcategory_id,
          implementation_status,
          maturity_level,
          notes,
          last_assessed
        FROM subcategory_implementations si
        JOIN profiles p ON p.org_id = si.org_id
        WHERE p.id = ?
      ),
      dependencies AS (
        SELECT 
          subcategory_id,
          json_group_array(depends_on_subcategory_id) as dependencies
        FROM subcategory_dependencies
        GROUP BY subcategory_id
      )
      SELECT 
        (SELECT json_group_array(json_object(
          'subcategory_id', sd.subcategory_id,
          'subcategory_name', sd.subcategory_name,
          'description', sd.description,
          'category_name', sd.category_name,
          'function_name', sd.function_name,
          'implementation_level', sd.implementation_level,
          'maturity_score', sd.maturity_score,
          'notes', sd.notes,
          'assessed_at', sd.assessed_at,
          'dependencies', d.dependencies
        )) FROM subcategory_details sd
        LEFT JOIN dependencies d ON sd.subcategory_id = d.subcategory_id
        ) as subcategory_assessments,
        (SELECT json_group_array(json_object(
          'subcategory_id', subcategory_id,
          'implementation_status', implementation_status,
          'maturity_level', maturity_level,
          'notes', notes,
          'last_assessed', last_assessed
        )) FROM implementation_details) as implementation_history
    `;
    
    return this.db.prepare(sql).get(profileId, profileId);
  }

  getProgressReportData(profileId: string): any {
    const sql = `
      WITH progress_overview AS (
        SELECT 
          COUNT(*) as total_subcategories,
          AVG(completion_percentage) as avg_completion,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'on_track' THEN 1 ELSE 0 END) as on_track,
          SUM(CASE WHEN status = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM progress_tracking
        WHERE profile_id = ?
      ),
      milestone_status AS (
        SELECT 
          COUNT(*) as total_milestones,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
          SUM(CASE WHEN status = 'on_track' THEN 1 ELSE 0 END) as on_track_milestones,
          SUM(CASE WHEN status = 'at_risk' THEN 1 ELSE 0 END) as at_risk_milestones
        FROM progress_milestones
        WHERE profile_id = ?
      ),
      recent_progress AS (
        SELECT 
          subcategory_id,
          current_implementation,
          current_maturity,
          completion_percentage,
          status,
          last_updated,
          notes
        FROM progress_tracking
        WHERE profile_id = ?
          AND last_updated >= datetime('now', '-30 days')
        ORDER BY last_updated DESC
        LIMIT 10
      ),
      velocity_trend AS (
        SELECT 
          DATE(last_updated) as date,
          AVG(completion_percentage) as daily_avg
        FROM progress_tracking
        WHERE profile_id = ?
          AND last_updated >= datetime('now', '-90 days')
        GROUP BY DATE(last_updated)
        ORDER BY date
      )
      SELECT 
        po.*,
        ms.*,
        (SELECT json_group_array(json_object(
          'subcategory_id', subcategory_id,
          'current_implementation', current_implementation,
          'current_maturity', current_maturity,
          'completion_percentage', completion_percentage,
          'status', status,
          'last_updated', last_updated,
          'notes', notes
        )) FROM recent_progress) as recent_updates,
        (SELECT json_group_array(json_object(
          'date', date,
          'daily_avg', ROUND(daily_avg, 2)
        )) FROM velocity_trend) as progress_trend
      FROM progress_overview po
      CROSS JOIN milestone_status ms
    `;
    
    return this.db.prepare(sql).get(profileId, profileId, profileId, profileId);
  }

  getAuditReportData(profileId: string): any {
    const sql = `
      WITH audit_trail AS (
        SELECT 
          'assessment' as activity_type,
          subcategory_id as item_id,
          assessed_at as activity_date,
          assessed_by as performed_by,
          'Maturity: ' || maturity_score as details
        FROM assessments
        WHERE profile_id = ?
        UNION ALL
        SELECT 
          'progress_update' as activity_type,
          subcategory_id as item_id,
          last_updated as activity_date,
          'System' as performed_by,
          'Status: ' || status || ', Completion: ' || completion_percentage || '%' as details
        FROM progress_tracking
        WHERE profile_id = ?
        ORDER BY activity_date DESC
        LIMIT 100
      )
      SELECT 
        (SELECT json_group_array(json_object(
          'activity_type', activity_type,
          'item_id', item_id,
          'activity_date', activity_date,
          'performed_by', performed_by,
          'details', details
        )) FROM audit_trail) as audit_log
    `;
    
    return this.db.prepare(sql).get(profileId, profileId);
  }

  compareProfiles(profileIds: string[]): any {
    const placeholders = profileIds.map(() => '?').join(',');
    const sql = `
      WITH profile_comparisons AS (
        SELECT 
          p.id as profile_id,
          p.profile_name,
          o.org_name,
          o.industry,
          o.size,
          p.profile_type,
          p.created_at,
          (SELECT AVG(maturity_score) FROM assessments WHERE profile_id = p.id) as avg_maturity,
          (SELECT COUNT(*) FROM assessments WHERE profile_id = p.id) as assessments_count,
          (SELECT COUNT(*) FROM progress_tracking WHERE profile_id = p.id AND status = 'completed') as completed_items
        FROM profiles p
        JOIN organizations o ON p.org_id = o.org_id
        WHERE p.id IN (${placeholders})
      ),
      function_comparisons AS (
        SELECT 
          a.profile_id,
          SUBSTR(a.subcategory_id, 1, 2) as function_id,
          AVG(a.maturity_score) as avg_maturity
        FROM assessments a
        WHERE a.profile_id IN (${placeholders})
        GROUP BY a.profile_id, SUBSTR(a.subcategory_id, 1, 2)
      )
      SELECT 
        (SELECT json_group_array(json_object(
          'profile_id', profile_id,
          'profile_name', profile_name,
          'org_name', org_name,
          'industry', industry,
          'size', size,
          'profile_type', profile_type,
          'created_at', created_at,
          'avg_maturity', ROUND(avg_maturity, 2),
          'assessments_count', assessments_count,
          'completed_items', completed_items
        )) FROM profile_comparisons) as profiles,
        (SELECT json_group_array(json_object(
          'profile_id', profile_id,
          'function_id', function_id,
          'avg_maturity', ROUND(avg_maturity, 2)
        )) FROM function_comparisons) as function_scores
    `;
    
    return this.db.prepare(sql).get(...profileIds, ...profileIds);
  }

  exportProfileData(profileId: string): any {
    const sql = `
      SELECT 
        -- Profile Information
        (SELECT json_object(
          'id', p.id,
          'profile_name', p.profile_name,
          'profile_type', p.profile_type,
          'description', p.description,
          'created_at', p.created_at,
          'created_by', p.created_by,
          'org_name', o.org_name,
          'industry', o.industry,
          'size', o.size
        ) FROM profiles p
        JOIN organizations o ON p.org_id = o.org_id
        WHERE p.id = ?) as profile_info,
        
        -- Assessments
        (SELECT json_group_array(json_object(
          'subcategory_id', subcategory_id,
          'implementation_level', implementation_level,
          'maturity_score', maturity_score,
          'notes', notes,
          'assessed_at', assessed_at,
          'assessed_by', assessed_by
        )) FROM assessments WHERE profile_id = ?) as assessments,
        
        -- Progress Tracking
        (SELECT json_group_array(json_object(
          'subcategory_id', subcategory_id,
          'baseline_implementation', baseline_implementation,
          'current_implementation', current_implementation,
          'target_implementation', target_implementation,
          'current_maturity', current_maturity,
          'completion_percentage', completion_percentage,
          'status', status,
          'is_blocked', is_blocked,
          'blocking_reason', blocking_reason,
          'last_updated', last_updated,
          'notes', notes
        )) FROM progress_tracking WHERE profile_id = ?) as progress,
        
        -- Milestones
        (SELECT json_group_array(json_object(
          'milestone_name', milestone_name,
          'target_date', target_date,
          'completion_date', completion_date,
          'status', status,
          'completion_percentage', completion_percentage
        )) FROM progress_milestones WHERE profile_id = ?) as milestones
    `;
    
    return this.db.prepare(sql).get(profileId, profileId, profileId, profileId);
  }

  // ============================================================================
  // DATA IMPORT AND EVIDENCE VALIDATION
  // ============================================================================

  getAssessment(assessmentId: string): any {
    return this.db.prepare(`
      SELECT * FROM subcategory_assessments 
      WHERE assessment_id = ?
    `).get(assessmentId);
  }

  importAssessmentBatch(
    profileId: string,
    assessments: Array<{
      subcategory_id: string;
      implementation_level: string;
      maturity_score: number;
      notes?: string;
      assessed_by?: string;
    }>,
    conflictMode: 'skip' | 'overwrite' | 'merge' = 'overwrite'
  ): {
    imported: number;
    skipped: number;
    errors: Array<{ subcategory_id: string; error: string }>;
  } {
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ subcategory_id: string; error: string }>
    };

    const transaction = this.db.transaction(() => {
      for (const assessment of assessments) {
        try {
          // Validate subcategory exists
          const subcategoryExists = this.db.prepare(
            'SELECT subcategory_id FROM csf_subcategories WHERE subcategory_id = ?'
          ).get(assessment.subcategory_id);

          if (!subcategoryExists) {
            result.errors.push({
              subcategory_id: assessment.subcategory_id,
              error: `Subcategory ${assessment.subcategory_id} does not exist`
            });
            continue;
          }

          // Check for existing assessment
          const existing = this.db.prepare(`
            SELECT assessment_id, implementation_level, maturity_score, notes 
            FROM subcategory_assessments 
            WHERE profile_id = ? AND subcategory_id = ?
          `).get(profileId, assessment.subcategory_id) as any;

          if (existing && conflictMode === 'skip') {
            result.skipped++;
            continue;
          }

          if (existing && conflictMode === 'merge') {
            // Merge: keep higher maturity score and combine notes
            const mergedScore = Math.max(existing.maturity_score || 0, assessment.maturity_score);
            const mergedNotes = [existing.notes, assessment.notes]
              .filter(Boolean)
              .join('\n---\n');

            this.db.prepare(`
              UPDATE subcategory_assessments 
              SET implementation_level = ?,
                  maturity_score = ?,
                  notes = ?,
                  assessed_at = CURRENT_TIMESTAMP,
                  assessed_by = ?
              WHERE assessment_id = ?
            `).run(
              assessment.implementation_level,
              mergedScore,
              mergedNotes,
              assessment.assessed_by || 'imported',
              existing.assessment_id
            );
            result.imported++;
          } else if (existing && conflictMode === 'overwrite') {
            // Overwrite existing assessment
            this.db.prepare(`
              UPDATE subcategory_assessments 
              SET implementation_level = ?,
                  maturity_score = ?,
                  notes = ?,
                  assessed_at = CURRENT_TIMESTAMP,
                  assessed_by = ?
              WHERE profile_id = ? AND subcategory_id = ?
            `).run(
              assessment.implementation_level,
              assessment.maturity_score,
              assessment.notes,
              assessment.assessed_by || 'imported',
              profileId,
              assessment.subcategory_id
            );
            result.imported++;
          } else {
            // Insert new assessment
            const assessmentId = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
            this.db.prepare(`
              INSERT INTO subcategory_assessments 
              (assessment_id, profile_id, subcategory_id, implementation_level, 
               maturity_score, notes, assessed_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              assessmentId,
              profileId,
              assessment.subcategory_id,
              assessment.implementation_level,
              assessment.maturity_score,
              assessment.notes,
              assessment.assessed_by || 'imported'
            );
            result.imported++;
          }
        } catch (error) {
          result.errors.push({
            subcategory_id: assessment.subcategory_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    try {
      transaction();
    } catch (error) {
      logger.error('Import transaction failed:', error);
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  addAuditEvidence(evidence: {
    assessment_id: string;
    profile_id: string;
    subcategory_id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_hash: string;
    uploaded_by?: string;
    evidence_type?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): string {
    const evidenceId = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
    
    this.db.prepare(`
      INSERT INTO audit_evidence 
      (evidence_id, assessment_id, profile_id, subcategory_id, file_name, 
       file_type, file_size, file_hash, uploaded_by, evidence_type, 
       description, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      evidenceId,
      evidence.assessment_id,
      evidence.profile_id,
      evidence.subcategory_id,
      evidence.file_name,
      evidence.file_type,
      evidence.file_size,
      evidence.file_hash,
      evidence.uploaded_by || 'system',
      evidence.evidence_type,
      evidence.description,
      evidence.tags ? JSON.stringify(evidence.tags) : null,
      evidence.metadata ? JSON.stringify(evidence.metadata) : null
    );

    return evidenceId;
  }

  validateEvidence(
    evidenceId: string,
    status: 'validated' | 'rejected',
    notes: string,
    validatedBy: string
  ): void {
    this.db.prepare(`
      UPDATE audit_evidence 
      SET validation_status = ?,
          validation_notes = ?,
          validated_by = ?,
          validated_at = CURRENT_TIMESTAMP
      WHERE evidence_id = ?
    `).run(status, notes, validatedBy, evidenceId);
  }

  getEvidenceForAssessment(assessmentId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM audit_evidence 
      WHERE assessment_id = ? 
      ORDER BY upload_date DESC
    `).all(assessmentId);
  }

  getEvidenceValidationReport(profileId: string): any {
    const stats = this.db.prepare(`
      SELECT 
        validation_status,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM audit_evidence
      WHERE profile_id = ?
      GROUP BY validation_status
    `).all(profileId);

    const byType = this.db.prepare(`
      SELECT 
        evidence_type,
        COUNT(*) as count,
        AVG(file_size) as avg_size
      FROM audit_evidence
      WHERE profile_id = ?
      GROUP BY evidence_type
    `).all(profileId);

    const bySubcategory = this.db.prepare(`
      SELECT 
        ae.subcategory_id,
        cs.subcategory_name,
        COUNT(*) as evidence_count,
        SUM(CASE WHEN ae.validation_status = 'validated' THEN 1 ELSE 0 END) as validated_count,
        SUM(CASE WHEN ae.validation_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN ae.validation_status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM audit_evidence ae
      JOIN csf_subcategories cs ON ae.subcategory_id = cs.subcategory_id
      WHERE ae.profile_id = ?
      GROUP BY ae.subcategory_id, cs.subcategory_name
      ORDER BY evidence_count DESC
    `).all(profileId);

    return {
      statistics: stats,
      by_type: byType,
      by_subcategory: bySubcategory,
      generated_at: new Date().toISOString()
    };
  }

  getImportValidationErrors(
    data: any[],
    _format: 'csv' | 'json' | 'excel'
  ): Array<{ row: number; field: string; error: string }> {
    const errors: Array<{ row: number; field: string; error: string }> = [];
    const validSubcategories = new Set(
      this.db.prepare('SELECT subcategory_id FROM csf_subcategories').all()
        .map((row: any) => row.subcategory_id)
    );

    const validImplementationLevels = ['not_implemented', 'partially_implemented', 'fully_implemented'];

    data.forEach((row, index) => {
      // Check required fields
      if (!row.subcategory_id) {
        errors.push({ row: index + 1, field: 'subcategory_id', error: 'Required field missing' });
      } else if (!validSubcategories.has(row.subcategory_id)) {
        errors.push({ row: index + 1, field: 'subcategory_id', error: `Invalid subcategory: ${row.subcategory_id}` });
      }

      if (!row.implementation_level) {
        errors.push({ row: index + 1, field: 'implementation_level', error: 'Required field missing' });
      } else if (!validImplementationLevels.includes(row.implementation_level)) {
        errors.push({ row: index + 1, field: 'implementation_level', error: `Invalid level: ${row.implementation_level}` });
      }

      // Validate maturity score
      if (row.maturity_score !== undefined && row.maturity_score !== null) {
        const score = Number(row.maturity_score);
        if (isNaN(score) || score < 0 || score > 5) {
          errors.push({ row: index + 1, field: 'maturity_score', error: 'Must be between 0 and 5' });
        }
      }
    });

    return errors;
  }

  // ============================================================================
  // QUESTION BANK METHODS
  // ============================================================================

  /**
   * Seed question bank data for a subcategory
   */
  seedQuestionBankData(subcategoryId: string, questionData: {
    questions: Array<{
      id: string;
      questionText: string;
      questionType: string;
      helpText?: string;
      organizationSize?: string;
      sector?: string;
      weight?: number;
      required?: boolean;
      options?: Array<{
        id: string;
        value: number;
        label: string;
        description?: string;
        weight?: number;
        sortOrder?: number;
      }>;
      examples?: Array<{
        id: string;
        text: string;
        type?: string;
        organizationSize?: string;
        sector?: string;
        sortOrder?: number;
      }>;
    }>;
    context?: {
      riskFactors?: string[];
      bestPractices?: string[];
      commonChallenges?: string[];
      sectorGuidance?: Record<string, string[]>;
      implementationRoadmap?: string[];
      relatedSubcategories?: string[];
      references?: string[];
    };
  }): void {
    const transaction = this.db.transaction(() => {
      // Insert questions
      const insertQuestion = this.db.prepare(`
        INSERT OR REPLACE INTO question_bank (
          id, subcategory_id, question_text, question_type, help_text,
          organization_size, sector, weight, required, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const insertOption = this.db.prepare(`
        INSERT OR REPLACE INTO question_options (
          id, question_id, option_value, option_label, option_description,
          weight, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertExample = this.db.prepare(`
        INSERT OR REPLACE INTO question_examples (
          id, question_id, example_text, example_type, organization_size,
          sector, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const question of questionData.questions) {
        insertQuestion.run(
          question.id,
          subcategoryId,
          question.questionText,
          question.questionType,
          question.helpText || null,
          question.organizationSize || null,
          question.sector || null,
          question.weight || 1.0,
          question.required ? 1 : 0
        );

        // Insert options if provided
        if (question.options) {
          for (const option of question.options) {
            insertOption.run(
              option.id,
              question.id,
              option.value,
              option.label,
              option.description || null,
              option.weight || 1.0,
              option.sortOrder || 0
            );
          }
        }

        // Insert examples if provided
        if (question.examples) {
          for (const example of question.examples) {
            insertExample.run(
              example.id,
              question.id,
              example.text,
              example.type || 'implementation',
              example.organizationSize || null,
              example.sector || null,
              example.sortOrder || 0
            );
          }
        }
      }

      // Insert context if provided
      if (questionData.context) {
        const insertContext = this.db.prepare(`
          INSERT OR REPLACE INTO question_context (
            id, subcategory_id, risk_factors, best_practices, common_challenges,
            sector_guidance, implementation_roadmap, related_subcategories,
            reference_materials, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        insertContext.run(
          `context_${subcategoryId}`,
          subcategoryId,
          JSON.stringify(questionData.context.riskFactors || []),
          JSON.stringify(questionData.context.bestPractices || []),
          JSON.stringify(questionData.context.commonChallenges || []),
          JSON.stringify(questionData.context.sectorGuidance || {}),
          JSON.stringify(questionData.context.implementationRoadmap || []),
          JSON.stringify(questionData.context.relatedSubcategories || []),
          JSON.stringify(questionData.context.references || [])
        );
      }
    });

    transaction();
    logger.info(`Question bank data seeded for subcategory: ${subcategoryId}`);
  }

  /**
   * Get all questions for a subcategory
   */
  getQuestionsBySubcategory(subcategoryId: string, filters?: {
    questionType?: string;
    organizationSize?: string;
    sector?: string;
    includeOptions?: boolean;
    includeExamples?: boolean;
  }): any[] {
    let sql = `
      SELECT 
        qb.*,
        s.name as subcategory_name,
        s.description as subcategory_description,
        SUBSTR(qb.subcategory_id, 1, 2) as function_id
      FROM question_bank qb
      JOIN subcategories s ON qb.subcategory_id = s.id
      WHERE qb.subcategory_id = ?
    `;

    const params: any[] = [subcategoryId];

    if (filters?.questionType) {
      sql += ' AND qb.question_type = ?';
      params.push(filters.questionType);
    }

    if (filters?.organizationSize) {
      sql += ' AND (qb.organization_size IS NULL OR qb.organization_size = ?)';
      params.push(filters.organizationSize);
    }

    if (filters?.sector) {
      sql += ' AND (qb.sector IS NULL OR qb.sector = ?)';
      params.push(filters.sector);
    }

    sql += ' ORDER BY qb.required DESC, qb.weight DESC, qb.created_at ASC';

    const questions = this.db.prepare(sql).all(...params);

    // Include options and examples if requested
    if (filters?.includeOptions || filters?.includeExamples) {
      for (const question of questions as any[]) {
        if (filters.includeOptions) {
          question.options = this.getQuestionOptions(question.id);
        }
        if (filters.includeExamples) {
          question.examples = this.getQuestionExamples(question.id);
        }
      }
    }

    return questions;
  }

  /**
   * Get question options
   */
  getQuestionOptions(questionId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM question_options 
      WHERE question_id = ? 
      ORDER BY sort_order ASC, option_value ASC
    `).all(questionId);
  }

  /**
   * Get question examples
   */
  getQuestionExamples(questionId: string, filters?: {
    organizationSize?: string;
    sector?: string;
  }): any[] {
    let sql = `
      SELECT * FROM question_examples 
      WHERE question_id = ?
    `;

    const params: any[] = [questionId];

    if (filters?.organizationSize) {
      sql += ' AND (organization_size IS NULL OR organization_size = ?)';
      params.push(filters.organizationSize);
    }

    if (filters?.sector) {
      sql += ' AND (sector IS NULL OR sector = ?)';
      params.push(filters.sector);
    }

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    return this.db.prepare(sql).all(...params);
  }

  /**
   * Get question context for a subcategory
   */
  getQuestionContext(subcategoryId: string): any {
    const result = this.db.prepare(`
      SELECT * FROM question_context WHERE subcategory_id = ?
    `).get(subcategoryId);

    if (!result) return null;

    // Parse JSON fields
    const resultData = result as any;
    return {
      ...resultData,
      risk_factors: JSON.parse(resultData.risk_factors || '[]'),
      best_practices: JSON.parse(resultData.best_practices || '[]'),
      common_challenges: JSON.parse(resultData.common_challenges || '[]'),
      sector_guidance: JSON.parse(resultData.sector_guidance || '{}'),
      implementation_roadmap: JSON.parse(resultData.implementation_roadmap || '[]'),
      related_subcategories: JSON.parse(resultData.related_subcategories || '[]'),
      references: JSON.parse(resultData.reference_materials || '[]')
    };
  }

  /**
   * Store question response
   */
  storeQuestionResponse(response: {
    id: string;
    profileId: string;
    questionId: string;
    subcategoryId: string;
    responseValue?: number;
    responseText?: string;
    confidenceLevel?: string;
    notes?: string;
    evidence?: string[];
    respondedBy?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO question_responses (
        id, profile_id, question_id, subcategory_id, response_value,
        response_text, confidence_level, notes, evidence, responded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      response.id,
      response.profileId,
      response.questionId,
      response.subcategoryId,
      response.responseValue || null,
      response.responseText || null,
      response.confidenceLevel || null,
      response.notes || null,
      JSON.stringify(response.evidence || []),
      response.respondedBy || null
    );
  }

  /**
   * Get question responses for a profile
   */
  getQuestionResponses(profileId: string, subcategoryId?: string): any[] {
    let sql = `
      SELECT 
        qr.*,
        qb.question_text,
        qb.question_type,
        qb.required,
        s.name as subcategory_name
      FROM question_responses qr
      JOIN question_bank qb ON qr.question_id = qb.id
      JOIN subcategories s ON qr.subcategory_id = s.id
      WHERE qr.profile_id = ?
    `;

    const params: any[] = [profileId];

    if (subcategoryId) {
      sql += ' AND qr.subcategory_id = ?';
      params.push(subcategoryId);
    }

    sql += ' ORDER BY qr.responded_at DESC';

    const responses = this.db.prepare(sql).all(...params);

    // Parse evidence JSON
    return responses.map((response: any) => ({
      ...response,
      evidence: JSON.parse(response.evidence || '[]')
    }));
  }

  /**
   * Prepare SQL statement (expose prepare method for seeding)
   */
  prepare(sql: string): any {
    return this.db.prepare(sql);
  }

  /**
   * Get question bank statistics
   */
  getQuestionBankStats(): any {
    const totalQuestions = this.db.prepare('SELECT COUNT(*) as count FROM question_bank').get();
    const questionsByType = this.db.prepare(`
      SELECT question_type, COUNT(*) as count 
      FROM question_bank 
      GROUP BY question_type
    `).all();
    const questionsByFunction = this.db.prepare(`
      SELECT 
        SUBSTR(subcategory_id, 1, 2) as function_id,
        COUNT(*) as count
      FROM question_bank 
      GROUP BY SUBSTR(subcategory_id, 1, 2)
    `).all();
    const totalResponses = this.db.prepare('SELECT COUNT(*) as count FROM question_responses').get();

    return {
      total_questions: (totalQuestions as any).count,
      questions_by_type: questionsByType,
      questions_by_function: questionsByFunction,
      total_responses: (totalResponses as any).count
    };
  }
}

// Singleton instance
let dbInstance: CSFDatabase | null = null;

export function getDatabase(dbPath?: string): CSFDatabase {
  if (!dbInstance) {
    dbInstance = new CSFDatabase(dbPath);
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}