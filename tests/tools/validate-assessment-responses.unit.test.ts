/**
 * Validate Assessment Responses Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validate_assessment_responses } from '../../src/tools/validate_assessment_responses.js';
import { getDatabase } from '../../db/database.js';
import { getFrameworkLoader } from '../../services/framework-loader.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Mock the database
jest.mock('../../src/db/database.js');
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetFrameworkLoader = getFrameworkLoader as jest.MockedFunction<typeof getFrameworkLoader>;

describe('Validate Assessment Responses Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockFrameworkLoader: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
    mockFrameworkLoader = mockGetFrameworkLoader();
  });

  describe('basic functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      const params = { profile_id: 'profile-123' };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment()
      ]);

      const result = await validate_assessment_responses(params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await validate_assessment_responses({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await validate_assessment_responses({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await validate_assessment_responses({
        param: null
      });
      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.transaction!.mockImplementation(() => {
    throw new Error('Database connection failed');
  });

  const result = await validate_assessment_responses({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await validate_assessment_responses({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);
    });
  });
});