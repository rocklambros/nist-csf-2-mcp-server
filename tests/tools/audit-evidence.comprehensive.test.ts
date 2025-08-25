/**
 * Comprehensive tests for audit and evidence tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, testUtils, performanceUtils } from '../setup.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { validateEvidence } from '../../src/tools/validate_evidence.js';
import { generateAuditReport } from '../../src/tools/generate_audit_report.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';
import { invalidInputs } from '../helpers/mock-data.js';
import fs from 'fs';
import path from 'path';

describe('Audit and Evidence Tools - Comprehensive Tests', () => {
  let testProfileId: string;
  let testOrgId: string;
  let testEvidenceId: string;

  beforeAll(async () => {
    // Create test profile for audit testing
    const profile = await testUtils.createTestProfile({
      profile_name: 'Audit Test Profile',
      profile_type: 'current'
    });
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;

    // Create test assessments and evidence
    await testUtils.createTestAssessments(testProfileId, 10);
    await setupAuditTestData();
  });

  describe('Upload Evidence Tool', () => {
    describe('Valid Input Tests', () => {
      test('should upload document evidence successfully', async () => {
        const evidenceData = {
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'security-policy.pdf',
          file_path: '/evidence/security-policy.pdf',
          file_hash: 'abc123def456789',
          evidence_type: 'document',
          description: 'Organizational security policy document',
          uploaded_by: 'test-auditor'
        };

        const result = await uploadEvidence.execute(evidenceData, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          evidence: expect.objectContaining({
            profile_id: testProfileId,
            subcategory_id: 'GV.OC-01',
            file_name: 'security-policy.pdf',
            evidence_type: 'document',
            evidence_id: expect.any(String),
            upload_date: expect.any(String)
          })
        });

        testEvidenceId = result.evidence.evidence_id;
      });

      test('should upload screenshot evidence with metadata', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'ID.AM-01',
          file_name: 'asset-inventory-screenshot.png',
          file_path: '/evidence/screenshots/asset-inventory.png',
          file_hash: 'def456ghi789abc',
          evidence_type: 'screenshot',
          description: 'Asset inventory system interface',
          uploaded_by: 'test-user',
          metadata: {
            screen_resolution: '1920x1080',
            browser: 'Chrome 119.0',
            timestamp: new Date().toISOString()
          }
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.evidence.evidence_type).toBe('screenshot');
        expect(result.evidence.metadata.screen_resolution).toBe('1920x1080');
      });

      test('should upload log file evidence', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'DE.CM-01',
          file_name: 'security-audit.log',
          file_path: '/evidence/logs/security-audit-2024.log',
          file_hash: 'ghi789jkl012mno',
          evidence_type: 'log',
          description: 'Security monitoring system logs',
          uploaded_by: 'security-team',
          retention_period_days: 2555, // 7 years
          classification: 'confidential'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.evidence.evidence_type).toBe('log');
        expect(result.evidence.retention_period_days).toBe(2555);
        expect(result.evidence.classification).toBe('confidential');
      });

      test('should handle bulk evidence upload', async () => {
        const evidenceList = [
          {
            profile_id: testProfileId,
            subcategory_id: 'PR.AC-01',
            file_name: 'access-control-config.json',
            file_hash: 'bulk001',
            evidence_type: 'config'
          },
          {
            profile_id: testProfileId,
            subcategory_id: 'PR.AC-02',
            file_name: 'user-permissions.xlsx',
            file_hash: 'bulk002',
            evidence_type: 'report'
          }
        ];

        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          bulk_upload: true,
          evidence_list: evidenceList
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.bulk_upload_results).toHaveLength(2);
        expect(result.bulk_upload_results.every(r => r.success)).toBe(true);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing required fields', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          file_name: 'test.pdf'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'subcategory_id');
      });

      test('should validate file hash format', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'test.pdf',
          file_hash: 'invalid-hash-format-!!!'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'file_hash');
      });

      test('should handle invalid evidence type', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'test.pdf',
          file_hash: 'validhash123',
          evidence_type: 'invalid_type'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'evidence_type');
      });

      test('should prevent path traversal attacks', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'test.pdf',
          file_path: invalidInputs.pathTraversal,
          file_hash: 'validhash123',
          evidence_type: 'document'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'path');
      });

      test('should handle oversized file uploads', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'large-file.pdf',
          file_hash: 'largefile123',
          evidence_type: 'document',
          file_size_bytes: 1024 * 1024 * 1024 // 1GB
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'file_size');
      });
    });

    describe('Security Tests', () => {
      test('should sanitize malicious file names', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: '<script>alert("xss")</script>.pdf',
          file_hash: 'sanitize123',
          evidence_type: 'document'
        }, testDb);

        if (result.success) {
          expect(result.evidence.file_name).not.toContain('<script>');
        } else {
          testUtils.assertErrorResponse(result, 'file_name');
        }
      });

      test('should validate file hash integrity', async () => {
        const result = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'integrity-test.pdf',
          file_hash: 'original123',
          evidence_type: 'document',
          verify_integrity: true,
          calculated_hash: 'different456'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'integrity');
      });
    });

    describe('Performance Tests', () => {
      test('should handle multiple concurrent uploads', async () => {
        const uploadPromises = Array.from({ length: 5 }, (_, i) =>
          uploadEvidence.execute({
            profile_id: testProfileId,
            subcategory_id: `TEST-UPLOAD-${i}`,
            file_name: `concurrent-test-${i}.pdf`,
            file_hash: `concurrent${i}hash`,
            evidence_type: 'document'
          }, testDb)
        );

        const results = await Promise.all(uploadPromises);
        
        results.forEach(result => {
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('Validate Evidence Tool', () => {
    describe('Valid Input Tests', () => {
      test('should validate uploaded evidence', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'completeness',
          validated_by: 'lead-auditor'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          validation: expect.objectContaining({
            evidence_id: testEvidenceId,
            validation_type: 'completeness',
            validation_status: expect.any(String),
            validated_by: 'lead-auditor',
            validation_date: expect.any(String)
          })
        });
      });

      test('should perform technical validation with automated checks', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'technical',
          automated_checks: [
            'file_integrity',
            'metadata_verification',
            'virus_scan',
            'format_validation'
          ],
          validation_criteria: {
            min_file_size: 1024,
            max_file_size: 10485760,
            allowed_formats: ['pdf', 'doc', 'docx']
          }
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.validation.automated_checks).toBeDefined();
        expect(result.validation.validation_results).toBeDefined();
      });

      test('should validate evidence authenticity', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'authenticity',
          digital_signature_verification: true,
          timestamp_verification: true,
          chain_of_custody_check: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.validation.validation_type).toBe('authenticity');
        expect(result.validation).toHaveProperty('digital_signature_valid');
        expect(result.validation).toHaveProperty('timestamp_valid');
      });

      test('should perform compliance validation', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'compliance',
          compliance_frameworks: ['SOC2', 'ISO27001'],
          regulatory_requirements: ['GDPR', 'CCPA'],
          include_gap_analysis: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.validation.compliance_frameworks).toEqual(['SOC2', 'ISO27001']);
        expect(result.validation).toHaveProperty('compliance_status');
        expect(result.validation).toHaveProperty('gap_analysis');
      });

      test('should batch validate multiple evidence items', async () => {
        // Upload additional evidence for batch testing
        const evidence2 = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'ID.AM-02',
          file_name: 'batch-test-2.pdf',
          file_hash: 'batch002',
          evidence_type: 'document'
        }, testDb);

        const result = await validateEvidence.execute({
          batch_validation: true,
          evidence_ids: [testEvidenceId, evidence2.evidence.evidence_id],
          validation_type: 'completeness'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.batch_validation_results).toHaveLength(2);
        expect(result.batch_validation_results.every(r => r.success)).toBe(true);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle non-existent evidence ID', async () => {
        const result = await validateEvidence.execute({
          evidence_id: 'non-existent-evidence',
          validation_type: 'completeness'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'not found');
      });

      test('should handle invalid validation type', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'invalid_type'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'validation_type');
      });

      test('should handle invalid compliance framework', async () => {
        const result = await validateEvidence.execute({
          evidence_id: testEvidenceId,
          validation_type: 'compliance',
          compliance_frameworks: ['INVALID_FRAMEWORK']
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'compliance_frameworks');
      });
    });

    describe('Edge Cases', () => {
      test('should handle evidence with missing metadata', async () => {
        // Create evidence with minimal data
        const minimalEvidence = await uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'EDGE-TEST',
          file_name: 'minimal.pdf',
          file_hash: 'minimal123',
          evidence_type: 'document'
        }, testDb);

        const result = await validateEvidence.execute({
          evidence_id: minimalEvidence.evidence.evidence_id,
          validation_type: 'completeness'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.validation.validation_status).toBeDefined();
      });
    });
  });

  describe('Generate Audit Report Tool', () => {
    describe('Valid Input Tests', () => {
      test('should generate comprehensive audit report', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'comprehensive',
          audit_period: {
            start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date().toISOString()
          },
          include_evidence_summary: true,
          include_findings: true,
          include_recommendations: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          audit_report: expect.objectContaining({
            profile_id: testProfileId,
            audit_type: 'comprehensive',
            audit_period: expect.any(Object),
            evidence_summary: expect.any(Object),
            findings: expect.any(Array),
            recommendations: expect.any(Array),
            report_id: expect.any(String)
          })
        });

        expect(result.audit_report.evidence_summary.total_evidence_items).toBeGreaterThan(0);
        expect(result.audit_report.findings.length).toBeGreaterThan(0);
      });

      test('should generate focused audit report by function', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'focused',
          function_filter: 'GV',
          include_control_testing: true,
          include_exception_analysis: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_report.function_filter).toBe('GV');
        expect(result.audit_report).toHaveProperty('control_testing');
        expect(result.audit_report).toHaveProperty('exception_analysis');
      });

      test('should generate regulatory audit report', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'regulatory',
          regulatory_framework: 'SOC2',
          audit_standards: ['AICPA_TSC', 'SSAE_18'],
          include_management_letter: true,
          include_certification_status: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_report.audit_type).toBe('regulatory');
        expect(result.audit_report.regulatory_framework).toBe('SOC2');
        expect(result.audit_report).toHaveProperty('management_letter');
        expect(result.audit_report).toHaveProperty('certification_status');
      });

      test('should generate audit report with risk assessment', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'risk_based',
          risk_appetite: 'medium',
          include_risk_matrix: true,
          include_control_effectiveness: true,
          materiality_threshold: 0.05
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_report.risk_appetite).toBe('medium');
        expect(result.audit_report.materiality_threshold).toBe(0.05);
        expect(result.audit_report).toHaveProperty('risk_matrix');
        expect(result.audit_report).toHaveProperty('control_effectiveness');
      });

      test('should include audit trail and evidence validation', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'evidence_focused',
          include_audit_trail: true,
          include_evidence_validation: true,
          evidence_completeness_check: true,
          sample_size_percentage: 25
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_report.sample_size_percentage).toBe(25);
        expect(result.audit_report).toHaveProperty('audit_trail');
        expect(result.audit_report).toHaveProperty('evidence_validation');
        expect(result.audit_report).toHaveProperty('completeness_assessment');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle invalid audit type', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'invalid_type'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'audit_type');
      });

      test('should handle invalid date range', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'comprehensive',
          audit_period: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'audit_period');
      });

      test('should handle invalid regulatory framework', async () => {
        const result = await generateAuditReport.execute({
          profile_id: testProfileId,
          audit_type: 'regulatory',
          regulatory_framework: 'INVALID_FRAMEWORK'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'regulatory_framework');
      });
    });

    describe('Performance Tests', () => {
      test('should generate complex audit report within time limit', async () => {
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await generateAuditReport.execute({
            profile_id: testProfileId,
            audit_type: 'comprehensive',
            include_evidence_summary: true,
            include_findings: true,
            include_recommendations: true,
            include_risk_matrix: true,
            include_control_effectiveness: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });
  });

  describe('Track Audit Trail Tool', () => {
    describe('Valid Input Tests', () => {
      test('should create audit trail entry', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'evidence_uploaded',
          resource_type: 'evidence',
          resource_id: testEvidenceId,
          performed_by: 'test-auditor',
          details: {
            evidence_type: 'document',
            subcategory_id: 'GV.OC-01',
            file_name: 'security-policy.pdf'
          }
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          audit_entry: expect.objectContaining({
            profile_id: testProfileId,
            action: 'evidence_uploaded',
            resource_type: 'evidence',
            resource_id: testEvidenceId,
            performed_by: 'test-auditor',
            audit_id: expect.any(String),
            timestamp: expect.any(String)
          })
        });
      });

      test('should track assessment modifications', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'assessment_modified',
          resource_type: 'assessment',
          resource_id: 'test-assessment-id',
          performed_by: 'assessor-user',
          before_state: {
            implementation_level: 'Partially Implemented',
            maturity_score: 2
          },
          after_state: {
            implementation_level: 'Fully Implemented',
            maturity_score: 4
          },
          modification_reason: 'Control implementation completed'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_entry.action).toBe('assessment_modified');
        expect(result.audit_entry.before_state).toBeDefined();
        expect(result.audit_entry.after_state).toBeDefined();
        expect(result.audit_entry.modification_reason).toBe('Control implementation completed');
      });

      test('should track system access and authentication', async () => {
        const result = await trackAuditTrail.execute({
          action: 'user_login',
          resource_type: 'system',
          performed_by: 'admin-user',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          session_id: 'session-123',
          authentication_method: 'oauth2'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_entry.ip_address).toBe('192.168.1.100');
        expect(result.audit_entry.authentication_method).toBe('oauth2');
      });

      test('should track bulk operations', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'bulk_evidence_upload',
          resource_type: 'evidence',
          performed_by: 'batch-processor',
          bulk_operation: true,
          affected_resources: [
            { resource_id: 'evidence-1', action: 'created' },
            { resource_id: 'evidence-2', action: 'created' },
            { resource_id: 'evidence-3', action: 'created' }
          ],
          batch_size: 3
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_entry.bulk_operation).toBe(true);
        expect(result.audit_entry.affected_resources).toHaveLength(3);
        expect(result.audit_entry.batch_size).toBe(3);
      });

      test('should query audit trail with filters', async () => {
        const result = await trackAuditTrail.execute({
          query_mode: true,
          profile_id: testProfileId,
          filters: {
            action_types: ['evidence_uploaded', 'assessment_modified'],
            date_range: {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            performed_by: 'test-auditor'
          },
          limit: 50,
          sort_order: 'desc'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.audit_entries).toBeDefined();
        expect(Array.isArray(result.audit_entries)).toBe(true);
        expect(result.total_count).toBeDefined();
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing required action', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          resource_type: 'evidence',
          performed_by: 'test-user'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'action');
      });

      test('should handle invalid resource type', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'test_action',
          resource_type: 'invalid_resource',
          performed_by: 'test-user'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'resource_type');
      });

      test('should sanitize malicious input in details', async () => {
        const result = await trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'test_action',
          resource_type: 'evidence',
          performed_by: 'test-user',
          details: {
            malicious_script: invalidInputs.xssAttempt,
            sql_injection: invalidInputs.sqlInjection
          }
        }, testDb);

        // Should succeed but sanitize the input
        if (result.success) {
          expect(JSON.stringify(result.audit_entry.details)).not.toContain('<script>');
          expect(JSON.stringify(result.audit_entry.details)).not.toContain('DROP TABLE');
        } else {
          testUtils.assertErrorResponse(result);
        }
      });
    });

    describe('Performance Tests', () => {
      test('should handle high-volume audit logging', async () => {
        const startTime = Date.now();
        
        const logPromises = Array.from({ length: 20 }, (_, i) =>
          trackAuditTrail.execute({
            profile_id: testProfileId,
            action: 'performance_test',
            resource_type: 'test',
            resource_id: `perf-test-${i}`,
            performed_by: 'performance-tester'
          }, testDb)
        );

        const results = await Promise.all(logPromises);
        const duration = Date.now() - startTime;
        
        results.forEach(result => expect(result.success).toBe(true));
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });
  });

  describe('Database Transaction Tests', () => {
    test('should handle evidence upload rollback on error', async () => {
      const mockDb = {
        prepare: () => ({ 
          run: () => { throw new Error('Evidence database error'); }
        }),
        db: {
          prepare: () => ({ 
            run: () => { throw new Error('Evidence database error'); }
          })
        }
      };

      const result = await uploadEvidence.execute({
        profile_id: testProfileId,
        subcategory_id: 'GV.OC-01',
        file_name: 'error-test.pdf',
        file_hash: 'errortest123',
        evidence_type: 'document'
      }, mockDb as any);

      testUtils.assertErrorResponse(result, 'Evidence database error');
    });

    test('should maintain audit trail integrity during concurrent operations', async () => {
      const concurrentOperations = [
        trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'concurrent_test_1',
          resource_type: 'test',
          performed_by: 'concurrent-user-1'
        }, testDb),
        trackAuditTrail.execute({
          profile_id: testProfileId,
          action: 'concurrent_test_2',
          resource_type: 'test',
          performed_by: 'concurrent-user-2'
        }, testDb),
        uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'CONCURRENT-TEST',
          file_name: 'concurrent-evidence.pdf',
          file_hash: 'concurrent123',
          evidence_type: 'document'
        }, testDb)
      ];

      const results = await Promise.all(concurrentOperations);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent evidence format', async () => {
      const result = await uploadEvidence.execute({
        profile_id: testProfileId,
        subcategory_id: 'FORMAT-TEST',
        file_name: 'format-test.pdf',
        file_hash: 'formattest123',
        evidence_type: 'document'
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        evidence: expect.objectContaining({
          evidence_id: expect.any(String),
          profile_id: expect.any(String),
          subcategory_id: expect.any(String),
          file_name: expect.any(String),
          file_hash: expect.any(String),
          evidence_type: expect.any(String),
          upload_date: expect.any(String)
        })
      });
    });

    test('should return consistent audit report format', async () => {
      const result = await generateAuditReport.execute({
        profile_id: testProfileId,
        audit_type: 'comprehensive'
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        audit_report: expect.objectContaining({
          profile_id: expect.any(String),
          audit_type: expect.any(String),
          report_id: expect.any(String),
          generated_date: expect.any(String)
        })
      });
    });

    test('should return consistent audit trail format', async () => {
      const result = await trackAuditTrail.execute({
        profile_id: testProfileId,
        action: 'format_test',
        resource_type: 'test',
        performed_by: 'format-tester'
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        audit_entry: expect.objectContaining({
          audit_id: expect.any(String),
          profile_id: expect.any(String),
          action: expect.any(String),
          resource_type: expect.any(String),
          performed_by: expect.any(String),
          timestamp: expect.any(String)
        })
      });
    });

    test('should return consistent error format', async () => {
      const result = await uploadEvidence.execute({
        profile_id: 'invalid'
      } as any, testDb);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });
});

/**
 * Setup additional test data for audit testing
 */
async function setupAuditTestData() {
  // Add audit-specific test data
  const auditData = [
    {
      table: 'audit_evidence',
      data: [
        {
          evidence_id: 'test-evidence-001',
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: 'existing-evidence.pdf',
          evidence_type: 'document',
          file_hash: 'existinghash123',
          upload_date: new Date().toISOString(),
          is_valid: true
        }
      ]
    },
    {
      table: 'audit_trail',
      data: [
        {
          audit_id: 'audit-001',
          profile_id: testProfileId,
          action: 'profile_created',
          resource_type: 'profile',
          performed_by: 'system',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  ];

  for (const item of auditData) {
    try {
      for (const record of item.data) {
        const columns = Object.keys(record).join(', ');
        const placeholders = Object.keys(record).map(() => '?').join(', ');
        const values = Object.values(record);
        
        testDb.db.prepare(`
          INSERT OR REPLACE INTO ${item.table} (${columns})
          VALUES (${placeholders})
        `).run(...values);
      }
    } catch (error) {
      // Table might not exist yet, continue
    }
  }
}