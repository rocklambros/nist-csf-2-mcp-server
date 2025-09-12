/**
 * Category-Specific Test Helpers for NIST CSF 2.0 MCP Tools
 * 
 * Provides specialized test utilities for each tool category with
 * realistic test data and validation patterns.
 */

import { TestDatabase } from './test-db.js';
import { z } from 'zod';
import crypto from 'crypto';

// ============================================================================
// FRAMEWORK LOOKUP TEST HELPERS
// ============================================================================

export class FrameworkLookupTestHelper {
  static generateFrameworkElements() {
    return {
      functions: [
        { id: 'GV', name: 'GOVERN', description: 'Establish and monitor cybersecurity governance' },
        { id: 'ID', name: 'IDENTIFY', description: 'Develop understanding of cybersecurity risk' },
        { id: 'PR', name: 'PROTECT', description: 'Implement appropriate safeguards' }
      ],
      categories: [
        { id: 'GV.OC', function_id: 'GV', name: 'Organizational Context', description: 'Organization context understood' },
        { id: 'ID.AM', function_id: 'ID', name: 'Asset Management', description: 'Assets managed consistent with priorities' }
      ],
      subcategories: [
        { 
          id: 'GV.OC-01', 
          category_id: 'GV.OC', 
          name: 'Organizational mission', 
          description: 'Organizational mission is understood and informs cybersecurity risk management' 
        },
        { 
          id: 'ID.AM-01', 
          category_id: 'ID.AM', 
          name: 'Physical devices inventoried', 
          description: 'Physical devices and systems within organization are inventoried' 
        }
      ]
    };
  }

  static generateSearchQueries() {
    return [
      { query: 'governance', expectedResults: ['GV.OC-01', 'GV.OC-02'] },
      { query: 'asset management', expectedResults: ['ID.AM-01', 'ID.AM-02'] },
      { query: 'invalid-query-xyz', expectedResults: [] }
    ];
  }

  static validateFrameworkElement(element: any) {
    expect(element).toHaveProperty('element_identifier');
    expect(element).toHaveProperty('element_type');
    expect(element).toHaveProperty('text');
    expect(['function', 'category', 'subcategory']).toContain(element.element_type);
  }
}

// ============================================================================
// PROFILE MANAGEMENT TEST HELPERS
// ============================================================================

export class ProfileManagementTestHelper {
  static generateOrganizationParams() {
    return [
      {
        org_name: 'TechCorp Industries',
        sector: 'Technology',
        size: 'large',
        profile_name: 'Current State Assessment',
        profile_type: 'current',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      },
      {
        org_name: 'Healthcare Partners',
        sector: 'Healthcare',
        size: 'medium',
        profile_name: 'Target State Vision',
        profile_type: 'target',
        current_tier: 'Tier2',
        target_tier: 'Tier4'
      },
      {
        org_name: 'Financial Services LLC',
        sector: 'Financial Services',
        size: 'enterprise',
        profile_name: 'Compliance Profile',
        profile_type: 'baseline'
      }
    ];
  }

  static generateInvalidParams() {
    return [
      { org_name: '', sector: 'Technology', size: 'medium' }, // Empty name
      { org_name: 'Test', sector: 'Invalid Sector', size: 'medium' }, // Invalid sector
      { org_name: 'Test', sector: 'Technology', size: 'invalid-size' }, // Invalid size
      { org_name: 'Test', sector: 'Technology', size: 'medium', profile_type: 'invalid' } // Invalid type
    ];
  }

  static validateProfileCreation(result: any) {
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('profile_id');
    expect(result).toHaveProperty('org_id');
    expect(result.profile_id).toMatch(/^[a-zA-Z0-9-]+$/);
    expect(result.org_id).toMatch(/^org-[a-zA-Z0-9-]+$/);
  }

  static validateProfileComparison(result: any, profileCount: number) {
    expect(result.success).toBe(true);
    expect(result.comparison).toBeDefined();
    expect(result.comparison.profiles).toHaveLength(profileCount);
    expect(result.comparison.differences).toBeDefined();
    expect(result.comparison.similarity_matrix).toBeDefined();
  }
}

// ============================================================================
// ASSESSMENT EXECUTION TEST HELPERS
// ============================================================================

export class AssessmentExecutionTestHelper {
  static generateAssessmentAnswers() {
    return [
      {
        scenario: 'High Maturity Organization',
        answers: {
          govern: 'yes',
          identify: 'yes', 
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        },
        expectedScore: { min: 3.5, max: 4.0 }
      },
      {
        scenario: 'Medium Maturity Organization',
        answers: {
          govern: 'yes',
          identify: 'partial',
          protect: 'yes',
          detect: 'partial',
          respond: 'partial',
          recover: 'no'
        },
        expectedScore: { min: 2.0, max: 3.0 }
      },
      {
        scenario: 'Low Maturity Organization',
        answers: {
          govern: 'partial',
          identify: 'no',
          protect: 'no',
          detect: 'no',
          respond: 'no',
          recover: 'no'
        },
        expectedScore: { min: 0.5, max: 1.5 }
      }
    ];
  }

  static generateAssessmentQuestions() {
    return [
      {
        subcategory_id: 'GV.OC-01',
        dimension: 'risk',
        question: 'How well does the organization understand and document its mission and strategic objectives?',
        question_type: 'maturity_scale',
        response_options: ['not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented']
      },
      {
        subcategory_id: 'GV.OC-01',
        dimension: 'implementation',
        question: 'To what extent has the organization implemented processes to regularly review and update its mission statement?',
        question_type: 'effectiveness_scale',
        response_options: ['ineffective', 'somewhat_effective', 'effective', 'highly_effective']
      }
    ];
  }

  static validateAssessmentResult(result: any) {
    expect(result.success).toBe(true);
    expect(result.initial_maturity_scores).toBeDefined();
    expect(result.initial_maturity_scores.overall_average).toBeGreaterThanOrEqual(0);
    expect(result.initial_maturity_scores.overall_average).toBeLessThanOrEqual(5);
    
    // Validate individual function scores
    const functionScores = ['govern', 'identify', 'protect', 'detect', 'respond', 'recover'];
    functionScores.forEach(func => {
      expect(result.initial_maturity_scores[func]).toBeGreaterThanOrEqual(0);
      expect(result.initial_maturity_scores[func]).toBeLessThanOrEqual(5);
    });
  }

  static validateQuestionBankResponse(result: any) {
    expect(result.success).toBe(true);
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    
    result.questions.forEach((question: any) => {
      expect(question).toHaveProperty('question_id');
      expect(question).toHaveProperty('subcategory_id');
      expect(question).toHaveProperty('question');
      expect(question).toHaveProperty('dimension');
    });
  }
}

// ============================================================================
// RISK ANALYSIS TEST HELPERS
// ============================================================================

export class RiskAnalysisTestHelper {
  static generateRiskScenarios() {
    return [
      {
        name: 'High Risk Profile',
        profile: {
          assessments: [
            { subcategory_id: 'PR.AC-01', maturity_score: 0, implementation_level: 'not_implemented' },
            { subcategory_id: 'DE.CM-01', maturity_score: 1, implementation_level: 'partially_implemented' },
            { subcategory_id: 'RS.CO-01', maturity_score: 0, implementation_level: 'not_implemented' }
          ]
        },
        expectedRiskLevel: 'high',
        expectedScore: { min: 7, max: 10 }
      },
      {
        name: 'Medium Risk Profile',
        profile: {
          assessments: [
            { subcategory_id: 'PR.AC-01', maturity_score: 2, implementation_level: 'largely_implemented' },
            { subcategory_id: 'DE.CM-01', maturity_score: 3, implementation_level: 'fully_implemented' },
            { subcategory_id: 'RS.CO-01', maturity_score: 1, implementation_level: 'partially_implemented' }
          ]
        },
        expectedRiskLevel: 'medium',
        expectedScore: { min: 4, max: 7 }
      },
      {
        name: 'Low Risk Profile',
        profile: {
          assessments: [
            { subcategory_id: 'PR.AC-01', maturity_score: 4, implementation_level: 'fully_implemented' },
            { subcategory_id: 'DE.CM-01', maturity_score: 4, implementation_level: 'fully_implemented' },
            { subcategory_id: 'RS.CO-01', maturity_score: 3, implementation_level: 'largely_implemented' }
          ]
        },
        expectedRiskLevel: 'low',
        expectedScore: { min: 1, max: 4 }
      }
    ];
  }

  static generateGapAnalysisScenarios() {
    return [
      {
        name: 'Significant Gaps',
        currentProfile: { maturityAverage: 1.5 },
        targetProfile: { maturityAverage: 4.0 },
        expectedGapCount: { min: 15, max: 25 },
        expectedPriority: 'high'
      },
      {
        name: 'Moderate Gaps',
        currentProfile: { maturityAverage: 2.8 },
        targetProfile: { maturityAverage: 3.5 },
        expectedGapCount: { min: 8, max: 15 },
        expectedPriority: 'medium'
      },
      {
        name: 'Minimal Gaps',
        currentProfile: { maturityAverage: 3.8 },
        targetProfile: { maturityAverage: 4.0 },
        expectedGapCount: { min: 2, max: 8 },
        expectedPriority: 'low'
      }
    ];
  }

  static validateRiskScore(result: any) {
    expect(result.success).toBe(true);
    expect(result.risk_assessment).toBeDefined();
    expect(result.risk_assessment.overall_risk_score).toBeGreaterThanOrEqual(0);
    expect(result.risk_assessment.overall_risk_score).toBeLessThanOrEqual(10);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.risk_assessment.risk_level);
  }

  static validateGapAnalysis(result: any) {
    expect(result.success).toBe(true);
    expect(result.gap_summary).toBeDefined();
    expect(result.gap_summary.gaps_identified).toBeDefined();
    expect(Array.isArray(result.gap_summary.gaps_identified)).toBe(true);
    expect(result.gap_summary.priority_recommendations).toBeDefined();
  }
}

// ============================================================================
// PLANNING & IMPLEMENTATION TEST HELPERS
// ============================================================================

export class PlanningTestHelper {
  static generatePlanningScenarios() {
    return [
      {
        name: '6 Month Sprint Plan',
        timeline: 6,
        budget: 'low',
        scope: 'critical_gaps_only',
        expectedMilestones: { min: 3, max: 6 },
        expectedCost: { min: 50000, max: 150000 }
      },
      {
        name: '12 Month Comprehensive Plan',
        timeline: 12,
        budget: 'medium',
        scope: 'comprehensive',
        expectedMilestones: { min: 6, max: 12 },
        expectedCost: { min: 150000, max: 500000 }
      },
      {
        name: '24 Month Transformation Plan',
        timeline: 24,
        budget: 'high',
        scope: 'enterprise_transformation',
        expectedMilestones: { min: 12, max: 24 },
        expectedCost: { min: 500000, max: 2000000 }
      }
    ];
  }

  static generateCostEstimationFactors() {
    return {
      organizationSize: {
        small: { multiplier: 0.5, baseHours: 500 },
        medium: { multiplier: 1.0, baseHours: 1000 },
        large: { multiplier: 2.0, baseHours: 2000 },
        enterprise: { multiplier: 4.0, baseHours: 4000 }
      },
      industryComplexity: {
        'Technology': 1.0,
        'Financial Services': 1.5,
        'Healthcare': 1.3,
        'Government': 1.8,
        'Manufacturing': 1.1
      },
      implementationScope: {
        'critical_gaps_only': 0.3,
        'high_priority': 0.5,
        'comprehensive': 1.0,
        'enterprise_transformation': 1.5
      }
    };
  }

  static validateImplementationPlan(result: any) {
    expect(result.success).toBe(true);
    expect(result.implementation_plan).toBeDefined();
    expect(result.implementation_plan.phases).toBeDefined();
    expect(Array.isArray(result.implementation_plan.phases)).toBe(true);
    expect(result.implementation_plan.timeline_months).toBeGreaterThan(0);
    expect(result.implementation_plan.estimated_cost).toBeDefined();
  }

  static validateCostEstimation(result: any) {
    expect(result.success).toBe(true);
    expect(result.cost_estimate).toBeDefined();
    expect(result.cost_estimate.total_cost).toBeGreaterThan(0);
    expect(result.cost_estimate.breakdown).toBeDefined();
    expect(result.cost_estimate.assumptions).toBeDefined();
  }
}

// ============================================================================
// REPORTING TEST HELPERS
// ============================================================================

export class ReportingTestHelper {
  static generateReportingScenarios() {
    return [
      {
        name: 'Executive Summary Report',
        reportType: 'executive',
        audience: 'c_suite',
        format: 'json',
        expectedSections: ['executive_summary', 'key_findings', 'recommendations', 'next_steps']
      },
      {
        name: 'Technical Detail Report',
        reportType: 'detailed',
        audience: 'technical_team',
        format: 'json',
        expectedSections: ['assessment_details', 'gap_analysis', 'implementation_guidance', 'technical_recommendations']
      },
      {
        name: 'Compliance Report',
        reportType: 'compliance',
        audience: 'audit_team',
        format: 'json',
        expectedSections: ['compliance_status', 'evidence_summary', 'audit_findings', 'remediation_plan']
      }
    ];
  }

  static generateDashboardScenarios() {
    return [
      {
        name: 'Executive Dashboard',
        dashboardType: 'executive',
        metrics: ['overall_maturity', 'risk_score', 'compliance_percentage', 'progress_percentage'],
        visualizations: ['maturity_radar', 'risk_heatmap', 'progress_timeline']
      },
      {
        name: 'Technical Dashboard',
        dashboardType: 'technical',
        metrics: ['function_maturity', 'category_scores', 'subcategory_status', 'implementation_progress'],
        visualizations: ['detailed_heatmap', 'gap_analysis_chart', 'implementation_roadmap']
      }
    ];
  }

  static validateReportGeneration(result: any, expectedSections: string[]) {
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report.metadata).toBeDefined();
    expect(result.report.content).toBeDefined();
    
    expectedSections.forEach(section => {
      expect(result.report.content).toHaveProperty(section);
    });
  }

  static validateDashboard(result: any, expectedMetrics: string[]) {
    expect(result.success).toBe(true);
    expect(result.dashboard).toBeDefined();
    expect(result.dashboard.metrics).toBeDefined();
    expect(result.dashboard.visualizations).toBeDefined();
    
    expectedMetrics.forEach(metric => {
      expect(result.dashboard.metrics).toHaveProperty(metric);
    });
  }
}

// ============================================================================
// EVIDENCE MANAGEMENT TEST HELPERS
// ============================================================================

export class EvidenceManagementTestHelper {
  static generateEvidenceScenarios() {
    return [
      {
        name: 'Document Evidence',
        evidenceType: 'document',
        fileExtension: '.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 500, // 500KB
        hash: crypto.createHash('sha256').update('test-document-content').digest('hex')
      },
      {
        name: 'Image Evidence',
        evidenceType: 'image',
        fileExtension: '.png',
        mimeType: 'image/png',
        size: 1024 * 200, // 200KB
        hash: crypto.createHash('sha256').update('test-image-content').digest('hex')
      },
      {
        name: 'Large File (should be rejected)',
        evidenceType: 'document',
        fileExtension: '.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 1024 * 50, // 50MB
        hash: crypto.createHash('sha256').update('large-file-content').digest('hex'),
        shouldReject: true,
        rejectionReason: 'File too large'
      }
    ];
  }

  static generateMaliciousFileScenarios() {
    return [
      {
        name: 'Script File (should be rejected)',
        fileName: '../../../etc/passwd',
        mimeType: 'text/plain',
        shouldReject: true,
        rejectionReason: 'Invalid file path'
      },
      {
        name: 'Executable File (should be rejected)',
        fileName: 'malware.exe',
        mimeType: 'application/octet-stream',
        shouldReject: true,
        rejectionReason: 'Executable files not allowed'
      }
    ];
  }

  static validateEvidenceUpload(result: any) {
    expect(result.success).toBe(true);
    expect(result.evidence).toBeDefined();
    expect(result.evidence.evidence_id).toBeDefined();
    expect(result.evidence.file_path).toBeDefined();
    expect(result.evidence.hash_sha256).toBeDefined();
    expect(result.evidence.file_size).toBeGreaterThan(0);
  }

  static validateEvidenceRejection(result: any, expectedReason: string) {
    expect(result.success).toBe(false);
    expect(result.message).toContain(expectedReason);
  }
}

// ============================================================================
// DATA INTEGRATION TEST HELPERS  
// ============================================================================

export class DataIntegrationTestHelper {
  static generateImportScenarios() {
    return [
      {
        name: 'Valid CSV Import',
        format: 'csv',
        data: [
          { subcategory_id: 'GV.OC-01', implementation_level: 'fully_implemented', maturity_score: 4 },
          { subcategory_id: 'ID.AM-01', implementation_level: 'largely_implemented', maturity_score: 3 }
        ],
        expectedImportCount: 2
      },
      {
        name: 'Valid JSON Import',
        format: 'json',
        data: {
          assessments: [
            { subcategory_id: 'GV.OC-01', implementation_level: 'fully_implemented', maturity_score: 4 },
            { subcategory_id: 'ID.AM-01', implementation_level: 'largely_implemented', maturity_score: 3 }
          ]
        },
        expectedImportCount: 2
      },
      {
        name: 'Invalid Data Format',
        format: 'csv',
        data: [
          { subcategory_id: 'INVALID-ID', implementation_level: 'invalid_level', maturity_score: 10 }
        ],
        shouldReject: true,
        rejectionReason: 'Invalid subcategory or maturity score'
      }
    ];
  }

  static generateTestDataScenarios() {
    return [
      {
        name: 'Small Organization Test Data',
        organizationSize: 'small',
        profileCount: 2,
        assessmentCount: 20,
        evidenceCount: 5
      },
      {
        name: 'Medium Organization Test Data',
        organizationSize: 'medium',
        profileCount: 5,
        assessmentCount: 50,
        evidenceCount: 15
      },
      {
        name: 'Large Organization Test Data',
        organizationSize: 'large',
        profileCount: 10,
        assessmentCount: 100,
        evidenceCount: 30
      }
    ];
  }

  static validateImportResult(result: any, expectedCount: number) {
    expect(result.success).toBe(true);
    expect(result.import_summary).toBeDefined();
    expect(result.import_summary.records_imported).toBe(expectedCount);
    expect(result.import_summary.validation_errors).toHaveLength(0);
  }

  static validateImportRejection(result: any, expectedReason: string) {
    expect(result.success).toBe(false);
    expect(result.message).toContain(expectedReason);
    expect(result.validation_errors).toBeDefined();
  }
}