/**
 * Comprehensive Tool Test Framework for NIST CSF 2.0 MCP Server
 * 
 * This framework provides standardized testing utilities for all 36 MCP tools,
 * categorized by complexity and dependency patterns.
 */

import { jest } from '@jest/globals';
import { TestDatabase } from './test-db.js';
import { setupCompleteToolMocking } from './database-mock.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// ============================================================================
// CORE FRAMEWORK INTERFACES
// ============================================================================

export interface ToolTestConfig {
  toolName: string;
  category: ToolCategory;
  complexity: TestComplexity;
  dependencies: ToolDependency[];
  databaseTables: string[];
  requiresFrameworkLoader: boolean;
  requiresFileSystem: boolean;
  hasBusinessLogic: boolean;
}

export type ToolCategory = 
  | 'framework-lookup'
  | 'profile-management'
  | 'assessment-execution'
  | 'risk-analysis'
  | 'planning'
  | 'progress-tracking'
  | 'benchmarking'
  | 'reporting'
  | 'evidence-management'
  | 'data-integration';

export type TestComplexity = 'simple' | 'moderate' | 'complex';

export type ToolDependency = 
  | 'database'
  | 'framework-loader'
  | 'file-system'
  | 'question-bank'
  | 'external-services'
  | 'business-logic';

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<any>;
  params: any;
  expectedResult?: any;
  expectSuccess: boolean;
  skipReason?: string;
}

// ============================================================================
// TOOL CONFIGURATION REGISTRY
// ============================================================================

export const TOOL_CONFIGS: Record<string, ToolTestConfig> = {
  // Framework Lookup & Search (Simple)
  'csf_lookup': {
    toolName: 'csf_lookup',
    category: 'framework-lookup',
    complexity: 'simple',
    dependencies: ['framework-loader'],
    databaseTables: [],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'search_framework': {
    toolName: 'search_framework',
    category: 'framework-lookup',
    complexity: 'simple',
    dependencies: ['framework-loader'],
    databaseTables: [],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'get_related_subcategories': {
    toolName: 'get_related_subcategories',
    category: 'framework-lookup',
    complexity: 'moderate',
    dependencies: ['framework-loader', 'business-logic'],
    databaseTables: [],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'get_question_context': {
    toolName: 'get_question_context',
    category: 'framework-lookup',
    complexity: 'simple',
    dependencies: ['database', 'framework-loader'],
    databaseTables: ['question_bank'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'get_implementation_guidance': {
    toolName: 'get_implementation_guidance',
    category: 'framework-lookup',
    complexity: 'simple',
    dependencies: ['framework-loader'],
    databaseTables: ['implementation_examples'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },

  // Profile & Organization Management (Moderate)
  'create_profile': {
    toolName: 'create_profile',
    category: 'profile-management',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['organization_profiles', 'profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'clone_profile': {
    toolName: 'clone_profile',
    category: 'profile-management',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'compare_profiles': {
    toolName: 'compare_profiles',
    category: 'profile-management',
    complexity: 'moderate',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Assessment Execution & Validation (Complex)
  'quick_assessment': {
    toolName: 'quick_assessment',
    category: 'assessment-execution',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'assess_maturity': {
    toolName: 'assess_maturity',
    category: 'assessment-execution',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'get_assessment_questions': {
    toolName: 'get_assessment_questions',
    category: 'assessment-execution',
    complexity: 'moderate',
    dependencies: ['database', 'framework-loader', 'question-bank'],
    databaseTables: ['question_bank', 'profiles'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'validate_assessment_responses': {
    toolName: 'validate_assessment_responses',
    category: 'assessment-execution',
    complexity: 'complex',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['question_responses', 'question_bank'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Risk & Gap Analysis (Complex)
  'calculate_risk_score': {
    toolName: 'calculate_risk_score',
    category: 'risk-analysis',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'risk_assessments'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_gap_analysis': {
    toolName: 'generate_gap_analysis',
    category: 'risk-analysis',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'gap_analyses'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'calculate_maturity_trend': {
    toolName: 'calculate_maturity_trend',
    category: 'risk-analysis',
    complexity: 'complex',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'progress_tracking'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_priority_matrix': {
    toolName: 'generate_priority_matrix',
    category: 'planning',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'priority_matrices'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Planning & Implementation (Moderate to Complex)
  'create_implementation_plan': {
    toolName: 'create_implementation_plan',
    category: 'planning',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'implementation_plans'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'estimate_implementation_cost': {
    toolName: 'estimate_implementation_cost',
    category: 'planning',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'cost_estimates'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'suggest_next_actions': {
    toolName: 'suggest_next_actions',
    category: 'planning',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_milestone': {
    toolName: 'generate_milestone',
    category: 'planning',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'milestones'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Progress Tracking (Moderate)
  'track_progress': {
    toolName: 'track_progress',
    category: 'progress-tracking',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'progress_tracking'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'track_audit_trail': {
    toolName: 'track_audit_trail',
    category: 'progress-tracking',
    complexity: 'moderate',
    dependencies: ['database'],
    databaseTables: ['audit_trail'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },

  // Industry Benchmarking (Moderate)
  'get_industry_benchmarks': {
    toolName: 'get_industry_benchmarks',
    category: 'benchmarking',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['industry_benchmarks', 'profiles'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Reporting & Export (Moderate to Complex)
  'generate_report': {
    toolName: 'generate_report',
    category: 'reporting',
    complexity: 'moderate',
    dependencies: ['database', 'framework-loader'],
    databaseTables: ['profiles', 'assessments', 'reports'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'generate_executive_report': {
    toolName: 'generate_executive_report',
    category: 'reporting',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_compliance_report': {
    toolName: 'generate_compliance_report',
    category: 'reporting',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'compliance_mappings'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_audit_report': {
    toolName: 'generate_audit_report',
    category: 'reporting',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'audit_evidence', 'audit_trail'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'create_custom_report': {
    toolName: 'create_custom_report',
    category: 'reporting',
    complexity: 'complex',
    dependencies: ['database', 'framework-loader', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'generate_dashboard': {
    toolName: 'generate_dashboard',
    category: 'reporting',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['profiles', 'assessments', 'progress_tracking'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },
  'export_data': {
    toolName: 'export_data',
    category: 'reporting',
    complexity: 'moderate',
    dependencies: ['database', 'file-system'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: true,
    hasBusinessLogic: false
  },

  // Evidence Management (Moderate)
  'upload_evidence': {
    toolName: 'upload_evidence',
    category: 'evidence-management',
    complexity: 'moderate',
    dependencies: ['database', 'file-system'],
    databaseTables: ['audit_evidence', 'profiles'],
    requiresFrameworkLoader: false,
    requiresFileSystem: true,
    hasBusinessLogic: false
  },
  'validate_evidence': {
    toolName: 'validate_evidence',
    category: 'evidence-management',
    complexity: 'moderate',
    dependencies: ['database', 'business-logic'],
    databaseTables: ['audit_evidence', 'profiles'],
    requiresFrameworkLoader: false,
    requiresFileSystem: false,
    hasBusinessLogic: true
  },

  // Data Import/Export (Moderate to Complex)
  'import_assessment': {
    toolName: 'import_assessment',
    category: 'data-integration',
    complexity: 'complex',
    dependencies: ['database', 'file-system', 'business-logic'],
    databaseTables: ['profiles', 'assessments'],
    requiresFrameworkLoader: false,
    requiresFileSystem: true,
    hasBusinessLogic: true
  },
  'generate_test_scenarios': {
    toolName: 'generate_test_scenarios',
    category: 'data-integration',
    complexity: 'moderate',
    dependencies: ['database', 'framework-loader'],
    databaseTables: ['profiles'],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'generate_policy_template': {
    toolName: 'generate_policy_template',
    category: 'data-integration',
    complexity: 'moderate',
    dependencies: ['framework-loader'],
    databaseTables: [],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  },
  'get_implementation_template': {
    toolName: 'get_implementation_template',
    category: 'data-integration',
    complexity: 'simple',
    dependencies: ['framework-loader'],
    databaseTables: [],
    requiresFrameworkLoader: true,
    requiresFileSystem: false,
    hasBusinessLogic: false
  }
};

// ============================================================================
// CORE TEST FRAMEWORK CLASS
// ============================================================================

export class ToolTestFramework {
  private toolConfig: ToolTestConfig;
  private toolHelper: any;
  private testData: any;
  private tempFiles: string[] = [];

  constructor(toolName: string) {
    this.toolConfig = TOOL_CONFIGS[toolName];
    if (!this.toolConfig) {
      throw new Error(`Tool configuration not found for: ${toolName}`);
    }
  }

  /**
   * Initialize the test framework for a specific tool
   */
  async initialize(): Promise<void> {
    // Setup database mocking if required
    if (this.toolConfig.dependencies.includes('database')) {
      this.toolHelper = setupCompleteToolMocking(this.toolConfig.toolName);
      jest.clearAllMocks();
      this.testData = this.toolHelper.beforeEachSetup();
    }

    // Setup framework loader mocking if required
    if (this.toolConfig.requiresFrameworkLoader) {
      await this.setupFrameworkMocking();
    }

    // Setup file system mocking if required
    if (this.toolConfig.requiresFileSystem) {
      await this.setupFileSystemMocking();
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    if (this.toolHelper) {
      this.toolHelper.afterEachCleanup();
    }

    // Cleanup temporary files
    for (const filePath of this.tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, ignore
      }
    }
    this.tempFiles = [];
  }

  /**
   * Setup framework loader mocking with realistic CSF data
   */
  private async setupFrameworkMocking(): Promise<void> {
    // Framework mocking is already handled in setupCompleteToolMocking
    // This is a placeholder for additional framework-specific setup
  }

  /**
   * Setup file system mocking utilities
   */
  private async setupFileSystemMocking(): Promise<void> {
    // Create temp directory for test files
    const tempDir = path.join(process.cwd(), 'temp-test-files');
    
    // Mock file operations
    jest.mock('fs/promises', () => ({
      writeFile: jest.fn(),
      readFile: jest.fn(),
      access: jest.fn(),
      stat: jest.fn(),
      mkdir: jest.fn(),
      unlink: jest.fn()
    }));
  }

  /**
   * Create a temporary test file
   */
  async createTestFile(fileName: string, content: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp-test-files');
    const filePath = path.join(tempDir, fileName);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(filePath, content);
      this.tempFiles.push(filePath);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to create test file: ${error}`);
    }
  }

  /**
   * Generate test data for the specific tool
   */
  generateTestData(): any {
    if (!this.testData) {
      // Generate minimal test data for tools that don't require database
      return this.generateMinimalTestData();
    }
    return this.testData;
  }

  /**
   * Generate minimal test data for simple tools
   */
  private generateMinimalTestData(): any {
    return {
      organization: {
        org_id: 'test-org-1',
        org_name: 'Test Organization',
        industry: 'Technology',
        size: 'medium'
      },
      profile: {
        profile_id: 'test-profile-1',
        org_id: 'test-org-1',
        profile_name: 'Test Profile',
        profile_type: 'current'
      }
    };
  }

  /**
   * Get database instance if available
   */
  getDatabase(): any {
    return this.toolHelper?.getDatabase();
  }

  /**
   * Get tool configuration
   */
  getConfig(): ToolTestConfig {
    return this.toolConfig;
  }

  /**
   * Generate realistic test parameters for the tool
   */
  generateTestParameters(): any {
    return this.generateParametersForCategory(this.toolConfig.category);
  }

  /**
   * Generate category-specific test parameters
   */
  private generateParametersForCategory(category: ToolCategory): any {
    const testData = this.generateTestData();

    switch (category) {
      case 'framework-lookup':
        return {
          element_id: 'GV.OC-01',
          search_query: 'governance',
          filters: { function: 'GV' }
        };

      case 'profile-management':
        return {
          org_name: 'Test Organization',
          sector: 'Technology', 
          size: 'medium',
          profile_name: 'Test Profile'
        };

      case 'assessment-execution':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          simplified_answers: {
            govern: 'yes',
            identify: 'partial',
            protect: 'yes',
            detect: 'no',
            respond: 'partial',
            recover: 'no'
          }
        };

      case 'risk-analysis':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          target_profile_id: 'test-target-profile',
          analysis_type: 'comprehensive'
        };

      case 'planning':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          timeline_months: 12,
          budget_range: 'medium'
        };

      case 'progress-tracking':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          subcategory_id: 'GV.OC-01',
          progress_percentage: 75
        };

      case 'benchmarking':
        return {
          industry: 'Technology',
          size: 'medium',
          profile_id: testData.profile?.profile_id || 'test-profile-1'
        };

      case 'reporting':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          report_type: 'comprehensive',
          format: 'json'
        };

      case 'evidence-management':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          subcategory_id: 'GV.OC-01',
          evidence_type: 'document'
        };

      case 'data-integration':
        return {
          profile_id: testData.profile?.profile_id || 'test-profile-1',
          data_format: 'json',
          validation_level: 'strict'
        };

      default:
        return {};
    }
  }

  /**
   * Assert successful tool result
   */
  assertSuccess(result: any): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  }

  /**
   * Assert failed tool result
   */
  assertFailure(result: any, expectedMessage?: string): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    if (expectedMessage) {
      expect(result.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert validation error
   */
  assertValidationError(result: any): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/validation|invalid|required/i);
  }
}

// ============================================================================
// TEST SCENARIO GENERATORS
// ============================================================================

export class TestScenarioGenerator {
  private framework: ToolTestFramework;

  constructor(framework: ToolTestFramework) {
    this.framework = framework;
  }

  /**
   * Generate comprehensive test scenarios for a tool
   */
  generateScenarios(): TestScenario[] {
    const config = this.framework.getConfig();
    const scenarios: TestScenario[] = [];

    // Add basic success scenarios
    scenarios.push(...this.generateSuccessScenarios());

    // Add validation error scenarios
    scenarios.push(...this.generateValidationScenarios());

    // Add edge case scenarios
    scenarios.push(...this.generateEdgeCaseScenarios());

    // Add complexity-specific scenarios
    if (config.complexity === 'complex') {
      scenarios.push(...this.generateComplexScenarios());
    }

    return scenarios;
  }

  private generateSuccessScenarios(): TestScenario[] {
    return [
      {
        name: 'should execute successfully with valid parameters',
        description: 'Basic success case with standard parameters',
        setup: async () => this.framework.generateTestData(),
        params: this.framework.generateTestParameters(),
        expectSuccess: true
      }
    ];
  }

  private generateValidationScenarios(): TestScenario[] {
    const baseParams = this.framework.generateTestParameters();
    
    return [
      {
        name: 'should reject empty parameters',
        description: 'Validation should fail with empty parameters',
        setup: async () => ({}),
        params: {},
        expectSuccess: false
      },
      {
        name: 'should reject invalid parameter types',
        description: 'Validation should fail with wrong parameter types',
        setup: async () => ({}),
        params: { ...baseParams, profile_id: 123 }, // Invalid type
        expectSuccess: false
      }
    ];
  }

  private generateEdgeCaseScenarios(): TestScenario[] {
    return [
      {
        name: 'should handle non-existent profile',
        description: 'Should gracefully handle missing profile references',
        setup: async () => ({}),
        params: { 
          ...this.framework.generateTestParameters(),
          profile_id: 'non-existent-profile-id'
        },
        expectSuccess: false
      }
    ];
  }

  private generateComplexScenarios(): TestScenario[] {
    return [
      {
        name: 'should handle complex business logic scenarios',
        description: 'Advanced scenarios with complex data relationships',
        setup: async () => this.framework.generateTestData(),
        params: this.framework.generateTestParameters(),
        expectSuccess: true
      }
    ];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a tool test framework instance
 */
export function createToolTestFramework(toolName: string): ToolTestFramework {
  return new ToolTestFramework(toolName);
}

/**
 * Generate test suite for a specific tool
 */
export function generateToolTestSuite(toolName: string, customScenarios?: TestScenario[]): void {
  const framework = createToolTestFramework(toolName);
  const config = framework.getConfig();
  const scenarioGenerator = new TestScenarioGenerator(framework);
  
  describe(`${toolName} Tool - Comprehensive Test Suite`, () => {
    beforeEach(async () => {
      await framework.initialize();
    });

    afterEach(async () => {
      await framework.cleanup();
    });

    describe('Tool Configuration', () => {
      it('should have valid configuration', () => {
        expect(config).toBeDefined();
        expect(config.toolName).toBe(toolName);
        expect(config.category).toBeDefined();
        expect(config.complexity).toBeDefined();
      });
    });

    describe('Standard Test Scenarios', () => {
      const scenarios = customScenarios || scenarioGenerator.generateScenarios();
      
      scenarios.forEach(scenario => {
        if (scenario.skipReason) {
          it.skip(`${scenario.name} - ${scenario.skipReason}`, () => {});
          return;
        }

        it(scenario.name, async () => {
          // Setup test data
          const testData = await scenario.setup();
          
          // Dynamic import of tool after mocks are set up
          const toolModule = await import(`../../src/tools/${toolName}.js`);
          const toolFunction = toolModule[Object.keys(toolModule).find(key => 
            typeof toolModule[key] === 'function' && key !== 'default'
          )];

          expect(toolFunction).toBeDefined();

          // Execute tool
          const result = await toolFunction(scenario.params);

          // Assert results
          if (scenario.expectSuccess) {
            framework.assertSuccess(result);
            if (scenario.expectedResult) {
              expect(result).toMatchObject(scenario.expectedResult);
            }
          } else {
            framework.assertFailure(result);
          }
        });
      });
    });
  });
}