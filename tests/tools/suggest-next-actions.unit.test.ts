/**
 * Suggest Next Actions Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { suggest_next_actions } from '../../src/tools/suggest_next_actions.js';
import { getDatabase } from '../../db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Mock the database
jest.mock('../../src/db/database.js');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Suggest Next Actions Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('basic functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      const params = { id: 'test-123' };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      
      const result = await suggest_next_actions(params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await suggest_next_actions({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await suggest_next_actions({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await suggest_next_actions({
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

  const result = await suggest_next_actions({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await suggest_next_actions({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);
    });
  });
});