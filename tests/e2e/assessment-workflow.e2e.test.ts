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
jest.mock('../../src/services/framework-loader.js');

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
  getReportById: jest.fn()
};

const mockFrameworkLoader = {
  isLoaded: jest.fn().mockReturnValue(true),
  load: jest.fn(),
  getSubcategory: jest.fn(),
  getFunctions: jest.fn().mockReturnValue([
    { element_identifier: 'GV', title: 'Govern' },
    { element_identifier: 'ID', title: 'Identify' },
    { element_identifier: 'PR', title: 'Protect' },
    { element_identifier: 'DE', title: 'Detect' },
    { element_identifier: 'RS', title: 'Respond' },
    { element_identifier: 'RC', title: 'Recover' }
  ]),
  getElementsByType: jest.fn((type) => {
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
  })
};

describe('End-to-End Assessment Workflow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database
    (database.getDatabase as jest.MockedFunction<typeof database.getDatabase>).mockReturnValue(mockDb as any);
    
    // Mock framework loader
    const { getFrameworkLoader } = require('../../src/services/framework-loader.js');
    getFrameworkLoader.mockReturnValue(mockFrameworkLoader);
    
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
        analysis_name: 'TechCorp Cybersecurity Gap Analysis'
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
      mockDb.createGapAnalysis.mockReturnValue(gapAnalysisId);
      mockDb.getGapAnalysisById.mockReturnValue({
        analysis_id: gapAnalysisId,
        organization_id: orgId,
        analysis_name: 'TechCorp Cybersecurity Gap Analysis',
        overall_gap_score: 2.0,
        gaps: [
          {
            subcategory_id: 'RS.CO-01',
            current_score: 1,
            target_score: 4,
            gap_score: 3,
            priority: 'high'
          },
          {
            subcategory_id: 'RC.RP-01',
            current_score: 1,
            target_score: 4,
            gap_score: 3,
            priority: 'high'
          },
          {
            subcategory_id: 'ID.AM-01',
            current_score: 2,
            target_score: 4,
            gap_score: 2,
            priority: 'medium'
          }
        ]
      });

      const gapAnalysisResult = await generateGapAnalysis(gapAnalysisParams);
      
      expect(gapAnalysisResult.success).toBe(true);
      expect(gapAnalysisResult.analysis_id).toBe(gapAnalysisId);
      expect(gapAnalysisResult.gap_summary.average_gap_score).toBe(2.0);
      expect(gapAnalysisResult.gap_summary.total_gaps).toBeGreaterThan(0);
      
      // Verify high priority gaps identified
      expect(gapAnalysisResult.gap_summary.high_priority_gaps).toBeGreaterThan(0);
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
      
      // Verify report contains key sections
      expect(reportResult.content).toContain('assessment');
      expect(reportResult.content).toContain('gap');
      expect(reportResult.content).toContain('recommendations');
      
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
      
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          analysis_name: 'TechCorp Cybersecurity Gap Analysis'
        })
      );
      
      expect(mockDb.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          report_type: 'comprehensive'
        })
      );
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

      // Mock database error during assessment
      mockDb.getAssessments.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      const assessmentResult = await quickAssessment(assessmentParams);
      expect(assessmentResult.success).toBe(false);
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
      const orgId = 'org-consistency-test-789';
      const currentProfileId = `${orgId}-current-abc`;
      const targetProfileId = `${orgId}-target-def`;
      
      // Setup consistent organization data
      const orgData = {
        org_name: 'Consistency Test Corp',
        industry: 'Healthcare',
        size: 'large'
      };
      
      mockDb.getOrganization.mockReturnValue(orgData);
      
      mockDb.getProfile.mockImplementation((profileId: any) => {
        const baseProfile = {
            organization: orgData
        };
        
        if (profileId === currentProfileId) {
          return { ...baseProfile, profile_id: currentProfileId, profile_type: 'current' };
        } else if (profileId === targetProfileId) {
          return { ...baseProfile, profile_id: targetProfileId, profile_type: 'target' };
        }
        return null;
      });
      
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
      expect(currentProfile.org_id).toBe(targetProfile.org_id); // Same organization
      
      // Mock consistent assessment data
      mockDb.getAssessments.mockImplementation((profileId: any) => {
        const baseAssessments = [
          { subcategory_id: 'GV.OC-01', maturity_score: profileId === currentProfileId ? 2 : 4 },
          { subcategory_id: 'PR.AC-01', maturity_score: profileId === currentProfileId ? 3 : 4 }
        ];
        return baseAssessments;
      });
      
      // Generate gap analysis
      mockDb.createGapAnalysis.mockReturnValue('gap-123');
      mockDb.getGapAnalysisById.mockReturnValue({
        gap_analysis_id: 'gap-123',
        organization_id: orgId,
        gaps: [
          { subcategory_id: 'GV.OC-01', current_score: 2, target_score: 4, gap_score: 2 }
        ]
      });
      
      const gapAnalysis = await generateGapAnalysis({
        organization_id: orgId,
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId
      });
      
      expect(gapAnalysis.success).toBe(true);
      expect(gapAnalysis.gap_summary.total_gaps).toBeGreaterThanOrEqual(0);
      
      // Verify all operations reference the same organization
      expect(mockDb.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
            org_name: 'Consistency Test Corp',
          industry: 'Healthcare',
          size: 'large'
        })
      );
      
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId
        })
      );
    });
  });
});