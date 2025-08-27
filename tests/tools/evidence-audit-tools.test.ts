/**
 * Evidence & Audit Management Tools Test Suite
 * Tests for: upload_evidence, track_audit_trail, get_implementation_guidance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { EvidenceAuditTestHelper } from '../helpers/category-test-helpers.js';

const toolHelper = setupCompleteToolMocking('evidence_audit');

describe('Evidence & Audit Management Tools', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await toolHelper.resetDatabase();
    await toolHelper.createTestOrganization();
    await toolHelper.setupTestFileSystem();
  });

  afterEach(async () => {
    await toolHelper.cleanup();
  });

  describe('Upload Evidence Tool', () => {
    it('should upload and catalog evidence files', async () => {
      const { uploadEvidence } = await import('../../src/tools/upload_evidence.js');
      
      const evidenceData = EvidenceAuditTestHelper.generateEvidenceMetadata();
      const params = {
        organization_id: toolHelper.testOrgId,
        subcategory_id: 'GV.OC-01',
        evidence_type: 'policy_document',
        file_metadata: evidenceData.fileMetadata,
        description: 'Organizational cybersecurity governance policy',
        tags: ['governance', 'policy', 'executive']
      };

      const result = await uploadEvidence(params);

      expect(result.success).toBe(true);
      expect(result.evidence).toBeDefined();
      expect(result.evidence.evidence_id).toBeDefined();
      expect(result.evidence.file_path).toBeDefined();
      expect(result.evidence.upload_timestamp).toBeDefined();
      expect(result.evidence.checksum).toBeDefined();
      expect(result.evidence.file_size).toBeGreaterThan(0);
    });

    it('should validate file types and sizes', async () => {
      const { uploadEvidence } = await import('../../src/tools/upload_evidence.js');
      
      const invalidFile = {
        filename: 'test.exe', // Invalid file type
        size: 50 * 1024 * 1024, // 50MB - too large
        mime_type: 'application/x-executable'
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        subcategory_id: 'PR.AC-01',
        evidence_type: 'technical_document',
        file_metadata: invalidFile
      };

      const result = await uploadEvidence(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid file type|file too large|not allowed/i);
    });

    it('should support multiple evidence types', async () => {
      const { uploadEvidence } = await import('../../src/tools/upload_evidence.js');
      
      const evidenceTypes = [
        { type: 'policy_document', subcategory: 'GV.OC-01' },
        { type: 'procedure_document', subcategory: 'PR.AC-01' },
        { type: 'audit_log', subcategory: 'DE.AE-01' },
        { type: 'training_record', subcategory: 'PR.AT-01' },
        { type: 'technical_configuration', subcategory: 'PR.DS-01' }
      ];

      for (const evidence of evidenceTypes) {
        const evidenceData = EvidenceAuditTestHelper.generateEvidenceMetadata(evidence.type);
        const params = {
          organization_id: toolHelper.testOrgId,
          subcategory_id: evidence.subcategory,
          evidence_type: evidence.type,
          file_metadata: evidenceData.fileMetadata
        };

        const result = await uploadEvidence(params);
        
        expect(result.success).toBe(true);
        expect(result.evidence.evidence_type).toBe(evidence.type);
      }
    });

    it('should detect and prevent duplicate uploads', async () => {
      const { uploadEvidence } = await import('../../src/tools/upload_evidence.js');
      
      const evidenceData = EvidenceAuditTestHelper.generateEvidenceMetadata();
      const params = {
        organization_id: toolHelper.testOrgId,
        subcategory_id: 'ID.AM-01',
        evidence_type: 'inventory_document',
        file_metadata: evidenceData.fileMetadata,
        checksum: 'test-checksum-123'
      };

      // Upload first time
      const firstResult = await uploadEvidence(params);
      expect(firstResult.success).toBe(true);

      // Attempt duplicate upload
      const duplicateResult = await uploadEvidence(params);
      
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toMatch(/duplicate|already exists/i);
      expect(duplicateResult.existing_evidence_id).toBe(firstResult.evidence.evidence_id);
    });

    it('should support evidence versioning', async () => {
      const { uploadEvidence } = await import('../../src/tools/upload_evidence.js');
      
      const originalEvidence = EvidenceAuditTestHelper.generateEvidenceMetadata();
      const params = {
        organization_id: toolHelper.testOrgId,
        subcategory_id: 'GV.SC-01',
        evidence_type: 'supply_chain_policy',
        file_metadata: originalEvidence.fileMetadata,
        version: '1.0'
      };

      // Upload original version
      const originalResult = await uploadEvidence(params);
      expect(originalResult.success).toBe(true);

      // Upload new version
      const updatedEvidence = EvidenceAuditTestHelper.generateEvidenceMetadata();
      const updateParams = {
        ...params,
        file_metadata: updatedEvidence.fileMetadata,
        version: '1.1',
        replaces_evidence_id: originalResult.evidence.evidence_id
      };

      const updateResult = await uploadEvidence(updateParams);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.evidence.version).toBe('1.1');
      expect(updateResult.evidence.previous_version_id).toBe(originalResult.evidence.evidence_id);
    });
  });

  describe('Track Audit Trail Tool', () => {
    it('should log and track all system activities', async () => {
      const { trackAuditTrail } = await import('../../src/tools/track_audit_trail.js');
      
      const auditEvents = EvidenceAuditTestHelper.generateAuditEvents();
      const params = {
        organization_id: toolHelper.testOrgId,
        events: auditEvents,
        audit_scope: 'system_wide'
      };

      const result = await trackAuditTrail(params);

      expect(result.success).toBe(true);
      expect(result.audit_trail).toBeDefined();
      expect(result.audit_trail.total_events).toBe(auditEvents.length);
      expect(result.audit_trail.events_by_type).toBeDefined();
      expect(result.audit_trail.timeline).toBeDefined();
      
      // Validate event logging
      result.audit_trail.logged_events.forEach((event: any) => {
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('user_id');
        expect(event).toHaveProperty('action');
        expect(event).toHaveProperty('resource');
        expect(event).toHaveProperty('status');
      });
    });

    it('should query audit trail by various filters', async () => {
      const { trackAuditTrail } = await import('../../src/tools/track_audit_trail.js');
      
      // First, log some events
      const auditEvents = EvidenceAuditTestHelper.generateAuditEvents();
      await trackAuditTrail({
        organization_id: toolHelper.testOrgId,
        events: auditEvents
      });

      // Query with filters
      const queryParams = {
        organization_id: toolHelper.testOrgId,
        query_mode: true,
        filters: {
          action_type: 'assessment_update',
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          user_id: 'test-user-123'
        }
      };

      const result = await trackAuditTrail(queryParams);

      expect(result.success).toBe(true);
      expect(result.audit_trail.filtered_events).toBeDefined();
      expect(Array.isArray(result.audit_trail.filtered_events)).toBe(true);
    });

    it('should detect suspicious activities and anomalies', async () => {
      const { trackAuditTrail } = await import('../../src/tools/track_audit_trail.js');
      
      const suspiciousEvents = EvidenceAuditTestHelper.generateSuspiciousAuditEvents();
      const params = {
        organization_id: toolHelper.testOrgId,
        events: suspiciousEvents,
        enable_anomaly_detection: true
      };

      const result = await trackAuditTrail(params);

      expect(result.success).toBe(true);
      expect(result.security_alerts).toBeDefined();
      expect(result.anomalies_detected).toBeDefined();
      
      if (result.security_alerts.length > 0) {
        result.security_alerts.forEach((alert: any) => {
          expect(alert).toHaveProperty('alert_type');
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('description');
          expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
        });
      }
    });

    it('should generate compliance audit reports', async () => {
      const { trackAuditTrail } = await import('../../src/tools/track_audit_trail.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        generate_compliance_report: true,
        compliance_frameworks: ['SOX', 'GDPR', 'HIPAA'],
        reporting_period: 'quarterly'
      };

      const result = await trackAuditTrail(params);

      expect(result.success).toBe(true);
      expect(result.compliance_report).toBeDefined();
      expect(result.compliance_report.audit_completeness).toBeDefined();
      expect(result.compliance_report.control_testing_evidence).toBeDefined();
      expect(result.compliance_report.exceptions_identified).toBeDefined();
    });

    it('should support audit trail integrity verification', async () => {
      const { trackAuditTrail } = await import('../../src/tools/track_audit_trail.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        verify_integrity: true,
        hash_validation: true
      };

      const result = await trackAuditTrail(params);

      expect(result.success).toBe(true);
      expect(result.integrity_verification).toBeDefined();
      expect(result.integrity_verification.hash_chain_valid).toBeDefined();
      expect(result.integrity_verification.tampering_detected).toBeDefined();
      expect(result.integrity_verification.verification_timestamp).toBeDefined();
    });
  });

  describe('Get Implementation Guidance Tool', () => {
    it('should provide detailed implementation guidance for subcategories', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        organization_size: 'medium',
        industry_sector: 'financial_services',
        guidance_level: 'detailed'
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance).toBeDefined();
      expect(result.guidance.implementation_steps).toBeDefined();
      expect(result.guidance.best_practices).toBeDefined();
      expect(result.guidance.common_pitfalls).toBeDefined();
      expect(result.guidance.success_criteria).toBeDefined();
      expect(result.guidance.resource_requirements).toBeDefined();
      
      // Validate step-by-step guidance
      expect(Array.isArray(result.guidance.implementation_steps)).toBe(true);
      expect(result.guidance.implementation_steps.length).toBeGreaterThan(0);
    });

    it('should tailor guidance to organization size and industry', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const testScenarios = [
        { size: 'small', industry: 'healthcare', subcategory: 'PR.DS-01' },
        { size: 'large', industry: 'manufacturing', subcategory: 'DE.CM-01' },
        { size: 'enterprise', industry: 'technology', subcategory: 'RS.RP-01' }
      ];

      for (const scenario of testScenarios) {
        const params = {
          subcategory_id: scenario.subcategory,
          organization_size: scenario.size,
          industry_sector: scenario.industry
        };

        const result = await getImplementationGuidance(params);
        
        expect(result.success).toBe(true);
        expect(result.guidance.organization_considerations).toBeDefined();
        expect(result.guidance.industry_specific_requirements).toBeDefined();
        expect(result.guidance.scalability_notes).toBeDefined();
      }
    });

    it('should provide technology-specific implementation examples', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'PR.AC-01',
        organization_size: 'medium',
        technology_stack: ['Active_Directory', 'Azure_AD', 'Okta'],
        include_technical_examples: true
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance.technical_implementations).toBeDefined();
      expect(result.guidance.technology_specific_steps).toBeDefined();
      expect(result.guidance.configuration_examples).toBeDefined();
      
      // Validate technology-specific content
      params.technology_stack.forEach(tech => {
        expect(result.guidance.technical_implementations[tech]).toBeDefined();
      });
    });

    it('should include cost estimates and timeline projections', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'ID.AM-01',
        organization_size: 'large',
        include_cost_estimates: true,
        include_timeline: true,
        current_maturity_level: 2,
        target_maturity_level: 4
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance.cost_estimates).toBeDefined();
      expect(result.guidance.timeline_projection).toBeDefined();
      expect(result.guidance.resource_requirements.budget_range).toBeDefined();
      expect(result.guidance.timeline_projection.estimated_duration_months).toBeGreaterThan(0);
    });

    it('should provide regulatory compliance mapping', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'PR.DS-01',
        industry_sector: 'healthcare',
        compliance_requirements: ['HIPAA', 'HITECH'],
        include_regulatory_mapping: true
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance.regulatory_compliance).toBeDefined();
      expect(result.guidance.compliance_controls_mapping).toBeDefined();
      
      params.compliance_requirements.forEach(requirement => {
        expect(result.guidance.regulatory_compliance[requirement]).toBeDefined();
      });
    });

    it('should support multiple guidance formats and outputs', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const outputFormats = ['detailed', 'checklist', 'executive_summary', 'technical_specification'];
      
      for (const format of outputFormats) {
        const params = {
          subcategory_id: 'GV.SC-01',
          organization_size: 'medium',
          output_format: format
        };

        const result = await getImplementationGuidance(params);
        
        expect(result.success).toBe(true);
        expect(result.guidance.format).toBe(format);
        
        // Validate format-specific content structure
        if (format === 'checklist') {
          expect(result.guidance.checklist_items).toBeDefined();
          expect(Array.isArray(result.guidance.checklist_items)).toBe(true);
        } else if (format === 'executive_summary') {
          expect(result.guidance.executive_overview).toBeDefined();
          expect(result.guidance.key_recommendations).toBeDefined();
        }
      }
    });

    it('should validate subcategory existence and parameters', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'INVALID-SUBCATEGORY',
        organization_size: 'medium'
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/subcategory.*not found|invalid subcategory/i);
    });

    it('should provide progressive implementation guidance', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'RC.RP-01',
        organization_size: 'small',
        current_maturity_level: 1,
        target_maturity_level: 3,
        progressive_approach: true
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance.maturity_progression).toBeDefined();
      expect(result.guidance.phase_based_approach).toBeDefined();
      
      // Should have guidance for each maturity level progression
      expect(result.guidance.maturity_progression['level_1_to_2']).toBeDefined();
      expect(result.guidance.maturity_progression['level_2_to_3']).toBeDefined();
    });
  });
});