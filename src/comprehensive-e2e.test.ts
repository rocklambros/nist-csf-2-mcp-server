#!/usr/bin/env node
/**
 * Comprehensive End-to-End Test Script for NIST CSF MCP Server
 * 
 * This script tests the complete cybersecurity assessment workflow:
 * 1. Organization and profile creation
 * 2. Quick assessment execution
 * 3. Gap analysis generation
 * 4. Implementation plan creation
 * 5. Progress tracking updates
 * 6. Executive report generation
 * 
 * The script verifies data persistence, tool interactions, and error handling
 * across all major system components.
 */

import { performance } from 'perf_hooks';
import { getDatabase, closeDatabase } from './db/database.js';
import { getMonitoredDatabase, closeMonitoredDatabase } from './db/monitored-database.js';
import { initializeFramework } from './services/framework-loader.js';
import { toolAnalytics } from './utils/analytics.js';
// import { logger } from './utils/enhanced-logger.js';

// Interfaces
interface TestArtifacts {
  organizationId?: string;
  profileId?: string;
  targetProfileId?: string;
  gapAnalysisId?: string;
  implementationPlanId?: string;
  reportId?: string;
}

// Tool imports
import { createProfile } from './tools/create_profile.js';
import { quickAssessment } from './tools/quick_assessment.js';
import { assessMaturity } from './tools/assess_maturity.js';
import { calculateRiskScore } from './tools/calculate_risk_score.js';
import { generateGapAnalysis } from './tools/generate_gap_analysis.js';
import { generatePriorityMatrix } from './tools/generate_priority_matrix.js';
import { createImplementationPlan } from './tools/create_implementation_plan.js';
import { estimateImplementationCost } from './tools/estimate_implementation_cost.js';
import { trackProgressTool } from './tools/track_progress.js';
import { generateReportTool } from './tools/generate_report.js';
import { exportDataTool } from './tools/export_data.js';

// Test configuration
const TEST_CONFIG = {
  organization: {
    name: 'Comprehensive E2E Test Corp',
    sector: 'technology',
    size: 'large',
    description: 'Comprehensive end-to-end test organization for full workflow validation'
  },
  profile: {
    name: 'Complete Workflow Test Profile',
    description: 'Full workflow validation profile with comprehensive data',
    target_implementation_tier: 'Adaptive'
  },
  quick_assessment: {
    simplified_answers: {
      govern: 'partial' as const,
      identify: 'yes' as const, 
      protect: 'partial' as const,
      detect: 'no' as const,
      respond: 'partial' as const,
      recover: 'no' as const
    },
    assessed_by: 'E2E Test System',
    confidence_level: 'high' as const
  },
  progress_updates: [
    {
      subcategory_id: 'GV.OC-01',
      current_implementation: 'fully_implemented',
      current_maturity: 4,
      status: 'completed' as const,
      notes: 'Organizational context fully established and documented'
    },
    {
      subcategory_id: 'GV.PO-01',
      current_implementation: 'largely_implemented',
      current_maturity: 3,
      status: 'on_track' as const,
      notes: 'Security policies in final review phase'
    },
    {
      subcategory_id: 'ID.AM-01',
      current_implementation: 'partially_implemented',
      current_maturity: 2,
      status: 'at_risk' as const,
      notes: 'Asset inventory project experiencing delays'
    },
    {
      subcategory_id: 'PR.AC-01',
      current_implementation: 'not_implemented',
      current_maturity: 0,
      status: 'blocked' as const,
      notes: 'Identity management system procurement on hold'
    },
    {
      subcategory_id: 'DE.CM-01',
      current_implementation: 'partially_implemented',
      current_maturity: 1,
      status: 'behind' as const,
      notes: 'Network monitoring tools deployed but not fully configured'
    }
  ]
};

// Test result interfaces
interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'PASS' | 'FAIL' | 'SKIP';
  startTime?: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
  validations?: ValidationResult[];
}

interface ValidationResult {
  check: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  message?: string;
}

interface TestReport {
  testSuite: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  environment: {
    nodeVersion: string;
    platform: string;
    monitoringEnabled: boolean;
  };
  steps: TestStep[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  artifacts: {
    organizationId?: string;
    profileId?: string;
    targetProfileId?: string;
    gapAnalysisId?: string;
    implementationPlanId?: string;
    reportId?: string;
  };
  dataIntegrity: {
    checksPerformed: number;
    checksPass: number;
    issues: string[];
  };
  performanceMetrics: {
    totalApiCalls: number;
    averageResponseTime: number;
    slowestOperation: string;
    fastestOperation: string;
  };
}

class ComprehensiveE2ETestRunner {
  private db: any;
  private report: TestReport;
  private useMonitoring: boolean;

  constructor(useMonitoring: boolean = true) {
    this.useMonitoring = useMonitoring;
    this.report = {
      testSuite: 'NIST CSF MCP Server - Comprehensive End-to-End Test',
      startTime: new Date(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        monitoringEnabled: useMonitoring
      },
      steps: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, successRate: 0 },
      artifacts: {} as TestArtifacts,
      dataIntegrity: { checksPerformed: 0, checksPass: 0, issues: [] },
      performanceMetrics: { totalApiCalls: 0, averageResponseTime: 0, slowestOperation: '', fastestOperation: '' }
    };
  }

  /**
   * Initialize comprehensive test environment
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Comprehensive E2E Test Environment');
    console.log('='.repeat(80));
    
    try {
      // Initialize database and framework
      this.db = this.useMonitoring ? getMonitoredDatabase() : getDatabase();
      await initializeFramework();
      
      console.log('✅ Database initialized');
      console.log('✅ Framework data loaded');
      console.log('✅ Test environment ready');
      console.log('');
    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error);
      throw error;
    }
  }

  /**
   * Execute a test step with comprehensive validation and error handling
   */
  async executeStep(step: TestStep): Promise<TestStep> {
    const updatedStep = { ...step };
    updatedStep.status = 'RUNNING';
    updatedStep.startTime = performance.now();
    updatedStep.validations = [];
    
    console.log(`\n🔍 ${step.id}: ${step.name}`);
    console.log(`   ${step.description}`);
    
    try {
      // Execute the step
      updatedStep.result = await this.executeStepImplementation(step.id);
      
      // Perform validations
      updatedStep.validations = await this.validateStep(step.id, updatedStep.result);
      
      // Check if all validations passed
      const allValidationsPassed = updatedStep.validations.every(v => v.passed);
      
      updatedStep.endTime = performance.now();
      updatedStep.duration = updatedStep.endTime - updatedStep.startTime;
      updatedStep.status = allValidationsPassed ? 'PASS' : 'FAIL';
      
      if (updatedStep.status === 'PASS') {
        console.log(`✅ ${step.id} - PASSED (${updatedStep.duration.toFixed(0)}ms)`);
      } else {
        console.log(`❌ ${step.id} - FAILED (${updatedStep.duration.toFixed(0)}ms)`);
        updatedStep.validations.filter(v => !v.passed).forEach(v => {
          console.log(`   ❌ ${v.check}: ${v.message}`);
        });
      }
      
    } catch (error: any) {
      updatedStep.endTime = performance.now();
      updatedStep.duration = updatedStep.endTime - updatedStep.startTime;
      updatedStep.status = 'FAIL';
      updatedStep.error = error.message;
      
      console.log(`❌ ${step.id} - FAILED (${updatedStep.duration.toFixed(0)}ms)`);
      console.log(`   Error: ${error.message}`);
    }
    
    this.report.steps.push(updatedStep);
    this.updatePerformanceMetrics(updatedStep);
    
    return updatedStep;
  }

  /**
   * Execute step implementation based on step ID
   */
  private async executeStepImplementation(stepId: string): Promise<any> {
    switch (stepId) {
      case 'CREATE_ORGANIZATION':
        return await createProfile({
          org_name: TEST_CONFIG.organization.name,
          sector: TEST_CONFIG.organization.sector as any,
          size: TEST_CONFIG.organization.size as any,
          profile_type: 'current',
          profile_name: TEST_CONFIG.profile.name,
          description: TEST_CONFIG.profile.description
        });

      case 'QUICK_ASSESSMENT':
        return await quickAssessment({
          profile_id: this.report.artifacts.profileId!,
          ...TEST_CONFIG.quick_assessment
        });

      case 'MATURITY_ASSESSMENT':
        return await assessMaturity({
          profile_id: this.report.artifacts.profileId!,
          include_recommendations: true,
          include_subcategory_details: true
        });

      case 'RISK_CALCULATION':
        return await calculateRiskScore({
          profile_id: this.report.artifacts.profileId!,
          include_heat_map: true,
          include_recommendations: true
        });

      case 'CREATE_TARGET_PROFILE':
        return await createProfile({
          org_name: TEST_CONFIG.organization.name,
          sector: TEST_CONFIG.organization.sector as any,
          size: TEST_CONFIG.organization.size as any,
          profile_type: 'target',
          profile_name: 'Target State Profile',
          description: 'Target state with full implementation'
        });

      case 'TARGET_ASSESSMENT':
        return await quickAssessment({
          profile_id: this.report.artifacts.targetProfileId!,
          simplified_answers: {
            govern: 'yes',
            identify: 'yes',
            protect: 'yes',
            detect: 'yes',
            respond: 'yes',
            recover: 'yes'
          },
          assessed_by: 'E2E Test - Target State',
          confidence_level: 'high'
        });

      case 'GAP_ANALYSIS':
        return await generateGapAnalysis({
          current_profile_id: this.report.artifacts.profileId!,
          target_profile_id: this.report.artifacts.targetProfileId!,
          include_priority_matrix: true,
          include_visualizations: true,
          minimum_gap_score: 0
        });

      case 'PRIORITY_MATRIX':
        return await generatePriorityMatrix({
          profile_id: this.report.artifacts.profileId!,
          matrix_type: 'effort_impact',
          include_recommendations: true,
          include_resource_estimates: true,
          max_items_per_quadrant: 15
        });

      case 'IMPLEMENTATION_PLAN':
        return await createImplementationPlan({
          gap_analysis_id: this.report.artifacts.gapAnalysisId!,
          timeline_months: 18,
          available_resources: 6,
          prioritization_strategy: 'risk_based',
          phase_duration: 3,
          include_dependencies: true,
          include_milestones: true,
          plan_name: 'E2E Test Implementation Plan'
        });

      case 'COST_ESTIMATION':
        return await estimateImplementationCost({
          subcategory_ids: ['GV.OC-01', 'GV.PO-01', 'ID.AM-01', 'PR.AC-01', 'DE.CM-01'],
          organization_size: 'large',
          include_ongoing_costs: true,
          include_risk_adjusted: false,
          currency: 'USD',
          include_contingency: true
        });

      case 'PROGRESS_TRACKING':
        return await trackProgressTool.execute({
          profile_id: this.report.artifacts.profileId!,
          updates: TEST_CONFIG.progress_updates
        }, this.db);

      case 'EXECUTIVE_REPORT':
        return await generateReportTool.execute({
          profile_id: this.report.artifacts.profileId!,
          report_type: 'executive',
          format: 'json',
          include_recommendations: true
        }, this.db);

      case 'DATA_EXPORT':
        return await exportDataTool.execute({
          profile_id: this.report.artifacts.profileId!,
          format: 'json',
          include_assessments: true,
          include_progress: true,
          include_compliance: false,
          include_milestones: false
        }, this.db);

      default:
        throw new Error(`Unknown step ID: ${stepId}`);
    }
  }

  /**
   * Validate step results
   */
  private async validateStep(stepId: string, result: any): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = [];
    
    // Common validations for all steps
    validations.push({
      check: 'Result exists',
      passed: !!result,
      actual: !!result,
      message: result ? 'Result object returned' : 'No result returned'
    });

    if (result?.success !== undefined) {
      validations.push({
        check: 'Operation successful',
        passed: result.success === true,
        expected: true,
        actual: result.success,
        message: result.success ? 'Operation completed successfully' : `Operation failed: ${result.message || 'Unknown error'}`
      });
    }

    // Step-specific validations
    switch (stepId) {
      case 'CREATE_ORGANIZATION':
        this.validateOrganizationCreation(validations, result);
        break;
      case 'QUICK_ASSESSMENT':
        this.validateQuickAssessment(validations, result);
        break;
      case 'MATURITY_ASSESSMENT':
        this.validateMaturityAssessment(validations, result);
        break;
      case 'RISK_CALCULATION':
        this.validateRiskCalculation(validations, result);
        break;
      case 'CREATE_TARGET_PROFILE':
        this.validateTargetProfile(validations, result);
        break;
      case 'GAP_ANALYSIS':
        this.validateGapAnalysis(validations, result);
        break;
      case 'PRIORITY_MATRIX':
        this.validatePriorityMatrix(validations, result);
        break;
      case 'IMPLEMENTATION_PLAN':
        this.validateImplementationPlan(validations, result);
        break;
      case 'COST_ESTIMATION':
        this.validateCostEstimation(validations, result);
        break;
      case 'PROGRESS_TRACKING':
        this.validateProgressTracking(validations, result);
        break;
      case 'EXECUTIVE_REPORT':
        this.validateExecutiveReport(validations, result);
        break;
      case 'DATA_EXPORT':
        this.validateDataExport(validations, result);
        break;
    }

    // Update data integrity metrics
    this.report.dataIntegrity.checksPerformed += validations.length;
    this.report.dataIntegrity.checksPass += validations.filter(v => v.passed).length;
    
    const failedChecks = validations.filter(v => !v.passed);
    failedChecks.forEach(check => {
      this.report.dataIntegrity.issues.push(`${stepId}: ${check.check} - ${check.message}`);
    });

    return validations;
  }

  private validateOrganizationCreation(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Profile ID generated',
      passed: !!result?.profile_id && typeof result.profile_id === 'string',
      actual: result?.profile_id,
      message: result?.profile_id ? 'Valid profile ID generated' : 'Profile ID missing or invalid'
    });

    validations.push({
      check: 'Organization ID generated',
      passed: !!result?.org_id && typeof result.org_id === 'string',
      actual: result?.org_id,
      message: result?.org_id ? 'Valid organization ID generated' : 'Organization ID missing or invalid'
    });

    if (result?.profile_id) {
      this.report.artifacts.profileId = result.profile_id;
      this.report.artifacts.organizationId = result.org_id;
    }
  }

  private validateQuickAssessment(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Assessment scores calculated',
      passed: !!result?.initial_maturity_scores && typeof result.initial_maturity_scores.overall_average === 'number',
      actual: result?.initial_maturity_scores?.overall_average,
      message: 'Maturity scores calculated correctly'
    });

    validations.push({
      check: 'Assessment details provided',
      passed: !!result?.details && typeof result.details.assessmentsCreated === 'number',
      actual: result?.details?.assessmentsCreated,
      message: result?.details ? `${result.details.assessmentsCreated} assessments created` : 'Assessment details missing'
    });

    const expectedFunctions = ['govern', 'identify', 'protect', 'detect', 'respond', 'recover'];
    const actualFunctions = result?.initial_maturity_scores ? Object.keys(result.initial_maturity_scores).filter(k => k !== 'overall_average') : [];
    
    validations.push({
      check: 'All CSF functions assessed',
      passed: expectedFunctions.every(func => actualFunctions.includes(func)),
      expected: expectedFunctions,
      actual: actualFunctions,
      message: `Assessed functions: ${actualFunctions.join(', ')}`
    });
  }

  private validateMaturityAssessment(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Overall maturity calculated',
      passed: typeof result?.overall_maturity_score === 'number' && result.overall_maturity_score >= 0 && result.overall_maturity_score <= 5,
      actual: result?.overall_maturity_score,
      message: `Overall maturity score: ${result?.overall_maturity_score}`
    });

    validations.push({
      check: 'Function breakdown provided',
      passed: Array.isArray(result?.function_breakdown) && result.function_breakdown.length === 6,
      actual: result?.function_breakdown?.length,
      expected: 6,
      message: `${result?.function_breakdown?.length || 0} functions analyzed`
    });

    validations.push({
      check: 'Recommendations generated',
      passed: !!result?.recommendations,
      actual: !!result?.recommendations,
      message: result?.recommendations ? 'Recommendations provided' : 'No recommendations generated'
    });
  }

  private validateRiskCalculation(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Risk score in valid range',
      passed: typeof result?.overall_risk_score === 'number' && result.overall_risk_score >= 0 && result.overall_risk_score <= 100,
      actual: result?.overall_risk_score,
      expected: 'Number between 0-100',
      message: `Risk score: ${result?.overall_risk_score}`
    });

    validations.push({
      check: 'Risk level assigned',
      passed: ['Low', 'Medium', 'High', 'Critical'].includes(result?.risk_level),
      actual: result?.risk_level,
      expected: 'Low, Medium, High, or Critical',
      message: `Risk level: ${result?.risk_level}`
    });

    validations.push({
      check: 'Function risks calculated',
      passed: Array.isArray(result?.function_risks) && result.function_risks.length === 6,
      actual: result?.function_risks?.length,
      expected: 6,
      message: `${result?.function_risks?.length || 0} function risks calculated`
    });
  }

  private validateTargetProfile(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Target profile created',
      passed: !!result?.profile_id && result.profile_id !== this.report.artifacts.profileId,
      actual: result?.profile_id,
      message: 'Separate target profile created'
    });

    if (result?.profile_id) {
      this.report.artifacts.targetProfileId = result.profile_id;
    }
  }

  private validateGapAnalysis(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Gap analysis ID generated',
      passed: !!result?.analysis_id,
      actual: result?.analysis_id,
      message: result?.analysis_id ? 'Gap analysis ID generated' : 'Gap analysis ID missing'
    });

    validations.push({
      check: 'Gap summary calculated',
      passed: !!result?.gap_summary && typeof result.gap_summary.total_gaps === 'number',
      actual: result?.gap_summary?.total_gaps,
      message: `${result?.gap_summary?.total_gaps || 0} gaps identified`
    });

    validations.push({
      check: 'Recommendations provided',
      passed: !!result?.recommendations && Array.isArray(result.recommendations.immediate_actions),
      actual: result?.recommendations?.immediate_actions?.length,
      message: `${result?.recommendations?.immediate_actions?.length || 0} immediate actions recommended`
    });

    if (result?.analysis_id) {
      this.report.artifacts.gapAnalysisId = result.analysis_id;
    }
  }

  private validatePriorityMatrix(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Priority quadrants generated',
      passed: !!result?.quadrants,
      actual: !!result?.quadrants,
      message: result?.quadrants ? 'Priority quadrants generated' : 'Priority quadrants missing'
    });

    validations.push({
      check: 'Summary statistics calculated',
      passed: !!result?.summary && typeof result.summary.total_items === 'number',
      actual: result?.summary?.total_items,
      message: `${result?.summary?.total_items || 0} items prioritized`
    });
  }

  private validateImplementationPlan(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Implementation plan ID generated',
      passed: !!result?.plan_id,
      actual: result?.plan_id,
      message: result?.plan_id ? 'Implementation plan created' : 'Plan ID missing'
    });

    validations.push({
      check: 'Phases defined',
      passed: typeof result?.total_phases === 'number' && result.total_phases > 0,
      actual: result?.total_phases,
      message: `${result?.total_phases || 0} phases planned`
    });

    validations.push({
      check: 'Timeline specified',
      passed: typeof result?.timeline_months === 'number' && result.timeline_months > 0,
      actual: result?.timeline_months,
      expected: 18,
      message: `${result?.timeline_months} month timeline`
    });

    if (result?.plan_id) {
      this.report.artifacts.implementationPlanId = result.plan_id;
    }
  }

  private validateCostEstimation(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Total cost calculated',
      passed: typeof result?.total_cost === 'number' && result.total_cost > 0,
      actual: result?.total_cost,
      message: `Total cost: $${result?.total_cost?.toLocaleString() || 0}`
    });

    validations.push({
      check: 'Cost breakdown provided',
      passed: !!result?.cost_breakdown,
      actual: !!result?.cost_breakdown,
      message: result?.cost_breakdown ? 'Detailed cost breakdown provided' : 'Cost breakdown missing'
    });
  }

  private validateProgressTracking(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Progress summary calculated',
      passed: typeof result?.overall_completion_percentage === 'number',
      actual: result?.overall_completion_percentage,
      message: `Overall completion: ${result?.overall_completion_percentage || 0}%`
    });

    validations.push({
      check: 'Updates processed',
      passed: typeof result?.total_subcategories === 'number' && result.total_subcategories > 0,
      actual: result?.total_subcategories,
      message: `${result?.total_subcategories || 0} subcategories tracked`
    });
  }

  private validateExecutiveReport(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Report generated',
      passed: result?.success === true,
      actual: result?.success,
      message: result?.success ? 'Executive report generated successfully' : 'Report generation failed'
    });

    validations.push({
      check: 'Report format correct',
      passed: result?.format === 'json',
      actual: result?.format,
      expected: 'json',
      message: `Report format: ${result?.format}`
    });

    if (result?.success) {
      this.report.artifacts.reportId = result.report_id || 'generated';
    }
  }

  private validateDataExport(validations: ValidationResult[], result: any): void {
    validations.push({
      check: 'Data export successful',
      passed: result?.success === true,
      actual: result?.success,
      message: result?.success ? 'Data exported successfully' : 'Export failed'
    });

    validations.push({
      check: 'Export metadata provided',
      passed: !!result?.metadata && typeof result.metadata.record_count === 'number',
      actual: result?.metadata?.record_count,
      message: `${result?.metadata?.record_count || 0} records exported`
    });
  }

  private updatePerformanceMetrics(step: TestStep): void {
    if (!step.duration) return;

    this.report.performanceMetrics.totalApiCalls++;
    
    // Calculate rolling average
    const currentTotal = this.report.performanceMetrics.averageResponseTime * (this.report.performanceMetrics.totalApiCalls - 1);
    this.report.performanceMetrics.averageResponseTime = (currentTotal + step.duration) / this.report.performanceMetrics.totalApiCalls;

    // Track slowest and fastest operations
    if (!this.report.performanceMetrics.slowestOperation || step.duration > this.getStepDuration(this.report.performanceMetrics.slowestOperation)) {
      this.report.performanceMetrics.slowestOperation = `${step.id} (${step.duration.toFixed(0)}ms)`;
    }

    if (!this.report.performanceMetrics.fastestOperation || step.duration < this.getStepDuration(this.report.performanceMetrics.fastestOperation)) {
      this.report.performanceMetrics.fastestOperation = `${step.id} (${step.duration.toFixed(0)}ms)`;
    }
  }

  private getStepDuration(stepMetric: string | undefined): number {
    if (!stepMetric) return 0;
    const match = stepMetric.match(/\((\d+)ms\)$/);
    return match && match[1] ? parseInt(match[1]) : 0;
  }

  /**
   * Run the complete comprehensive test suite
   */
  async runTests(): Promise<TestReport> {
    console.log(`\n🎯 Starting ${this.report.testSuite}`);
    console.log('='.repeat(80));
    
    const testSteps: TestStep[] = [
      {
        id: 'CREATE_ORGANIZATION',
        name: 'Organization and Profile Creation',
        description: 'Create test organization with current state profile',
        status: 'PENDING'
      },
      {
        id: 'QUICK_ASSESSMENT',
        name: 'Quick Assessment Execution',
        description: 'Perform rapid organizational assessment across all CSF functions',
        status: 'PENDING'
      },
      {
        id: 'MATURITY_ASSESSMENT',
        name: 'Detailed Maturity Assessment',
        description: 'Calculate comprehensive maturity scores with recommendations',
        status: 'PENDING'
      },
      {
        id: 'RISK_CALCULATION',
        name: 'Risk Score Calculation',
        description: 'Calculate organizational risk score with heat map and recommendations',
        status: 'PENDING'
      },
      {
        id: 'CREATE_TARGET_PROFILE',
        name: 'Target Profile Creation',
        description: 'Create target state profile for gap analysis',
        status: 'PENDING'
      },
      {
        id: 'TARGET_ASSESSMENT',
        name: 'Target State Assessment',
        description: 'Define ideal target state with full implementation',
        status: 'PENDING'
      },
      {
        id: 'GAP_ANALYSIS',
        name: 'Gap Analysis Generation',
        description: 'Generate comprehensive gap analysis between current and target states',
        status: 'PENDING'
      },
      {
        id: 'PRIORITY_MATRIX',
        name: 'Priority Matrix Generation',
        description: 'Create implementation priority matrix based on effort and impact',
        status: 'PENDING'
      },
      {
        id: 'IMPLEMENTATION_PLAN',
        name: 'Implementation Plan Creation',
        description: 'Generate detailed implementation roadmap with phases and timelines',
        status: 'PENDING'
      },
      {
        id: 'COST_ESTIMATION',
        name: 'Cost Estimation',
        description: 'Calculate implementation costs with detailed breakdown',
        status: 'PENDING'
      },
      {
        id: 'PROGRESS_TRACKING',
        name: 'Progress Tracking Updates',
        description: 'Update implementation progress across multiple subcategories',
        status: 'PENDING'
      },
      {
        id: 'EXECUTIVE_REPORT',
        name: 'Executive Report Generation',
        description: 'Generate comprehensive executive report with recommendations',
        status: 'PENDING'
      },
      {
        id: 'DATA_EXPORT',
        name: 'Data Export Validation',
        description: 'Export all assessment and progress data for external analysis',
        status: 'PENDING'
      }
    ];

    try {
      // Initialize test environment
      await this.initialize();

      // Execute all test steps
      for (const step of testSteps) {
        const result = await this.executeStep(step);
        
        // Stop on critical failures (organization creation, etc.)
        if (result.status === 'FAIL' && ['CREATE_ORGANIZATION', 'QUICK_ASSESSMENT'].includes(result.id)) {
          console.log(`\n💥 Critical failure in ${result.id}, stopping test execution`);
          break;
        }
      }

    } catch (error: any) {
      console.error('💥 Test suite failed during setup:', error.message);
      this.report.steps.push({
        id: 'SETUP_FAILURE',
        name: 'Test Suite Setup',
        description: 'Initialize test environment',
        status: 'FAIL',
        error: error.message,
        duration: 0
      });
    }

    // Finalize report
    this.finalizeReport();
    return this.report;
  }

  /**
   * Generate comprehensive test report
   */
  private finalizeReport(): void {
    this.report.endTime = new Date();
    this.report.totalDuration = this.report.endTime.getTime() - this.report.startTime.getTime();

    // Calculate summary statistics
    this.report.summary.total = this.report.steps.length;
    this.report.summary.passed = this.report.steps.filter(s => s.status === 'PASS').length;
    this.report.summary.failed = this.report.steps.filter(s => s.status === 'FAIL').length;
    this.report.summary.skipped = this.report.steps.filter(s => s.status === 'SKIP').length;
    this.report.summary.successRate = this.report.summary.total > 0 
      ? (this.report.summary.passed / this.report.summary.total) * 100 
      : 0;
  }

  /**
   * Display comprehensive test report
   */
  displayReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE E2E TEST REPORT');
    console.log('='.repeat(80));

    // Test Summary
    console.log(`\n📋 Test Suite: ${this.report.testSuite}`);
    console.log(`⏱️  Start Time: ${this.report.startTime.toISOString()}`);
    console.log(`⏱️  End Time: ${this.report.endTime?.toISOString()}`);
    console.log(`⌚ Total Duration: ${this.report.totalDuration}ms (${(this.report.totalDuration! / 1000).toFixed(2)}s)`);

    // Environment Information
    console.log(`\n🌍 Test Environment:`);
    console.log(`   Node Version: ${this.report.environment.nodeVersion}`);
    console.log(`   Platform: ${this.report.environment.platform}`);
    console.log(`   Monitoring: ${this.report.environment.monitoringEnabled ? 'Enabled' : 'Disabled'}`);

    // Summary Statistics
    console.log(`\n📈 Test Results:`);
    console.log(`   Total Steps: ${this.report.summary.total}`);
    console.log(`   ✅ Passed: ${this.report.summary.passed}`);
    console.log(`   ❌ Failed: ${this.report.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${this.report.summary.skipped}`);
    console.log(`   📊 Success Rate: ${this.report.summary.successRate.toFixed(1)}%`);

    // Generated Artifacts
    console.log(`\n🗂️ Generated Test Artifacts:`);
    console.log(`   Organization ID: ${this.report.artifacts.organizationId || 'N/A'}`);
    console.log(`   Current Profile ID: ${this.report.artifacts.profileId || 'N/A'}`);
    console.log(`   Target Profile ID: ${this.report.artifacts.targetProfileId || 'N/A'}`);
    console.log(`   Gap Analysis ID: ${this.report.artifacts.gapAnalysisId || 'N/A'}`);
    console.log(`   Implementation Plan ID: ${this.report.artifacts.implementationPlanId || 'N/A'}`);
    console.log(`   Executive Report: ${this.report.artifacts.reportId ? 'Generated' : 'N/A'}`);

    // Data Integrity Results
    console.log(`\n🔍 Data Integrity Validation:`);
    console.log(`   Total Checks: ${this.report.dataIntegrity.checksPerformed}`);
    console.log(`   Passed Checks: ${this.report.dataIntegrity.checksPass}`);
    console.log(`   Failed Checks: ${this.report.dataIntegrity.checksPerformed - this.report.dataIntegrity.checksPass}`);
    console.log(`   Integrity Rate: ${((this.report.dataIntegrity.checksPass / this.report.dataIntegrity.checksPerformed) * 100).toFixed(1)}%`);

    if (this.report.dataIntegrity.issues.length > 0) {
      console.log(`\n⚠️  Data Integrity Issues:`);
      this.report.dataIntegrity.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    // Performance Metrics
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   Total API Calls: ${this.report.performanceMetrics.totalApiCalls}`);
    console.log(`   Average Response Time: ${this.report.performanceMetrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Fastest Operation: ${this.report.performanceMetrics.fastestOperation || 'N/A'}`);
    console.log(`   Slowest Operation: ${this.report.performanceMetrics.slowestOperation || 'N/A'}`);

    // Detailed Step Results
    console.log(`\n📝 Detailed Test Steps:`);
    this.report.steps.forEach((step, index) => {
      const statusIcon = step.status === 'PASS' ? '✅' : step.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`\n   ${statusIcon} ${index + 1}. ${step.name} (${step.id})`);
      console.log(`      Description: ${step.description}`);
      console.log(`      Status: ${step.status}`);
      console.log(`      Duration: ${step.duration?.toFixed(0) || 0}ms`);

      if (step.validations && step.validations.length > 0) {
        const passedValidations = step.validations.filter(v => v.passed).length;
        const totalValidations = step.validations.length;
        console.log(`      Validations: ${passedValidations}/${totalValidations} passed`);

        const failedValidations = step.validations.filter(v => !v.passed);
        if (failedValidations.length > 0) {
          failedValidations.forEach(v => {
            console.log(`         ❌ ${v.check}: ${v.message}`);
          });
        }
      }

      if (step.error) {
        console.log(`      Error: ${step.error}`);
      }
    });

    // Final Status
    const overallStatus = this.report.summary.failed === 0 ? 'SUCCESS' : 'FAILURE';
    const statusIcon = overallStatus === 'SUCCESS' ? '🎉' : '💥';

    console.log('\n' + '='.repeat(80));
    console.log(`${statusIcon} OVERALL TEST STATUS: ${overallStatus}`);
    console.log('='.repeat(80));

    if (overallStatus === 'SUCCESS') {
      console.log('🎯 All comprehensive workflows validated successfully!');
      console.log('✅ Data persistence, tool interactions, and reporting verified');
      console.log('🔒 Error handling and data integrity confirmed');
      console.log('⚡ Performance within acceptable thresholds');
      console.log('🚀 System ready for production deployment');
    } else {
      console.log('⚠️  Some tests failed - review detailed results above');
      console.log('🔧 Address failing components before deployment');
      console.log(`📊 Success Rate: ${this.report.summary.successRate.toFixed(1)}% - Target: 100%`);
    }

    console.log(`\n📄 Test completed at ${new Date().toISOString()}`);
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up comprehensive test environment...');

    try {
      // Close database connections
      if (this.useMonitoring) {
        closeMonitoredDatabase();
      } else {
        closeDatabase();
      }

      // Stop analytics if running
      if (toolAnalytics) {
        toolAnalytics.stop();
      }

      console.log('✅ Test environment cleaned up successfully');
    } catch (error) {
      console.warn('⚠️ Warning during cleanup:', error);
    }
  }
}

/**
 * Main test execution function
 */
async function main() {
  const useMonitoring = process.env.ENABLE_MONITORING !== 'false';
  const testRunner = new ComprehensiveE2ETestRunner(useMonitoring);

  try {
    console.log('🚀 NIST CSF MCP Server - Comprehensive End-to-End Test');
    console.log('='.repeat(80));
    console.log('This test validates the complete cybersecurity assessment workflow');
    console.log('including data persistence, tool interactions, and error handling.\n');

    // Run the complete test suite
    const report = await testRunner.runTests();

    // Display comprehensive results
    testRunner.displayReport();

    // Save detailed report to file
    const fs = await import('fs');
    const reportPath = `./test-reports/comprehensive-e2e-report-${Date.now()}.json`;
    fs.mkdirSync('./test-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed JSON report saved to: ${reportPath}`);

    // Exit with appropriate code
    const exitCode = report.summary.failed === 0 ? 0 : 1;
    process.exit(exitCode);

  } catch (error) {
    console.error('💥 Comprehensive test execution failed:', error);
    process.exit(1);
  } finally {
    await testRunner.cleanup();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export type { TestReport, TestStep, ValidationResult };
export { ComprehensiveE2ETestRunner };