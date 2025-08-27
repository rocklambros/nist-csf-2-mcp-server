/**
 * Jest Setup File - Global test configuration and mocking
 */

import { jest } from '@jest/globals';
import type { CSFDatabase } from '../../src/db/database.js';

// Mock the database module at the top level with proper implementation
jest.mock('../../src/db/database.js', () => {
  // Import the actual better-sqlite3 for the mock implementation
  const Database = jest.requireActual('better-sqlite3');
  const path = jest.requireActual('path');
  
  let mockDatabaseInstance: any = null;
  
  const createMockDatabase = (dbPath?: string) => {
    const testPath = dbPath || path.join(process.cwd(), 'test-mock.db');
    const db = new Database(testPath, { readonly: false, fileMustExist: false });
    
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Initialize comprehensive schema for testing
    db.exec(`
      -- Core organization and profile tables
      CREATE TABLE IF NOT EXISTS organization_profiles (
        org_id TEXT PRIMARY KEY,
        org_name TEXT NOT NULL,
        industry TEXT,
        size TEXT,
        current_tier TEXT,
        target_tier TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        profile_name TEXT NOT NULL,
        profile_type TEXT,
        description TEXT,
        created_by TEXT,
        parent_profile_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(org_id)
      );

      -- Framework structure tables
      CREATE TABLE IF NOT EXISTS functions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        function_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (function_id) REFERENCES functions(id)
      );

      CREATE TABLE IF NOT EXISTS subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- Assessment and tracking tables
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        implementation_level TEXT,
        maturity_score INTEGER,
        notes TEXT,
        assessed_by TEXT,
        assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      CREATE TABLE IF NOT EXISTS progress_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT NOT NULL,
        current_score INTEGER,
        target_score INTEGER,
        progress_percentage REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      CREATE TABLE IF NOT EXISTS audit_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        subcategory_id TEXT,
        evidence_type TEXT,
        file_path TEXT,
        description TEXT,
        uploaded_by TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      CREATE TABLE IF NOT EXISTS gap_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        overall_maturity_score REAL,
        priority_recommendations TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );

      CREATE TABLE IF NOT EXISTS implementation_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        plan_name TEXT,
        timeline TEXT,
        budget_estimate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
      );
    `);
    
    return {
      prepare: (sql: string) => db.prepare(sql),
      transaction: (fn: () => any) => {
        try {
          return db.transaction(fn)();
        } catch (error) {
          throw error;
        }
      },
      close: () => db.close(),
      
      // Organization methods
      getOrganization: jest.fn((orgId: string) => {
        try {
          const stmt = db.prepare('SELECT * FROM organization_profiles WHERE org_id = ?');
          return stmt.get(orgId);
        } catch (error) {
          return null;
        }
      }),
      createOrganization: jest.fn((org: any) => {
        try {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO organization_profiles (org_id, org_name, industry, size, current_tier, target_tier)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          return stmt.run(org.org_id, org.org_name, org.industry, org.size, org.current_tier, org.target_tier);
        } catch (error) {
          throw error;
        }
      }),
      
      // Profile methods
      createProfile: jest.fn((profile: any) => {
        try {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO profiles (profile_id, org_id, profile_name, profile_type, description, created_by, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          return stmt.run(
            profile.profile_id, 
            profile.org_id, 
            profile.profile_name,
            profile.profile_type || 'current', 
            profile.description || null, 
            profile.created_by || null,
            profile.is_active !== undefined ? profile.is_active : 1
          );
        } catch (error) {
          throw error;
        }
      }),
      getProfile: jest.fn((profileId: string) => {
        try {
          const stmt = db.prepare('SELECT * FROM profiles WHERE profile_id = ?');
          return stmt.get(profileId);
        } catch (error) {
          return null;
        }
      }),
      
      // Assessment methods
      createBulkAssessments: jest.fn((profileId: string, assessments: any[]) => {
        try {
          const stmt = db.prepare(`
            INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          const insertMany = db.transaction((assessments: any[]) => {
            for (const assessment of assessments) {
              stmt.run(profileId, assessment.subcategory_id, assessment.implementation_level, 
                      assessment.maturity_score, assessment.notes, assessment.assessed_by);
            }
          });
          insertMany(assessments);
          return { changes: assessments.length };
        } catch (error) {
          throw error;
        }
      })
    };
  };
  
  return {
    CSFDatabase: jest.fn().mockImplementation(createMockDatabase),
    getDatabase: jest.fn(() => {
      if (!mockDatabaseInstance) {
        mockDatabaseInstance = createMockDatabase();
      }
      return mockDatabaseInstance;
    })
  };
});

// Mock the logger module to prevent console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    silent: true,
  }
}));

// Mock the framework loader module with proper structure
jest.mock('../../src/services/framework-loader.js', () => ({
  getFrameworkLoader: jest.fn(() => ({
    isLoaded: jest.fn(() => true),
    load: jest.fn(() => Promise.resolve()),
    getFunction: jest.fn(),
    getCategory: jest.fn(), 
    getSubcategory: jest.fn(),
    searchElements: jest.fn(),
    getRelatedSubcategories: jest.fn(),
    getAllFunctions: jest.fn(() => []),
    getAllCategories: jest.fn(() => []),
    getAllSubcategories: jest.fn(() => []),
    getFunctions: jest.fn(() => []),
    getElementsByType: jest.fn(() => []),
    getCategoriesForFunction: jest.fn(() => []),
    getImplementationExamples: jest.fn(() => []),
    getRelationships: jest.fn(() => []),
  })),
  FrameworkLoader: jest.fn()
}));

// Global database mock factory
export function createMockDatabase(): Partial<CSFDatabase> {
  return {
    transaction: jest.fn((fn: () => any) => {
      try {
        return fn();
      } catch (error) {
        throw error;
      }
    }),
    
    // Organization methods
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
    updateOrganization: jest.fn(),
    
    // Profile methods
    getProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    getProfilesByOrganization: jest.fn(),
    
    // Assessment methods
    createBulkAssessments: jest.fn(),
    getAssessments: jest.fn(),
    updateAssessment: jest.fn(),
    
    // Framework methods
    getFunction: jest.fn(),
    getCategory: jest.fn(),
    getSubcategory: jest.fn(),
    getAllSubcategories: jest.fn(),
    
    // Gap analysis methods
    createGapAnalysis: jest.fn(),
    getGapAnalysis: jest.fn(),
    
    // Risk assessment methods
    calculateRiskScore: jest.fn(),
    getRiskAssessment: jest.fn(),
    
    // Implementation plan methods
    createImplementationPlan: jest.fn(),
    getImplementationPlan: jest.fn(),
    
    // Progress tracking methods
    updateProgressTracking: jest.fn(),
    getProgressTracking: jest.fn(),
    
    // Evidence methods
    addEvidence: jest.fn(),
    getEvidence: jest.fn(),
    
    // Report methods
    generateReport: jest.fn(),
    
    // Utility methods
    close: jest.fn(),
    backup: jest.fn(),
  };
}

// Global test utilities
export const testUtils = {
  /**
   * Create mock organization data
   */
  createMockOrganization: (overrides: any = {}) => ({
    org_id: 'test-org-123',
    org_name: 'Test Organization',
    industry: 'Technology',
    size: 'medium',
    current_tier: 'Tier1',
    target_tier: 'Tier3',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock profile data
   */
  createMockProfile: (overrides: any = {}) => ({
    profile_id: 'test-profile-123',
    org_id: 'test-org-123',
    profile_name: 'Test Profile',
    profile_type: 'current',
    description: 'Test profile for unit testing',
    created_by: 'test-user',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock assessment data
   */
  createMockAssessment: (overrides: any = {}) => ({
    profile_id: 'test-profile-123',
    subcategory_id: 'GV.OC-01',
    implementation_level: 2,
    maturity_score: 3,
    confidence_level: 'medium',
    notes: 'Test assessment',
    assessed_by: 'test-user',
    assessed_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock framework element
   */
  createMockFrameworkElement: (type: 'function' | 'category' | 'subcategory', overrides: any = {}) => {
    const base = {
      function: {
        element_identifier: 'GV',
        title: 'GOVERN',
        text: 'Establish and monitor cybersecurity governance',
        element_type: 'function',
        ...overrides
      },
      category: {
        element_identifier: 'GV.OC',
        title: 'Organizational Context',
        text: 'The organizational context is understood',
        element_type: 'category',
        parent_id: 'GV',
        ...overrides
      },
      subcategory: {
        element_identifier: 'GV.OC-01',
        title: 'Organizational mission understood',
        text: 'The organizational mission is understood and informs cybersecurity risk management',
        element_type: 'subcategory',
        parent_id: 'GV.OC',
        ...overrides
      }
    };
    return base[type];
  },

  /**
   * Assert success response format
   */
  assertSuccessResponse: (response: any, expectedData?: any) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    if (expectedData) {
      expect(response).toMatchObject(expectedData);
    }
  },

  /**
   * Assert error response format
   */
  assertErrorResponse: (response: any, expectedMessage?: string) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    
    if (expectedMessage) {
      expect(response.error).toContain(expectedMessage);
    }
  }
};

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.resetAllMocks();
});

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
});

export default {};