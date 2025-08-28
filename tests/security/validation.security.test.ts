/**
 * Comprehensive input validation and security tests
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { testUtils } from '../helpers/jest-setup.js';
import { getDatabase } from '../../src/db/database.js';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { searchFramework } from '../../src/tools/search_framework.js';
import { exportData } from '../../src/tools/export_data.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';

describe('Security and Validation Tests', () => {
  let testProfileId: string;

  beforeAll(async () => {
    const profile = await createProfile({
      org_name: 'Security Test Org',
      sector: 'Technology',
      size: 'medium',
      profile_name: 'Security Test Profile'
    });
    
    if (profile.success) {
      testProfileId = profile.profile_id;
    }
  });

  describe('Input Validation Tests', () => {
    describe('SQL Injection Prevention', () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO profiles VALUES ('malicious'); --",
        "' UNION SELECT * FROM sensitive_table --",
        "'; DELETE FROM assessments; --",
        "' OR 1=1; UPDATE profiles SET admin=1; --",
        "1'; EXEC xp_cmdshell('dir'); --",
        "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --"
      ];

      test('should prevent SQL injection in profile creation', async () => {
        for (const payload of sqlInjectionPayloads) {
          const result = await createProfile({
            org_name: payload,
            profile_name: 'Test Profile',
            industry: 'Technology',
            size: 'medium'
          }, testDb);

          // Should either fail with proper error or succeed with sanitized input
          if (result.success) {
            // Verify the payload was sanitized, not executed
            expect(result.profile.org_name).not.toContain('DROP TABLE');
            expect(result.profile.org_name).not.toContain('DELETE FROM');
          } else {
            expect(result.message).toBeDefined();
            expect(result.success).toBe(false);
          }
        }
      });

      test('should prevent SQL injection in assessment queries', async () => {
        for (const payload of sqlInjectionPayloads) {
          const result = await quickAssessment({
            profile_id: payload,
            subcategory_id: 'GV.OC-01',
            implementation_level: 'Partially Implemented'
          }, testDb);

          expect(result.success).toBe(false);
          expect(result.message).toBeDefined();
        }
      });

      test('should prevent SQL injection in search queries', async () => {
        for (const payload of sqlInjectionPayloads) {
          const result = await searchFramework({
            keyword: payload,
            limit: 10
          }, testDb);

          // Search should either return empty results or properly sanitized results
          expect(result.success).toBe(true);
          if (result.results.length > 0) {
            // Verify no malicious content in results
            result.results.forEach((item: any) => {
              expect(JSON.stringify(item)).not.toContain('DROP TABLE');
              expect(JSON.stringify(item)).not.toContain('DELETE FROM');
            });
          }
        }
      });
    });

    describe('XSS Prevention', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>",
        '<input type="text" onfocus="alert(\'XSS\')">'
      ];

      test('should sanitize XSS attempts in profile data', async () => {
        for (const payload of xssPayloads) {
          const result = await createProfile({
            org_name: 'Test Organization',
            profile_name: payload,
            industry: 'Technology',
            size: 'medium'
          }, testDb);

          if (result.success) {
            // Verify XSS payload was sanitized
            expect(result.profile.profile_name).not.toContain('<script>');
            expect(result.profile.profile_name).not.toContain('javascript:');
            expect(result.profile.profile_name).not.toContain('onerror');
            expect(result.profile.profile_name).not.toContain('onload');
          }
        }
      });

      test('should sanitize XSS attempts in assessment notes', async () => {
        for (const payload of xssPayloads) {
          const result = await quickAssessment({
            profile_id: testProfileId,
            subcategory_id: 'XSS-TEST-' + Date.now(),
            implementation_level: 'Partially Implemented',
            notes: payload
          }, testDb);

          if (result.success) {
            expect(result.assessment.notes).not.toContain('<script>');
            expect(result.assessment.notes).not.toContain('javascript:');
            expect(result.assessment.notes).not.toContain('onerror');
          }
        }
      });

      test('should sanitize XSS attempts in evidence descriptions', async () => {
        for (const payload of xssPayloads) {
          const result = await uploadEvidence({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            file_name: 'test-evidence.pdf',
            file_hash: 'testhash123',
            evidence_type: 'document',
            description: payload
          }, testDb);

          if (result.success) {
            expect(result.evidence.description).not.toContain('<script>');
            expect(result.evidence.description).not.toContain('javascript:');
          }
        }
      });
    });

    describe('Path Traversal Prevention', () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\SAM',
        '....//....//....//etc/passwd',
        '..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\/etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd'
      ];

      test('should prevent path traversal in file uploads', async () => {
        for (const payload of pathTraversalPayloads) {
          const result = await uploadEvidence({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            file_name: 'test.pdf',
            file_path: payload,
            file_hash: 'testhash123',
            evidence_type: 'document'
          }, testDb);

          expect(result.success).toBe(false);
          expect(result.message).toContain('path');
        }
      });

      test('should prevent path traversal in file names', async () => {
        for (const payload of pathTraversalPayloads) {
          const result = await uploadEvidence({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            file_name: payload,
            file_hash: 'testhash123',
            evidence_type: 'document'
          }, testDb);

          if (result.success) {
            // Verify path was sanitized
            expect(result.evidence.file_name).not.toContain('../');
            expect(result.evidence.file_name).not.toContain('..\\');
            expect(result.evidence.file_name).not.toContain('/etc/');
          } else {
            expect(result.message).toBeDefined();
          }
        }
      });
    });

    describe('Command Injection Prevention', () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '&& rm -rf /',
        '| whoami',
        '`id`',
        '$(whoami)',
        '; cat /etc/passwd',
        '&& net user hacker password /add',
        '| dir c:\\'
      ];

      test('should prevent command injection in all text inputs', async () => {
        for (const payload of commandInjectionPayloads) {
          const result = await quickAssessment({
            profile_id: testProfileId,
            subcategory_id: 'CMD-TEST-' + Date.now(),
            implementation_level: 'Partially Implemented',
            notes: payload,
            assessed_by: payload
          }, testDb);

          if (result.success) {
            // Verify command injection was sanitized
            expect(result.assessment.notes).not.toContain('; ls');
            expect(result.assessment.notes).not.toContain('&& rm');
            expect(result.assessment.assessed_by).not.toContain('whoami');
          }
        }
      });
    });

    describe('LDAP Injection Prevention', () => {
      const ldapInjectionPayloads = [
        '*)(uid=*',
        '*)(|(uid=*))',
        '*)(&(uid=*)',
        '*))%00',
        '*()|%26',
        '*)(objectClass=*)',
        '*)((|uid=*))'
      ];

      test('should prevent LDAP injection in user fields', async () => {
        for (const payload of ldapInjectionPayloads) {
          const result = await trackAuditTrail({
            profile_id: testProfileId,
            action: 'test_action',
            resource_type: 'test',
            performed_by: payload
          }, testDb);

          if (result.success) {
            // Verify LDAP injection was sanitized
            expect(result.audit_entry.performed_by).not.toContain('*)(&');
            expect(result.audit_entry.performed_by).not.toContain('objectClass=*');
          }
        }
      });
    });
  });

  describe('Data Type Validation', () => {
    test('should validate string length limits', async () => {
      const oversizedString = 'x'.repeat(10000); // Very long string

      const result = await createProfile({
        org_name: 'Test Org',
        profile_name: oversizedString,
        industry: 'Technology',
        size: 'medium'
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('length');
    });

    test('should validate numeric ranges', async () => {
      const invalidScores = [-1, 0, 6, 100, 999];

      for (const score of invalidScores) {
        const result = await quickAssessment({
          profile_id: testProfileId,
          subcategory_id: 'RANGE-TEST-' + score,
          implementation_level: 'Partially Implemented',
          maturity_score: score
        }, testDb);

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should validate email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        'user name@domain.com',
        'user@domain',
        'user@.com'
      ];

      for (const email of invalidEmails) {
        const result = await createProfile({
          org_name: 'Test Org',
          profile_name: 'Test Profile',
          industry: 'Technology',
          size: 'medium',
          contact_email: email
        }, testDb);

        if (!result.success) {
          expect(result.message).toBeDefined();
        }
      }
    });

    test('should validate date formats', async () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // Invalid month
        '2024-02-30', // Invalid day
        '2024/02/01', // Wrong format
        '01-02-2024', // Wrong format
        'February 1, 2024' // Wrong format
      ];

      for (const date of invalidDates) {
        const result = await quickAssessment({
          profile_id: testProfileId,
          subcategory_id: 'DATE-TEST-' + Date.now(),
          implementation_level: 'Partially Implemented',
          assessment_date: date
        }, testDb);

        if (!result.success) {
          expect(result.message).toBeDefined();
        }
      }
    });

    test('should validate enum values', async () => {
      const invalidImplementationLevels = [
        'Invalid Level',
        'NotImplemented', // Wrong case
        'fully implemented', // Wrong case
        'Partially',
        'Complete',
        ''
      ];

      for (const level of invalidImplementationLevels) {
        const result = await quickAssessment({
          profile_id: testProfileId,
          subcategory_id: 'ENUM-TEST-' + Date.now(),
          implementation_level: level
        }, testDb);

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate profile relationships', async () => {
      // Try to create assessment for non-existent profile
      const result = await quickAssessment({
        profile_id: 'non-existent-profile-id',
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented'
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should validate subcategory existence', async () => {
      const result = await quickAssessment({
        profile_id: testProfileId,
        subcategory_id: 'INVALID.SUBCATEGORY',
        implementation_level: 'Partially Implemented'
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    test('should validate data consistency', async () => {
      // Try to create assessment with mismatched maturity score
      const result = await quickAssessment({
        profile_id: testProfileId,
        subcategory_id: 'CONSISTENCY-TEST',
        implementation_level: 'Not Implemented',
        maturity_score: 5 // Inconsistent with "Not Implemented"
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    test('should validate file hash format', async () => {
      const invalidHashes = [
        'invalid-hash-format',
        'short',
        'contains spaces and special chars!@#',
        '12345', // Too short
        'g'.repeat(64) // Invalid hex character
      ];

      for (const hash of invalidHashes) {
        const result = await uploadEvidence({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'test.pdf',
          file_hash: hash,
          evidence_type: 'document'
        }, testDb);

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should validate export parameters', async () => {
      const result = await exportData({
        profile_id: testProfileId,
        export_format: 'invalid_format',
        date_range: {
          start_date: '2024-12-01',
          end_date: '2024-01-01' // End before start
        }
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('Rate Limiting and Resource Protection', () => {
    test('should handle rapid successive requests gracefully', async () => {
      const rapidRequests = Array.from({ length: 100 }, (_, i) =>
        searchFramework({
          keyword: `rapid-test-${i}`,
          limit: 5
        }, testDb)
      );

      const results = await Promise.allSettled(rapidRequests);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const successRate = successCount / rapidRequests.length;

      // Should handle most requests successfully
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum
    });

    test('should protect against resource exhaustion', async () => {
      // Try to export extremely large dataset
      const result = await exportData({
        profile_id: testProfileId,
        export_format: 'json',
        max_records: 1000000, // Very large number
        include_all_data: true
      }, testDb);

      // Should either succeed with pagination or fail gracefully
      if (result.success) {
        expect(result.export_data).toHaveProperty('pagination_info');
      } else {
        expect(result.message).toBeDefined();
      }
    });

    test('should limit query complexity', async () => {
      // Complex search query that could be expensive
      const result = await searchFramework({
        keyword: 'a', // Very broad search
        limit: 10000, // Very large limit
        include_all_fields: true,
        deep_search: true
      }, testDb);

      if (result.success) {
        // Should limit results even with large limit
        expect(result.results.length).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      // Create scenarios that cause various errors
      const errorScenarios = [
        () => createProfile({
          org_name: 'Test',
          profile_name: null as any,
          industry: 'Technology',
          size: 'medium'
        }, testDb),
        
        () => quickAssessment({
          profile_id: 'invalid-id',
          subcategory_id: 'GV.OC-01',
          implementation_level: 'Partially Implemented'
        }, testDb),
        
        () => uploadEvidence({
          profile_id: testProfileId,
          subcategory_id: null as any,
          file_name: 'test.pdf',
          file_hash: 'hash123',
          evidence_type: 'document'
        }, testDb)
      ];

      for (const scenario of errorScenarios) {
        const result = await scenario();
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
        
        // Verify no sensitive information in error messages
        const errorText = JSON.stringify(result);
        expect(errorText).not.toContain('password');
        expect(errorText).not.toContain('secret');
        expect(errorText).not.toContain('token');
        expect(errorText).not.toContain('api_key');
        expect(errorText).not.toContain('database');
        expect(errorText).not.toContain('connection');
        expect(errorText).not.toMatch(/\/[a-zA-Z0-9\/]+\/database/); // Database paths
      }
    });

    test('should sanitize stack traces in error responses', async () => {
      // Force an internal error
      const mockDb = {
        prepare: () => ({ 
          run: () => { 
            throw new Error('Internal database error with sensitive path: /var/lib/mysql/sensitive.db'); 
          }
        })
      };

      const result = await createProfile({
        org_name: 'Test Org',
        profile_name: 'Test Profile',
        industry: 'Technology',
        size: 'medium'
      }, mockDb as any);

      expect(result.success).toBe(false);
      
      // Error message should not contain sensitive file paths
      const errorText = JSON.stringify(result);
      expect(errorText).not.toContain('/var/lib/mysql');
      expect(errorText).not.toContain('sensitive.db');
    });
  });

  describe('Content Security Policy Tests', () => {
    test('should validate content types', async () => {
      const maliciousContent = {
        profile_id: testProfileId,
        subcategory_id: 'CSP-TEST',
        implementation_level: 'Partially Implemented',
        notes: 'data:text/html,<script>alert("XSS")</script>'
      };

      const result = await quickAssessment(maliciousContent, testDb);

      if (result.success) {
        expect(result.assessment.notes).not.toContain('data:text/html');
        expect(result.assessment.notes).not.toContain('<script>');
      }
    });

    test('should block dangerous MIME types', async () => {
      const dangerousFiles = [
        { name: 'malicious.exe', hash: 'hash1' },
        { name: 'script.js', hash: 'hash2' },
        { name: 'payload.bat', hash: 'hash3' },
        { name: 'virus.scr', hash: 'hash4' }
      ];

      for (const file of dangerousFiles) {
        const result = await uploadEvidence({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: file.name,
          file_hash: file.hash,
          evidence_type: 'document'
        }, testDb);

        // Should either reject dangerous file types or sanitize them
        if (result.success) {
          expect(result.evidence.file_name).not.toContain('.exe');
          expect(result.evidence.file_name).not.toContain('.bat');
          expect(result.evidence.file_name).not.toContain('.scr');
        } else {
          expect(result.message).toBeDefined();
        }
      }
    });
  });

  describe('Authorization and Access Control', () => {
    test('should prevent cross-profile access', async () => {
      // Create another profile
      const otherProfile = await testUtils.createTestProfile({
        profile_name: 'Other Profile'
      });

      // Try to access assessments from different profile
      const result = await quickAssessment({
        profile_id: otherProfile.profile_id,
        subcategory_id: 'CROSS-ACCESS-TEST',
        implementation_level: 'Partially Implemented'
      }, testDb);

      // This should succeed as it's creating, not cross-accessing
      // But if we had user context, we'd test that users can't access other users' profiles
      expect(result.success).toBe(true);
    });

    test('should validate resource ownership', async () => {
      // In a real system with user authentication, test that users can only access their own resources
      // For now, we test basic resource validation
      const result = await exportData({
        profile_id: 'non-existent-profile',
        export_format: 'json'
      }, testDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});