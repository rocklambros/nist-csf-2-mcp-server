/**
 * Integration tests for database operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestDatabase } from '../helpers/test-db';
import { Database } from '../../src/db/database';
import { 
  mockOrganization,
  mockProfile,
  mockAssessment,
  mockImplementation,
  mockRiskAssessment,
  mockGapAnalysis,
  mockProgress,
  mockMilestone,
  mockEvidence,
  mockComplianceMapping,
  generateMockAssessments,
  generateMockProgress
} from '../helpers/mock-data';

describe('Database Integration Tests', () => {
  let testDb: TestDatabase;
  let appDb: Database;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    appDb = testDb.createAppDatabase();
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Transaction Management', () => {
    it('should commit successful transactions', () => {
      testDb.beginTransaction();
      
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      
      testDb.commit();
      
      const org = testDb.get('SELECT * FROM organizations WHERE org_id = ?', [mockOrganization.org_id]);
      const profile = testDb.get('SELECT * FROM profiles WHERE profile_id = ?', [mockProfile.profile_id]);
      
      expect(org).toBeDefined();
      expect(profile).toBeDefined();
    });
    
    it('should rollback failed transactions', () => {
      testDb.beginTransaction();
      
      try {
        testDb.insertTestData('organizations', mockOrganization);
        // Try to insert duplicate
        testDb.insertTestData('organizations', mockOrganization);
      } catch (error) {
        testDb.rollback();
      }
      
      const orgs = testDb.query('SELECT * FROM organizations WHERE org_id = ?', [mockOrganization.org_id]);
      expect(orgs.length).toBe(0);
    });
    
    it('should maintain referential integrity', () => {
      // Try to insert profile without organization
      expect(() => {
        testDb.insertTestData('profiles', mockProfile);
      }).toThrow();
      
      // Insert organization first
      testDb.insertTestData('organizations', mockOrganization);
      
      // Now profile insertion should work
      testDb.insertTestData('profiles', mockProfile);
      
      const profile = testDb.get('SELECT * FROM profiles WHERE profile_id = ?', [mockProfile.profile_id]);
      expect(profile).toBeDefined();
    });
  });
  
  describe('Batch Operations', () => {
    it('should handle batch inserts efficiently', () => {
      // Insert organization and profile first
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      
      // Generate large batch of assessments
      const assessments = generateMockAssessments(100, mockProfile.profile_id);
      
      const startTime = Date.now();
      
      testDb.beginTransaction();
      testDb.insertTestData('assessments', assessments);
      testDb.commit();
      
      const duration = Date.now() - startTime;
      
      // Should complete quickly even with 100 records
      expect(duration).toBeLessThan(1000);
      
      const count = testDb.get('SELECT COUNT(*) as count FROM assessments').count;
      expect(count).toBe(100);
    });
    
    it('should handle batch updates', () => {
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      
      // Insert initial progress records
      const progressRecords = generateMockProgress(20, mockProfile.profile_id);
      testDb.insertTestData('progress_tracking', progressRecords);
      
      // Batch update all to completed
      testDb.exec(`
        UPDATE progress_tracking 
        SET status = 'completed', progress_percentage = 100
        WHERE profile_id = '${mockProfile.profile_id}'
      `);
      
      const completed = testDb.query(
        'SELECT * FROM progress_tracking WHERE status = ?',
        ['completed']
      );
      
      expect(completed.length).toBe(20);
      expect(completed.every(p => p.progress_percentage === 100)).toBe(true);
    });
    
    it('should handle batch deletes with cascade', () => {
      // Setup related data
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      testDb.insertTestData('assessments', generateMockAssessments(10, mockProfile.profile_id));
      
      // Delete profile should cascade to assessments
      testDb.exec(`DELETE FROM profiles WHERE profile_id = '${mockProfile.profile_id}'`);
      
      const assessments = testDb.query(
        'SELECT * FROM assessments WHERE profile_id = ?',
        [mockProfile.profile_id]
      );
      
      expect(assessments.length).toBe(0);
    });
  });
  
  describe('Complex Queries', () => {
    beforeEach(() => {
      // Setup comprehensive test data
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      testDb.insertTestData('assessments', generateMockAssessments(20, mockProfile.profile_id));
      testDb.insertTestData('progress_tracking', generateMockProgress(10, mockProfile.profile_id));
    });
    
    it('should aggregate assessment data correctly', () => {
      const result = testDb.get(`
        SELECT 
          AVG(maturity_score) as avg_maturity,
          COUNT(*) as total_assessments,
          MAX(maturity_score) as max_maturity,
          MIN(maturity_score) as min_maturity
        FROM assessments
        WHERE profile_id = ?
      `, [mockProfile.profile_id]);
      
      expect(result.total_assessments).toBe(20);
      expect(result.avg_maturity).toBeGreaterThanOrEqual(1);
      expect(result.avg_maturity).toBeLessThanOrEqual(5);
      expect(result.max_maturity).toBeLessThanOrEqual(5);
      expect(result.min_maturity).toBeGreaterThanOrEqual(1);
    });
    
    it('should join multiple tables correctly', () => {
      const results = testDb.query(`
        SELECT 
          p.profile_name,
          o.org_name,
          COUNT(a.assessment_id) as assessment_count
        FROM profiles p
        JOIN organizations o ON p.org_id = o.org_id
        LEFT JOIN assessments a ON p.profile_id = a.profile_id
        GROUP BY p.profile_id
      `);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].assessment_count).toBe(20);
      expect(results[0].org_name).toBe(mockOrganization.org_name);
    });
    
    it('should handle subqueries', () => {
      const result = testDb.get(`
        SELECT 
          profile_id,
          (SELECT COUNT(*) FROM assessments WHERE profile_id = p.profile_id) as assessment_count,
          (SELECT COUNT(*) FROM progress_tracking WHERE profile_id = p.profile_id) as progress_count
        FROM profiles p
        WHERE profile_id = ?
      `, [mockProfile.profile_id]);
      
      expect(result.assessment_count).toBe(20);
      expect(result.progress_count).toBe(10);
    });
    
    it('should handle window functions', () => {
      const results = testDb.query(`
        SELECT 
          subcategory_id,
          maturity_score,
          RANK() OVER (ORDER BY maturity_score DESC) as rank,
          ROW_NUMBER() OVER (PARTITION BY subcategory_id ORDER BY assessment_date DESC) as row_num
        FROM assessments
        WHERE profile_id = ?
        LIMIT 10
      `, [mockProfile.profile_id]);
      
      expect(results.length).toBeLessThanOrEqual(10);
      expect(results[0].rank).toBeDefined();
      expect(results[0].row_num).toBeDefined();
    });
  });
  
  describe('Performance Optimization', () => {
    it('should use indexes effectively', () => {
      // Insert large dataset
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      
      const largeDataset = generateMockAssessments(1000, mockProfile.profile_id);
      testDb.insertTestData('assessments', largeDataset);
      
      // Query using indexed column
      const startTime = Date.now();
      const results = testDb.query(
        'SELECT * FROM assessments WHERE profile_id = ? AND subcategory_id = ?',
        [mockProfile.profile_id, 'GV.OC-01']
      );
      const duration = Date.now() - startTime;
      
      // Should be fast due to index
      expect(duration).toBeLessThan(50);
      expect(results).toBeDefined();
    });
    
    it('should handle concurrent reads', async () => {
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', mockProfile);
      testDb.insertTestData('assessments', generateMockAssessments(100, mockProfile.profile_id));
      
      // Simulate concurrent reads
      const promises = Array.from({ length: 10 }, () => 
        new Promise((resolve) => {
          const result = testDb.query(
            'SELECT * FROM assessments WHERE profile_id = ?',
            [mockProfile.profile_id]
          );
          resolve(result);
        })
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveLength(100);
      });
    });
  });
  
  describe('Data Integrity', () => {
    it('should enforce unique constraints', () => {
      testDb.insertTestData('organizations', mockOrganization);
      
      // Try to insert duplicate
      expect(() => {
        testDb.insertTestData('organizations', mockOrganization);
      }).toThrow();
    });
    
    it('should enforce foreign key constraints', () => {
      // Try to insert assessment without profile
      expect(() => {
        testDb.insertTestData('assessments', mockAssessment);
      }).toThrow();
    });
    
    it('should handle NULL values correctly', () => {
      testDb.insertTestData('organizations', {
        ...mockOrganization,
        current_tier: null,
        target_tier: null
      });
      
      const org = testDb.get(
        'SELECT * FROM organizations WHERE org_id = ?',
        [mockOrganization.org_id]
      );
      
      expect(org.current_tier).toBeNull();
      expect(org.target_tier).toBeNull();
    });
    
    it('should apply default values', () => {
      testDb.insertTestData('organizations', mockOrganization);
      testDb.insertTestData('profiles', {
        profile_id: 'test-profile',
        org_id: mockOrganization.org_id,
        profile_name: 'Test Profile'
        // is_active should default to 1
      });
      
      const profile = testDb.get(
        'SELECT * FROM profiles WHERE profile_id = ?',
        ['test-profile']
      );
      
      expect(profile.is_active).toBe(1);
      expect(profile.profile_type).toBe('current');
    });
  });
  
  describe('Application Database Methods', () => {
    it('should create organization successfully', () => {
      appDb.createOrganization(mockOrganization);
      
      const org = appDb.getOrganization(mockOrganization.org_id);
      expect(org).toBeDefined();
      expect(org?.org_name).toBe(mockOrganization.org_name);
    });
    
    it('should upsert implementation correctly', () => {
      appDb.createOrganization(mockOrganization);
      
      // First insert
      appDb.upsertImplementation(mockImplementation);
      
      let impl = appDb.getImplementations(mockOrganization.org_id);
      expect(impl.length).toBe(1);
      expect(impl[0].maturity_level).toBe(2);
      
      // Update
      appDb.upsertImplementation({
        ...mockImplementation,
        maturity_level: 4
      });
      
      impl = appDb.getImplementations(mockOrganization.org_id);
      expect(impl.length).toBe(1);
      expect(impl[0].maturity_level).toBe(4);
    });
    
    it('should handle risk assessments', () => {
      appDb.createOrganization(mockOrganization);
      
      appDb.upsertRiskAssessment(mockRiskAssessment);
      
      const risks = appDb.getRiskAssessments(mockOrganization.org_id);
      expect(risks.length).toBe(1);
      expect(risks[0].risk_level).toBe('Medium');
      expect(risks[0].risk_score).toBeCloseTo(0.6);
    });
    
    it('should handle gap analyses', () => {
      appDb.createOrganization(mockOrganization);
      
      appDb.upsertGapAnalysis(mockGapAnalysis);
      
      const gaps = appDb.getGapAnalyses(mockOrganization.org_id);
      expect(gaps.length).toBe(1);
      expect(gaps[0].gap_score).toBe(2);
    });
    
    it('should provide database statistics', () => {
      appDb.createOrganization(mockOrganization);
      
      const stats = appDb.getStats();
      
      expect(stats.organizations).toBe(1);
      expect(stats.implementations).toBe(0);
      expect(stats.risk_assessments).toBe(0);
      expect(stats.gap_analyses).toBe(0);
    });
  });
});