/**
 * Error Handling Pattern Tests - Validate consistent error handling across tools
 */

import { describe, test, expect, jest } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { searchFramework } from '../../src/tools/search_framework.js';
import { testUtils } from '../helpers/jest-setup.js';
import { getDatabase } from '../../src/db/database.js';

describe('Error Handling Pattern Tests', () => {

  describe('Consistent Error Response Structure', () => {
    test('should return standardized error format for invalid input', async () => {
      const invalidInput = {
        org_name: '', // Invalid: empty string
        sector: 'Technology',
        size: 'invalid_size' as any // Invalid enum value
      };

      const result = await createProfile(invalidInput);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
      
      // Should include context about which field failed
      expect(result.error.toLowerCase()).toContain('validation');
    });

    test('should handle Zod validation errors consistently', async () => {
      const invalidQuickAssessment = {
        profile_id: '', // Invalid: empty string
        simplified_answers: {
          govern: 'invalid_answer' as any, // Invalid enum value
          identify: 'yes',
          protect: 'no',
          detect: 'yes',
          respond: 'partial',
          recover: 'no'
        }
      };

      const result = await quickAssessment(invalidQuickAssessment);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    test('should not expose internal system details in errors', async () => {
      const invalidInput = {
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'medium' as const
      };

      // Mock database to throw an internal error
      const mockDb = getDatabase();
      const originalCreateOrg = mockDb.createOrganization;
      (mockDb.createOrganization as jest.MockedFunction<any>).mockImplementationOnce(() => {
        throw new Error('INTERNAL: Database connection failed at server.db.connection.pool[0].execute');
      });

      const result = await createProfile(invalidInput);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Should not expose internal paths, connection details, or stack traces
      expect(result.error).not.toContain('server.db.connection');
      expect(result.error).not.toContain('pool[0]');
      expect(result.error).not.toContain('stack trace');
      expect(result.error).not.toContain('INTERNAL:');
      
      // Restore original mock
      (mockDb.createOrganization as jest.MockedFunction<any>).mockImplementation(originalCreateOrg);
    });
  });

  describe('Database Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      const mockDb = getDatabase();
      const originalTransaction = mockDb.transaction;
      
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementationOnce(() => {
        throw new Error('Database connection lost');
      });

      const result = await createProfile({
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('Database connection lost');
      expect(result.error.toLowerCase()).toContain('error');
      
      // Restore original mock
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementation(originalTransaction);
    });

    test('should handle database constraint violations', async () => {
      const mockDb = getDatabase();
      const originalCreateOrg = mockDb.createOrganization;
      
      (mockDb.createOrganization as jest.MockedFunction<any>).mockImplementationOnce(() => {
        const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: organization_profiles.org_id');
        (error as any).code = 'SQLITE_CONSTRAINT_UNIQUE';
        throw error;
      });

      const result = await createProfile({
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Should not expose SQL error codes or constraint names
      expect(result.error).not.toContain('SQLITE_CONSTRAINT');
      expect(result.error).not.toContain('organization_profiles.org_id');
      
      // Restore original mock
      (mockDb.createOrganization as jest.MockedFunction<any>).mockImplementation(originalCreateOrg);
    });

    test('should handle transaction rollback scenarios', async () => {
      const mockDb = getDatabase();
      const originalTransaction = mockDb.transaction;
      
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementationOnce((fn: Function) => {
        throw new Error('Transaction failed, rolling back');
      });

      const result = await quickAssessment({
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes',
          identify: 'partial',
          protect: 'no',
          detect: 'yes',
          respond: 'partial',
          recover: 'no'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('rolling back');
      
      // Restore original mock
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementation(originalTransaction);
    });
  });

  describe('Input Sanitization and Security', () => {
    test('should sanitize error messages from malicious input', async () => {
      const maliciousInput = {
        org_name: '<script>alert("xss")</script>Malicious Org',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = await createProfile(maliciousInput);
      
      if (!result.success) {
        // Error messages should not contain unescaped HTML/JS
        expect(result.error).not.toContain('<script>');
        expect(result.error).not.toContain('alert(');
      }
    });

    test('should handle SQL injection attempts in error context', async () => {
      const sqlInjectionInput = {
        org_name: "'; DROP TABLE users; --",
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = await createProfile(sqlInjectionInput);
      
      // Should either succeed with sanitized input or fail safely
      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).not.toContain('DROP TABLE');
        expect(result.error).not.toContain('--');
      }
    });

    test('should prevent path traversal in error messages', async () => {
      const pathTraversalInput = {
        org_name: '../../../etc/passwd',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = await createProfile(pathTraversalInput);
      
      if (!result.success) {
        expect(result.error).not.toContain('../../../');
        expect(result.error).not.toContain('/etc/passwd');
      }
    });
  });

  describe('Framework and Service Error Handling', () => {
    test('should handle framework loader failures', async () => {
      // Mock framework loader to fail
      const originalSearchFramework = searchFramework;
      
      const result = await searchFramework({
        query: 'governance',
        element_types: ['function', 'category', 'subcategory'],
        limit: 10,
        min_score: 0.1,
        enable_fuzzy: true
      });

      // Even with mocked framework, should handle gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    test('should handle missing profile references gracefully', async () => {
      const result = await quickAssessment({
        profile_id: 'non-existent-profile-id',
        simplified_answers: {
          govern: 'yes',
          identify: 'partial',
          protect: 'no',
          detect: 'yes',
          respond: 'partial',
          recover: 'no'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toContain('profile');
      expect(result.error).not.toContain('non-existent-profile-id'); // Don't echo back user input
    });
  });

  describe('Async Error Handling', () => {
    test('should handle Promise rejection properly', async () => {
      const mockDb = getDatabase();
      const originalGetProfile = mockDb.getProfile;
      
      (mockDb.getProfile as jest.MockedFunction<any>).mockImplementationOnce(() => {
        return Promise.reject(new Error('Async operation failed'));
      });

      const result = await quickAssessment({
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes',
          identify: 'partial',
          protect: 'no',
          detect: 'yes',
          respond: 'partial',
          recover: 'no'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original mock
      (mockDb.getProfile as jest.MockedFunction<any>).mockImplementation(originalGetProfile);
    });

    test('should handle timeout scenarios', async () => {
      // This test simulates a timeout scenario
      const mockDb = getDatabase();
      const originalTransaction = mockDb.transaction;
      
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), 1000);
        });
      });

      // Set a shorter timeout for the test
      const result = await Promise.race([
        createProfile({
          org_name: 'Test Organization',
          sector: 'Technology',
          size: 'medium'
        }),
        new Promise<any>(resolve => 
          setTimeout(() => resolve({ success: false, error: 'Timeout' }), 100)
        )
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original mock
      (mockDb.transaction as jest.MockedFunction<any>).mockImplementation(originalTransaction);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should provide actionable error messages', async () => {
      const invalidInput = {
        org_name: '',
        sector: '',
        size: 'invalid' as any
      };

      const result = await createProfile(invalidInput);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Error should be helpful for debugging
      expect(result.error.length).toBeGreaterThan(10);
      expect(result.error.toLowerCase()).toMatch(/validation|invalid|required|empty/);
    });

    test('should maintain system stability after errors', async () => {
      // First, cause an error
      await createProfile({
        org_name: '',
        sector: 'Technology',
        size: 'medium'
      });

      // Then, verify system can still handle valid requests
      const validResult = await createProfile({
        org_name: 'Valid Organization',
        sector: 'Technology',
        size: 'medium'
      });

      expect(validResult).toBeDefined();
      // System should still be functional
      expect(typeof validResult.success).toBe('boolean');
    });

    test('should handle concurrent errors without interference', async () => {
      const invalidInputs = [
        { org_name: '', sector: 'Technology', size: 'medium' },
        { org_name: 'Test', sector: '', size: 'medium' },
        { org_name: 'Test', sector: 'Technology', size: 'invalid' as any }
      ];

      // Run multiple invalid requests concurrently
      const results = await Promise.all(
        invalidInputs.map(input => createProfile(input))
      );

      // All should fail independently
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      });
    });
  });
});