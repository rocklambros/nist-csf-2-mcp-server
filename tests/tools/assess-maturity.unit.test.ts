/**
 * Assess Maturity Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { assessMaturity } from '../../src/tools/assess_maturity.js';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Assess Maturity Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('maturity assessment functionality', () => {
    it('should assess maturity levels successfully', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'full' as const,
        include_recommendations: true
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-123'
      }));

      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({
          subcategory_id: 'GV.OC-01',
          maturity_score: 2,
          implementation_level: 2
        }),
        testUtils.createMockAssessment({
          subcategory_id: 'ID.AM-01',
          maturity_score: 3,
          implementation_level: 3
        }),
        testUtils.createMockAssessment({
          subcategory_id: 'PR.AC-01',
          maturity_score: 4,
          implementation_level: 4
        })
      ]);

      const result = await assessMaturity(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data?.maturity_assessment).toBeDefined();
      expect(result.data.overall_maturity_score).toBeDefined();
      expect(result.data.function_scores).toBeDefined();
    });

    it('should handle different assessment scopes', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'function' as const,
        function_id: 'GV'
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({
          subcategory_id: 'GV.OC-01',
          maturity_score: 3
        })
      ]);

      const result = await assessMaturity(params);

      testUtils.assertSuccessResponse(result);
    });

    it('should calculate maturity trends over time', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'full' as const,
        include_trend_analysis: true
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({
          maturity_score: 2,
          assessed_at: '2024-01-01'
        }),
        testUtils.createMockAssessment({
          maturity_score: 3,
          assessed_at: '2024-06-01'
        })
      ]);

      const result = await assessMaturity(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data?.trend_analysis).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should validate profile_id parameter', async () => {
      const result = await assessMaturity({
        profile_id: '',
        assessment_scope: 'full'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate assessment_scope parameter', async () => {
      const result = await assessMaturity({
        profile_id: 'profile-123',
        assessment_scope: 'invalid' as any
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate function_id when scope is function', async () => {
      const result = await assessMaturity({
        profile_id: 'profile-123',
        assessment_scope: 'function',
        function_id: ''
      });
      testUtils.assertErrorResponse(result);
    });
  });

  describe('maturity calculation logic', () => {
    it('should calculate weighted maturity scores correctly', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'full' as const
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({ maturity_score: 1 }),
        testUtils.createMockAssessment({ maturity_score: 2 }),
        testUtils.createMockAssessment({ maturity_score: 3 }),
        testUtils.createMockAssessment({ maturity_score: 4 }),
        testUtils.createMockAssessment({ maturity_score: 5 })
      ]);

      const result = await assessMaturity(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data.overall_maturity_score).toBeGreaterThan(0);
      expect(result.data.overall_maturity_score).toBeLessThanOrEqual(5);
    });

    it('should handle assessments with missing maturity scores', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'full' as const
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({ maturity_score: null }),
        testUtils.createMockAssessment({ maturity_score: 3 })
      ]);

      const result = await assessMaturity(params);

      testUtils.assertSuccessResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent profile', async () => {
      const params = {
        profile_id: 'nonexistent',
        assessment_scope: 'full' as const
      };

      mockDb.getProfile!.mockReturnValue(null);

      const result = await assessMaturity(params);

      testUtils.assertErrorResponse(result, 'Profile not found');
    });

    it('should handle database transaction errors', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_scope: 'full' as const
      };

      mockDb.transaction!.mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      const result = await assessMaturity(params);

      testUtils.assertErrorResponse(result, 'Transaction failed');
    });
  });
});