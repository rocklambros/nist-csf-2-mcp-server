/**
 * Compare Profiles Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { compare_profiles } from '../../src/tools/compare_profiles.js';
import { getDatabase } from '../../db/database.js';
import { getFrameworkLoader } from '../../services/framework-loader.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetFrameworkLoader = getFrameworkLoader as jest.MockedFunction<typeof getFrameworkLoader>;

describe('Compare Profiles Tool - Unit Tests', () => {
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
      const params = { 
        profile_id: 'profile-123',
        analysis_type: 'risk'
      };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      
      const result = await compare_profiles(params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await compare_profiles({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await compare_profiles({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await compare_profiles({
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

  const result = await compare_profiles({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await compare_profiles({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);
    });
  });
});