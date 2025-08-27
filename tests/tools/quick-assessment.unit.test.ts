/**
 * Quick Assessment Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Quick Assessment Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('basic assessment functionality', () => {
    it('should perform quick assessment successfully', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_type: 'maturity' as const,
        quick_questions: true
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-123'
      }));

      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment({
          subcategory_id: 'GV.OC-01',
          implementation_level: 2,
          maturity_score: 3
        }),
        testUtils.createMockAssessment({
          subcategory_id: 'ID.AM-01',
          implementation_level: 3,
          maturity_score: 4
        })
      ]);

      const result = await quickAssessment(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data?.assessment_summary).toBeDefined();
      expect(result.data.overall_score).toBeDefined();
      expect(mockDb.getProfile).toHaveBeenCalledWith('profile-123');
    });

    it('should handle different assessment types', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_type: 'risk' as const
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([]);

      const result = await quickAssessment(params);

      testUtils.assertSuccessResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate profile_id parameter', async () => {
      const result = await quickAssessment({
        profile_id: '',
        assessment_type: 'maturity'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate assessment_type parameter', async () => {
      const result = await quickAssessment({
        profile_id: 'profile-123',
        assessment_type: 'invalid' as any
      });
      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent profile', async () => {
      const params = {
        profile_id: 'nonexistent-profile',
        assessment_type: 'maturity' as const
      };

      mockDb.getProfile!.mockReturnValue(null);

      const result = await quickAssessment(params);

      testUtils.assertErrorResponse(result, 'Profile not found');
    });

    it('should handle database errors', async () => {
      const params = {
        profile_id: 'profile-123',
        assessment_type: 'maturity' as const
      };

      mockDb.transaction!.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await quickAssessment(params);

      testUtils.assertErrorResponse(result, 'Database error');
    });
  });
});