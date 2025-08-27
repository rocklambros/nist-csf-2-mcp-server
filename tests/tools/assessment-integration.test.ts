/**
 * Integration tests for assessment tools using test database
 * Tests real database operations with complete schema
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestDatabase } from '../helpers/test-db';
import { 
  mockOrganization, 
  mockProfile
} from '../helpers/mock-data';

// Mock the database module to use our test database
let testDb: TestDatabase;

// Mock getDatabase to return our test database
jest.mock('../../src/db/database.js', () => {
  const originalModule = jest.requireActual('../../src/db/database.js');
  return {
    ...originalModule,
    getDatabase: jest.fn(() => {
      if (testDb) {
        return testDb.createAppDatabase();
      }
      throw new Error('Test database not initialized');
    })
  };
});

describe('Assessment Tools - Integration Tests', () => {
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testDb.insertTestData('organization_profiles', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
  });
  
  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });
  
  describe('Database Schema Validation', () => {
    it('should have created all required tables', () => {
      const tables = testDb.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tableNames = tables.map((t: any) => t.name);
      
      // Check for key tables
      expect(tableNames).toContain('functions');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('subcategories');
      expect(tableNames).toContain('organization_profiles');
      expect(tableNames).toContain('profiles');
      expect(tableNames).toContain('assessments');
      expect(tableNames).toContain('progress_tracking');
      expect(tableNames).toContain('audit_evidence');
    });
    
    it('should have seeded framework data', () => {
      const functions = testDb.query('SELECT COUNT(*) as count FROM functions');
      expect(functions[0].count).toBeGreaterThan(0);
      
      const categories = testDb.query('SELECT COUNT(*) as count FROM categories');
      expect(categories[0].count).toBeGreaterThan(0);
      
      const subcategories = testDb.query('SELECT COUNT(*) as count FROM subcategories');
      expect(subcategories[0].count).toBeGreaterThan(0);
    });
    
    it('should have inserted test org and profile data', () => {
      const org = testDb.get('SELECT * FROM organization_profiles WHERE org_id = ?', [mockOrganization.org_id]);
      expect(org).toBeTruthy();
      expect(org.org_name).toBe(mockOrganization.org_name);
      
      const profile = testDb.get('SELECT * FROM profiles WHERE profile_id = ?', [mockProfile.profile_id]);
      expect(profile).toBeTruthy();
      expect(profile.profile_name).toBe(mockProfile.profile_name);
    });
    
    it('should enforce foreign key constraints', () => {
      // This should fail due to foreign key constraint
      expect(() => {
        testDb.insertTestData('profiles', {
          profile_id: 'test-invalid-profile',
          org_id: 'non-existent-org',
          profile_name: 'Invalid Profile',
          profile_type: 'current'
        });
      }).toThrow();
    });
  });
  
  describe('Assessment Data Relationships', () => {
    it('should allow creating assessments linked to existing profiles', () => {
      testDb.insertTestData('assessments', {
        profile_id: mockProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'partially_implemented',
        maturity_score: 3,
        notes: 'Test assessment',
        assessed_by: 'test-user'
      });
      
      const assessment = testDb.get(
        'SELECT * FROM assessments WHERE profile_id = ?',
        [mockProfile.profile_id]
      );
      
      expect(assessment).toBeTruthy();
      expect(assessment.implementation_level).toBe('partially_implemented');
      expect(assessment.maturity_score).toBe(3);
    });
    
    it('should allow creating progress tracking entries', () => {
      testDb.insertTestData('progress_tracking', {
        id: 'test-progress-1',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        current_implementation: 'Basic implementation',
        current_maturity: 2,
        target_maturity: 4,
        completion_percentage: 50,
        status: 'on_track'
      });
      
      const progress = testDb.get(
        'SELECT * FROM progress_tracking WHERE profile_id = ?',
        [mockProfile.profile_id]
      );
      
      expect(progress).toBeTruthy();
      expect(progress.current_maturity).toBe(2);
      expect(progress.status).toBe('on_track');
    });
  });
  
  describe('Quick Assessment Simulation', () => {
    it('should simulate quick assessment workflow', async () => {
      // Simulate what a quick assessment would do
      
      // 1. Verify profile exists
      const profile = testDb.get(
        'SELECT * FROM profiles WHERE profile_id = ?',
        [mockProfile.profile_id]
      );
      expect(profile).toBeTruthy();
      
      // 2. Get available subcategories
      const subcategories = testDb.query(`
        SELECT id, category_id, name FROM subcategories 
        LIMIT 5
      `);
      expect(subcategories.length).toBeGreaterThan(0);
      
      // 3. Create assessments for each function
      const functions = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
      const assessments = [];
      
      for (const func of functions) {
        // Get a subcategory for this function
        const subcategory = testDb.get(`
          SELECT s.id 
          FROM subcategories s
          JOIN categories c ON s.category_id = c.id
          WHERE c.function_id = ?
          LIMIT 1
        `, [func]);
        
        if (subcategory) {
          const assessmentData = {
            profile_id: mockProfile.profile_id,
            subcategory_id: subcategory.id,
            implementation_level: 'largely_implemented',
            maturity_score: 4,
            notes: `Quick assessment for ${func}`,
            assessed_by: 'test-assessor'
          };
          
          testDb.insertTestData('assessments', assessmentData);
          assessments.push(assessmentData);
        }
      }
      
      // 4. Verify assessments were created
      const createdAssessments = testDb.query(
        'SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?',
        [mockProfile.profile_id]
      );
      
      expect(createdAssessments[0].count).toBe(assessments.length);
      
      // 5. Calculate summary scores
      const avgMaturity = testDb.get(`
        SELECT AVG(maturity_score) as avg_score 
        FROM assessments 
        WHERE profile_id = ?
      `, [mockProfile.profile_id]);
      
      expect(avgMaturity.avg_score).toBeGreaterThan(0);
    });
  });
});