/**
 * Analysis & Planning Tools Test Suite
 * Tests for: generate_gap_analysis, generate_priority_matrix, create_implementation_plan, estimate_costs, track_progress
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { AnalysisPlanningTestHelper } from '../helpers/category-test-helpers.js';

const toolHelper = setupCompleteToolMocking('analysis_planning');

describe('Analysis & Planning Tools', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await toolHelper.resetDatabase();
    await toolHelper.createTestOrganization();
    await toolHelper.createSampleAssessment();
  });

  afterEach(async () => {
    await toolHelper.cleanup();
  });

  describe('Generate Gap Analysis Tool', () => {
    it('should generate comprehensive gap analysis from current vs target profiles', async () => {
      const { generateGapAnalysis } = await import('../../src/tools/generate_gap_analysis.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        current_profile_id: toolHelper.testCurrentProfileId,
        target_profile_id: toolHelper.testTargetProfileId,
        analysis_scope: 'comprehensive'
      };

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.gap_analysis).toBeDefined();
      expect(result.gap_analysis.overall_gap_score).toBeGreaterThanOrEqual(0);
      expect(result.gap_analysis.overall_gap_score).toBeLessThanOrEqual(100);
      expect(result.gap_analysis.function_gaps).toBeDefined();
      expect(result.gap_analysis.priority_gaps).toBeDefined();
      expect(Array.isArray(result.gap_analysis.priority_gaps)).toBe(true);
    });

    it('should identify high-priority gaps with risk impact', async () => {
      const { generateGapAnalysis } = await import('../../src/tools/generate_gap_analysis.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        current_profile_id: toolHelper.testCurrentProfileId,
        target_profile_id: toolHelper.testTargetProfileId,
        include_risk_impact: true,
        priority_threshold: 'high'
      };

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.gap_analysis.high_priority_gaps).toBeDefined();
      expect(result.gap_analysis.high_priority_gaps.length).toBeGreaterThan(0);
      
      result.gap_analysis.high_priority_gaps.forEach((gap: any) => {
        expect(gap).toHaveProperty('subcategory_id');
        expect(gap).toHaveProperty('gap_score');
        expect(gap).toHaveProperty('risk_impact');
        expect(gap).toHaveProperty('priority_level');
        expect(gap.priority_level).toBe('high');
      });
    });

    it('should provide resource estimates for gap closure', async () => {
      const { generateGapAnalysis } = await import('../../src/tools/generate_gap_analysis.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        current_profile_id: toolHelper.testCurrentProfileId,
        target_profile_id: toolHelper.testTargetProfileId,
        include_resource_estimates: true
      };

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.gap_analysis.resource_requirements).toBeDefined();
      expect(result.gap_analysis.resource_requirements.total_effort_hours).toBeGreaterThan(0);
      expect(result.gap_analysis.resource_requirements.estimated_cost).toBeGreaterThan(0);
      expect(result.gap_analysis.resource_requirements.timeline_months).toBeGreaterThan(0);
    });

    it('should handle industry-specific gap analysis', async () => {
      const { generateGapAnalysis } = await import('../../src/tools/generate_gap_analysis.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        current_profile_id: toolHelper.testCurrentProfileId,
        industry_benchmark: 'financial_services',
        analysis_type: 'industry_comparison'
      };

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.gap_analysis.industry_specific_gaps).toBeDefined();
      expect(result.gap_analysis.compliance_gaps).toBeDefined();
    });
  });

  describe('Generate Priority Matrix Tool', () => {
    it('should create implementation priority matrix', async () => {
      const { generatePriorityMatrix } = await import('../../src/tools/generate_priority_matrix.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        gap_analysis_id: toolHelper.testGapAnalysisId,
        prioritization_criteria: {
          risk_impact: 0.4,
          implementation_effort: 0.3,
          business_value: 0.2,
          compliance_requirement: 0.1
        }
      };

      const result = await generatePriorityMatrix(params);

      expect(result.success).toBe(true);
      expect(result.priority_matrix).toBeDefined();
      expect(result.priority_matrix.high_priority_items).toBeDefined();
      expect(result.priority_matrix.medium_priority_items).toBeDefined();
      expect(result.priority_matrix.low_priority_items).toBeDefined();
      
      // Validate priority categorization
      expect(Array.isArray(result.priority_matrix.high_priority_items)).toBe(true);
      expect(result.priority_matrix.high_priority_items.length).toBeGreaterThan(0);
    });

    it('should support different prioritization methodologies', async () => {
      const { generatePriorityMatrix } = await import('../../src/tools/generate_priority_matrix.js');
      
      const methodologies = ['risk_based', 'value_based', 'effort_based', 'compliance_driven'];
      
      for (const methodology of methodologies) {
        const params = {
          organization_id: toolHelper.testOrgId,
          gap_analysis_id: toolHelper.testGapAnalysisId,
          methodology: methodology
        };

        const result = await generatePriorityMatrix(params);
        
        expect(result.success).toBe(true);
        expect(result.priority_matrix.methodology).toBe(methodology);
      }
    });

    it('should include effort and timeline estimates', async () => {
      const { generatePriorityMatrix } = await import('../../src/tools/generate_priority_matrix.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        gap_analysis_id: toolHelper.testGapAnalysisId,
        include_estimates: true
      };

      const result = await generatePriorityMatrix(params);

      expect(result.success).toBe(true);
      
      result.priority_matrix.high_priority_items.forEach((item: any) => {
        expect(item).toHaveProperty('estimated_effort_hours');
        expect(item).toHaveProperty('estimated_duration_weeks');
        expect(item).toHaveProperty('estimated_cost');
        expect(item.estimated_effort_hours).toBeGreaterThan(0);
      });
    });

    it('should validate gap analysis existence', async () => {
      const { generatePriorityMatrix } = await import('../../src/tools/generate_priority_matrix.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        gap_analysis_id: 'non-existent-gap-analysis'
      };

      const result = await generatePriorityMatrix(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/gap analysis.*not found/i);
    });
  });

  describe('Create Implementation Plan Tool', () => {
    it('should create detailed implementation roadmap', async () => {
      const { createImplementationPlan } = await import('../../src/tools/create_implementation_plan.js');
      
      const planData = AnalysisPlanningTestHelper.generateImplementationPlan();
      const params = {
        organization_id: toolHelper.testOrgId,
        priority_matrix_id: toolHelper.testPriorityMatrixId,
        plan_data: planData,
        timeline_months: 12
      };

      const result = await createImplementationPlan(params);

      expect(result.success).toBe(true);
      expect(result.implementation_plan).toBeDefined();
      expect(result.implementation_plan.phases).toBeDefined();
      expect(Array.isArray(result.implementation_plan.phases)).toBe(true);
      expect(result.implementation_plan.phases.length).toBeGreaterThan(0);
      
      // Validate phase structure
      result.implementation_plan.phases.forEach((phase: any) => {
        expect(phase).toHaveProperty('phase_number');
        expect(phase).toHaveProperty('phase_name');
        expect(phase).toHaveProperty('duration_weeks');
        expect(phase).toHaveProperty('deliverables');
        expect(phase).toHaveProperty('success_criteria');
      });
    });

    it('should include resource allocation and dependencies', async () => {
      const { createImplementationPlan } = await import('../../src/tools/create_implementation_plan.js');
      
      const planData = AnalysisPlanningTestHelper.generateImplementationPlan();
      const params = {
        organization_id: toolHelper.testOrgId,
        priority_matrix_id: toolHelper.testPriorityMatrixId,
        plan_data: planData,
        include_resource_allocation: true,
        include_dependencies: true
      };

      const result = await createImplementationPlan(params);

      expect(result.success).toBe(true);
      expect(result.implementation_plan.resource_allocation).toBeDefined();
      expect(result.implementation_plan.dependencies).toBeDefined();
      expect(result.implementation_plan.critical_path).toBeDefined();
    });

    it('should support different planning methodologies', async () => {
      const { createImplementationPlan } = await import('../../src/tools/create_implementation_plan.js');
      
      const methodologies = ['agile', 'waterfall', 'hybrid', 'lean'];
      
      for (const methodology of methodologies) {
        const planData = AnalysisPlanningTestHelper.generateImplementationPlan();
        const params = {
          organization_id: toolHelper.testOrgId,
          priority_matrix_id: toolHelper.testPriorityMatrixId,
          plan_data: planData,
          methodology: methodology
        };

        const result = await createImplementationPlan(params);
        
        expect(result.success).toBe(true);
        expect(result.implementation_plan.methodology).toBe(methodology);
      }
    });

    it('should create milestone tracking structure', async () => {
      const { createImplementationPlan } = await import('../../src/tools/create_implementation_plan.js');
      
      const planData = AnalysisPlanningTestHelper.generateImplementationPlan();
      const params = {
        organization_id: toolHelper.testOrgId,
        priority_matrix_id: toolHelper.testPriorityMatrixId,
        plan_data: planData,
        create_milestones: true
      };

      const result = await createImplementationPlan(params);

      expect(result.success).toBe(true);
      expect(result.implementation_plan.milestones).toBeDefined();
      expect(Array.isArray(result.implementation_plan.milestones)).toBe(true);
      
      result.implementation_plan.milestones.forEach((milestone: any) => {
        expect(milestone).toHaveProperty('milestone_id');
        expect(milestone).toHaveProperty('title');
        expect(milestone).toHaveProperty('target_date');
        expect(milestone).toHaveProperty('success_criteria');
      });
    });
  });

  describe('Estimate Costs Tool', () => {
    it('should provide detailed cost breakdown', async () => {
      const { estimateCosts } = await import('../../src/tools/estimate_costs.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        cost_model: 'detailed',
        include_labor_costs: true,
        include_technology_costs: true,
        include_training_costs: true
      };

      const result = await estimateCosts(params);

      expect(result.success).toBe(true);
      expect(result.cost_estimate).toBeDefined();
      expect(result.cost_estimate.total_cost).toBeGreaterThan(0);
      expect(result.cost_estimate.labor_costs).toBeDefined();
      expect(result.cost_estimate.technology_costs).toBeDefined();
      expect(result.cost_estimate.training_costs).toBeDefined();
      expect(result.cost_estimate.breakdown_by_phase).toBeDefined();
    });

    it('should calculate ROI and payback period', async () => {
      const { estimateCosts } = await import('../../src/tools/estimate_costs.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        calculate_roi: true,
        include_risk_reduction_benefits: true
      };

      const result = await estimateCosts(params);

      expect(result.success).toBe(true);
      expect(result.cost_estimate.roi_analysis).toBeDefined();
      expect(result.cost_estimate.roi_analysis.payback_period_months).toBeGreaterThan(0);
      expect(result.cost_estimate.roi_analysis.net_present_value).toBeDefined();
      expect(result.cost_estimate.roi_analysis.internal_rate_of_return).toBeDefined();
    });

    it('should support different organizational sizes', async () => {
      const { estimateCosts } = await import('../../src/tools/estimate_costs.js');
      
      const sizes = ['small', 'medium', 'large', 'enterprise'];
      
      for (const size of sizes) {
        const params = {
          organization_id: toolHelper.testOrgId,
          implementation_plan_id: toolHelper.testImplementationPlanId,
          organization_size: size
        };

        const result = await estimateCosts(params);
        
        expect(result.success).toBe(true);
        expect(result.cost_estimate.size_adjustments).toBeDefined();
        expect(result.cost_estimate.organization_size).toBe(size);
      }
    });

    it('should provide cost optimization suggestions', async () => {
      const { estimateCosts } = await import('../../src/tools/estimate_costs.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        include_optimizations: true
      };

      const result = await estimateCosts(params);

      expect(result.success).toBe(true);
      expect(result.cost_optimizations).toBeDefined();
      expect(Array.isArray(result.cost_optimizations.suggestions)).toBe(true);
      expect(result.cost_optimizations.potential_savings).toBeGreaterThan(0);
    });
  });

  describe('Track Progress Tool', () => {
    it('should track implementation progress against milestones', async () => {
      const { trackProgress } = await import('../../src/tools/track_progress.js');
      
      const progressData = AnalysisPlanningTestHelper.generateProgressUpdate();
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        progress_data: progressData,
        reporting_period: 'monthly'
      };

      const result = await trackProgress(params);

      expect(result.success).toBe(true);
      expect(result.progress_report).toBeDefined();
      expect(result.progress_report.overall_completion_percentage).toBeGreaterThanOrEqual(0);
      expect(result.progress_report.overall_completion_percentage).toBeLessThanOrEqual(100);
      expect(result.progress_report.phase_progress).toBeDefined();
      expect(result.progress_report.milestone_status).toBeDefined();
    });

    it('should identify delays and risks', async () => {
      const { trackProgress } = await import('../../src/tools/track_progress.js');
      
      const delayedProgressData = AnalysisPlanningTestHelper.generateDelayedProgress();
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        progress_data: delayedProgressData,
        include_risk_analysis: true
      };

      const result = await trackProgress(params);

      expect(result.success).toBe(true);
      expect(result.progress_report.delays).toBeDefined();
      expect(result.progress_report.at_risk_milestones).toBeDefined();
      expect(result.progress_report.recommended_actions).toBeDefined();
      expect(Array.isArray(result.progress_report.recommended_actions)).toBe(true);
    });

    it('should update milestone completion status', async () => {
      const { trackProgress } = await import('../../src/tools/track_progress.js');
      
      const milestoneUpdates = AnalysisPlanningTestHelper.generateMilestoneUpdates();
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        milestone_updates: milestoneUpdates,
        update_database: true
      };

      const result = await trackProgress(params);

      expect(result.success).toBe(true);
      expect(result.updated_milestones).toBeDefined();
      expect(result.updated_milestones.length).toBeGreaterThan(0);
      
      result.updated_milestones.forEach((milestone: any) => {
        expect(milestone).toHaveProperty('milestone_id');
        expect(milestone).toHaveProperty('status');
        expect(['not_started', 'in_progress', 'completed', 'delayed']).toContain(milestone.status);
      });
    });

    it('should generate progress dashboard data', async () => {
      const { trackProgress } = await import('../../src/tools/track_progress.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        generate_dashboard: true
      };

      const result = await trackProgress(params);

      expect(result.success).toBe(true);
      expect(result.dashboard_data).toBeDefined();
      expect(result.dashboard_data.kpi_metrics).toBeDefined();
      expect(result.dashboard_data.trend_analysis).toBeDefined();
      expect(result.dashboard_data.upcoming_milestones).toBeDefined();
    });
  });
});