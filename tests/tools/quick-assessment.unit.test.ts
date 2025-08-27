/**
 * Quick Assessment Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { getDatabase } from '../../src/db/database.js';
import { getFrameworkLoader } from '../../src/services/framework-loader.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Mock the database
jest.mock('../../src/db/database.js');
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetFrameworkLoader = getFrameworkLoader as jest.MockedFunction<typeof getFrameworkLoader>;

describe('Quick Assessment Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockFramework: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
    
    mockFramework = {
      isLoaded: jest.fn().mockReturnValue(true),
      load: jest.fn().mockResolvedValue(undefined),
      getElementsByType: jest.fn().mockReturnValue([
        { element_identifier: 'GV.OC-01' },
        { element_identifier: 'ID.AM-01' },
        { element_identifier: 'PR.AC-01' }
      ])
    };
    mockGetFrameworkLoader.mockReturnValue(mockFramework);
  });

  describe('basic assessment functionality', () => {
    it('should perform quick assessment successfully', async () => {
      const params = {
        profile_id: 'profile-123',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'yes' as const,
          detect: 'no' as const,
          respond: 'partial' as const,
          recover: 'yes' as const
        }
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-123'
      }));
      
      mockDb.createBulkAssessments = jest.fn();

      const result = await quickAssessment(params);

      testUtils.assertSuccessResponse(result);
      expect(result.initial_maturity_scores).toBeDefined();
      expect(result.initial_maturity_scores.overall_average).toBeDefined();
      expect(result.details).toBeDefined();
      expect(mockDb.getProfile).toHaveBeenCalledWith('profile-123');
    });

    it('should handle different confidence levels', async () => {
      const params = {
        profile_id: 'profile-456',
        simplified_answers: {
          govern: 'partial' as const,
          identify: 'no' as const,
          protect: 'yes' as const,
          detect: 'partial' as const,
          respond: 'yes' as const,
          recover: 'no' as const
        },
        confidence_level: 'high' as const
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.createBulkAssessments = jest.fn();

      const result = await quickAssessment(params);

      testUtils.assertSuccessResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate profile_id parameter', async () => {
      const result = await quickAssessment({
        profile_id: '',
        simplified_answers: {
          govern: 'yes',
          identify: 'yes',
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        }
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate simplified_answers parameter', async () => {
      const result = await quickAssessment({
        profile_id: 'profile-123',
        simplified_answers: {
          govern: 'invalid' as any,
          identify: 'yes',
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        }
      });
      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent profile', async () => {
      const params = {
        profile_id: 'nonexistent-profile',
        simplified_answers: {
          govern: 'yes',
          identify: 'yes',
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        }
      };

      mockDb.getProfile!.mockReturnValue(null);

      const result = await quickAssessment(params);

      testUtils.assertErrorResponse(result, 'Profile not found');
    });

    it('should handle database errors', async () => {
      const params = {
        profile_id: 'profile-123',
        simplified_answers: {
          govern: 'yes',
          identify: 'yes',
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        }
      };

      mockDb.transaction!.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await quickAssessment(params);

      testUtils.assertErrorResponse(result, 'Database error');
    });
  });
});