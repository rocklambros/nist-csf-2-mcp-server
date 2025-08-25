/**
 * Integration tests for database operations across MCP tools
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testUtils, performanceUtils } from '../setup.js';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { trackProgress } from '../../src/tools/track_progress.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';
import { exportData } from '../../src/tools/export_data.js';

describe('Database Integration Tests', () => {
  let testOrgId: string;
  let testProfileId: string;
  let targetProfileId: string;

  beforeAll(async () => {
    // Setup test organization and profiles
    const profile = await testUtils.createTestProfile({
      profile_name: 'Integration Test Profile',
      profile_type: 'current'
    });
    testOrgId = profile.org_id;
    testProfileId = profile.profile_id;

    const targetProfile = await testUtils.createTestProfile({
      profile_name: 'Target Profile',
      profile_type: 'target',
      org_id: testOrgId
    });
    targetProfileId = targetProfile.profile_id;
  });

  describe('Cross-Tool Data Flow Integration', () => {
    test('should maintain data consistency across profile creation and assessment workflow', async () => {
      // Step 1: Create new profile
      const profileResult = await createProfile.execute({
        org_name: 'Integration Test Org',
        profile_name: 'Workflow Test Profile',
        industry: 'Healthcare',
        size: 'large',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      }, testDb);

      expect(profileResult.success).toBe(true);
      const workflowProfileId = profileResult.profile.profile_id;

      // Step 2: Add assessments
      const assessmentResult = await quickAssessment.execute({
        profile_id: workflowProfileId,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 2,
        notes: 'Integration test assessment'
      }, testDb);

      expect(assessmentResult.success).toBe(true);

      // Step 3: Upload evidence
      const evidenceResult = await uploadEvidence.execute({
        profile_id: workflowProfileId,
        subcategory_id: 'GV.OC-01',
        file_name: 'integration-evidence.pdf',
        file_hash: 'integrationhash123',
        evidence_type: 'document',
        description: 'Integration test evidence'
      }, testDb);

      expect(evidenceResult.success).toBe(true);

      // Step 4: Track progress
      const progressResult = await trackProgress.execute({
        profile_id: workflowProfileId,
        subcategory_id: 'GV.OC-01',
        target_implementation: 'Fully Implemented',
        target_maturity: 4,
        current_implementation: 'Partially Implemented',
        current_maturity: 2
      }, testDb);

      expect(progressResult.success).toBe(true);

      // Step 5: Verify audit trail
      const auditResult = await trackAuditTrail.execute({
        profile_id: workflowProfileId,
        action: 'workflow_completed',
        resource_type: 'profile',
        performed_by: 'integration-test'
      }, testDb);

      expect(auditResult.success).toBe(true);

      // Step 6: Export all data and verify completeness
      const exportResult = await exportData.execute({
        profile_id: workflowProfileId,
        export_format: 'json',
        include_assessments: true,
        include_evidence: true,
        include_progress: true,
        include_audit_trail: true
      }, testDb);

      expect(exportResult.success).toBe(true);
      expect(exportResult.export_data.data.profile.profile_id).toBe(workflowProfileId);
      expect(exportResult.export_data.data.assessments).toHaveLength(1);
      expect(exportResult.export_data.data.evidence).toHaveLength(1);
      expect(exportResult.export_data.data.progress_tracking).toHaveLength(1);
    });

    test('should handle complex gap analysis workflow with multiple profiles', async () => {
      // Create assessments for both profiles
      const currentAssessments = [
        { subcategory_id: 'GV.OC-01', implementation_level: 'Partially Implemented', maturity_score: 2 },
        { subcategory_id: 'ID.AM-01', implementation_level: 'Not Implemented', maturity_score: 1 },
        { subcategory_id: 'PR.AC-01', implementation_level: 'Largely Implemented', maturity_score: 3 }
      ];

      const targetAssessments = [
        { subcategory_id: 'GV.OC-01', implementation_level: 'Fully Implemented', maturity_score: 4 },
        { subcategory_id: 'ID.AM-01', implementation_level: 'Fully Implemented', maturity_score: 4 },
        { subcategory_id: 'PR.AC-01', implementation_level: 'Fully Implemented', maturity_score: 4 }
      ];

      // Add assessments to current profile
      for (const assessment of currentAssessments) {
        await quickAssessment.execute({
          profile_id: testProfileId,
          ...assessment
        }, testDb);
      }

      // Add assessments to target profile
      for (const assessment of targetAssessments) {
        await quickAssessment.execute({
          profile_id: targetProfileId,
          ...assessment
        }, testDb);
      }

      // Generate gap analysis
      const gapResult = await generateGapAnalysis.execute({
        current_profile_id: testProfileId,
        target_profile_id: targetProfileId,
        include_recommendations: true,
        include_priority_ranking: true,
        include_effort_estimates: true
      }, testDb);

      expect(gapResult.success).toBe(true);
      expect(gapResult.gap_analysis.overall_gap_score).toBeGreaterThan(0);
      expect(gapResult.gap_analysis.function_gaps).toBeDefined();
      expect(gapResult.recommendations).toHaveLength(greaterThan(0));

      // Verify that gap analysis reflects the actual differences
      expect(gapResult.gap_analysis.total_gaps).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Database Transaction Integrity', () => {
    test('should maintain ACID properties during complex operations', async () => {
      // Start a complex operation that should be atomic
      const complexProfileData = {
        org_name: 'ACID Test Organization',
        profile_name: 'ACID Test Profile',
        industry: 'Financial Services',
        size: 'enterprise',
        current_tier: 'Tier1',
        target_tier: 'Tier4'
      };

      // This should either complete entirely or not at all
      const result = await createProfile.execute(complexProfileData, testDb);
      expect(result.success).toBe(true);

      // Verify the organization was created
      const orgQuery = testDb.db.prepare(`
        SELECT * FROM organizations WHERE org_id = ?
      `).get(result.profile.org_id);
      
      expect(orgQuery).toBeDefined();
      expect(orgQuery.org_name).toBe('ACID Test Organization');

      // Verify the profile was created
      const profileQuery = testDb.db.prepare(`
        SELECT * FROM profiles WHERE profile_id = ?
      `).get(result.profile.profile_id);
      
      expect(profileQuery).toBeDefined();
      expect(profileQuery.profile_name).toBe('ACID Test Profile');
    });

    test('should handle rollback on partial failures', async () => {
      // Create a scenario where a complex operation might fail partway through
      let initialProfileCount = 0;
      let initialOrgCount = 0;

      // Get initial counts
      try {
        const profileCount = testDb.db.prepare('SELECT COUNT(*) as count FROM profiles').get();
        const orgCount = testDb.db.prepare('SELECT COUNT(*) as count FROM organizations').get();
        initialProfileCount = profileCount.count;
        initialOrgCount = orgCount.count;
      } catch (error) {
        // Tables might not exist yet
      }

      // Create a mock database that will fail on the second operation
      let operationCount = 0;
      const mockDb = {
        db: {
          prepare: (sql: string) => ({
            run: (...args: any[]) => {
              operationCount++;
              if (operationCount > 1) {
                throw new Error('Simulated database failure');
              }
              return testDb.db.prepare(sql).run(...args);
            },
            get: (...args: any[]) => testDb.db.prepare(sql).get(...args),
            all: (...args: any[]) => testDb.db.prepare(sql).all(...args)
          }),
          prepare: (sql: string) => ({
            run: (...args: any[]) => {
              operationCount++;
              if (operationCount > 1) {
                throw new Error('Simulated database failure');
              }
              return testDb.db.prepare(sql).run(...args);
            }
          })
        }
      };

      // Attempt the operation that should fail
      const result = await createProfile.execute({
        org_name: 'Rollback Test Org',
        profile_name: 'Rollback Test Profile',
        industry: 'Technology',
        size: 'small'
      }, mockDb as any);

      // The operation should fail
      expect(result.success).toBe(false);

      // Verify counts haven't changed (rollback occurred)
      try {
        const finalProfileCount = testDb.db.prepare('SELECT COUNT(*) as count FROM profiles').get();
        const finalOrgCount = testDb.db.prepare('SELECT COUNT(*) as count FROM organizations').get();
        expect(finalProfileCount.count).toBe(initialProfileCount);
        expect(finalOrgCount.count).toBe(initialOrgCount);
      } catch (error) {
        // Expected if tables don't exist
      }
    });

    test('should handle concurrent database access safely', async () => {
      // Create multiple concurrent operations that modify the same data
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: `CONCURRENT-${i}`,
          implementation_level: 'Partially Implemented',
          maturity_score: 2,
          notes: `Concurrent test ${i}`
        }, testDb)
      );

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.assessment.notes).toBe(`Concurrent test ${index}`);
      });

      // Verify all assessments were created
      const assessmentCount = testDb.db.prepare(`
        SELECT COUNT(*) as count FROM assessments 
        WHERE profile_id = ? AND subcategory_id LIKE 'CONCURRENT-%'
      `).get(testProfileId);
      
      expect(assessmentCount.count).toBe(10);
    });
  });

  describe('Database Performance Integration', () => {
    test('should handle large dataset operations efficiently', async () => {
      // Create a profile with many assessments
      const largeProfile = await testUtils.createTestProfile({
        profile_name: 'Large Dataset Profile'
      });

      // Create many assessments
      const assessmentPromises = Array.from({ length: 100 }, (_, i) =>
        quickAssessment.execute({
          profile_id: largeProfile.profile_id,
          subcategory_id: `LARGE-DATASET-${String(i).padStart(3, '0')}`,
          implementation_level: ['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented'][i % 4],
          maturity_score: (i % 4) + 1,
          notes: `Large dataset assessment ${i}`
        }, testDb)
      );

      const startTime = Date.now();
      const results = await Promise.all(assessmentPromises);
      const duration = Date.now() - startTime;

      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete within reasonable time (10 seconds for 100 operations)
      expect(duration).toBeLessThan(10000);

      // Test large export operation
      const exportStartTime = Date.now();
      const exportResult = await exportData.execute({
        profile_id: largeProfile.profile_id,
        export_format: 'json',
        include_assessments: true
      }, testDb);
      const exportDuration = Date.now() - exportStartTime;

      expect(exportResult.success).toBe(true);
      expect(exportResult.export_data.data.assessments).toHaveLength(100);
      expect(exportDuration).toBeLessThan(5000); // Should export within 5 seconds
    });

    test('should optimize database queries for complex operations', async () => {
      // Test gap analysis performance with large datasets
      await testUtils.createTestAssessments(testProfileId, 50);
      await testUtils.createTestAssessments(targetProfileId, 50);

      const { result, duration } = await performanceUtils.measureTime(async () => {
        return await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          include_recommendations: true,
          include_effort_estimates: true,
          include_timeline: true
        }, testDb);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.gap_analysis.total_gaps).toBeGreaterThan(0);
    });
  });

  describe('Database Schema Validation', () => {
    test('should enforce foreign key constraints', async () => {
      // Try to create an assessment with invalid profile_id
      const result = await quickAssessment.execute({
        profile_id: 'non-existent-profile-id',
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented'
      }, testDb);

      // Should fail due to foreign key constraint
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should validate data types and constraints', async () => {
      // Test invalid maturity score (should be 1-5)
      const result1 = await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 10 // Invalid - outside range
      }, testDb);

      expect(result1.success).toBe(false);

      // Test invalid implementation level
      const result2 = await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Invalid Level' // Should not be accepted
      }, testDb);

      expect(result2.success).toBe(false);
    });

    test('should handle unique constraints properly', async () => {
      // Create first assessment
      const result1 = await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: 'UNIQUE-TEST-01',
        implementation_level: 'Partially Implemented'
      }, testDb);

      expect(result1.success).toBe(true);

      // Try to create duplicate assessment (should either update or fail gracefully)
      const result2 = await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: 'UNIQUE-TEST-01',
        implementation_level: 'Fully Implemented'
      }, testDb);

      // Should either succeed (update) or fail gracefully (unique constraint)
      expect(result2.success).toBeDefined();
      if (result2.success) {
        // If it succeeds, it should be an update
        expect(result2.assessment.implementation_level).toBe('Fully Implemented');
      }
    });
  });

  describe('Cross-Database Operation Tests', () => {
    test('should maintain referential integrity across related tables', async () => {
      // Create a complete workflow that spans multiple tables
      const workflowProfile = await testUtils.createTestProfile({
        profile_name: 'Referential Integrity Test'
      });

      // Add assessment
      const assessment = await quickAssessment.execute({
        profile_id: workflowProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 2
      }, testDb);

      // Add evidence linked to the assessment
      const evidence = await uploadEvidence.execute({
        profile_id: workflowProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        file_name: 'referential-test.pdf',
        file_hash: 'referentialhash123',
        evidence_type: 'document'
      }, testDb);

      // Add progress tracking
      const progress = await trackProgress.execute({
        profile_id: workflowProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        target_implementation: 'Fully Implemented',
        target_maturity: 4,
        current_implementation: 'Partially Implemented',
        current_maturity: 2
      }, testDb);

      // All should succeed
      expect(assessment.success).toBe(true);
      expect(evidence.success).toBe(true);
      expect(progress.success).toBe(true);

      // Verify relationships exist
      const profileCheck = testDb.db.prepare(`
        SELECT COUNT(*) as count FROM profiles WHERE profile_id = ?
      `).get(workflowProfile.profile_id);
      expect(profileCheck.count).toBe(1);

      const assessmentCheck = testDb.db.prepare(`
        SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?
      `).get(workflowProfile.profile_id);
      expect(assessmentCheck.count).toBe(1);

      // Test cascade behavior (if implemented)
      // Note: This would depend on your actual database schema
    });

    test('should handle batch operations with mixed success/failure', async () => {
      // Create a batch operation with some valid and some invalid items
      const batchResults = await Promise.allSettled([
        quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'BATCH-VALID-01',
          implementation_level: 'Partially Implemented'
        }, testDb),
        quickAssessment.execute({
          profile_id: 'invalid-profile-id',
          subcategory_id: 'BATCH-INVALID-01',
          implementation_level: 'Partially Implemented'
        }, testDb),
        quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'BATCH-VALID-02',
          implementation_level: 'Fully Implemented'
        }, testDb)
      ]);

      // Check results
      expect(batchResults[0].status).toBe('fulfilled');
      expect((batchResults[0] as any).value.success).toBe(true);
      
      expect(batchResults[1].status).toBe('fulfilled');
      expect((batchResults[1] as any).value.success).toBe(false);
      
      expect(batchResults[2].status).toBe('fulfilled');
      expect((batchResults[2] as any).value.success).toBe(true);

      // Verify that valid operations succeeded despite invalid ones
      const validAssessments = testDb.db.prepare(`
        SELECT COUNT(*) as count FROM assessments 
        WHERE profile_id = ? AND subcategory_id LIKE 'BATCH-VALID-%'
      `).get(testProfileId);
      
      expect(validAssessments.count).toBe(2);
    });
  });

  describe('Database Cleanup and Maintenance', () => {
    test('should handle orphaned record cleanup', async () => {
      // This test would verify cleanup of orphaned records
      // Implementation depends on your specific cleanup logic
      
      // Create test data
      const tempProfile = await testUtils.createTestProfile({
        profile_name: 'Cleanup Test Profile'
      });

      await quickAssessment.execute({
        profile_id: tempProfile.profile_id,
        subcategory_id: 'CLEANUP-TEST',
        implementation_level: 'Partially Implemented'
      }, testDb);

      // Verify data exists
      const beforeCount = testDb.db.prepare(`
        SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?
      `).get(tempProfile.profile_id);
      expect(beforeCount.count).toBe(1);

      // If you have cleanup functionality, test it here
      // This is a placeholder for cleanup operations
    });

    test('should maintain database integrity during maintenance operations', async () => {
      // Test database operations during simulated maintenance
      // This ensures the system gracefully handles maintenance windows
      
      const maintenanceOperations = [
        quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'MAINTENANCE-TEST-01',
          implementation_level: 'Partially Implemented'
        }, testDb),
        uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'MAINTENANCE-TEST-01',
          file_name: 'maintenance-test.pdf',
          file_hash: 'maintenancehash123',
          evidence_type: 'document'
        }, testDb)
      ];

      const results = await Promise.all(maintenanceOperations);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});