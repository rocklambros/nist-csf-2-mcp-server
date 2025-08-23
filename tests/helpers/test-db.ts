/**
 * Test database helper for unit and integration tests
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { Database as AppDatabase } from '../../src/db/database';

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
  }
  
  /**
   * Initialize database schema for testing
   */
  private initializeSchema() {
    // Organizations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        org_id TEXT PRIMARY KEY,
        org_name TEXT NOT NULL,
        industry TEXT,
        size TEXT,
        current_tier TEXT,
        target_tier TEXT,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP
      )
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
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (org_id) REFERENCES organizations(org_id)
      )
    `);
    
    // Assessments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assessments (
        assessment_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_level TEXT,
        maturity_score INTEGER,
        notes TEXT,
        assessed_by TEXT,
        assessment_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      )
    `);
    
    // Implementations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS implementations (
        org_id TEXT,
        subcategory_id TEXT,
        implementation_status TEXT,
        maturity_level INTEGER,
        notes TEXT,
        assessed_by TEXT,
        last_assessed TEXT,
        PRIMARY KEY (org_id, subcategory_id),
        FOREIGN KEY (org_id) REFERENCES organizations(org_id)
      )
    `);
    
    // Risk assessments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        org_id TEXT,
        element_id TEXT,
        risk_level TEXT,
        likelihood INTEGER,
        impact INTEGER,
        risk_score REAL,
        mitigation_status TEXT,
        mitigation_plan TEXT,
        assessment_date TEXT,
        PRIMARY KEY (org_id, element_id),
        FOREIGN KEY (org_id) REFERENCES organizations(org_id)
      )
    `);
    
    // Gap analyses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gap_analyses (
        org_id TEXT,
        category_id TEXT,
        current_score REAL,
        target_score REAL,
        gap_score REAL,
        priority TEXT,
        estimated_effort TEXT,
        analysis_date TEXT,
        PRIMARY KEY (org_id, category_id),
        FOREIGN KEY (org_id) REFERENCES organizations(org_id)
      )
    `);
    
    // Progress tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress_tracking (
        progress_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        target_implementation TEXT,
        target_maturity INTEGER,
        current_implementation TEXT,
        current_maturity INTEGER,
        progress_percentage REAL,
        status TEXT,
        is_blocked INTEGER DEFAULT 0,
        blocking_reason TEXT,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      )
    `);
    
    // Milestones table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS milestones (
        milestone_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        milestone_name TEXT NOT NULL,
        description TEXT,
        target_date TEXT,
        actual_date TEXT,
        status TEXT DEFAULT 'pending',
        completion_percentage REAL DEFAULT 0,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      )
    `);
    
    // Audit evidence table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_evidence (
        evidence_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_hash TEXT,
        evidence_type TEXT,
        description TEXT,
        uploaded_by TEXT,
        upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
        is_valid INTEGER DEFAULT 1,
        validation_date TEXT,
        validation_notes TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
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
    
    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_assessments_profile ON assessments(profile_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_subcategory ON assessments(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress_tracking(profile_id);
      CREATE INDEX IF NOT EXISTS idx_progress_subcategory ON progress_tracking(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_profile ON audit_evidence(profile_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_profile ON compliance_mappings(profile_id);
    `);
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
   * Insert test data
   */
  insertTestData(table: string, data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      const keys = Object.keys(item);
      const values = Object.values(item);
      const placeholders = keys.map(() => '?').join(', ');
      
      const stmt = this.db.prepare(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
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
   * Clear all data from tables
   */
  clearAll() {
    const tables = [
      'compliance_mappings',
      'audit_evidence',
      'milestones',
      'progress_tracking',
      'gap_analyses',
      'risk_assessments',
      'implementations',
      'assessments',
      'profiles',
      'organizations'
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
  createAppDatabase(): AppDatabase {
    return new AppDatabase(this.dbPath);
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