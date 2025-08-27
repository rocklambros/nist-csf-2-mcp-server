/**
 * Fixed Quick Assessment Tool Test with Proper Database Mocking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock';

// Setup complete mocking environment
const toolHelper = setupCompleteToolMocking('quick_assessment');

describe('Quick Assessment Tool - Fixed', () => {
  let testData: any;

  beforeEach(() => {
    // Clear all mocks and setup test database
    jest.clearAllMocks();
    testData = toolHelper.beforeEachSetup();
  });

  afterEach(() => {
    toolHelper.afterEachCleanup();
  });

  describe('Valid assessments', () => {
    it('should perform quick assessment with all yes answers', async () => {
      // Dynamic import after mocks are set up
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: testData.profile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        },
        assessed_by: 'test-assessor'
      };

      const result = await quickAssessment(params);

      // Should succeed with realistic test data
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.initial_maturity_scores).toBeDefined();
        expect(result.initial_maturity_scores.overall_average).toBeGreaterThan(2.5);
        expect(result.details?.assessmentsCreated).toBeGreaterThan(0);
      }
    });

    it('should perform quick assessment with mixed answers', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: testData.profile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'yes' as const,
          detect: 'no' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        },
        assessed_by: 'test-assessor'
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.initial_maturity_scores).toBeDefined();
        expect(result.initial_maturity_scores.overall_average).toBeLessThan(2.5);
        expect(result.initial_maturity_scores.overall_average).toBeGreaterThan(1.0);
      }
    });

    it('should include function-specific notes', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: testData.profile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        },
        notes: {
          govern: 'Strong governance framework in place',
          detect: 'Advanced monitoring capabilities implemented'
        },
        assessed_by: 'test-assessor'
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.initial_maturity_scores).toBeDefined();
        expect(result.details?.assessmentsCreated).toBeGreaterThan(0);
      }
    });
  });

  describe('Invalid inputs', () => {
    it('should reject invalid profile ID', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: 'invalid-profile-id',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        }
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Profile not found');
    });

    it('should reject invalid answer values', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: testData.profile.profile_id,
        simplified_answers: {
          govern: 'maybe' as any,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        }
      };

      const result = await quickAssessment(params);
      expect(result.success).toBe(false);
    });
  });

  describe('Database integration', () => {
    it('should create assessments in database', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');

      const params = {
        profile_id: testData.profile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        },
        assessed_by: 'integration-test'
      };

      const initialCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?',
        [testData.profile.profile_id]
      )[0].count;

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.details?.assessmentsCreated).toBeGreaterThan(0);
        expect(result.initial_maturity_scores).toBeDefined();
      }

      // Verify assessments were created in database
      const finalCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?',
        [testData.profile.profile_id]
      )[0].count;

      expect(finalCount).toBeGreaterThan(initialCount);

      // Verify assessment data
      const assessments = toolHelper.getDatabase().query(
        'SELECT * FROM assessments WHERE profile_id = ? AND assessed_by = ?',
        [testData.profile.profile_id, 'integration-test']
      );

      expect(assessments.length).toBeGreaterThan(0);
      assessments.forEach(assessment => {
        expect(assessment.maturity_score).toBeGreaterThanOrEqual(0);
        expect(assessment.maturity_score).toBeLessThanOrEqual(5);
      });
    });
  });
});