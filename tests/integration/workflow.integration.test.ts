/**
 * Comprehensive Workflow Integration Tests
 * Tests real-world scenarios with multiple tool interactions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Import MCP tools for integration testing
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { assessMaturity } from '../../src/tools/assess_maturity.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { createImplementationPlan } from '../../src/tools/create_implementation_plan.js';
import { generateReport } from '../../src/tools/generate_report.js';
import { trackProgress } from '../../src/tools/track_progress.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { trackAuditTrail } from '../../src/tools/track_audit_trail.js';

// Mock the database
jest.mock('../../src/db/database.js');
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Comprehensive Workflow Integration Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('Complete Assessment Workflow', () => {
    it('should execute full assessment lifecycle successfully', async () => {
      // Step 1: Create organization and profile
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-integration-123');
      mockDb.createProfile!.mockReturnValue('profile-integration-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-integration-123',
        org_id: 'org-integration-123'
      }));

      const profileResult = await createProfile({
        org_name: 'Integration Test Corporation',
        profile_name: 'Current State Assessment',
        industry: 'Financial Services',
        size: 'large',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      });

      testUtils.assertSuccessResponse(profileResult);
      expect(profileResult.profile_id).toBe('profile-integration-123');

      // Step 2: Perform quick assessments across multiple functions
      const assessmentScenarios = [
        { subcategory_id: 'GV.OC-01', implementation_level: 2, maturity_score: 2, function: 'Govern' },
        { subcategory_id: 'ID.AM-01', implementation_level: 1, maturity_score: 1, function: 'Identify' },
        { subcategory_id: 'PR.AC-01', implementation_level: 3, maturity_score: 3, function: 'Protect' },
        { subcategory_id: 'DE.CM-01', implementation_level: 2, maturity_score: 2, function: 'Detect' },
        { subcategory_id: 'RS.RP-01', implementation_level: 1, maturity_score: 1, function: 'Respond' },
        { subcategory_id: 'RC.RP-01', implementation_level: 1, maturity_score: 1, function: 'Recover' }
      ];

      for (const scenario of assessmentScenarios) {
        mockDb.createAssessment!.mockReturnValue(`assessment-${scenario.subcategory_id}`);
        mockDb.getAssessment!.mockReturnValue(testUtils.createMockAssessment({
          assessment_id: `assessment-${scenario.subcategory_id}`,
          profile_id: 'profile-integration-123',
          subcategory_id: scenario.subcategory_id,
          implementation_level: scenario.implementation_level,
          maturity_score: scenario.maturity_score
        }));

        const assessmentResult = await quickAssessment({
          profile_id: 'profile-integration-123',
          subcategory_id: scenario.subcategory_id,
          implementation_level: scenario.implementation_level,
          maturity_score: scenario.maturity_score,
          notes: `Assessment for ${scenario.function} function`
        });

        testUtils.assertSuccessResponse(assessmentResult);
        expect(assessmentResult.assessment_id).toBe(`assessment-${scenario.subcategory_id}`);
      }

      // Step 3: Upload evidence for key assessments
      const evidenceItems = [
        { subcategory_id: 'GV.OC-01', file_name: 'governance-policy.pdf', evidence_type: 'policy' },
        { subcategory_id: 'PR.AC-01', file_name: 'access-control-config.json', evidence_type: 'configuration' }
      ];

      for (const evidence of evidenceItems) {
        mockDb.createEvidence!.mockReturnValue(`evidence-${evidence.subcategory_id}`);
        mockDb.getEvidence!.mockReturnValue(testUtils.createMockEvidence({
          evidence_id: `evidence-${evidence.subcategory_id}`,
          profile_id: 'profile-integration-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          evidence_type: evidence.evidence_type
        }));

        const evidenceResult = await uploadEvidence({
          profile_id: 'profile-integration-123',
          subcategory_id: evidence.subcategory_id,
          file_name: evidence.file_name,
          file_hash: `hash-${evidence.subcategory_id}`,
          evidence_type: evidence.evidence_type,
          description: `Evidence for ${evidence.subcategory_id}`
        });

        testUtils.assertSuccessResponse(evidenceResult);
        expect(evidenceResult.evidence_id).toBe(`evidence-${evidence.subcategory_id}`);
      }

      // Step 4: Generate comprehensive maturity assessment
      mockDb.getAssessments!.mockReturnValue(assessmentScenarios.map(s => 
        testUtils.createMockAssessment({
          subcategory_id: s.subcategory_id,
          implementation_level: s.implementation_level,
          maturity_score: s.maturity_score
        })
      ));

      const maturityResult = await assessMaturity({
        profile_id: 'profile-integration-123',
        assessment_scope: 'full',
        include_recommendations: true
      });

      testUtils.assertSuccessResponse(maturityResult);
      expect(maturityResult.data?.overall_maturity_score).toBeGreaterThan(0);
      expect(maturityResult.data?.function_scores).toBeDefined();

      // Step 5: Create target profile and generate gap analysis
      mockDb.createProfile!.mockReturnValueOnce('profile-target-123');
      mockDb.getProfile!.mockImplementation((profileId: string) => {
        if (profileId === 'profile-target-123') {
          return testUtils.createMockProfile({
            profile_id: 'profile-target-123',
            org_id: 'org-integration-123',
            profile_type: 'target'
          });
        }
        return testUtils.createMockProfile({
          profile_id: 'profile-integration-123',
          org_id: 'org-integration-123'
        });
      });

      // Mock gap analysis creation
      mockDb.createGapAnalysis!.mockReturnValue('gap-analysis-123');
      mockDb.getGapAnalysis!.mockReturnValue({
        id: 'gap-analysis-123',
        current_profile_id: 'profile-integration-123',
        target_profile_id: 'profile-target-123',
        overall_gap_score: 2.5,
        total_gaps: 6,
        priority_items: 4,
        status: 'completed'
      });

      const gapResult = await generateGapAnalysis({
        current_profile_id: 'profile-integration-123',
        target_profile_id: 'profile-target-123',
        analysis_name: 'Integration Test Gap Analysis',
        include_priority_matrix: true,
        include_visualizations: true
      });

      testUtils.assertSuccessResponse(gapResult);
      expect(gapResult.analysis_id).toBe('gap-analysis-123');
      expect(gapResult.data?.analysis.overall_gap_score).toBe(2.5);

      // Step 6: Create implementation plan based on gap analysis
      mockDb.createImplementationPlan!.mockReturnValue('implementation-plan-123');
      mockDb.getImplementationPlan!.mockReturnValue({
        plan_id: 'implementation-plan-123',
        profile_id: 'profile-integration-123',
        plan_name: 'Integration Test Implementation Plan',
        total_phases: 3,
        estimated_duration_months: 12,
        status: 'draft'
      });

      const planResult = await createImplementationPlan({
        profile_id: 'profile-integration-123',
        plan_name: 'Integration Test Implementation Plan',
        timeline_months: 12,
        include_milestones: true,
        include_cost_estimates: true
      });

      testUtils.assertSuccessResponse(planResult);
      expect(planResult.plan_id).toBe('implementation-plan-123');

      // Step 7: Generate comprehensive report
      mockDb.createReport!.mockReturnValue('report-integration-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'report-integration-123',
        profile_id: 'profile-integration-123',
        report_type: 'comprehensive',
        status: 'completed',
        content: JSON.stringify({
          executive_summary: 'Test summary',
          assessment_results: 'Test results',
          gap_analysis: 'Test gaps',
          recommendations: 'Test recommendations'
        })
      });

      const reportResult = await generateReport({
        profile_id: 'profile-integration-123',
        report_type: 'comprehensive',
        include_executive_summary: true,
        include_gap_analysis: true,
        include_recommendations: true,
        include_implementation_roadmap: true
      });

      testUtils.assertSuccessResponse(reportResult);
      expect(reportResult.report_id).toBe('report-integration-123');

      // Step 8: Track audit trail for the entire workflow
      const auditResult = await trackAuditTrail({
        profile_id: 'profile-integration-123',
        action: 'workflow_completed',
        resource_type: 'assessment_lifecycle',
        resource_id: 'profile-integration-123',
        details: JSON.stringify({
          assessments_created: 6,
          evidence_uploaded: 2,
          gap_analysis_generated: true,
          implementation_plan_created: true,
          report_generated: true
        }),
        performed_by: 'integration-test-user'
      });

      testUtils.assertSuccessResponse(auditResult);
      expect(auditResult.audit_id).toBeDefined();

      // Verify all database operations were called
      expect(mockDb.createOrganization).toHaveBeenCalledTimes(1);
      expect(mockDb.createProfile).toHaveBeenCalledTimes(1);
      expect(mockDb.createAssessment).toHaveBeenCalledTimes(6);
      expect(mockDb.createEvidence).toHaveBeenCalledTimes(2);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledTimes(1);
      expect(mockDb.createImplementationPlan).toHaveBeenCalledTimes(1);
      expect(mockDb.createReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multi-Organization Comparative Analysis', () => {
    it('should handle comparative analysis across multiple organizations', async () => {
      // Create multiple organizations and profiles for comparison
      const organizations = [
        { id: 'org-finance-123', name: 'Financial Corp', industry: 'Financial Services' },
        { id: 'org-healthcare-123', name: 'Healthcare Inc', industry: 'Healthcare' },
        { id: 'org-tech-123', name: 'Tech Solutions', industry: 'Technology' }
      ];

      const profiles = [];
      for (let i = 0; i < organizations.length; i++) {
        const org = organizations[i];
        const profileId = `profile-${org.id}`;
        
        mockDb.createOrganization!.mockReturnValueOnce(org.id);
        mockDb.createProfile!.mockReturnValueOnce(profileId);
        mockDb.getProfile!.mockImplementation((id: string) => {
          if (id === profileId) {
            return testUtils.createMockProfile({
              profile_id: profileId,
              org_id: org.id,
              industry: org.industry
            });
          }
          return null;
        });

        const profileResult = await createProfile({
          org_name: org.name,
          profile_name: `${org.name} Assessment`,
          industry: org.industry,
          size: 'large'
        });

        testUtils.assertSuccessResponse(profileResult);
        profiles.push(profileId);

        // Add varied assessment levels for comparison
        const assessmentLevel = i + 2; // Different maturity levels
        mockDb.createAssessment!.mockReturnValue(`assessment-${profileId}-GV.OC-01`);
        
        const assessmentResult = await quickAssessment({
          profile_id: profileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: assessmentLevel,
          maturity_score: assessmentLevel
        });

        testUtils.assertSuccessResponse(assessmentResult);
      }

      // Generate comparative gap analyses
      for (let i = 0; i < profiles.length - 1; i++) {
        const currentProfileId = profiles[i];
        const targetProfileId = profiles[i + 1];
        
        mockDb.createGapAnalysis!.mockReturnValue(`gap-analysis-${i}`);
        mockDb.getGapAnalysis!.mockReturnValue({
          id: `gap-analysis-${i}`,
          current_profile_id: currentProfileId,
          target_profile_id: targetProfileId,
          overall_gap_score: 1.0,
          total_gaps: 1,
          status: 'completed'
        });

        const gapResult = await generateGapAnalysis({
          current_profile_id: currentProfileId,
          target_profile_id: targetProfileId,
          analysis_name: `Comparative Analysis ${i}`
        });

        testUtils.assertSuccessResponse(gapResult);
        expect(gapResult.analysis_id).toBe(`gap-analysis-${i}`);
      }

      // Verify multi-organization setup completed
      expect(mockDb.createOrganization).toHaveBeenCalledTimes(3);
      expect(mockDb.createProfile).toHaveBeenCalledTimes(3);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledTimes(2);
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track progress through complete implementation lifecycle', async () => {
      // Setup base profile
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-progress-123');
      mockDb.createProfile!.mockReturnValue('profile-progress-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-progress-123'
      }));

      const profileResult = await createProfile({
        org_name: 'Progress Tracking Corp',
        profile_name: 'Implementation Progress Profile',
        industry: 'Manufacturing'
      });

      testUtils.assertSuccessResponse(profileResult);

      // Create initial assessment
      mockDb.createAssessment!.mockReturnValue('assessment-progress-123');
      const initialAssessment = await quickAssessment({
        profile_id: 'profile-progress-123',
        subcategory_id: 'GV.OC-01',
        implementation_level: 1,
        maturity_score: 1,
        notes: 'Initial baseline assessment'
      });

      testUtils.assertSuccessResponse(initialAssessment);

      // Track progress through multiple phases
      const progressPhases = [
        { phase: 'Planning', implementation_level: 1, maturity_score: 1, progress_percentage: 10 },
        { phase: 'Design', implementation_level: 2, maturity_score: 2, progress_percentage: 35 },
        { phase: 'Implementation', implementation_level: 3, maturity_score: 3, progress_percentage: 70 },
        { phase: 'Testing', implementation_level: 3, maturity_score: 4, progress_percentage: 90 },
        { phase: 'Deployment', implementation_level: 4, maturity_score: 4, progress_percentage: 100 }
      ];

      for (let i = 0; i < progressPhases.length; i++) {
        const phase = progressPhases[i];
        
        // Mock progress tracking creation
        mockDb.createProgress!.mockReturnValue(`progress-${i}`);
        mockDb.getProgress!.mockReturnValue({
          progress_id: `progress-${i}`,
          profile_id: 'profile-progress-123',
          subcategory_id: 'GV.OC-01',
          current_implementation: phase.implementation_level,
          current_maturity: phase.maturity_score,
          progress_percentage: phase.progress_percentage,
          status: phase.progress_percentage === 100 ? 'completed' : 'in_progress'
        });

        const progressResult = await trackProgress({
          profile_id: 'profile-progress-123',
          subcategory_id: 'GV.OC-01',
          target_implementation: 4,
          target_maturity: 4,
          current_implementation: phase.implementation_level,
          current_maturity: phase.maturity_score,
          progress_percentage: phase.progress_percentage,
          milestone_name: `${phase.phase} Complete`,
          notes: `Completed ${phase.phase} phase`
        });

        testUtils.assertSuccessResponse(progressResult);
        expect(progressResult.progress_id).toBe(`progress-${i}`);

        // Track audit trail for each phase
        const auditResult = await trackAuditTrail({
          profile_id: 'profile-progress-123',
          action: 'progress_updated',
          resource_type: 'progress_tracking',
          resource_id: `progress-${i}`,
          details: JSON.stringify({
            phase: phase.phase,
            progress_percentage: phase.progress_percentage,
            implementation_level: phase.implementation_level,
            maturity_score: phase.maturity_score
          }),
          performed_by: 'progress-tracker'
        });

        testUtils.assertSuccessResponse(auditResult);
      }

      // Generate final progress report
      mockDb.createReport!.mockReturnValue('progress-report-123');
      mockDb.getReport!.mockReturnValue({
        report_id: 'progress-report-123',
        profile_id: 'profile-progress-123',
        report_type: 'progress',
        status: 'completed',
        content: JSON.stringify({
          progress_summary: 'Implementation completed successfully',
          phases_completed: 5,
          total_progress: 100
        })
      });

      const reportResult = await generateReport({
        profile_id: 'profile-progress-123',
        report_type: 'progress',
        include_timeline: true,
        include_milestones: true
      });

      testUtils.assertSuccessResponse(reportResult);
      expect(reportResult.report_id).toBe('progress-report-123');

      // Verify complete progress tracking
      expect(mockDb.createProgress).toHaveBeenCalledTimes(5);
      expect(mockDb.createReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle partial failures gracefully in complex workflows', async () => {
      // Setup successful profile creation
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.createOrganization!.mockReturnValue('org-error-test-123');
      mockDb.createProfile!.mockReturnValue('profile-error-test-123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'profile-error-test-123'
      }));

      const profileResult = await createProfile({
        org_name: 'Error Testing Corp',
        profile_name: 'Error Handling Profile'
      });

      testUtils.assertSuccessResponse(profileResult);

      // Test successful assessment followed by failed assessment
      mockDb.createAssessment!.mockReturnValueOnce('assessment-success-123');
      const successAssessment = await quickAssessment({
        profile_id: 'profile-error-test-123',
        subcategory_id: 'GV.OC-01',
        implementation_level: 2,
        maturity_score: 2
      });

      testUtils.assertSuccessResponse(successAssessment);

      // Mock database error for next operation
      mockDb.createAssessment!.mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const failedAssessment = await quickAssessment({
        profile_id: 'profile-error-test-123',
        subcategory_id: 'ID.AM-01',
        implementation_level: 2,
        maturity_score: 2
      });

      // Should handle error gracefully
      testUtils.assertErrorResponse(failedAssessment);
      expect(failedAssessment.error).toContain('Database connection error');

      // Subsequent operations should continue working
      mockDb.createAssessment!.mockReturnValue('assessment-recovery-123');
      const recoveryAssessment = await quickAssessment({
        profile_id: 'profile-error-test-123',
        subcategory_id: 'PR.AC-01',
        implementation_level: 3,
        maturity_score: 3
      });

      testUtils.assertSuccessResponse(recoveryAssessment);
      expect(recoveryAssessment.assessment_id).toBe('assessment-recovery-123');

      // Verify partial success scenario
      expect(mockDb.createAssessment).toHaveBeenCalledTimes(3); // 2 successful, 1 failed
    });

    it('should handle transaction rollbacks in complex operations', async () => {
      // Mock transaction that fails midway
      let operationCount = 0;
      mockDb.transaction!.mockImplementation((callback: () => any) => {
        try {
          return callback();
        } catch (error) {
          // Simulate rollback
          throw new Error('Transaction rolled back');
        }
      });

      mockDb.createOrganization!.mockImplementation(() => {
        operationCount++;
        if (operationCount > 1) {
          throw new Error('Simulated failure');
        }
        return 'org-rollback-test';
      });

      // Attempt operation that should fail
      const result = await createProfile({
        org_name: 'Rollback Test Corp',
        profile_name: 'Rollback Test Profile'
      });

      // Should fail gracefully
      testUtils.assertErrorResponse(result);
      expect(result.error).toBeDefined();
    });
  });
});