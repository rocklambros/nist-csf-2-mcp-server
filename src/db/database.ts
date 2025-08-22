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

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_implementations_org ON subcategory_implementations(org_id);
      CREATE INDEX IF NOT EXISTS idx_implementations_subcategory ON subcategory_implementations(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_risk_org ON risk_assessments(org_id);
      CREATE INDEX IF NOT EXISTS idx_risk_element ON risk_assessments(element_id);
      CREATE INDEX IF NOT EXISTS idx_gap_org ON gap_analysis(org_id);
      CREATE INDEX IF NOT EXISTS idx_gap_category ON gap_analysis(category_id);
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
      implementations: this.db.prepare('SELECT COUNT(*) as count FROM subcategory_implementations').get(),
      assessments: this.db.prepare('SELECT COUNT(*) as count FROM risk_assessments').get(),
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