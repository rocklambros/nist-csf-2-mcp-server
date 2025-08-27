/**
 * Database transaction validation tests - simplified version focusing on core functionality
 */

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { testDb, testUtils } from '../setup.js';

describe('Database Transaction Tests', () => {
  let testProfileId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Create basic framework data for testing
    testDb.prepare(`
      INSERT OR REPLACE INTO functions (id, name, description)
      VALUES ('GV', 'GOVERN', 'Establish and monitor cybersecurity governance')
    `).run();
    
    testDb.prepare(`
      INSERT OR REPLACE INTO categories (id, function_id, name, description)
      VALUES ('GV.OC', 'GV', 'Organizational Context', 'The organizations context is understood')
    `).run();
    
    testDb.prepare(`
      INSERT OR REPLACE INTO subcategories (id, category_id, name, description)
      VALUES ('GV.OC-01', 'GV.OC', 'Organizational mission understood', 'The organizational mission is understood and informs cybersecurity risk management')
    `).run();
    
    testDb.prepare(`
      INSERT OR REPLACE INTO subcategories (id, category_id, name, description)
      VALUES ('GV.OC-02', 'GV.OC', 'Test subcategory 2', 'Test subcategory for validation')
    `).run();

    const profile = await testUtils.createTestProfile({
      profile_name: 'Transaction Test Profile'
    });
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;
    
    // Verify the profile was created
    const profileExists = testDb.prepare('SELECT COUNT(*) as count FROM profiles WHERE profile_id = ?').get(testProfileId) as { count: number };
    console.log('Profile exists count:', profileExists.count, 'Profile ID:', testProfileId);
  });

  afterEach(() => {
    // Clean up test data between tests
    try {
      testDb.prepare('DELETE FROM assessments WHERE profile_id LIKE ?').run('test-%');
      testDb.prepare('DELETE FROM progress_tracking WHERE profile_id LIKE ?').run('test-%');
      testDb.prepare('DELETE FROM audit_evidence WHERE profile_id LIKE ?').run('test-%');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  function getTableCount(tableName: string): number {
    try {
      const result = testDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      return result.count;
    } catch (error) {
      return 0;
    }
  }

  describe('ACID Properties Validation', () => {
    test('should maintain atomicity in transaction operations', async () => {
      const initialCount = getTableCount('assessments');

      // Test atomic transaction with multiple operations
      const transaction = testDb.transaction(() => {
        // Insert assessment
        testDb.prepare(`
          INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(testProfileId, 'GV.OC-01', 'Partially Implemented', 2, 'Test assessment', 'test-user');
        
        // Insert progress tracking
        testDb.prepare(`
          INSERT INTO progress_tracking (profile_id, subcategory_id, current_score, target_score, progress_percentage)
          VALUES (?, ?, ?, ?, ?)
        `).run(testProfileId, 'GV.OC-01', 2, 4, 50);
      });

      transaction();

      // Both operations should have succeeded
      const finalCount = getTableCount('assessments');
      expect(finalCount).toBe(initialCount + 1);

      const progressCount = getTableCount('progress_tracking');
      expect(progressCount).toBeGreaterThan(0);
    });

    test('should rollback on transaction failure', async () => {
      const initialAssessmentCount = getTableCount('assessments');
      
      try {
        const transaction = testDb.transaction(() => {
          // Insert valid assessment
          testDb.prepare(`
            INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(testProfileId, 'GV.OC-02', 'Fully Implemented', 4, 'Test assessment', 'test-user');
          
          // Insert invalid data that will cause transaction to fail
          testDb.prepare(`
            INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(null, 'INVALID-ID', 'Invalid Level', -1, 'This should fail', null);
        });

        transaction();
      } catch (error) {
        // Transaction should fail
      }

      // Count should remain unchanged due to rollback
      const finalCount = getTableCount('assessments');
      expect(finalCount).toBe(initialAssessmentCount);
    });

    test('should maintain consistency with foreign key constraints', async () => {
      const invalidProfileId = 'non-existent-profile';
      
      expect(() => {
        testDb.prepare(`
          INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score)
          VALUES (?, ?, ?, ?)
        `).run(invalidProfileId, 'GV.OC-01', 'Partially Implemented', 2);
      }).toThrow();
    });

    test('should handle concurrent operations safely', async () => {
      const concurrentOperations = [];
      
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          new Promise((resolve) => {
            try {
              testDb.prepare(`
                INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes)
                VALUES (?, ?, ?, ?, ?)
              `).run(testProfileId, `CONCURRENT-${i}`, 'Partially Implemented', 2, `Concurrent test ${i}`);
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          })
        );
      }

      const results = await Promise.all(concurrentOperations);
      
      // At least some operations should succeed
      const successCount = results.filter(result => result === true).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should enforce data type constraints', async () => {
      // Test invalid maturity score
      expect(() => {
        testDb.prepare(`
          INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score)
          VALUES (?, ?, ?, ?)
        `).run(testProfileId, 'GV.OC-01', 'Partially Implemented', 'invalid-score');
      }).toThrow();
    });

    test('should handle null values appropriately', async () => {
      // Test with optional null values
      const stmt = testDb.prepare(`
        INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      expect(() => {
        stmt.run(testProfileId, 'NULL-TEST', 'Partially Implemented', 2, null, null);
      }).not.toThrow();
    });
  });

  describe('Database Operations Performance', () => {
    test('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      const batchInsert = testDb.transaction((assessments: any[]) => {
        const stmt = testDb.prepare(`
          INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const assessment of assessments) {
          stmt.run(assessment.profile_id, assessment.subcategory_id, 
                   assessment.implementation_level, assessment.maturity_score, assessment.notes);
        }
      });

      const testData = Array.from({ length: 50 }, (_, i) => ({
        profile_id: testProfileId,
        subcategory_id: `BATCH-TEST-${i}`,
        implementation_level: 'Partially Implemented',
        maturity_score: 2,
        notes: `Batch test ${i}`
      }));

      batchInsert(testData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      // Verify all records were inserted
      const count = testDb.prepare(`
        SELECT COUNT(*) as count FROM assessments WHERE subcategory_id LIKE 'BATCH-TEST-%'
      `).get() as { count: number };
      
      expect(count.count).toBe(50);
    });
  });
});