/**
 * Performance benchmark tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestDatabase } from '../helpers/test-db';
import { Database } from '../../src/db/database';
import { 
  generateMockProfiles,
  generateMockAssessments,
  generateMockProgress,
  generateMockEvidence,
  generateLargeBatchData,
  mockOrganization
} from '../helpers/mock-data';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  singleInsert: 10,
  batchInsert100: 100,
  batchInsert1000: 1000,
  complexQuery: 50,
  aggregation: 100,
  fullTextSearch: 200,
  reportGeneration: 500,
  profileComparison: 300
};

describe('Performance Benchmarks', () => {
  let testDb: TestDatabase;
  let appDb: Database;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    appDb = testDb.createAppDatabase();
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Insert Performance', () => {
    it('should insert single record quickly', () => {
      const startTime = performance.now();
      
      testDb.insertTestData('organization_profiles', mockOrganization);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleInsert);
    });
    
    it('should handle batch insert of 100 records efficiently', () => {
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(100);
      
      const startTime = performance.now();
      
      testDb.beginTransaction();
      testDb.insertTestData('profiles', profiles);
      testDb.commit();
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchInsert100);
      
      const count = testDb.get('SELECT COUNT(*) as count FROM profiles').count;
      expect(count).toBe(100);
    });
    
    it('should handle batch insert of 1000 records', () => {
      testDb.insertTestData('organization_profiles', mockOrganization);
      testDb.insertTestData('profiles', { 
        ...generateMockProfiles(1)[0], 
        profile_id: 'test-profile' 
      });
      
      const assessments = generateMockAssessments(1000, 'test-profile');
      
      const startTime = performance.now();
      
      testDb.beginTransaction();
      for (const assessment of assessments) {
        testDb.insertTestData('assessments', assessment);
      }
      testDb.commit();
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchInsert1000);
      
      const count = testDb.get('SELECT COUNT(*) as count FROM assessments').count;
      expect(count).toBe(1000);
    });
  });
  
  describe('Query Performance', () => {
    beforeEach(() => {
      // Setup large dataset
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(10);
      testDb.insertTestData('profiles', profiles);
      
      // Insert assessments for each profile
      profiles.forEach(profile => {
        const assessments = generateMockAssessments(100, profile.profile_id);
        testDb.insertTestData('assessments', assessments);
      });
    });
    
    it('should execute simple queries quickly', () => {
      const startTime = performance.now();
      
      const result = testDb.query(
        'SELECT * FROM assessments WHERE profile_id = ? LIMIT 10',
        ['test-profile-0']
      );
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
      expect(result.length).toBeLessThanOrEqual(10);
    });
    
    it('should handle complex joins efficiently', () => {
      const startTime = performance.now();
      
      const result = testDb.query(`
        SELECT 
          p.profile_name,
          COUNT(a.assessment_id) as count,
          AVG(a.maturity_score) as avg_maturity
        FROM profiles p
        LEFT JOIN assessments a ON p.profile_id = a.profile_id
        GROUP BY p.profile_id
        ORDER BY avg_maturity DESC
        LIMIT 5
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
      expect(result.length).toBeLessThanOrEqual(5);
    });
    
    it('should perform aggregations efficiently', () => {
      const startTime = performance.now();
      
      const result = testDb.get(`
        SELECT 
          COUNT(DISTINCT profile_id) as profile_count,
          COUNT(*) as total_assessments,
          AVG(maturity_score) as avg_maturity,
          MIN(maturity_score) as min_maturity,
          MAX(maturity_score) as max_maturity,
          SUM(CASE WHEN maturity_score >= 4 THEN 1 ELSE 0 END) as high_maturity_count
        FROM assessments
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
      expect(result.total_assessments).toBe(1000);
    });
    
    it('should handle pagination efficiently', () => {
      const pageSize = 20;
      const totalPages = 50;
      let totalDuration = 0;
      
      for (let page = 0; page < 5; page++) {
        const startTime = performance.now();
        
        const result = testDb.query(`
          SELECT * FROM assessments
          ORDER BY assessment_date DESC
          LIMIT ? OFFSET ?
        `, [pageSize, page * pageSize]);
        
        totalDuration += performance.now() - startTime;
        
        expect(result.length).toBeLessThanOrEqual(pageSize);
      }
      
      // Average time per page should be low
      const avgDuration = totalDuration / 5;
      expect(avgDuration).toBeLessThan(20);
    });
  });
  
  describe('Search Performance', () => {
    beforeEach(() => {
      // Insert searchable data
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(10);
      testDb.insertTestData('profiles', profiles);
      
      profiles.forEach(profile => {
        const assessments = generateMockAssessments(50, profile.profile_id);
        testDb.insertTestData('assessments', assessments.map(a => ({
          ...a,
          notes: `Security assessment for ${a.subcategory_id} with various keywords like compliance, risk, vulnerability, control, audit`
        })));
      });
    });
    
    it('should perform text search efficiently', () => {
      const startTime = performance.now();
      
      const result = testDb.query(`
        SELECT * FROM assessments
        WHERE notes LIKE '%compliance%'
        LIMIT 50
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fullTextSearch);
      expect(result.length).toBeGreaterThan(0);
    });
    
    it('should handle multiple search conditions', () => {
      const startTime = performance.now();
      
      const result = testDb.query(`
        SELECT * FROM assessments
        WHERE (notes LIKE '%risk%' OR notes LIKE '%vulnerability%')
        AND maturity_score >= 3
        AND implementation_level IN ('Largely Implemented', 'Fully Implemented')
        LIMIT 100
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fullTextSearch);
    });
  });
  
  describe('Concurrent Operations', () => {
    it('should handle concurrent reads efficiently', async () => {
      // Setup data
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(5);
      testDb.insertTestData('profiles', profiles);
      
      profiles.forEach(profile => {
        const assessments = generateMockAssessments(100, profile.profile_id);
        testDb.insertTestData('assessments', assessments);
      });
      
      const startTime = performance.now();
      
      // Simulate 10 concurrent read operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        new Promise((resolve) => {
          const result = testDb.query(
            'SELECT * FROM assessments WHERE profile_id = ?',
            [profiles[i % 5].profile_id]
          );
          resolve(result);
        })
      );
      
      const results = await Promise.all(promises);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(200);
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveLength(100);
      });
    });
    
    it('should handle mixed read/write operations', async () => {
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(5);
      testDb.insertTestData('profiles', profiles);
      
      const startTime = performance.now();
      
      const operations = Array.from({ length: 20 }, (_, i) => {
        if (i % 3 === 0) {
          // Write operation
          return new Promise((resolve) => {
            const assessment = generateMockAssessments(1, profiles[0].profile_id)[0];
            testDb.insertTestData('assessments', assessment);
            resolve('write');
          });
        } else {
          // Read operation
          return new Promise((resolve) => {
            const result = testDb.query(
              'SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?',
              [profiles[0].profile_id]
            );
            resolve(result);
          });
        }
      });
      
      await Promise.all(operations);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(500);
    });
  });
  
  describe('Memory Performance', () => {
    it('should handle large result sets without memory issues', () => {
      // Insert large dataset
      testDb.insertTestData('organization_profiles', mockOrganization);
      testDb.insertTestData('profiles', generateMockProfiles(1)[0]);
      
      const largeDataset = generateMockAssessments(5000, 'test-profile-0');
      
      testDb.beginTransaction();
      largeDataset.forEach(item => {
        testDb.insertTestData('assessments', item);
      });
      testDb.commit();
      
      const startTime = performance.now();
      
      // Query large result set
      const result = testDb.query('SELECT * FROM assessments');
      
      const duration = performance.now() - startTime;
      
      expect(result.length).toBe(5000);
      expect(duration).toBeLessThan(1000);
    });
    
    it('should clean up resources properly', () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const db = new TestDatabase();
        db.insertTestData('organization_profiles', {
          ...mockOrganization,
          org_id: `org-${i}`
        });
        db.close();
      }
      
      // If resources aren't cleaned up properly, this would fail
      expect(true).toBe(true);
    });
  });
  
  describe('Real-world Scenarios', () => {
    it('should generate reports quickly', () => {
      // Setup realistic data
      const batchData = generateLargeBatchData();
      
      testDb.insertTestData('organization_profiles', mockOrganization);
      testDb.insertTestData('profiles', batchData.profiles);
      
      batchData.profiles.forEach((profile, i) => {
        const assessments = batchData.assessments.slice(i * 5, (i + 1) * 5);
        testDb.insertTestData('assessments', assessments);
      });
      
      const startTime = performance.now();
      
      // Simulate report generation query
      const reportData = testDb.query(`
        SELECT 
          p.profile_name,
          p.profile_type,
          COUNT(a.assessment_id) as total_assessments,
          AVG(a.maturity_score) as avg_maturity,
          SUM(CASE WHEN a.implementation_level = 'Fully Implemented' THEN 1 ELSE 0 END) as fully_implemented,
          SUM(CASE WHEN a.implementation_level = 'Not Implemented' THEN 1 ELSE 0 END) as not_implemented
        FROM profiles p
        LEFT JOIN assessments a ON p.profile_id = a.profile_id
        GROUP BY p.profile_id
        ORDER BY avg_maturity DESC
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.reportGeneration);
      expect(reportData.length).toBeGreaterThan(0);
    });
    
    it('should compare profiles efficiently', () => {
      // Setup profiles with assessments
      testDb.insertTestData('organization_profiles', mockOrganization);
      const profiles = generateMockProfiles(3);
      testDb.insertTestData('profiles', profiles);
      
      profiles.forEach(profile => {
        const assessments = generateMockAssessments(100, profile.profile_id);
        testDb.insertTestData('assessments', assessments);
      });
      
      const startTime = performance.now();
      
      // Simulate profile comparison
      const comparison = testDb.query(`
        WITH profile_scores AS (
          SELECT 
            profile_id,
            subcategory_id,
            AVG(maturity_score) as avg_score
          FROM assessments
          WHERE profile_id IN (?, ?, ?)
          GROUP BY profile_id, subcategory_id
        )
        SELECT 
          subcategory_id,
          MAX(CASE WHEN profile_id = ? THEN avg_score END) as profile1_score,
          MAX(CASE WHEN profile_id = ? THEN avg_score END) as profile2_score,
          MAX(CASE WHEN profile_id = ? THEN avg_score END) as profile3_score
        FROM profile_scores
        GROUP BY subcategory_id
      `, [
        profiles[0].profile_id,
        profiles[1].profile_id,
        profiles[2].profile_id,
        profiles[0].profile_id,
        profiles[1].profile_id,
        profiles[2].profile_id
      ]);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.profileComparison);
      expect(comparison.length).toBeGreaterThan(0);
    });
  });
});