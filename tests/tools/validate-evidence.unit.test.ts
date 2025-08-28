/**
 * Validate Evidence Tool - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validateEvidence } from '../../src/tools/validate_evidence.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Import and immediately mock the database - this ensures the mock is applied
jest.mock('../../src/db/database.js', () => ({
  getDatabase: jest.fn(() => mockDbInstance),
  CSFDatabase: jest.fn()
}));

import { getDatabase } from '../../src/db/database.js';

let mockDbInstance: ReturnType<typeof createMockDatabase>;

describe('Validate Evidence Tool - Unit Tests', () => {
  let mockGetDatabase: jest.MockedFunction<typeof getDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbInstance = createMockDatabase();
    mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
    mockGetDatabase.mockReturnValue(mockDbInstance as any);
  });

  describe('basic functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      const params = { 
        assessment_id: 'test-assessment-123',
        evidence_files: [
          { file_path: '/test/evidence1.pdf', evidence_type: 'document' as const, description: 'Test evidence' }
        ]
      };
      
      mockDbInstance.transaction!.mockImplementation((callback: () => any) => callback());
      
      const result = await validateEvidence(mockDbInstance, params);
      testUtils.assertSuccessResponse(result);
    });

    it('should handle missing required parameters', async () => {
      const result = await validateEvidence(mockDbInstance, {} as any);
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await validateEvidence(mockDbInstance, {
        invalid_param: 'test'
      } as any);
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await validateEvidence(mockDbInstance, {
        assessment_id: null,
        evidence_files: null
      } as any);
      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const params = { 
        assessment_id: 'test-assessment-123',
        evidence_files: [
          { file_path: '/test/evidence1.pdf', evidence_type: 'document' as const }
        ]
      };
      
      mockDbInstance.transaction!.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await validateEvidence(mockDbInstance, params);
      testUtils.assertErrorResponse(result, 'Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      const params = { 
        assessment_id: 'test-assessment-123',
        evidence_files: [
          { file_path: '/test/evidence1.pdf' }
        ]
      };
      
      // Mock an unexpected error condition
      if (mockDbInstance.getProfile) {
        mockDbInstance.getProfile.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });
      }

      const result = await validateEvidence(mockDbInstance, params);
      testUtils.assertErrorResponse(result);
    });
  });
});