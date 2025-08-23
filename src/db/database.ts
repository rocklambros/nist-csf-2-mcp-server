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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CSFDatabase {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath?: string) {
    // Default to nist_csf.db in project root
    this.dbPath = dbPath || path.join(__dirname, '../../nist_csf.db');
    
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

      -- Subcategory implementations table
      CREATE TABLE IF NOT EXISTS subcategory_implementations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_status TEXT NOT NULL,
        maturity_level INTEGER CHECK (maturity_level >= 0 AND maturity_level <= 5),
        notes TEXT,
        evidence TEXT, -- JSON array stored as text
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

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_implementations_org ON subcategory_implementations(org_id);
      CREATE INDEX IF NOT EXISTS idx_implementations_subcategory ON subcategory_implementations(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_assessments(org_id);
      CREATE INDEX IF NOT EXISTS idx_risk_element ON risk_assessments(element_id);
      CREATE INDEX IF NOT EXISTS idx_gap_org ON gap_analysis(org_id);
      CREATE INDEX IF NOT EXISTS idx_gap_category ON gap_analysis(category_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(org_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_profile ON assessments(profile_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_subcategory ON assessments(subcategory_id);
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