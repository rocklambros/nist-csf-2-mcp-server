/**
 * Security and Compliance Integration Tests
 * Tests security-focused workflows and compliance scenarios
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Import security-focused MCP tools
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { calculateRiskScore } from '../../src/tools/calculate_risk_score.js';
import { generateComplianceReport } from '../../src/tools/generate_compliance_report.js';
import { generateAuditReport } from '../../src/tools/generate_audit_report.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { validateEvidence } from '../../src/tools/validate_evidence.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';
import { validateAssessmentResponses } from '../../src/tools/validate_assessment_responses.js';

// Mock the database
jest.mock('../../src/db/database.js');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Security and Compliance Integration Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('Financial Services Compliance Workflow', () => {
    it('should execute complete financial services compliance assessment', async () => {
      // Step 1: Create financial services organization profile
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-financial-123');
      mockDb.createProfile!.mockReturnValue('profile-financial-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-financial-123',
        org_id: 'org-financial-123',
        industry: 'Financial Services',
        size: 'large',
        regulatory_requirements: ['PCI DSS', 'SOX', 'GDPR']
      }));

      const profileResult = await createProfile({
        org_name: 'Global Financial Corp',
        profile_name: 'SOX Compliance Assessment',
        industry: 'Financial Services',
        size: 'large',
        regulatory_requirements: ['PCI DSS', 'SOX', 'GDPR'],
        current_tier: 'Tier2',
        target_tier: 'Tier4'
      });

      testUtils.assertSuccessResponse(profileResult);

      // Step 2: Conduct high-risk assessments for financial controls
      const financialControlAssessments = [
        { subcategory_id: 'GV.OC-01', level: 3, risk_level: 'High', control_type: 'governance' },
        { subcategory_id: 'ID.AM-01', level: 2, risk_level: 'High', control_type: 'asset_management' },
        { subcategory_id: 'PR.AC-01', level: 4, risk_level: 'Critical', control_type: 'access_control' },
        { subcategory_id: 'PR.DS-01', level: 3, risk_level: 'High', control_type: 'data_security' },
        { subcategory_id: 'DE.CM-01', level: 2, risk_level: 'Medium', control_type: 'monitoring' }
      ];

      for (const assessment of financialControlAssessments) {
        mockDb.createAssessment!.mockReturnValue(`assessment-${assessment.subcategory_id}`);
        mockDb.getAssessment!.mockReturnValue(testUtils.createMockAssessment({
          assessment_id: `assessment-${assessment.subcategory_id}`,
          profile_id: 'profile-financial-123',
          subcategory_id: assessment.subcategory_id,
          implementation_level: assessment.level,
          maturity_score: assessment.level,
          risk_rating: assessment.risk_level
        }));

        const assessmentResult = await quickAssessment({
          profile_id: 'profile-financial-123',
          subcategory_id: assessment.subcategory_id,
          implementation_level: assessment.level,
          maturity_score: assessment.level,
          risk_rating: assessment.risk_level,
          notes: `${assessment.control_type} control assessment for financial compliance`
        });

        testUtils.assertSuccessResponse(assessmentResult);
      }

      // Step 3: Upload compliance evidence
      const complianceEvidence = [
        { subcategory_id: 'GV.OC-01', file_name: 'board-cyber-oversight-charter.pdf', type: 'policy' },
        { subcategory_id: 'PR.AC-01', file_name: 'privileged-access-controls.json', type: 'configuration' },
        { subcategory_id: 'PR.DS-01', file_name: 'encryption-standards.pdf', type: 'procedure' },
        { subcategory_id: 'DE.CM-01', file_name: 'siem-monitoring-logs.csv', type: 'log_data' }
      ];

      for (const evidence of complianceEvidence) {
        mockDb.createEvidence!.mockReturnValue(`evidence-${evidence.subcategory_id}`);
        mockDb.getEvidence!.mockReturnValue(testUtils.createMockEvidence({
          evidence_id: `evidence-${evidence.subcategory_id}`,
          profile_id: 'profile-financial-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          evidence_type: evidence.type,
          validation_status: 'pending'
        }));

        const evidenceResult = await uploadEvidence({
          profile_id: 'profile-financial-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          file_hash: `hash-${evidence.subcategory_id}`,
          evidence_type: evidence.type,
          description: `Compliance evidence for ${evidence.subcategory_id}`,
          compliance_frameworks: ['SOX', 'PCI DSS']
        });

        testUtils.assertSuccessResponse(evidenceResult);
      }

      // Step 4: Validate evidence for compliance requirements
      for (const evidence of complianceEvidence) {
        mockDb.updateEvidence!.mockReturnValue(true);
        mockDb.getEvidence!.mockReturnValue(testUtils.createMockEvidence({
          evidence_id: `evidence-${evidence.subcategory_id}`,
          validation_status: 'validated',
          validation_notes: 'Meets SOX compliance requirements'
        }));

        const validationResult = await validateEvidence({
          evidence_id: `evidence-${evidence.subcategory_id}`,
          validation_criteria: ['completeness', 'authenticity', 'compliance'],
          compliance_frameworks: ['SOX', 'PCI DSS'],
          validator_notes: `Validated against ${evidence.type} standards`
        });

        testUtils.assertSuccessResponse(validationResult);
        expect(validationResult.validation_status).toBe('validated');
      }

      // Step 5: Calculate risk scores for financial operations
      mockDb.getRiskAssessments!.mockReturnValue([
        { subcategory_id: 'GV.OC-01', risk_score: 0.7, risk_level: 'High' },
        { subcategory_id: 'PR.AC-01', risk_score: 0.9, risk_level: 'Critical' },
        { subcategory_id: 'PR.DS-01', risk_score: 0.8, risk_level: 'High' }
      ]);

      mockDb.createRiskAssessment!.mockReturnValue('risk-assessment-financial-123');
      mockDb.getRiskAssessment!.mockReturnValue({
        risk_assessment_id: 'risk-assessment-financial-123',
        profile_id: 'profile-financial-123',
        overall_risk_score: 0.8,
        risk_level: 'High',
        critical_areas: 3,
        high_risk_areas: 2,
        recommendations: ['Strengthen access controls', 'Enhance monitoring']
      });

      const riskResult = await calculateRiskScore({
        profile_id: 'profile-financial-123',
        risk_methodology: 'quantitative',
        include_threat_analysis: true,
        include_vulnerability_assessment: true,
        compliance_context: 'financial_services'
      });

      testUtils.assertSuccessResponse(riskResult);
      expect(riskResult.risk_assessment_id).toBe('risk-assessment-financial-123');
      expect(riskResult.data?.overall_risk_score).toBe(0.8);

      // Step 6: Generate SOX compliance report
      mockDb.createReport!.mockReturnValue('sox-compliance-report-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'sox-compliance-report-123',
        profile_id: 'profile-financial-123',
        report_type: 'compliance',
        compliance_framework: 'SOX',
        status: 'completed',
        content: JSON.stringify({
          compliance_score: 85,
          control_deficiencies: 2,
          material_weaknesses: 0,
          recommendations: ['Enhance IT general controls', 'Improve change management']
        })
      });

      const complianceReportResult = await generateComplianceReport({
        profile_id: 'profile-financial-123',
        compliance_frameworks: ['SOX', 'PCI DSS'],
        include_gap_analysis: true,
        include_risk_assessment: true,
        include_evidence_summary: true,
        report_format: 'executive'
      });

      testUtils.assertSuccessResponse(complianceReportResult);
      expect(complianceReportResult.report_id).toBe('sox-compliance-report-123');

      // Step 7: Generate audit report
      mockDb.createReport!.mockReturnValueOnce('audit-report-financial-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'audit-report-financial-123',
        profile_id: 'profile-financial-123',
        report_type: 'audit',
        status: 'completed',
        content: JSON.stringify({
          audit_findings: 3,
          control_testing_results: 'Satisfactory',
          evidence_validation_summary: 'Complete',
          audit_opinion: 'Unqualified with recommendations'
        })
      });

      const auditReportResult = await generateAuditReport({
        profile_id: 'profile-financial-123',
        audit_scope: 'sox_compliance',
        include_control_testing: true,
        include_evidence_review: true,
        include_management_responses: true,
        auditor_name: 'External Auditor LLC'
      });

      testUtils.assertSuccessResponse(auditReportResult);
      expect(auditReportResult.report_id).toBe('audit-report-financial-123');

      // Verify comprehensive compliance workflow
      expect(mockDb.createAssessment).toHaveBeenCalledTimes(5);
      expect(mockDb.createEvidence).toHaveBeenCalledTimes(4);
      expect(mockDb.createRiskAssessment).toHaveBeenCalledTimes(1);
      expect(mockDb.createReport).toHaveBeenCalledTimes(2);
    });
  });

  describe('Healthcare HIPAA Compliance Workflow', () => {
    it('should execute healthcare-specific compliance assessment', async () => {
      // Setup healthcare organization
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-healthcare-123');
      mockDb.createProfile!.mockReturnValue('profile-healthcare-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-healthcare-123',
        org_id: 'org-healthcare-123',
        industry: 'Healthcare',
        regulatory_requirements: ['HIPAA', 'HITECH']
      }));

      const profileResult = await createProfile({
        org_name: 'Regional Medical Center',
        profile_name: 'HIPAA Compliance Assessment',
        industry: 'Healthcare',
        size: 'medium',
        regulatory_requirements: ['HIPAA', 'HITECH']
      });

      testUtils.assertSuccessResponse(profileResult);

      // HIPAA-specific assessments focusing on PHI protection
      const hipaaAssessments = [
        { subcategory_id: 'GV.OC-01', level: 3, focus: 'HIPAA_governance' },
        { subcategory_id: 'PR.AC-01', level: 4, focus: 'PHI_access_controls' },
        { subcategory_id: 'PR.DS-01', level: 4, focus: 'PHI_encryption' },
        { subcategory_id: 'PR.DS-02', level: 3, focus: 'data_in_transit' },
        { subcategory_id: 'DE.CM-01', level: 3, focus: 'PHI_monitoring' }
      ];

      for (const assessment of hipaaAssessments) {
        mockDb.createAssessment!.mockReturnValue(`hipaa-assessment-${assessment.subcategory_id}`);
        
        const assessmentResult = await quickAssessment({
          profile_id: 'profile-healthcare-123',
          subcategory_id: assessment.subcategory_id,
          implementation_level: assessment.level,
          maturity_score: assessment.level,
          compliance_notes: `HIPAA compliance assessment for ${assessment.focus}`,
          regulatory_requirements: ['HIPAA']
        });

        testUtils.assertSuccessResponse(assessmentResult);
      }

      // Upload HIPAA-specific evidence
      const hipaaEvidence = [
        { subcategory_id: 'PR.AC-01', file_name: 'hipaa-access-control-policy.pdf', type: 'policy' },
        { subcategory_id: 'PR.DS-01', file_name: 'phi-encryption-procedures.pdf', type: 'procedure' },
        { subcategory_id: 'DE.CM-01', file_name: 'phi-access-logs.csv', type: 'log_data' }
      ];

      for (const evidence of hipaaEvidence) {
        mockDb.createEvidence!.mockReturnValue(`hipaa-evidence-${evidence.subcategory_id}`);
        
        const evidenceResult = await uploadEvidence({
          profile_id: 'profile-healthcare-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          file_hash: `hipaa-hash-${evidence.subcategory_id}`,
          evidence_type: evidence.type,
          description: `HIPAA compliance evidence for ${evidence.subcategory_id}`,
          compliance_frameworks: ['HIPAA'],
          contains_phi: false,
          retention_period_years: 7
        });

        testUtils.assertSuccessResponse(evidenceResult);
      }

      // Generate HIPAA compliance report
      mockDb.createReport!.mockReturnValue('hipaa-compliance-report-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'hipaa-compliance-report-123',
        profile_id: 'profile-healthcare-123',
        report_type: 'compliance',
        compliance_framework: 'HIPAA',
        status: 'completed',
        content: JSON.stringify({
          hipaa_compliance_score: 92,
          safeguards_implemented: {
            administrative: 8,
            physical: 6,
            technical: 7
          },
          areas_for_improvement: ['Incident response procedures', 'Staff training documentation']
        })
      });

      const hipaaReportResult = await generateComplianceReport({
        profile_id: 'profile-healthcare-123',
        compliance_frameworks: ['HIPAA', 'HITECH'],
        include_safeguards_analysis: true,
        include_risk_assessment: true,
        include_breach_readiness: true
      });

      testUtils.assertSuccessResponse(hipaaReportResult);
      expect(hipaaReportResult.report_id).toBe('hipaa-compliance-report-123');
    });
  });

  describe('Security Incident Response Integration', () => {
    it('should handle security incident response workflow', async () => {
      // Setup organization with incident response profile
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-incident-123');
      mockDb.createProfile!.mockReturnValue('profile-incident-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-incident-123',
        org_id: 'org-incident-123'
      }));

      const profileResult = await createProfile({
        org_name: 'Incident Response Corp',
        profile_name: 'Security Incident Response Assessment'
      });

      testUtils.assertSuccessResponse(profileResult);

      // Conduct incident response capability assessments
      const incidentResponseAssessments = [
        { subcategory_id: 'RS.RP-01', level: 2, capability: 'response_planning' },
        { subcategory_id: 'RS.CO-01', level: 3, capability: 'communications' },
        { subcategory_id: 'RS.AN-01', level: 2, capability: 'analysis' },
        { subcategory_id: 'RS.MI-01', level: 1, capability: 'mitigation' },
        { subcategory_id: 'RS.IM-01', level: 2, capability: 'improvements' }
      ];

      for (const assessment of incidentResponseAssessments) {
        mockDb.createAssessment!.mockReturnValue(`ir-assessment-${assessment.subcategory_id}`);
        
        const assessmentResult = await quickAssessment({
          profile_id: 'profile-incident-123',
          subcategory_id: assessment.subcategory_id,
          implementation_level: assessment.level,
          maturity_score: assessment.level,
          notes: `Incident response ${assessment.capability} assessment`
        });

        testUtils.assertSuccessResponse(assessmentResult);
      }

      // Simulate incident response evidence collection
      const incidentEvidence = [
        { subcategory_id: 'RS.RP-01', file_name: 'incident-response-plan.pdf', type: 'plan' },
        { subcategory_id: 'RS.CO-01', file_name: 'incident-communication-templates.docx', type: 'template' },
        { subcategory_id: 'RS.AN-01', file_name: 'forensic-analysis-tools.json', type: 'configuration' }
      ];

      for (const evidence of incidentEvidence) {
        mockDb.createEvidence!.mockReturnValue(`ir-evidence-${evidence.subcategory_id}`);
        
        const evidenceResult = await uploadEvidence({
          profile_id: 'profile-incident-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          file_hash: `ir-hash-${evidence.subcategory_id}`,
          evidence_type: evidence.type,
          description: `Incident response evidence for ${evidence.subcategory_id}`
        });

        testUtils.assertSuccessResponse(evidenceResult);
      }

      // Calculate incident response readiness score
      mockDb.createRiskAssessment!.mockReturnValue('ir-risk-assessment-123');
      mockDb.getRiskAssessment!.mockReturnValue({
        risk_assessment_id: 'ir-risk-assessment-123',
        profile_id: 'profile-incident-123',
        overall_risk_score: 0.6,
        risk_level: 'Medium',
        incident_readiness_score: 0.4,
        critical_gaps: 2
      });

      const riskResult = await calculateRiskScore({
        profile_id: 'profile-incident-123',
        risk_methodology: 'incident_response',
        include_threat_analysis: true,
        include_readiness_assessment: true
      });

      testUtils.assertSuccessResponse(riskResult);
      expect(riskResult.data?.incident_readiness_score).toBe(0.4);

      // Track incident response audit trail
      const auditResult = await trackAuditTrail({
        profile_id: 'profile-incident-123',
        action: 'incident_response_assessment',
        resource_type: 'security_assessment',
        details: JSON.stringify({
          assessment_type: 'incident_response',
          assessments_completed: 5,
          evidence_collected: 3,
          readiness_score: 0.4,
          critical_gaps: 2
        }),
        performed_by: 'security-team'
      });

      testUtils.assertSuccessResponse(auditResult);
    });
  });

  describe('Assessment Response Validation', () => {
    it('should validate assessment responses for consistency and compliance', async () => {
      // Setup test profile
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createProfile!.mockReturnValue('profile-validation-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-validation-123'
      }));

      const profileResult = await createProfile({
        org_name: 'Validation Test Corp',
        profile_name: 'Response Validation Profile'
      });

      testUtils.assertSuccessResponse(profileResult);

      // Create test assessment responses to validate
      const assessmentResponses = [
        {
          subcategory_id: 'GV.OC-01',
          implementation_level: 4,
          maturity_score: 2, // Inconsistent - should be flagged
          evidence_provided: false
        },
        {
          subcategory_id: 'PR.AC-01',
          implementation_level: 1,
          maturity_score: 1,
          evidence_provided: true // Consistent
        },
        {
          subcategory_id: 'DE.CM-01',
          implementation_level: 3,
          maturity_score: 3,
          evidence_provided: false, // Should require evidence
          risk_rating: 'High'
        }
      ];

      // Mock validation results
      mockDb.createValidationResult!.mockReturnValue('validation-result-123');
      mockDb.getValidationResult!.mockReturnValue({
        validation_id: 'validation-result-123',
        profile_id: 'profile-validation-123',
        total_responses: 3,
        valid_responses: 1,
        invalid_responses: 2,
        warnings: 1,
        validation_errors: [
          {
            subcategory_id: 'GV.OC-01',
            error_type: 'inconsistent_scores',
            message: 'Implementation level and maturity score are inconsistent'
          },
          {
            subcategory_id: 'DE.CM-01',
            error_type: 'missing_evidence',
            message: 'High-risk assessment requires supporting evidence'
          }
        ]
      });

      const validationResult = await validateAssessmentResponses({
        profile_id: 'profile-validation-123',
        assessment_responses: assessmentResponses,
        validation_rules: [
          'consistency_check',
          'evidence_requirements',
          'risk_correlation',
          'compliance_alignment'
        ],
        strict_mode: true
      });

      testUtils.assertSuccessResponse(validationResult);
      expect(validationResult.validation_id).toBe('validation-result-123');
      expect(validationResult.data?.invalid_responses).toBe(2);
      expect(validationResult.data?.validation_errors).toHaveLength(2);

      // Track validation audit trail
      const auditResult = await trackAuditTrail({
        profile_id: 'profile-validation-123',
        action: 'response_validation',
        resource_type: 'assessment_validation',
        resource_id: 'validation-result-123',
        details: JSON.stringify({
          total_responses: 3,
          validation_errors: 2,
          validation_warnings: 1,
          validation_rules_applied: 4
        }),
        performed_by: 'validation-system'
      });

      testUtils.assertSuccessResponse(auditResult);
    });
  });

  describe('Multi-Framework Compliance Integration', () => {
    it('should handle multiple compliance frameworks simultaneously', async () => {
      // Create profile for organization with multiple compliance requirements
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-multi-compliance-123');
      mockDb.createProfile!.mockReturnValue('profile-multi-compliance-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-multi-compliance-123',
        org_id: 'org-multi-compliance-123',
        industry: 'Technology',
        regulatory_requirements: ['SOC2', 'ISO27001', 'GDPR', 'CCPA']
      }));

      const profileResult = await createProfile({
        org_name: 'Multi-Compliance Tech Corp',
        profile_name: 'Multi-Framework Compliance Assessment',
        industry: 'Technology',
        size: 'large',
        regulatory_requirements: ['SOC2', 'ISO27001', 'GDPR', 'CCPA']
      });

      testUtils.assertSuccessResponse(profileResult);

      // Generate compliance reports for each framework
      const complianceFrameworks = ['SOC2', 'ISO27001', 'GDPR', 'CCPA'];
      
      for (let i = 0; i < complianceFrameworks.length; i++) {
        const framework = complianceFrameworks[i];
        
        mockDb.createReport!.mockReturnValueOnce(`${framework.toLowerCase()}-report-123`);
        mockDb.getReport!.mockReturnValue({
          report_id: `${framework.toLowerCase()}-report-123`,
          profile_id: 'profile-multi-compliance-123',
          report_type: 'compliance',
          compliance_framework: framework,
          status: 'completed',
          content: JSON.stringify({
            framework_compliance_score: 85 + i,
            control_coverage: `90%`,
            gaps_identified: 3 - i,
            recommendations: [`Improve ${framework} specific controls`]
          })
        });

        const complianceResult = await generateComplianceReport({
          profile_id: 'profile-multi-compliance-123',
          compliance_frameworks: [framework],
          include_gap_analysis: true,
          include_cross_framework_mapping: true
        });

        testUtils.assertSuccessResponse(complianceResult);
        expect(complianceResult.report_id).toBe(`${framework.toLowerCase()}-report-123`);
      }

      // Generate consolidated multi-framework report
      mockDb.createReport!.mockReturnValue('consolidated-compliance-report-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'consolidated-compliance-report-123',
        profile_id: 'profile-multi-compliance-123',
        report_type: 'compliance',
        compliance_framework: 'multi_framework',
        status: 'completed',
        content: JSON.stringify({
          overall_compliance_score: 87,
          framework_coverage: {
            SOC2: 88,
            ISO27001: 89,
            GDPR: 85,
            CCPA: 86
          },
          common_gaps: ['Data retention policies', 'Incident notification procedures'],
          synergies_identified: 12
        })
      });

      const consolidatedResult = await generateComplianceReport({
        profile_id: 'profile-multi-compliance-123',
        compliance_frameworks: ['SOC2', 'ISO27001', 'GDPR', 'CCPA'],
        include_framework_mapping: true,
        include_synergies_analysis: true,
        report_format: 'consolidated'
      });

      testUtils.assertSuccessResponse(consolidatedResult);
      expect(consolidatedResult.report_id).toBe('consolidated-compliance-report-123');

      // Verify all framework reports were generated
      expect(mockDb.createReport).toHaveBeenCalledTimes(5); // 4 individual + 1 consolidated
    });
  });
});