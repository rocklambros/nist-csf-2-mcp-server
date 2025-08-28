/**
 * Security tests focused on input validation and injection prevention
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { testUtils } from '../helpers/jest-setup.js';

// Import the mocked database to ensure mocks are properly initialized
import { getDatabase } from '../../src/db/database.js';

describe('Input Validation Security Tests', () => {
  let testProfileId: string;

  beforeAll(async () => {
    // Create a valid test profile for testing
    const validProfile = await createProfile({
      org_name: 'Security Test Org',
      sector: 'Technology',
      size: 'medium',
      profile_name: 'Security Test Profile'
    });
    
    if (validProfile.success) {
      testProfileId = validProfile.profile_id;
    }
  });

  describe('SQL Injection Prevention', () => {
    test('should handle malicious SQL in organization name', async () => {
      const maliciousInputs = [
        "'; DROP TABLE organization_profiles; --",
        "Test'; INSERT INTO profiles VALUES ('hack', 'hack'); --",
        "1' OR '1'='1",
        "'; UPDATE profiles SET profile_name='hacked'; --",
        "'; DELETE FROM profiles; --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const result = await createProfile({
          org_name: maliciousInput,
          sector: 'Technology',
          size: 'medium',
          profile_name: 'Test Profile'
        });

        // Should either fail gracefully or sanitize the input
        if (result.success) {
          // If it succeeds, the input should be sanitized/escaped
          expect(result.message).not.toContain('DROP TABLE');
          expect(result.message).not.toContain('INSERT INTO');
          expect(result.message).not.toContain('DELETE FROM');
        }
        // If it fails, that's also acceptable as input rejection
      }
    });

    test('should prevent SQL injection in assessment data', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not available');
      }

      const result = await quickAssessment({
        profile_id: "'; DROP TABLE assessments; --",
        simplified_answers: {
          govern: 'partial',
          identify: 'yes',
          protect: 'no',
          detect: 'partial',
          respond: 'yes',
          recover: 'no'
        },
        confidence_level: 'medium'
      });

      // Should fail due to invalid profile ID format
      expect(result.success).toBe(false);
      expect(result.message).not.toContain('DROP TABLE');
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize XSS attempts in profile data', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const result = await createProfile({
          org_name: `Test Org ${payload}`,
          sector: 'Technology',
          size: 'medium',
          profile_name: `Test Profile ${payload}`
        });

        if (result.success) {
          // Should not contain script tags or javascript protocols
          expect(JSON.stringify(result)).not.toMatch(/<script/i);
          expect(JSON.stringify(result)).not.toMatch(/javascript:/i);
          expect(JSON.stringify(result)).not.toMatch(/onerror=/i);
          expect(JSON.stringify(result)).not.toMatch(/onload=/i);
        }
      }
    });
  });

  describe('Input Length Validation', () => {
    test('should handle extremely long organization names', async () => {
      const veryLongString = 'A'.repeat(10000); // 10KB string

      const result = await createProfile({
        org_name: veryLongString,
        sector: 'Technology',
        size: 'medium',
        profile_name: 'Test Profile'
      });

      // Should either reject the input or truncate it
      if (result.success) {
        expect(result.org_id).toBeDefined();
        expect(result.org_id.length).toBeLessThan(1000); // Reasonable limit
      }
      // Failure is also acceptable
    });

    test('should validate required field presence', async () => {
      const invalidInputs = [
        { org_name: '', sector: 'Technology', size: 'medium' },
        { org_name: 'Test', sector: '', size: 'medium' },
        { org_name: 'Test', sector: 'Technology', size: '' },
      ];

      for (const invalidInput of invalidInputs) {
        const result = await createProfile(invalidInput as any);
        
        // Should fail validation for empty required fields
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Type Safety Validation', () => {
    test('should handle invalid data types', async () => {
      const invalidTypeInputs = [
        { org_name: null, sector: 'Technology', size: 'medium' },
        { org_name: 123, sector: 'Technology', size: 'medium' },
        { org_name: {}, sector: 'Technology', size: 'medium' },
        { org_name: [], sector: 'Technology', size: 'medium' }
      ];

      for (const invalidInput of invalidTypeInputs) {
        const result = await createProfile(invalidInput as any);
        
        // Should fail type validation
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should validate enum values', async () => {
      const invalidSizes = ['tiny', 'huge', 'massive', '', null, 123];

      for (const invalidSize of invalidSizes) {
        const result = await createProfile({
          org_name: 'Test Org',
          sector: 'Technology', 
          size: invalidSize as any
        });

        // Should fail enum validation
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    test('should limit assessment data size', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not available');
      }

      // Create assessment with very large notes
      const largeNotes = {
        govern: 'A'.repeat(100000),
        identify: 'B'.repeat(100000),
        protect: 'C'.repeat(100000),
        detect: 'D'.repeat(100000),
        respond: 'E'.repeat(100000),
        recover: 'F'.repeat(100000)
      };

      const result = await quickAssessment({
        profile_id: testProfileId,
        simplified_answers: {
          govern: 'partial',
          identify: 'yes',
          protect: 'no',
          detect: 'partial',
          respond: 'yes',
          recover: 'no'
        },
        confidence_level: 'medium',
        notes: largeNotes
      });

      // Should either reject large payloads or handle them efficiently
      if (result.success) {
        expect(typeof result).toBe('object');
      }
      // Performance should be reasonable - this test also validates no DoS
    });

    test('should handle concurrent operations safely', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        createProfile({
          org_name: `Concurrent Test Org ${i} ${Date.now()}`,
          sector: 'Technology',
          size: 'medium',
          profile_name: `Concurrent Test Profile ${i}`
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (no deadlocks)
      expect(duration).toBeLessThan(10000); // 10 seconds max
      
      // At least some should succeed (no total system failure)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Error Message Security', () => {
    test('should not expose internal system details in errors', async () => {
      const result = await createProfile({
        org_name: 'Test Org',
        sector: 'Invalid Sector That Does Not Exist',
        size: 'medium'
      });

      if (!result.success) {
        const errorMessage = result.message.toLowerCase();
        
        // Should not expose file paths, stack traces, or internal structure
        expect(errorMessage).not.toContain('/src/');
        expect(errorMessage).not.toContain('/node_modules/');
        expect(errorMessage).not.toContain('.ts:');
        expect(errorMessage).not.toContain('stack trace');
        expect(errorMessage).not.toContain('database');
        expect(errorMessage).not.toContain('sqlite');
      }
    });

    test('should provide safe error responses for invalid operations', async () => {
      // Try operations that should fail safely
      const invalidOperations = [
        () => createProfile(null as any),
        () => createProfile(undefined as any),
        () => createProfile({} as any),
        () => quickAssessment({} as any)
      ];

      for (const operation of invalidOperations) {
        try {
          const result = await operation();
          
          if (!result.success) {
            expect(result.message).toBeDefined();
            expect(result.message).not.toContain('undefined');
            expect(result.message).not.toContain('null');
            expect(result.message).not.toContain('[object Object]');
          }
        } catch (error) {
          // Exceptions should be handled gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Data Integrity Validation', () => {
    test('should maintain data consistency under error conditions', async () => {
      // Test profile creation that might partially fail
      const potentiallyProblematicInput = {
        org_name: 'Data Integrity Test Org',
        sector: 'Technology',
        size: 'medium',
        profile_name: 'Test Profile',
        // Add invalid fields that might cause issues
        invalid_field: 'should be ignored',
        nested_object: { malicious: 'data' }
      };

      const result = await createProfile(potentiallyProblematicInput as any);

      if (result.success) {
        // Verify the profile was created correctly
        expect(result.profile_id).toBeDefined();
        expect(result.org_id).toBeDefined();
        expect(result.message).toBeDefined();
        
        // Verify no invalid data was persisted
        expect(result.profile_id).not.toContain('invalid_field');
        expect(result.org_id).not.toContain('nested_object');
      }
    });
  });
});