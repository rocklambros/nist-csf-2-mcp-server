/**
 * Comprehensive tests for assessment tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, testUtils } from '../setup.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { assessMaturity } from '../../src/tools/assess_maturity.js';
import { trackProgress } from '../../src/tools/track_progress.js';
import { generateMilestone } from '../../src/tools/generate_milestone.js';
import { invalidInputs } from '../helpers/mock-data.js';

describe('Assessment Tools - Comprehensive Tests', () => {
  let testProfileId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Create test profile for assessments
    const profile = await testUtils.createTestProfile();
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;
  });

  describe('Quick Assessment Tool', () => {
    describe('Valid Input Tests', () => {
      test('should perform quick assessment with minimal data', async () => {
        const assessmentData = {
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented',
          notes: 'Quick assessment test'
        };

        const result = await quickAssessment.execute(assessmentData, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          assessment: expect.objectContaining({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            implementation_level: 'Partially Implemented',
            assessment_id: expect.any(String)
          })
        });
      });

      test('should perform assessment with all optional fields', async () => {
        const assessmentData = {
          profile_id: testProfileId,
          subcategory_id: 'ID.AM-01',
          implementation_level: 'Fully Implemented',
          maturity_score: 4,
          notes: 'Comprehensive assessment with all fields',
          assessed_by: 'test-assessor',
          priority: 'high',
          target_completion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        };

        const result = await quickAssessment.execute(assessmentData, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          assessment: expect.objectContaining({
            profile_id: testProfileId,
            subcategory_id: 'ID.AM-01',
            implementation_level: 'Fully Implemented',
            maturity_score: 4,
            priority: 'high'
          })
        });
      });

      test('should calculate automatic maturity score based on implementation level', async () => {
        const testCases = [
          { level: 'Not Implemented', expectedScore: 1 },
          { level: 'Partially Implemented', expectedScore: 2 },
          { level: 'Largely Implemented', expectedScore: 3 },
          { level: 'Fully Implemented', expectedScore: 4 }
        ];

        for (const testCase of testCases) {
          const result = await quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: `TEST-${Math.random().toString(36).substr(2, 9)}`,
            implementation_level: testCase.level
          }, testDb);

          expect(result.success).toBe(true);
          expect(result.assessment.maturity_score).toBe(testCase.expectedScore);
        }
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing profile_id', async () => {
        const result = await quickAssessment.execute({
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'profile_id');
      });

      test('should handle invalid implementation level', async () => {
        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Invalid Level'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'implementation_level');
      });

      test('should handle invalid maturity score', async () => {
        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented',
          maturity_score: 10
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'maturity_score');
      });

      test('should handle SQL injection attempts', async () => {
        const result = await quickAssessment.execute({
          profile_id: invalidInputs.sqlInjection,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        }, testDb);
        
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Database Transaction Tests', () => {
      test('should rollback on database error', async () => {
        // Create invalid database state to trigger rollback
        const mockDb = {
          prepare: () => ({ run: () => { throw new Error('Database error'); } })
        };

        const result = await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        }, mockDb as any);

        testUtils.assertErrorResponse(result, 'Database error');
      });

      test('should handle concurrent assessments', async () => {
        const promises = Array.from({ length: 5 }, (_, i) =>
          quickAssessment.execute({
            profile_id: testProfileId,
            subcategory_id: `TEST-CONCURRENT-${i}`,
            implementation_level: 'Partially Implemented'
          }, testDb)
        );

        const results = await Promise.all(promises);
        
        results.forEach(result => {
          expect(result.success).toBe(true);
          expect(result.assessment).toBeDefined();
        });
      });
    });

    describe('Performance Tests', () => {
      test('should complete assessment within performance threshold', async () => {
        const startTime = Date.now();
        
        await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: 'PERF-TEST-01',
          implementation_level: 'Partially Implemented'
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(500); // Should complete within 500ms
      });
    });
  });

  describe('Assess Maturity Tool', () => {
    describe('Valid Input Tests', () => {
      test('should assess maturity for profile', async () => {
        // Create some test assessments first
        await testUtils.createTestAssessments(testProfileId, 5);

        const result = await assessMaturity.execute({
          profile_id: testProfileId,
          include_subcategory_breakdown: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          maturity_assessment: expect.objectContaining({
            profile_id: testProfileId,
            overall_score: expect.any(Number),
            function_scores: expect.any(Object),
            subcategory_count: expect.any(Number)
          })
        });

        expect(result.maturity_assessment.overall_score).toBeGreaterThanOrEqual(0);
        expect(result.maturity_assessment.overall_score).toBeLessThanOrEqual(5);
      });

      test('should assess maturity by function', async () => {
        const result = await assessMaturity.execute({
          profile_id: testProfileId,
          function_filter: 'GV',
          include_recommendations: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          maturity_assessment: expect.objectContaining({
            profile_id: testProfileId,
            function_filter: 'GV',
            recommendations: expect.any(Array)
          })
        });
      });

      test('should include maturity trends when requested', async () => {
        const result = await assessMaturity.execute({
          profile_id: testProfileId,
          include_trends: true,
          trend_period_days: 30
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.maturity_assessment).toHaveProperty('trends');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing profile_id', async () => {
        const result = await assessMaturity.execute({} as any, testDb);
        testUtils.assertErrorResponse(result, 'profile_id');
      });

      test('should handle non-existent profile', async () => {
        const result = await assessMaturity.execute({
          profile_id: 'non-existent-profile'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'not found');
      });

      test('should handle invalid function filter', async () => {
        const result = await assessMaturity.execute({
          profile_id: testProfileId,
          function_filter: 'INVALID'
        }, testDb);

        // Should succeed but return empty results
        expect(result.success).toBe(true);
        expect(result.maturity_assessment.function_scores).toEqual({});
      });
    });

    describe('Edge Cases', () => {
      test('should handle profile with no assessments', async () => {
        const emptyProfile = await testUtils.createTestProfile({
          profile_name: 'Empty Profile'
        });

        const result = await assessMaturity.execute({
          profile_id: emptyProfile.profile_id
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.maturity_assessment.overall_score).toBe(0);
        expect(result.maturity_assessment.subcategory_count).toBe(0);
      });
    });
  });

  describe('Track Progress Tool', () => {
    describe('Valid Input Tests', () => {
      test('should create progress tracking entry', async () => {
        const progressData = {
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          target_implementation: 'Fully Implemented',
          target_maturity: 4,
          target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        };

        const result = await trackProgress.execute(progressData, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          progress_entry: expect.objectContaining({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            target_implementation: 'Fully Implemented',
            target_maturity: 4,
            progress_id: expect.any(String)
          })
        });
      });

      test('should update existing progress entry', async () => {
        // Create initial progress entry
        const initial = await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'ID.AM-01',
          target_implementation: 'Partially Implemented',
          target_maturity: 2
        }, testDb);

        // Update the progress
        const result = await trackProgress.execute({
          progress_id: initial.progress_entry.progress_id,
          current_implementation: 'Partially Implemented',
          current_maturity: 2,
          progress_percentage: 50,
          status: 'on_track',
          notes: 'Making good progress'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          progress_entry: expect.objectContaining({
            progress_id: initial.progress_entry.progress_id,
            current_implementation: 'Partially Implemented',
            progress_percentage: 50,
            status: 'on_track'
          })
        });
      });

      test('should calculate progress percentage automatically', async () => {
        const result = await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'TEST-AUTO-CALC',
          target_implementation: 'Fully Implemented',
          target_maturity: 4,
          current_implementation: 'Partially Implemented',
          current_maturity: 2
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.progress_entry.progress_percentage).toBe(50); // 2/4 * 100
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle invalid status values', async () => {
        const result = await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          target_implementation: 'Fully Implemented',
          status: 'invalid_status'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'status');
      });

      test('should handle invalid progress percentage', async () => {
        const result = await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          target_implementation: 'Fully Implemented',
          progress_percentage: 150
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'progress_percentage');
      });
    });
  });

  describe('Generate Milestone Tool', () => {
    describe('Valid Input Tests', () => {
      test('should create milestone with required fields', async () => {
        const milestoneData = {
          profile_id: testProfileId,
          milestone_name: 'Q1 Security Goals',
          description: 'Complete governance framework implementation',
          target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        };

        const result = await generateMilestone.execute(milestoneData, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          milestone: expect.objectContaining({
            profile_id: testProfileId,
            milestone_name: 'Q1 Security Goals',
            milestone_id: expect.any(String),
            status: 'planned'
          })
        });
      });

      test('should create milestone with subcategory associations', async () => {
        const result = await generateMilestone.execute({
          profile_id: testProfileId,
          milestone_name: 'Identity Management Milestone',
          description: 'Complete identity management controls',
          target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          associated_subcategories: ['GV.OC-01', 'ID.AM-01'],
          priority: 'high'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.milestone.associated_subcategories).toEqual(['GV.OC-01', 'ID.AM-01']);
        expect(result.milestone.priority).toBe('high');
      });

      test('should calculate completion percentage based on progress', async () => {
        // Create progress entries first
        await trackProgress.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          target_implementation: 'Fully Implemented',
          current_implementation: 'Partially Implemented',
          progress_percentage: 75
        }, testDb);

        const result = await generateMilestone.execute({
          profile_id: testProfileId,
          milestone_name: 'Auto-calculated Milestone',
          description: 'Test auto-calculation',
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          associated_subcategories: ['GV.OC-01']
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.milestone.completion_percentage).toBeGreaterThan(0);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing required fields', async () => {
        const result = await generateMilestone.execute({
          profile_id: testProfileId
        } as any, testDb);
        
        testUtils.assertErrorResponse(result);
      });

      test('should handle invalid priority values', async () => {
        const result = await generateMilestone.execute({
          profile_id: testProfileId,
          milestone_name: 'Test Milestone',
          target_date: new Date().toISOString(),
          priority: 'invalid_priority'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'priority');
      });

      test('should handle past target dates', async () => {
        const result = await generateMilestone.execute({
          profile_id: testProfileId,
          milestone_name: 'Past Milestone',
          target_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'target_date');
      });
    });

    describe('Performance Tests', () => {
      test('should create multiple milestones efficiently', async () => {
        const startTime = Date.now();
        
        const promises = Array.from({ length: 5 }, (_, i) =>
          generateMilestone.execute({
            profile_id: testProfileId,
            milestone_name: `Performance Milestone ${i}`,
            description: `Test milestone ${i}`,
            target_date: new Date(Date.now() + (30 + i) * 24 * 60 * 60 * 1000).toISOString()
          }, testDb)
        );

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        results.forEach(result => expect(result.success).toBe(true));
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent assessment response format', async () => {
      const result = await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: 'FORMAT-TEST-01',
        implementation_level: 'Partially Implemented'
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
    });

    test('should return consistent maturity response format', async () => {
      const result = await assessMaturity.execute({
        profile_id: testProfileId
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        maturity_assessment: expect.objectContaining({
          profile_id: expect.any(String),
          overall_score: expect.any(Number),
          function_scores: expect.any(Object),
          assessment_date: expect.any(String),
          subcategory_count: expect.any(Number)
        })
      });
    });

    test('should return consistent error format', async () => {
      const result = await quickAssessment.execute({
        profile_id: 'invalid'
      } as any, testDb);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });
});