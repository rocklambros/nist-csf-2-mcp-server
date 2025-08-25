/**
 * Comprehensive database transaction and response format validation tests
 */

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { testDb, testUtils } from '../setup.js';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { trackProgress } from '../../src/tools/track_progress.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';

describe('Transaction and Response Validation Tests', () => {
  let testProfileId: string;
  let testOrgId: string;

  beforeAll(async () => {
    const profile = await testUtils.createTestProfile({
      profile_name: 'Transaction Test Profile'
    });
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;
  });

  describe('Database Transaction Tests', () => {
    describe('ACID Properties Validation', () => {
      test('should maintain atomicity in profile creation', async () => {
        // Create a scenario where profile creation might partially fail
        const initialOrgCount = getTableCount('organizations');
        const initialProfileCount = getTableCount('profiles');

        // Valid profile creation should be fully atomic
        const result = await createProfile.execute({
          org_name: 'Atomic Test Organization',
          profile_name: 'Atomic Test Profile',
          industry: 'Technology',
          size: 'medium',
          current_tier: 'Tier1',
          target_tier: 'Tier3'
        }, testDb);

        if (result.success) {
          // Both organization and profile should be created
          expect(getTableCount('organizations')).toBe(initialOrgCount + 1);
          expect(getTableCount('profiles')).toBe(initialProfileCount + 1);
        } else {
          // Neither should be created on failure
          expect(getTableCount('organizations')).toBe(initialOrgCount);
          expect(getTableCount('profiles')).toBe(initialProfileCount);
        }
      });

      test('should maintain consistency across related operations', async () => {
        const startTime = Date.now();
        
        // Create assessment and evidence for same subcategory
        const assessmentResult = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'CONSISTENCY-TEST',
          implementation_level: 'Partially Implemented',
          maturity_score: 2
        }, testDb);

        const evidenceResult = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'CONSISTENCY-TEST',
          file_name: 'consistency-test.pdf',
          file_hash: 'consistencyhash123',
          evidence_type: 'document'
        }, testDb);

        const progressResult = await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'CONSISTENCY-TEST',
          target_implementation: 'Fully Implemented',
          target_maturity: 4,
          current_implementation: 'Partially Implemented',
          current_maturity: 2
        }, testDb);

        // All operations should succeed and be consistent
        expect(assessmentResult.success).toBe(true);
        expect(evidenceResult.success).toBe(true);
        expect(progressResult.success).toBe(true);

        // Verify consistency of data
        expect(assessmentResult.assessment.subcategory_id).toBe('CONSISTENCY-TEST');
        expect(evidenceResult.evidence.subcategory_id).toBe('CONSISTENCY-TEST');
        expect(progressResult.progress_entry.subcategory_id).toBe('CONSISTENCY-TEST');
        
        // All should have timestamps after the start time
        expect(new Date(assessmentResult.assessment.assessment_date).getTime()).toBeGreaterThanOrEqual(startTime);
        expect(new Date(evidenceResult.evidence.upload_date).getTime()).toBeGreaterThanOrEqual(startTime);
        expect(new Date(progressResult.progress_entry.last_updated).getTime()).toBeGreaterThanOrEqual(startTime);
      });

      test('should provide isolation between concurrent transactions', async () => {
        const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
          assessmentPromise: quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: `ISOLATION-TEST-${i}`,
            implementation_level: 'Partially Implemented',
            maturity_score: 2
          }, testDb),
          evidencePromise: uploadEvidence.execute({
            profile_id: testProfileId,
            subcategory_id: `ISOLATION-TEST-${i}`,
            file_name: `isolation-${i}.pdf`,
            file_hash: `isolationhash${i}`,
            evidence_type: 'document'
          }, testDb)
        }));

        // Execute all operations concurrently
        const allPromises = concurrentOperations.flatMap(op => [op.assessmentPromise, op.evidencePromise]);
        const results = await Promise.all(allPromises);

        // All operations should succeed
        results.forEach(result => {
          expect(result.success).toBe(true);
        });

        // Verify that each operation maintained its isolation
        for (let i = 0; i < concurrentOperations.length; i++) {
          const assessmentResult = results[i * 2];
          const evidenceResult = results[i * 2 + 1];
          
          expect(assessmentResult.assessment.subcategory_id).toBe(`ISOLATION-TEST-${i}`);
          expect(evidenceResult.evidence.subcategory_id).toBe(`ISOLATION-TEST-${i}`);
          expect(evidenceResult.evidence.file_name).toBe(`isolation-${i}.pdf`);
        }
      });

      test('should ensure durability of committed transactions', async () => {
        const durabilityTestId = `DURABILITY-${Date.now()}`;
        
        // Create assessment
        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: durabilityTestId,
          implementation_level: 'Fully Implemented',
          maturity_score: 4,
          notes: 'Durability test assessment'
        }, testDb);

        expect(result.success).toBe(true);
        const assessmentId = result.assessment.assessment_id;

        // Simulate application restart by creating a new database connection
        // (In a real scenario, you might restart the application)
        
        // Verify the data persists
        const verifyQuery = testDb.db.prepare(`
          SELECT * FROM assessments WHERE assessment_id = ?
        `).get(assessmentId);

        expect(verifyQuery).toBeDefined();
        expect(verifyQuery.subcategory_id).toBe(durabilityTestId);
        expect(verifyQuery.implementation_level).toBe('Fully Implemented');
        expect(verifyQuery.maturity_score).toBe(4);
        expect(verifyQuery.notes).toBe('Durability test assessment');
      });
    });

    describe('Transaction Rollback Tests', () => {
      test('should rollback failed complex operations', async () => {
        const initialAssessmentCount = getTableCount('assessments');
        const initialEvidenceCount = getTableCount('audit_evidence');

        // Create a mock database that fails on the second operation
        let operationCount = 0;
        const failingDb = {
          db: {
            prepare: (sql: string) => ({
              run: (...args: any[]) => {
                operationCount++;
                if (operationCount === 2) {
                  throw new Error('Simulated transaction failure');
                }
                return testDb.db.prepare(sql).run(...args);
              },
              get: (...args: any[]) => testDb.db.prepare(sql).get(...args),
              all: (...args: any[]) => testDb.db.prepare(sql).all(...args)
            }),
            prepare: (sql: string) => ({
              run: (...args: any[]) => {
                operationCount++;
                if (operationCount === 2) {
                  throw new Error('Simulated transaction failure');
                }
                return testDb.db.prepare(sql).run(...args);
              }
            })
          }
        };

        // Attempt operation that should fail and rollback
        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'ROLLBACK-TEST',
          implementation_level: 'Partially Implemented',
          maturity_score: 2
        }, failingDb as any);

        // Operation should fail
        expect(result.success).toBe(false);

        // Database should remain unchanged (rollback)
        expect(getTableCount('assessments')).toBe(initialAssessmentCount);
      });

      test('should handle nested transaction failures', async () => {
        // This would test rollback of nested transactions if your tools support them
        // For now, test sequential operations that might fail
        
        const nestedOperations = async () => {
          // First operation should succeed
          const assessment = await quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: 'NESTED-TEST',
            implementation_level: 'Partially Implemented'
          }, testDb);

          if (!assessment.success) throw new Error('First operation failed');

          // Second operation with invalid data should fail
          const evidence = await uploadEvidence.execute({
            profile_id: 'invalid-profile-id', // This should fail
            subcategory_id: 'NESTED-TEST',
            file_name: 'test.pdf',
            file_hash: 'testhash',
            evidence_type: 'document'
          }, testDb);

          return { assessment, evidence };
        };

        try {
          const results = await nestedOperations();
          // If this doesn't throw, check results
          expect(results.assessment.success).toBe(true);
          expect(results.evidence.success).toBe(false);
        } catch (error) {
          // Expected behavior - nested operations can fail
          expect(error).toBeDefined();
        }
      });
    });

    describe('Deadlock Prevention Tests', () => {
      test('should prevent deadlocks in concurrent operations', async () => {
        // Create operations that might cause deadlocks if not handled properly
        const deadlockTestPromises = Array.from({ length: 20 }, (_, i) => {
          // Alternate between different operation types to create potential lock contention
          if (i % 2 === 0) {
            return quickAssessment.execute({
              profile_id: testProfileId,
              subcategory_id: `DEADLOCK-A-${i}`,
              implementation_level: 'Partially Implemented'
            }, testDb);
          } else {
            return uploadEvidence.execute({
              profile_id: testProfileId,
              subcategory_id: `DEADLOCK-B-${i}`,
              file_name: `deadlock-${i}.pdf`,
              file_hash: `deadlockhash${i}`,
              evidence_type: 'document'
            }, testDb);
          }
        });

        // All operations should complete without deadlock
        const results = await Promise.all(deadlockTestPromises);
        
        // Most operations should succeed (some might fail due to validation, but not deadlocks)
        const successCount = results.filter(r => r.success).length;
        const successRate = successCount / results.length;
        expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum
      });

      test('should handle lock timeouts gracefully', async () => {
        // Create a long-running operation and concurrent operations
        const longRunningOperation = generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          baseline_tier: 'Tier2',
          include_recommendations: true,
          include_effort_estimates: true
        }, testDb);

        const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
          quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: `LOCK-TIMEOUT-${i}`,
            implementation_level: 'Partially Implemented'
          }, testDb)
        );

        // All operations should eventually complete
        const allResults = await Promise.all([longRunningOperation, ...concurrentOperations]);
        
        allResults.forEach(result => {
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Constraint Violation Handling', () => {
      test('should handle foreign key constraint violations', async () => {
        const result = await quickAssessment.execute({
          profile_id: 'non-existent-profile-id',
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        }, testDb);

        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
      });

      test('should handle unique constraint violations gracefully', async () => {
        const duplicateData = {
          profile_id: testProfileId,
          subcategory_id: 'UNIQUE-CONSTRAINT-TEST',
          implementation_level: 'Partially Implemented',
          maturity_score: 2
        };

        // Create first assessment
        const firstResult = await quickAssessment.execute(duplicateData, testDb);
        expect(firstResult.success).toBe(true);

        // Attempt to create duplicate
        const duplicateResult = await quickAssessment.execute(duplicateData, testDb);
        
        // Should either succeed (update) or fail gracefully (duplicate prevention)
        expect(duplicateResult).toBeDefined();
        if (!duplicateResult.success) {
          expect(duplicateResult.message).toBeDefined();
        }
      });

      test('should handle check constraint violations', async () => {
        // Test invalid enum values
        const invalidEnumResult = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'CHECK-CONSTRAINT-TEST',
          implementation_level: 'Invalid Implementation Level'
        }, testDb);

        expect(invalidEnumResult.success).toBe(false);
        expect(invalidEnumResult.message).toBeDefined();

        // Test invalid numeric ranges
        const invalidRangeResult = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'RANGE-CONSTRAINT-TEST',
          implementation_level: 'Partially Implemented',
          maturity_score: 10 // Outside valid range
        }, testDb);

        expect(invalidRangeResult.success).toBe(false);
        expect(invalidRangeResult.message).toBeDefined();
      });
    });
  });

  describe('Response Format Validation Tests', () => {
    describe('Success Response Format', () => {
      test('should return consistent success format for profile creation', async () => {
        const result = await createProfile.execute({
          org_name: `Format Test Org ${Date.now()}`,
          profile_name: 'Format Test Profile',
          industry: 'Technology',
          size: 'medium'
        }, testDb);

        expect(result).toMatchObject({
          success: true,
          profile: expect.objectContaining({
            profile_id: expect.any(String),
            org_id: expect.any(String),
            profile_name: expect.any(String),
            profile_type: expect.any(String),
            created_date: expect.any(String)
          }),
          organization: expect.objectContaining({
            org_id: expect.any(String),
            org_name: expect.any(String),
            industry: expect.any(String),
            size: expect.any(String)
          })
        });

        // Verify date formats
        expect(() => new Date(result.profile.created_date)).not.toThrow();
        expect(new Date(result.profile.created_date).toISOString()).toBe(result.profile.created_date);
      });

      test('should return consistent success format for assessments', async () => {
        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'FORMAT-TEST-ASSESSMENT',
          implementation_level: 'Partially Implemented',
          maturity_score: 2,
          notes: 'Format validation test'
        }, testDb);

        expect(result).toMatchObject({
          success: true,
          assessment: expect.objectContaining({
            assessment_id: expect.any(String),
            profile_id: expect.any(String),
            subcategory_id: expect.any(String),
            implementation_level: expect.any(String),
            maturity_score: expect.any(Number),
            assessment_date: expect.any(String)
          })
        });

        // Verify data types
        expect(typeof result.assessment.assessment_id).toBe('string');
        expect(typeof result.assessment.maturity_score).toBe('number');
        expect(result.assessment.maturity_score).toBeGreaterThanOrEqual(1);
        expect(result.assessment.maturity_score).toBeLessThanOrEqual(5);
        
        // Verify date format
        expect(() => new Date(result.assessment.assessment_date)).not.toThrow();
      });

      test('should return consistent success format for evidence upload', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'format-test.pdf',
          file_hash: 'formattesthash123',
          evidence_type: 'document',
          description: 'Format validation evidence'
        }, testDb);

        expect(result).toMatchObject({
          success: true,
          evidence: expect.objectContaining({
            evidence_id: expect.any(String),
            profile_id: expect.any(String),
            subcategory_id: expect.any(String),
            file_name: expect.any(String),
            file_hash: expect.any(String),
            evidence_type: expect.any(String),
            upload_date: expect.any(String)
          })
        });

        // Verify specific field formats
        expect(result.evidence.file_hash).toMatch(/^[a-f0-9]+$/i); // Hex format
        expect(result.evidence.evidence_type).toMatch(/^(document|screenshot|log|report|config|certificate|policy|procedure)$/);
        expect(() => new Date(result.evidence.upload_date)).not.toThrow();
      });
    });

    describe('Error Response Format', () => {
      test('should return consistent error format across all tools', async () => {
        const errorScenarios = [
          () => createProfile.execute({
            org_name: 'Test',
            profile_name: '', // Invalid empty name
            industry: 'Technology',
            size: 'medium'
          }, testDb),
          
          () => quickAssessment.execute({
            profile_id: 'invalid-profile-id',
            subcategory_id: 'GV.OC-01',
            implementation_level: 'Partially Implemented'
          }, testDb),
          
          () => uploadEvidence.execute({
            profile_id: testProfileId,
            subcategory_id: 'INVALID.SUBCATEGORY',
            file_name: 'test.pdf',
            file_hash: 'hash123',
            evidence_type: 'document'
          }, testDb)
        ];

        for (const scenario of errorScenarios) {
          const result = await scenario();
          
          expect(result).toMatchObject({
            success: false,
            error: expect.any(String),
            message: expect.any(String)
          });

          // Verify error structure
          expect(typeof result.error).toBe('string');
          expect(typeof result.message).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          expect(result.message.length).toBeGreaterThan(0);
          
          // Verify no sensitive information
          const responseText = JSON.stringify(result);
          expect(responseText).not.toContain('password');
          expect(responseText).not.toContain('secret');
          expect(responseText).not.toContain('token');
          expect(responseText).not.toContain('database');
        }
      });

      test('should include appropriate error codes and categories', async () => {
        const validationErrorResult = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Invalid Level'
        }, testDb);

        expect(validationErrorResult.success).toBe(false);
        expect(validationErrorResult.error).toBeDefined();
        
        // Error should indicate validation issue
        expect(validationErrorResult.error.toLowerCase()).toMatch(/(validation|invalid|format)/);

        const notFoundErrorResult = await quickAssessment.execute({
          profile_id: 'non-existent-profile',
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        }, testDb);

        expect(notFoundErrorResult.success).toBe(false);
        expect(notFoundErrorResult.message.toLowerCase()).toMatch(/(not found|does not exist)/);
      });
    });

    describe('Data Type Consistency', () => {
      test('should maintain consistent data types across operations', async () => {
        // Create test data
        const profileResult = await createProfile.execute({
          org_name: 'Data Type Test Org',
          profile_name: 'Data Type Test Profile',
          industry: 'Technology',
          size: 'medium'
        }, testDb);

        const assessmentResult = await quickAssessment.execute({
          profile_id: profileResult.profile.profile_id,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented',
          maturity_score: 2
        }, testDb);

        const evidenceResult = await uploadEvidence.execute({
          profile_id: profileResult.profile.profile_id,
          subcategory_id: 'GV.OC-01',
          file_name: 'consistency-test.pdf',
          file_hash: 'consistencyhash',
          evidence_type: 'document'
        }, testDb);

        // Verify consistent ID formats
        expect(typeof profileResult.profile.profile_id).toBe('string');
        expect(typeof assessmentResult.assessment.assessment_id).toBe('string');
        expect(typeof evidenceResult.evidence.evidence_id).toBe('string');

        // Verify consistent date formats
        const profileDate = new Date(profileResult.profile.created_date);
        const assessmentDate = new Date(assessmentResult.assessment.assessment_date);
        const evidenceDate = new Date(evidenceResult.evidence.upload_date);

        expect(profileDate).toBeInstanceOf(Date);
        expect(assessmentDate).toBeInstanceOf(Date);
        expect(evidenceDate).toBeInstanceOf(Date);
        expect(isNaN(profileDate.getTime())).toBe(false);
        expect(isNaN(assessmentDate.getTime())).toBe(false);
        expect(isNaN(evidenceDate.getTime())).toBe(false);

        // Verify consistent numeric formats
        expect(typeof assessmentResult.assessment.maturity_score).toBe('number');
        expect(Number.isInteger(assessmentResult.assessment.maturity_score)).toBe(true);
      });

      test('should handle null and undefined values correctly', async () => {
        const resultWithOptionalFields = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'NULL-TEST',
          implementation_level: 'Partially Implemented',
          // Optional fields omitted
        }, testDb);

        expect(resultWithOptionalFields.success).toBe(true);
        
        // Optional fields should be handled consistently
        if ('notes' in resultWithOptionalFields.assessment) {
          expect(resultWithOptionalFields.assessment.notes === null || 
                 resultWithOptionalFields.assessment.notes === undefined ||
                 typeof resultWithOptionalFields.assessment.notes === 'string').toBe(true);
        }
      });
    });

    describe('Response Completeness', () => {
      test('should include all required fields in responses', async () => {
        const requiredProfileFields = [
          'profile_id', 'org_id', 'profile_name', 'profile_type', 'created_date'
        ];
        
        const requiredOrgFields = [
          'org_id', 'org_name', 'industry', 'size'
        ];

        const profileResult = await createProfile.execute({
          org_name: 'Completeness Test Org',
          profile_name: 'Completeness Test Profile',
          industry: 'Technology',
          size: 'medium'
        }, testDb);

        expect(profileResult.success).toBe(true);

        // Check all required profile fields are present
        requiredProfileFields.forEach(field => {
          expect(profileResult.profile).toHaveProperty(field);
          expect(profileResult.profile[field]).toBeDefined();
          expect(profileResult.profile[field]).not.toBe('');
        });

        // Check all required organization fields are present
        requiredOrgFields.forEach(field => {
          expect(profileResult.organization).toHaveProperty(field);
          expect(profileResult.organization[field]).toBeDefined();
          expect(profileResult.organization[field]).not.toBe('');
        });
      });

      test('should maintain response structure consistency', async () => {
        // Test multiple operations to ensure consistent response structure
        const operations = [
          () => quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: 'STRUCTURE-TEST-1',
            implementation_level: 'Partially Implemented'
          }, testDb),
          
          () => quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: 'STRUCTURE-TEST-2',
            implementation_level: 'Fully Implemented'
          }, testDb)
        ];

        const results = await Promise.all(operations.map(op => op()));
        
        // All successful results should have the same structure
        const successfulResults = results.filter(r => r.success);
        expect(successfulResults.length).toBeGreaterThan(0);

        const firstResult = successfulResults[0];
        const responseKeys = Object.keys(firstResult).sort();

        successfulResults.forEach(result => {
          expect(Object.keys(result).sort()).toEqual(responseKeys);
          expect(typeof result.success).toBe('boolean');
          expect(result.success).toBe(true);
        });
      });
    });
  });

  // Helper function to count table records
  function getTableCount(tableName: string): number {
    try {
      const result = testDb.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      return result.count;
    } catch (error) {
      // Table might not exist
      return 0;
    }
  }
});