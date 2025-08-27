/**
 * Get Implementation Guidance Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { get_implementation_guidance } from '../../src/tools/get_implementation_guidance.js';
import { getDatabase } from '../../db/database.js';
import { getFrameworkLoader } from '../../services/framework-loader.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetFrameworkLoader = getFrameworkLoader as jest.MockedFunction<typeof getFrameworkLoader>;

describe('Get Implementation Guidance Tool - Unit Tests', () => {
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
      const params = { query: 'governance' };
      
      mockFrameworkLoader.searchElements.mockReturnValue([
        testUtils.createMockFrameworkElement('function', {
          element_identifier: 'GV',
          title: 'GOVERN'
        })
      ]);

      const result = await get_implementation_guidance(params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await get_implementation_guidance({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await get_implementation_guidance({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await get_implementation_guidance({
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

  const result = await get_implementation_guidance({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await get_implementation_guidance({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);
    });
  });
});