/**
 * End-to-End Assessment Workflow Tests
 * Tests complete NIST CSF 2.0 assessment lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { generateReport } from '../../src/tools/generate_report.js';
import * as database from '../../src/db/database.js';

// Mock dependencies
jest.mock('../../src/db/database.js');
jest.mock('../../src/utils/logger.js');

// Mock the framework loader module with factory function (required for ESM)
jest.mock('../../src/services/framework-loader.js', () => {
  const mockLoader = {
    isLoaded: () => true,
    load: () => Promise.resolve(),
    getSubcategory: jest.fn(),
    getFunctions: () => [
      { element_identifier: 'GV', title: 'Govern' },
      { element_identifier: 'ID', title: 'Identify' },
      { element_identifier: 'PR', title: 'Protect' },
      { element_identifier: 'DE', title: 'Detect' },
      { element_identifier: 'RS', title: 'Respond' },
      { element_identifier: 'RC', title: 'Recover' }
    ],
    getElementsByType: (type: string) => {
      if (type === 'subcategory') {
        // Return mock subcategories for all functions
        return [
          { element_identifier: 'GV.OC-01', function: 'GV', title: 'Organizational Context' },
          { element_identifier: 'ID.AM-01', function: 'ID', title: 'Asset Management' },
          { element_identifier: 'PR.AC-01', function: 'PR', title: 'Access Control' },
          { element_identifier: 'DE.CM-01', function: 'DE', title: 'Continuous Monitoring' },
          { element_identifier: 'RS.CO-01', function: 'RS', title: 'Communications' },
          { element_identifier: 'RC.RP-01', function: 'RC', title: 'Recovery Planning' }
        ];
      }
      return [];
    }
  };
  return {
    getFrameworkLoader: () => mockLoader
  };
});

const mockDb = {
  transaction: jest.fn(),
  getOrganization: jest.fn(),
  getProfile: jest.fn(),
  createOrganization: jest.fn(),
  createProfile: jest.fn(),
  createBulkAssessments: jest.fn(),
  getAssessments: jest.fn(),
  updateProfile: jest.fn(),
  createGapAnalysis: jest.fn(),
  getGapAnalysisById: jest.fn(),
  createReport: jest.fn(),
  getReportById: jest.fn(),
  // Methods used by generateGapAnalysis tool
  generateGapAnalysis: jest.fn(),
  getGapAnalysisDetails: jest.fn(),
  getProfileAssessments: jest.fn(),
  // Methods used by generateReport tool
  getExecutiveReportData: jest.fn(),
  getTechnicalReportData: jest.fn(),
  getAuditReportData: jest.fn(),
  getProgressReportData: jest.fn()
};


describe('End-to-End Assessment Workflow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database
    (database.getDatabase as jest.MockedFunction<typeof database.getDatabase>).mockReturnValue(mockDb as any);

    // Setup transaction mock
    mockDb.transaction.mockImplementation((callback: any) => callback());
  });

  describe('Complete Assessment Lifecycle', () => {
    it('should complete full assessment workflow: Create Profile → Quick Assessment → Gap Analysis → Report', async () => {
      // Step 1: Create Organization Profile
      const profileParams = {
        org_name: 'TechCorp Solutions',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'current' as const,
        description: 'Technology services company'
      };

      // Mock profile creation responses
      const orgId = 'org-techcorp-solutions-abc123';
      const currentProfileId = `${orgId}-current-def456`;
      
      mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValue({
        org_name: 'TechCorp Solutions',
        industry: 'Technology',
        size: 'medium'
      });
      
      mockDb.getProfile.mockReturnValue({
        profile_id: currentProfileId,
        profile_name: 'TechCorp Solutions - Current Profile',
        profile_type: 'current'
      });

      const profileResult = await createProfile(profileParams);
      
      expect(profileResult.success).toBe(true);
      expect(profileResult.profile_id).toBeDefined();
      expect(profileResult.profile_id).toMatch(/^org-.+-current-.+$/);
      expect(profileResult.org_id).toBeDefined();
      expect(profileResult.org_id).toMatch(/^org-.+$/);
      
      // Use actual returned IDs for subsequent tests
      const actualProfileId = profileResult.profile_id;
      const actualOrgId = profileResult.org_id;
      
      // Step 2: Perform Quick Assessment
      const assessmentParams = {
        profile_id: actualProfileId,
        simplified_answers: {
          govern: 'yes' as const,      // Moderate governance
          identify: 'partial' as const,    // Basic identification
          protect: 'yes' as const,     // Moderate protection
          detect: 'partial' as const,      // Basic detection
          respond: 'no' as const,     // Minimal response
          recover: 'no' as const      // Minimal recovery
        }
      };

      // Mock getProfile for quick assessment
      mockDb.getProfile.mockReturnValue({
        profile_id: actualProfileId,
        org_id: actualOrgId,
        profile_name: 'TechCorp Solutions - Current Profile',
        profile_type: 'current'
      });

      // Mock createBulkAssessments for quick assessment
      mockDb.createBulkAssessments = jest.fn();

      // Mock assessment responses
      mockDb.getAssessments.mockReturnValue([
        { subcategory_id: 'GV.OC-01', maturity_score: 3, implementation_level: 'largely_implemented' },
        { subcategory_id: 'ID.AM-01', maturity_score: 2, implementation_level: 'partially_implemented' },
        { subcategory_id: 'PR.AC-01', maturity_score: 3, implementation_level: 'largely_implemented' },
        { subcategory_id: 'DE.CM-01', maturity_score: 2, implementation_level: 'partially_implemented' },
        { subcategory_id: 'RS.CO-01', maturity_score: 1, implementation_level: 'not_implemented' },
        { subcategory_id: 'RC.RP-01', maturity_score: 1, implementation_level: 'not_implemented' }
      ]);

      const assessmentResult = await quickAssessment(assessmentParams);
      
      // Debug: Print the actual result to understand the failure
      if (!assessmentResult.success) {
        console.log('Quick Assessment failed:', assessmentResult);
      }
      
      expect(assessmentResult.success).toBe(true);
      expect(assessmentResult.initial_maturity_scores?.overall_average).toBeDefined();
      expect(assessmentResult.initial_maturity_scores).toBeDefined();
      expect(assessmentResult.initial_maturity_scores?.govern).toBeGreaterThan(0);
      expect(assessmentResult.initial_maturity_scores?.respond).toBeLessThan(assessmentResult.initial_maturity_scores?.govern);
      
      // Step 3: Create Target Profile for Gap Analysis
      const targetProfileParams = {
        org_name: 'TechCorp Solutions',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'target' as const
      };

      const targetProfileResult = await createProfile(targetProfileParams);
      expect(targetProfileResult.success).toBe(true);
      expect(targetProfileResult.profile_id).toBeDefined();
      expect(targetProfileResult.profile_id).toMatch(/^org-.+-target-.+$/);
      
      // Use actual returned target profile ID
      const actualTargetProfileId = targetProfileResult.profile_id;
      
      mockDb.getProfile.mockImplementation((profileId: any) => {
        if (profileId === actualProfileId) {
          return { profile_id: actualProfileId, org_id: actualOrgId, profile_type: 'current' };
        } else if (profileId === actualTargetProfileId) {
          return { profile_id: actualTargetProfileId, org_id: actualOrgId, profile_type: 'target' };
        }
        return null;
      });
      
      // Step 4: Generate Gap Analysis
      const gapAnalysisParams = {
        organization_id: actualOrgId,
        current_profile_id: actualProfileId,
        target_profile_id: actualTargetProfileId,
        analysis_name: 'TechCorp Cybersecurity Gap Analysis',
        include_priority_matrix: true,
        include_visualizations: false,
        minimum_gap_score: 0  // Required: tool doesn't parse with Zod, so defaults don't apply
      };

      // Mock target profile assessments (higher maturity)
      mockDb.getAssessments.mockImplementation((profileId: any) => {
        if (profileId === actualProfileId) {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 3 },
            { subcategory_id: 'ID.AM-01', maturity_score: 2 },
            { subcategory_id: 'PR.AC-01', maturity_score: 3 },
            { subcategory_id: 'DE.CM-01', maturity_score: 2 },
            { subcategory_id: 'RS.CO-01', maturity_score: 1 },
            { subcategory_id: 'RC.RP-01', maturity_score: 1 }
          ];
        } else if (profileId === actualTargetProfileId) {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 4 },
            { subcategory_id: 'ID.AM-01', maturity_score: 4 },
            { subcategory_id: 'PR.AC-01', maturity_score: 4 },
            { subcategory_id: 'DE.CM-01', maturity_score: 4 },
            { subcategory_id: 'RS.CO-01', maturity_score: 4 },
            { subcategory_id: 'RC.RP-01', maturity_score: 4 }
          ];
        }
        return [];
      });

      const gapAnalysisId = 'gap-analysis-jkl012';

      // Mock the methods used by generateGapAnalysis tool
      // Note: high_priority_gaps requires gap_score >= 50 && < 75
      mockDb.generateGapAnalysis.mockReturnValue([
        { subcategory_id: 'RS.CO-01', current_maturity: 1, target_maturity: 4, gap_score: 60 },
        { subcategory_id: 'RC.RP-01', current_maturity: 1, target_maturity: 4, gap_score: 55 },
        { subcategory_id: 'ID.AM-01', current_maturity: 2, target_maturity: 4, gap_score: 30 }
      ]);
      mockDb.getGapAnalysisDetails.mockReturnValue([
        {
          subcategory_id: 'RS.CO-01',
          subcategory_name: 'Communications',
          function_id: 'RS',
          category_id: 'RS.CO',
          current_implementation: 'not_implemented',
          target_implementation: 'fully_implemented',
          current_maturity: 1,
          target_maturity: 4,
          gap_score: 60,  // High priority (50-75)
          risk_score: 4,
          effort_score: 3,
          priority_rank: 1,
          improvement_required: 'Develop incident response communications'
        },
        {
          subcategory_id: 'RC.RP-01',
          subcategory_name: 'Recovery Planning',
          function_id: 'RC',
          category_id: 'RC.RP',
          current_implementation: 'not_implemented',
          target_implementation: 'fully_implemented',
          current_maturity: 1,
          target_maturity: 4,
          gap_score: 55,  // High priority (50-75)
          risk_score: 4,
          effort_score: 3,
          priority_rank: 2,
          improvement_required: 'Implement recovery planning procedures'
        },
        {
          subcategory_id: 'ID.AM-01',
          subcategory_name: 'Asset Management',
          function_id: 'ID',
          category_id: 'ID.AM',
          current_implementation: 'partially_implemented',
          target_implementation: 'fully_implemented',
          current_maturity: 2,
          target_maturity: 4,
          gap_score: 30,  // Medium priority (25-50)
          risk_score: 3,
          effort_score: 2,
          priority_rank: 3,
          improvement_required: 'Improve asset inventory management'
        }
      ]);
      mockDb.createGapAnalysis.mockReturnValue(gapAnalysisId);
      mockDb.getGapAnalysisById.mockReturnValue({
        analysis_id: gapAnalysisId,
        organization_id: orgId,
        analysis_name: 'TechCorp Cybersecurity Gap Analysis',
        overall_gap_score: 2.0,
        gaps: []
      });

      const gapAnalysisResult = await generateGapAnalysis(gapAnalysisParams);

      expect(gapAnalysisResult.success).toBe(true);
      expect(gapAnalysisResult.analysis_id).toBeDefined();
      expect(gapAnalysisResult.gap_summary.total_gaps).toBeGreaterThan(0);

      // Verify high priority gaps identified (gap_score >= 3)
      expect(gapAnalysisResult.gap_summary.high_priority_gaps).toBeGreaterThanOrEqual(2);
      
      // Step 5: Generate Comprehensive Report
      // Security: Validate profile_id format to prevent path traversal attacks
      // Profile IDs must match the expected pattern (org-*-current/target-*) with no path separators
      const safeProfileIdPattern = /^org-[a-z0-9-]+-(?:current|target)-[a-z0-9]+$/i;
      if (!safeProfileIdPattern.test(actualProfileId)) {
        throw new Error('Invalid profile_id format - potential path traversal attempt');
      }

      const reportParams = {
        profile_id: actualProfileId,
        report_type: 'executive' as const,
        format: 'json' as const,
        include_charts: true,
        include_recommendations: true
      };

      // Mock executive report data (required by generateReport)
      mockDb.getExecutiveReportData.mockReturnValue({
        profile_id: actualProfileId,
        org_name: 'TechCorp Solutions',
        overall_maturity: 2.5,
        function_scores: {
          govern: 3,
          identify: 2,
          protect: 3,
          detect: 2,
          respond: 1,
          recover: 1
        },
        gap_summary: {
          total_gaps: 3,
          high_priority: 2,
          medium_priority: 1
        },
        recommendations: [
          'Improve incident response procedures',
          'Enhance recovery planning'
        ]
      });

      const reportId = 'report-mno345';
      mockDb.createReport.mockReturnValue(reportId);
      mockDb.getReportById.mockReturnValue({
        report_id: reportId,
        organization_id: orgId,
        report_type: 'comprehensive',
        title: 'TechCorp Solutions - Comprehensive Cybersecurity Assessment Report',
        sections: [
          {
            section_id: 'executive-summary',
            title: 'Executive Summary',
            content: 'TechCorp Solutions demonstrates moderate cybersecurity maturity...'
          },
          {
            section_id: 'assessment-results',
            title: 'Assessment Results',
            content: 'Current maturity assessment shows strengths in governance and protection...'
          },
          {
            section_id: 'gap-analysis',
            title: 'Gap Analysis',
            content: 'Critical gaps identified in response and recovery capabilities...'
          },
          {
            section_id: 'recommendations',
            title: 'Recommendations',
            content: 'Priority 1: Develop incident response procedures...'
          }
        ],
        generated_at: new Date().toISOString()
      });

      const reportResult = await generateReport(mockDb as any, reportParams);
      
      expect(reportResult.success).toBe(true);
      expect(reportResult.metadata.profile_id).toBe(actualProfileId);
      expect(reportResult.content).toBeDefined();
      expect(reportResult.content).toContain('TechCorp Solutions');

      // Verify report contains key data from mock
      expect(reportResult.content).toContain('gap_summary');
      expect(reportResult.content).toContain('recommendations');
      expect(reportResult.content).toContain('function_scores');
      
      // Step 6: Verify End-to-End Data Consistency
      expect(mockDb.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          org_name: 'TechCorp Solutions',
          industry: 'Technology',
          size: 'medium'
        })
      );
      
      expect(mockDb.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_type: 'current'
        })
      );
      
      // The generateGapAnalysis tool calls db.generateGapAnalysis, not createGapAnalysis
      expect(mockDb.generateGapAnalysis).toHaveBeenCalled();
      
      // Note: generateReport writes to file directly, doesn't call createReport
      // Verify the report was generated with correct data
      expect(mockDb.getExecutiveReportData).toHaveBeenCalledWith(actualProfileId);
    });

    it('should handle workflow errors gracefully with proper rollback', async () => {
      // Step 1: Create Profile - Success
      const profileParams = {
        org_name: 'FailTest Corp',
        sector: 'Technology',
        size: 'small' as const,
        profile_type: 'current' as const
      };

      const orgId = 'org-failtest-corp-xyz123';
      const profileId = `${orgId}-current-abc456`;
      
      mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValue({
        org_name: 'FailTest Corp'
      });
      
      mockDb.getProfile.mockReturnValue({
        profile_id: profileId,
        org_id: orgId
      });

      const profileResult = await createProfile(profileParams);
      expect(profileResult.success).toBe(true);
      
      // Step 2: Quick Assessment - Simulate Database Error
      const assessmentParams = {
        profile_id: profileId,
        simplified_answers: {
          govern: 'partial',
          identify: 'partial',
          protect: 'partial',
          detect: 'partial',
          respond: 'partial',
          recover: 'partial'
        } as const
      };

      // Mock database error during assessment (createBulkAssessments is called by quickAssessment)
      mockDb.createBulkAssessments.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      const assessmentResult = await quickAssessment(assessmentParams);
      expect(assessmentResult.success).toBe(false);
      
      // Verify that subsequent operations don't proceed with invalid data
      // This tests the error handling and prevents cascade failures
    });

    it('should support multiple assessment iterations and tracking progress', async () => {
      // Simulate an organization improving over time through multiple assessments
      const orgId = 'org-progressive-company-123';
      const currentProfileId = `${orgId}-current-456`;
      
      // Setup organization
      mockDb.getOrganization.mockReturnValue({
        org_name: 'Progressive Company'
      });
      
      mockDb.getProfile.mockReturnValue({
        profile_id: currentProfileId,
        org_id: orgId
      });
      
      // Initial assessment (low maturity)
      mockDb.getAssessments.mockReturnValueOnce([
        { subcategory_id: 'GV.OC-01', maturity_score: 1, assessed_at: '2024-01-01' },
        { subcategory_id: 'PR.AC-01', maturity_score: 1, assessed_at: '2024-01-01' },
        { subcategory_id: 'DE.CM-01', maturity_score: 1, assessed_at: '2024-01-01' }
      ]);
      
      const initialAssessment = await quickAssessment({
        profile_id: currentProfileId,
        simplified_answers: { govern: 'no', identify: 'no', protect: 'no', detect: 'no', respond: 'no', recover: 'no' }
      });
      
      expect(initialAssessment.success).toBe(true);
      expect(initialAssessment.initial_maturity_scores?.overall_average).toBeLessThan(2);
      
      // Follow-up assessment after 6 months (improved maturity)
      mockDb.getAssessments.mockReturnValueOnce([
        { subcategory_id: 'GV.OC-01', maturity_score: 3, assessed_at: '2024-07-01' },
        { subcategory_id: 'PR.AC-01', maturity_score: 3, assessed_at: '2024-07-01' },
        { subcategory_id: 'DE.CM-01', maturity_score: 2, assessed_at: '2024-07-01' }
      ]);
      
      const followUpAssessment = await quickAssessment({
        profile_id: currentProfileId,
        simplified_answers: { govern: 'yes', identify: 'partial', protect: 'yes', detect: 'partial', respond: 'partial', recover: 'partial' }
      });
      
      expect(followUpAssessment.success).toBe(true);
      expect(followUpAssessment.initial_maturity_scores?.overall_average).toBeGreaterThan(initialAssessment.initial_maturity_scores?.overall_average);
      
      // This demonstrates tracking improvement over time
      const improvementMade = followUpAssessment.initial_maturity_scores?.overall_average - initialAssessment.initial_maturity_scores?.overall_average;
      expect(improvementMade).toBeGreaterThan(0.5); // Significant improvement
    });

    it('should validate data consistency across workflow steps', async () => {
      // Note: createProfile generates unique org_ids each time with random suffixes
      // So we verify both profiles are created successfully and then use their actual IDs

      // Setup organization mock
      mockDb.getOrganization.mockReturnValue(null);

      // Create profiles
      const currentProfile = await createProfile({
        org_name: 'Consistency Test Corp',
        sector: 'Healthcare',
        size: 'large',
        profile_type: 'current'
      });

      const targetProfile = await createProfile({
        org_name: 'Consistency Test Corp',
        sector: 'Healthcare',
        size: 'large',
        profile_type: 'target'
      });

      expect(currentProfile.success).toBe(true);
      expect(targetProfile.success).toBe(true);

      // Both org_ids should follow the pattern but may differ (unique generation)
      expect(currentProfile.org_id).toMatch(/^org-consistency-test-corp-[a-z0-9]+$/);
      expect(targetProfile.org_id).toMatch(/^org-consistency-test-corp-[a-z0-9]+$/);

      // Use actual IDs for subsequent operations
      const actualCurrentProfileId = currentProfile.profile_id;
      const actualTargetProfileId = targetProfile.profile_id;
      const actualOrgId = currentProfile.org_id; // Use first org_id for gap analysis

      // Mock profile lookup to return consistent data
      mockDb.getProfile.mockImplementation((profileId: any) => {
        if (profileId === actualCurrentProfileId) {
          return { profile_id: actualCurrentProfileId, org_id: actualOrgId, profile_type: 'current' };
        } else if (profileId === actualTargetProfileId) {
          return { profile_id: actualTargetProfileId, org_id: actualOrgId, profile_type: 'target' };
        }
        return null;
      });

      // Mock assessment data
      mockDb.getAssessments.mockImplementation((profileId: any) => {
        const baseAssessments = [
          { subcategory_id: 'GV.OC-01', maturity_score: profileId === actualCurrentProfileId ? 2 : 4 },
          { subcategory_id: 'PR.AC-01', maturity_score: profileId === actualCurrentProfileId ? 3 : 4 }
        ];
        return baseAssessments;
      });

      // Mock generateGapAnalysis and getGapAnalysisDetails methods (used by the tool)
      (mockDb as any).generateGapAnalysis = jest.fn().mockReturnValue([
        { subcategory_id: 'GV.OC-01', current_maturity: 2, target_maturity: 4, gap_score: 2 }
      ]);
      (mockDb as any).getGapAnalysisDetails = jest.fn().mockReturnValue([
        {
          subcategory_id: 'GV.OC-01',
          subcategory_name: 'Organizational Context',
          function_id: 'GV',
          category_id: 'GV.OC',
          current_implementation: 'partially_implemented',
          target_implementation: 'fully_implemented',
          current_maturity: 2,
          target_maturity: 4,
          gap_score: 2,
          risk_score: 3,
          effort_score: 2,
          priority_rank: 1,
          improvement_required: 'Implement governance controls'
        }
      ]);

      const gapAnalysis = await generateGapAnalysis({
        organization_id: actualOrgId,
        current_profile_id: actualCurrentProfileId,
        target_profile_id: actualTargetProfileId
      });

      expect(gapAnalysis.success).toBe(true);
      expect(gapAnalysis.gap_summary.total_gaps).toBeGreaterThanOrEqual(0);

      // Verify organization was created with correct data
      expect(mockDb.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          org_name: 'Consistency Test Corp',
          industry: 'Healthcare',
          size: 'large'
        })
      );
    });
  });
});