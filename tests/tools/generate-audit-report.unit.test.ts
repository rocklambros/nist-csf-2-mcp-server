/**
 * Generate Audit Report Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generate_audit_report } from '../../src/tools/generate_audit_report.js';
import { getDatabase } from '../../db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Mock the database
jest.mock('../../src/db/database.js');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Generate Audit Report Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('basic functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      const params = { 
        profile_id: 'profile-123',
        report_type: 'summary'
      };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.generateReport!.mockReturnValue({
        report_id: 'report-123',
        content: 'Generated report content'
      });
      
      const result = await generate_audit_report(params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await generate_audit_report({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await generate_audit_report({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await generate_audit_report({
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

  const result = await generate_audit_report({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await generate_audit_report({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);
    });
  });
});