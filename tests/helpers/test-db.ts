/**
 * Test database helper for unit and integration tests
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { CSFDatabase, getDatabase } from '../../src/db/database';
import { testFrameworkData, testImplementationExamples } from './csf-reference-data';

export class TestDatabase {
  private db: Database.Database;
  private tempDir: string;
  private dbPath: string;
  
  constructor() {
    // Create temporary directory for test database
    this.tempDir = mkdtempSync(join(tmpdir(), 'test-db-'));
    this.dbPath = join(this.tempDir, 'test.db');
    this.db = new Database(this.dbPath);
    this.initializeSchema();
    this.seedFrameworkData();
  }
  
  /**
   * Initialize database schema for testing
   */
  private initializeSchema() {
    this.createFrameworkTables();
    this.createOrganizationalTables();
    this.createAssessmentTables();
    this.createPlanningTables();
    this.createAuditTables();
    this.createIndexes();
  }
  
  /**
   * Create CSF framework reference tables
   */
  private createFrameworkTables() {
    // CSF Framework reference tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS functions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        function_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (function_id) REFERENCES functions(id)
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        outcome_examples TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS implementation_examples (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        example_type TEXT DEFAULT 'general',
        organization_size TEXT DEFAULT 'All',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      )
    `);
  }
  
  /**
   * Create organizational and profile tables
   */
  private createOrganizationalTables() {
    // Organization profiles table (matching production)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organization_profiles (
        org_id TEXT PRIMARY KEY,
        org_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        size TEXT NOT NULL,
        current_tier TEXT,
        target_tier TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Legacy organizations table as view (for compatibility)
    this.db.exec(`
      CREATE VIEW IF NOT EXISTS organizations AS
      SELECT org_id, org_name, industry, size, current_tier, target_tier, 
             created_at as created_date FROM organization_profiles
    `);
    
    // Profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        org_id TEXT,
        profile_name TEXT NOT NULL,
        profile_type TEXT DEFAULT 'current',
        description TEXT,
        created_by TEXT,
        parent_profile_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        FOREIGN KEY (parent_profile_id) REFERENCES profiles(profile_id)
      )
    `);
  }
  
  /**
   * Create assessment and tracking tables
   */
  private createAssessmentTables() {
    // Assessments table (matching production schema)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assessments (
        assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_level TEXT CHECK (implementation_level IN ('not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented')),
        maturity_score INTEGER CHECK (maturity_score >= 0 AND maturity_score <= 5),
        confidence_level TEXT DEFAULT 'medium',
        notes TEXT,
        evidence TEXT,
        assessed_by TEXT,
        assessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        UNIQUE(profile_id, subcategory_id)
      )
    `);
    
    // Subcategory Implementations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subcategory_implementations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_status TEXT,
        maturity_level INTEGER,
        implementation_description TEXT,
        notes TEXT,
        assessed_by TEXT,
        assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_review_date TIMESTAMP,
        next_review_date TIMESTAMP,
        evidence_references TEXT,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, subcategory_id)
      )
    `);
    
    // Risk Assessments table (updated to match production)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        element_id TEXT NOT NULL,
        element_type TEXT NOT NULL,
        likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
        impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
        risk_level TEXT NOT NULL,
        risk_score REAL NOT NULL,
        mitigation_status TEXT DEFAULT 'pending',
        mitigation_plan TEXT,
        assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assessed_by TEXT,
        review_date TIMESTAMP,
        next_assessment_date TIMESTAMP,
        risk_tolerance TEXT,
        residual_risk REAL,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, element_id)
      )
    `);
    
    // Gap Analysis table (updated to match production)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gap_analysis (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        current_score REAL NOT NULL,
        target_score REAL NOT NULL,
        gap_score REAL NOT NULL,
        priority TEXT NOT NULL,
        estimated_effort TEXT,
        recommendations TEXT,
        analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        analyst TEXT,
        status TEXT DEFAULT 'identified',
        implementation_timeline TEXT,
        resource_requirements TEXT,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id),
        UNIQUE(org_id, category_id)
      )
    `);
  }
  
  /**
   * Create planning and implementation tables
   */
  private createPlanningTables() {
    // Implementation Plans table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS implementation_plans (
        id TEXT PRIMARY KEY,
        gap_analysis_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        plan_description TEXT,
        start_date DATE,
        end_date DATE,
        total_phases INTEGER DEFAULT 3,
        estimated_cost REAL,
        available_resources TEXT,
        success_criteria TEXT,
        status TEXT DEFAULT 'draft',
        created_by TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by TEXT,
        approved_date TIMESTAMP,
        FOREIGN KEY (gap_analysis_id) REFERENCES gap_analysis(id),
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id)
      )
    `);
    
    // Implementation Phases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS implementation_phases (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        phase_number INTEGER NOT NULL,
        phase_name TEXT NOT NULL,
        phase_description TEXT,
        start_date DATE,
        end_date DATE,
        dependencies TEXT,
        deliverables TEXT,
        success_criteria TEXT,
        status TEXT DEFAULT 'pending',
        completion_percentage INTEGER DEFAULT 0,
        FOREIGN KEY (plan_id) REFERENCES implementation_plans(id)
      )
    `);
    
    // Implementation Items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS implementation_items (
        id TEXT PRIMARY KEY,
        phase_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_description TEXT,
        priority TEXT DEFAULT 'medium',
        estimated_cost REAL,
        effort_hours INTEGER NOT NULL,
        dependencies TEXT,
        status TEXT DEFAULT 'pending',
        completion_percentage INTEGER DEFAULT 0,
        FOREIGN KEY (phase_id) REFERENCES implementation_phases(id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      )
    `);
    
    // Subcategory Dependencies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subcategory_dependencies (
        id TEXT PRIMARY KEY,
        subcategory_id TEXT NOT NULL,
        depends_on_subcategory_id TEXT NOT NULL,
        dependency_type TEXT NOT NULL,
        dependency_strength INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
        FOREIGN KEY (depends_on_subcategory_id) REFERENCES subcategories(id)
      )
    `);
    
    // Cost Estimates table
    this.db.exec(`
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
      )
    `);
    
    // Progress Tracking table (matching production schema)
    this.db.exec(`
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
      )
    `);
    
    // Progress Milestones table (matching production schema)
    this.db.exec(`
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
      )
    `);
  }
  
  /**
   * Create audit and compliance tables
   */
  private createAuditTables() {
    // Audit Evidence table (matching production schema)
    this.db.exec(`
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
        evidence_type TEXT,
        description TEXT,
        validation_status TEXT DEFAULT 'pending',
        validation_notes TEXT,
        validated_by TEXT,
        validated_at TEXT,
        tags TEXT,
        metadata TEXT,
        FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id),
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
      )
    `);
    
    // Industry Benchmarks table
    this.db.exec(`
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
      )
    `);
    
    // Compliance mappings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS compliance_mappings (
        mapping_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        csf_subcategory_id TEXT NOT NULL,
        framework TEXT NOT NULL,
        control_id TEXT NOT NULL,
        control_description TEXT,
        mapping_strength TEXT,
        notes TEXT,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      )
    `);
  }
  
  /**
   * Create database indexes
   */
  private createIndexes() {
    // Create indexes (matching production schema)
    this.db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_benchmarks_industry ON industry_benchmarks(industry, organization_size);
      CREATE INDEX IF NOT EXISTS idx_evidence_assessment ON audit_evidence(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_profile ON audit_evidence(profile_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_subcategory ON audit_evidence(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_validation ON audit_evidence(validation_status);
      CREATE INDEX IF NOT EXISTS idx_compliance_profile ON compliance_mappings(profile_id);
    `);
  }
  
  /**
   * Seed CSF framework reference data
   */
  private seedFrameworkData() {
    // Insert functions
    const insertFunction = this.db.prepare(`
      INSERT OR IGNORE INTO functions (id, name, description, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    for (const func of testFrameworkData.functions) {
      insertFunction.run(func.id, func.name, func.description, func.created_at);
    }
    
    // Insert categories
    const insertCategory = this.db.prepare(`
      INSERT OR IGNORE INTO categories (id, function_id, name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const category of testFrameworkData.categories) {
      insertCategory.run(category.id, category.function_id, category.name, category.description, category.created_at);
    }
    
    // Insert subcategories
    const insertSubcategory = this.db.prepare(`
      INSERT OR IGNORE INTO subcategories (id, category_id, name, description, outcome_examples, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const subcategory of testFrameworkData.subcategories) {
      insertSubcategory.run(
        subcategory.id,
        subcategory.category_id,
        subcategory.name,
        subcategory.description,
        subcategory.outcome_examples,
        subcategory.created_at
      );
    }
    
    // Insert implementation examples
    const insertExample = this.db.prepare(`
      INSERT OR IGNORE INTO implementation_examples (id, subcategory_id, title, description, example_type, organization_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const example of testImplementationExamples) {
      insertExample.run(
        example.id,
        example.subcategory_id,
        example.title,
        example.description,
        example.example_type,
        example.organization_size,
        example.created_at
      );
    }
  }
  
  /**
   * Get the database instance
   */
  getDb(): Database.Database {
    return this.db;
  }
  
  /**
   * Get database path
   */
  getPath(): string {
    return this.dbPath;
  }
  
  /**
   * Load realistic test dataset with all relationships
   */
  loadRealisticTestData() {
    const { initializeRealisticTestData } = require('./realistic-test-data');
    const testData = initializeRealisticTestData();
    
    this.insertTestData('organization_profiles', testData.organization);
    this.insertTestData('profiles', testData.profile);
    
    // Insert assessments (convert assessment_date to assessed_at for schema compatibility)
    for (const assessment of testData.assessments) {
      const modifiedAssessment = { ...assessment };
      if (modifiedAssessment.assessment_date) {
        modifiedAssessment.assessed_at = modifiedAssessment.assessment_date;
        delete modifiedAssessment.assessment_date;
      }
      this.insertTestData('assessments', modifiedAssessment);
    }
    
    // Insert progress tracking
    for (const progress of testData.progressTracking) {
      this.insertTestData('progress_tracking', progress);
    }
    
    // Insert gap analysis
    for (const gap of testData.gapAnalysis) {
      this.insertTestData('gap_analysis', gap);
    }
    
    // Insert implementation plan
    this.insertTestData('implementation_plans', testData.implementationPlan);
    
    // Insert risk assessments
    for (const risk of testData.riskAssessments) {
      this.insertTestData('risk_assessments', risk);
    }
    
    // Insert milestones
    for (const milestone of testData.progressMilestones) {
      this.insertTestData('progress_milestones', milestone);
    }
    
    return testData;
  }
  
  /**
   * Insert test data
   */
  insertTestData(table: string, data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      const keys = Object.keys(item);
      const values = Object.values(item).map(value => {
        // Convert non-primitive values to JSON strings
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        return value;
      });
      const placeholders = keys.map(() => '?').join(', ');
      
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
      );
      
      stmt.run(...values);
    }
  }
  
  /**
   * Query test data
   */
  query(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  }
  
  /**
   * Get single row
   */
  get(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    return params ? stmt.get(...params) : stmt.get();
  }
  
  /**
   * Execute SQL
   */
  exec(sql: string) {
    return this.db.exec(sql);
  }
  
  /**
   * Begin transaction
   */
  beginTransaction() {
    this.db.exec('BEGIN');
  }
  
  /**
   * Commit transaction
   */
  commit() {
    this.db.exec('COMMIT');
  }
  
  /**
   * Rollback transaction
   */
  rollback() {
    this.db.exec('ROLLBACK');
  }
  
  /**
   * Clear all data from tables (except framework reference data)
   */
  clearAll() {
    const tables = [
      'compliance_mappings',
      'audit_evidence',
      'industry_benchmarks',
      'progress_milestones',
      'progress_tracking',
      'cost_estimates',
      'subcategory_dependencies',
      'implementation_items',
      'implementation_phases',
      'implementation_plans',
      'gap_analysis',
      'risk_assessments',
      'subcategory_implementations',
      'assessments',
      'profiles',
      'organization_profiles'
    ];
    
    for (const table of tables) {
      this.db.exec(`DELETE FROM ${table}`);
    }
  }
  
  /**
   * Close database and cleanup
   */
  close() {
    this.db.close();
    try {
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to cleanup test database:', err);
    }
  }
  
  /**
   * Create app database instance for testing
   */
  createAppDatabase(): CSFDatabase {
    return getDatabase(this.dbPath);
  }
}

/**
 * Setup test database for a test suite
 */
export function setupTestDb() {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  return {
    getDb: () => testDb,
    getAppDb: () => testDb.createAppDatabase()
  };
}