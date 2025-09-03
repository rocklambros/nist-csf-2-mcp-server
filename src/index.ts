#!/usr/bin/env node
/**
 * NIST CSF 2.0 MCP Server
 * Main entry point with tool registrations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { logger } from './utils/logger.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { initializeFramework } from './services/framework-loader.js';
import { 
  initializeInstanceManager, 
  setupShutdownHandlers, 
  removeLockFile 
} from './utils/instance-manager.js';
import type { 
  SubcategoryImplementation,
  RiskAssessment,
  GapAnalysis,
  ImplementationTier
} from './types/index.js';

// Import new tools
import { csfLookup, CSFLookupSchema } from './tools/csf_lookup.js';
import { searchFramework, SearchFrameworkSchema } from './tools/search_framework.js';
import { getRelatedSubcategories, GetRelatedSubcategoriesSchema } from './tools/get_related_subcategories.js';
import { createProfile, CreateProfileSchema } from './tools/create_profile.js';
import { cloneProfile, CloneProfileSchema } from './tools/clone_profile.js';
import { quickAssessment, QuickAssessmentSchema } from './tools/quick_assessment.js';
import { assessMaturity, AssessMaturitySchema } from './tools/assess_maturity.js';
import { calculateRiskScore, CalculateRiskScoreSchema } from './tools/calculate_risk_score.js';
import { calculateMaturityTrend, CalculateMaturityTrendSchema } from './tools/calculate_maturity_trend.js';
import { generateGapAnalysis, GenerateGapAnalysisSchema } from './tools/generate_gap_analysis.js';
import { generatePriorityMatrix, GeneratePriorityMatrixSchema } from './tools/generate_priority_matrix.js';
import { createImplementationPlan, CreateImplementationPlanSchema } from './tools/create_implementation_plan.js';
import { estimateImplementationCost, EstimateImplementationCostSchema } from './tools/estimate_implementation_cost.js';
import { suggestNextActions, SuggestNextActionsSchema } from './tools/suggest_next_actions.js';
import { trackProgressTool } from './tools/track_progress.js';
import { getIndustryBenchmarksTool } from './tools/get_industry_benchmarks.js';
import { generateReportTool } from './tools/generate_report.js';
import { compareProfilesTool } from './tools/compare_profiles.js';
import { exportDataTool } from './tools/export_data.js';
import { importAssessmentTool } from './tools/import_assessment.js';
import { validateEvidenceTool } from './tools/validate_evidence.js';
import { getImplementationTemplateTool } from './tools/get_implementation_template.js';
import { generatePolicyTemplateTool } from './tools/generate_policy_template.js';
// import { generateTestScenariosTool } from './tools/generate_test_scenarios.js'; // DOCKER WORKAROUND

// Question Bank Tools
import { getAssessmentQuestions, getAssessmentQuestionsTool } from './tools/get_assessment_questions.js';
import { validateAssessmentResponses, validateAssessmentResponsesTool } from './tools/validate_assessment_responses.js';
import { getQuestionContext, getQuestionContextTool } from './tools/get_question_context.js';

// Data Management Tools
import { resetOrganizationalData, resetOrganizationalDataTool } from './tools/reset_organizational_data.js';

// Comprehensive Assessment Workflow Tools
import { 
  startAssessmentWorkflow, 
  StartAssessmentWorkflowSchema,
  checkAssessmentWorkflowStatus,
  CheckAssessmentWorkflowSchema
} from './tools/comprehensive_assessment_workflow.js';

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

const QueryFrameworkSchema = z.object({
  function: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  keyword: z.string().optional(),
  limit: z.number().min(1).max(100).default(20)
});

const GetElementSchema = z.object({
  element_id: z.string()
});

const CreateOrganizationSchema = z.object({
  org_id: z.string(),
  org_name: z.string(),
  industry: z.string(),
  size: z.string(),
  current_tier: z.string().optional(),
  target_tier: z.string().optional()
});

const RecordImplementationSchema = z.object({
  org_id: z.string(),
  subcategory_id: z.string(),
  implementation_status: z.enum(['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented']),
  maturity_level: z.number().min(0).max(5),
  notes: z.string().optional(),
  assessed_by: z.string().optional()
});

const RecordRiskSchema = z.object({
  org_id: z.string(),
  element_id: z.string(),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation_status: z.string(),
  mitigation_plan: z.string().optional()
});

const RecordGapSchema = z.object({
  org_id: z.string(),
  category_id: z.string(),
  current_score: z.number().min(0).max(5),
  target_score: z.number().min(0).max(5),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  estimated_effort: z.string().optional()
});

const GetAssessmentSchema = z.object({
  profile_id: z.string(),
  assessment_type: z.enum(['implementations', 'risks', 'gaps']).optional()
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function main() {
  logger.info('Starting NIST CSF 2.0 MCP Server...');

  // Initialize instance management and prevent duplicates
  const forceTerminate = process.env.FORCE_TERMINATE === 'true';
  if (!initializeInstanceManager(forceTerminate)) {
    logger.error('Failed to initialize - another instance is running');
    process.exit(1);
  }

  // Initialize services
  const framework = await initializeFramework();
  const db = getDatabase();
  
  logger.info('Services initialized successfully');

  // Create MCP server
  const server = new Server(
    {
      name: 'nist-csf-2-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    }
  );

  // ============================================================================
  // TOOL HANDLERS
  // ============================================================================

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'query_framework',
        description: 'Query NIST CSF 2.0 framework elements',
        inputSchema: {
          type: 'object',
          properties: {
            function: { type: 'string', description: 'Function ID (e.g., GV, ID, PR)' },
            category: { type: 'string', description: 'Category ID (e.g., GV.OC)' },
            subcategory: { type: 'string', description: 'Subcategory ID (e.g., GV.OC-01)' },
            keyword: { type: 'string', description: 'Search keyword' },
            limit: { type: 'number', description: 'Maximum results (1-100)', default: 20 }
          }
        }
      },
      {
        name: 'get_element',
        description: 'Get a specific CSF element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            element_id: { type: 'string', description: 'Element identifier' }
          },
          required: ['element_id']
        }
      },
      {
        name: 'get_implementation_examples',
        description: 'Get implementation examples for a subcategory',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_id: { type: 'string', description: 'Subcategory ID (e.g., GV.OC-01)' }
          },
          required: ['subcategory_id']
        }
      },
      {
        name: 'create_organization',
        description: 'Create a new organization profile',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'string', description: 'Organization identifier' },
            org_name: { type: 'string', description: 'Organization name' },
            industry: { type: 'string', description: 'Industry sector' },
            size: { type: 'string', description: 'Organization size' },
            current_tier: { type: 'string', description: 'Current implementation tier' },
            target_tier: { type: 'string', description: 'Target implementation tier' }
          },
          required: ['org_id', 'org_name', 'industry', 'size']
        }
      },
      {
        name: 'record_implementation',
        description: 'Record subcategory implementation status',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'string', description: 'Organization ID' },
            subcategory_id: { type: 'string', description: 'Subcategory ID' },
            implementation_status: { 
              type: 'string', 
              enum: ['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented']
            },
            maturity_level: { type: 'number', description: 'Maturity level (0-5)' },
            notes: { type: 'string', description: 'Implementation notes' },
            assessed_by: { type: 'string', description: 'Assessor name' }
          },
          required: ['org_id', 'subcategory_id', 'implementation_status', 'maturity_level']
        }
      },
      {
        name: 'record_risk',
        description: 'Record risk assessment for an element',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'string', description: 'Organization ID' },
            element_id: { type: 'string', description: 'Element ID' },
            risk_level: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
            likelihood: { type: 'number', description: 'Likelihood (1-5)' },
            impact: { type: 'number', description: 'Impact (1-5)' },
            mitigation_status: { type: 'string', description: 'Mitigation status' },
            mitigation_plan: { type: 'string', description: 'Mitigation plan' }
          },
          required: ['org_id', 'element_id', 'risk_level', 'likelihood', 'impact', 'mitigation_status']
        }
      },
      {
        name: 'record_gap',
        description: 'Record gap analysis for a category',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'string', description: 'Organization ID' },
            category_id: { type: 'string', description: 'Category ID' },
            current_score: { type: 'number', description: 'Current maturity (0-5)' },
            target_score: { type: 'number', description: 'Target maturity (0-5)' },
            priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
            estimated_effort: { type: 'string', description: 'Effort estimate' }
          },
          required: ['org_id', 'category_id', 'current_score', 'target_score', 'priority']
        }
      },
      {
        name: 'get_assessment',
        description: 'Get assessment data for a profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to assess' },
            assessment_type: { 
              type: 'string', 
              enum: ['implementations', 'risks', 'gaps'],
              description: 'Type of assessment to retrieve'
            }
          },
          required: ['profile_id']
        }
      },
      {
        name: 'get_framework_stats',
        description: 'Get framework and database statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'csf_lookup',
        description: 'Retrieve specific CSF guidance with partial matching support',
        inputSchema: {
          type: 'object',
          properties: {
            function_id: { type: 'string', description: 'Function ID (supports partial match)' },
            category_id: { type: 'string', description: 'Category ID (supports partial match)' },
            subcategory_id: { type: 'string', description: 'Subcategory ID (supports partial match)' },
            include_examples: { type: 'boolean', description: 'Include implementation examples', default: true },
            include_relationships: { type: 'boolean', description: 'Include relationships', default: true }
          }
        }
      },
      {
        name: 'search_framework',
        description: 'Full-text search across the CSF framework with fuzzy matching',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (min 2 characters)' },
            element_types: { 
              type: 'array', 
              items: { type: 'string', enum: ['function', 'category', 'subcategory', 'implementation_example'] },
              description: 'Filter by element types' 
            },
            limit: { type: 'number', description: 'Maximum results (1-100)', default: 20 },
            fuzzy: { type: 'boolean', description: 'Enable fuzzy matching', default: true },
            min_score: { type: 'number', description: 'Minimum score threshold (0-1)', default: 0.3 }
          },
          required: ['query']
        }
      },
      {
        name: 'get_related_subcategories',
        description: 'Find related subcategories and analyze relationships',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_id: { type: 'string', description: 'Source subcategory ID' },
            relationship_types: { 
              type: 'array', 
              items: { type: 'string', enum: ['projection', 'related_to', 'supersedes', 'incorporated_into'] },
              description: 'Filter by relationship types'
            },
            include_bidirectional: { type: 'boolean', description: 'Include incoming relationships', default: true },
            depth: { type: 'number', description: 'Relationship traversal depth (1-3)', default: 1 },
            include_details: { type: 'boolean', description: 'Include additional details', default: true }
          },
          required: ['subcategory_id']
        }
      },
      {
        name: 'create_profile',
        description: 'Create new organization and security profile',
        inputSchema: {
          type: 'object',
          properties: {
            org_name: { type: 'string', description: 'Organization name' },
            sector: { type: 'string', description: 'Industry sector' },
            size: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'], description: 'Organization size' },
            profile_type: { type: 'string', enum: ['baseline', 'target', 'current', 'custom'], description: 'Profile type', default: 'current' },
            profile_name: { type: 'string', description: 'Custom profile name (optional)' },
            description: { type: 'string', description: 'Profile description' },
            created_by: { type: 'string', description: 'Creator name' },
            current_tier: { type: 'string', description: 'Current implementation tier' },
            target_tier: { type: 'string', description: 'Target implementation tier' }
          },
          required: ['org_name', 'sector', 'size']
        }
      },
      {
        name: 'clone_profile',
        description: 'Duplicate an existing profile with modifications',
        inputSchema: {
          type: 'object',
          properties: {
            source_profile_id: { type: 'string', description: 'Source profile ID to clone' },
            new_name: { type: 'string', description: 'Name for the new profile' },
            modifications: {
              type: 'object',
              description: 'Optional modifications to apply',
              properties: {
                profile_type: { type: 'string', enum: ['baseline', 'target', 'current', 'custom'] },
                description: { type: 'string' },
                created_by: { type: 'string' },
                adjustments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      subcategory_id: { type: 'string' },
                      implementation_level: { type: 'string', enum: ['not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented'] },
                      maturity_score: { type: 'number', minimum: 0, maximum: 5 },
                      notes: { type: 'string' }
                    },
                    required: ['subcategory_id']
                  }
                }
              }
            }
          },
          required: ['source_profile_id', 'new_name']
        }
      },
      {
        name: 'quick_assessment',
        description: 'Interactive cybersecurity assessment - presents questions for each CSF function and collects real user responses. Call with only profile_id to see questions, then call again with your answers.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to assess' },
            simplified_answers: {
              type: 'object',
              description: 'Your answers for each function (optional - if not provided, questions will be presented)',
              properties: {
                govern: { type: 'string', enum: ['yes', 'no', 'partial'] },
                identify: { type: 'string', enum: ['yes', 'no', 'partial'] },
                protect: { type: 'string', enum: ['yes', 'no', 'partial'] },
                detect: { type: 'string', enum: ['yes', 'no', 'partial'] },
                respond: { type: 'string', enum: ['yes', 'no', 'partial'] },
                recover: { type: 'string', enum: ['yes', 'no', 'partial'] }
              }
            },
            interactive: { type: 'boolean', description: 'Enable interactive question mode (default: true)', default: true },
            assessed_by: { type: 'string', description: 'Assessor name' },
            confidence_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Confidence level', default: 'medium' },
            notes: {
              type: 'object',
              description: 'Optional notes for each function',
              properties: {
                govern: { type: 'string' },
                identify: { type: 'string' },
                protect: { type: 'string' },
                detect: { type: 'string' },
                respond: { type: 'string' },
                recover: { type: 'string' }
              }
            }
          },
          required: ['profile_id', 'simplified_answers']
        }
      },
      {
        name: 'assess_maturity',
        description: 'Calculate maturity tier for each CSF function',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to assess' },
            include_recommendations: { type: 'boolean', description: 'Include recommendations', default: true },
            include_subcategory_details: { type: 'boolean', description: 'Include subcategory details', default: false }
          },
          required: ['profile_id']
        }
      },
      {
        name: 'calculate_risk_score',
        description: 'Calculate risk score based on unimplemented subcategories',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to assess' },
            threat_weights: {
              type: 'object',
              description: 'Custom threat weights by function',
              properties: {
                govern: { type: 'number', minimum: 0, maximum: 2, default: 1.5 },
                identify: { type: 'number', minimum: 0, maximum: 2, default: 1.3 },
                protect: { type: 'number', minimum: 0, maximum: 2, default: 1.4 },
                detect: { type: 'number', minimum: 0, maximum: 2, default: 1.2 },
                respond: { type: 'number', minimum: 0, maximum: 2, default: 1.1 },
                recover: { type: 'number', minimum: 0, maximum: 2, default: 1.0 }
              }
            },
            include_heat_map: { type: 'boolean', description: 'Include heat map data', default: true },
            include_recommendations: { type: 'boolean', description: 'Include recommendations', default: true }
          },
          required: ['profile_id']
        }
      },
      {
        name: 'calculate_maturity_trend',
        description: 'Analyze historical assessments and calculate maturity trends',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to analyze' },
            date_range: {
              type: 'object',
              description: 'Date range for analysis',
              properties: {
                start_date: { type: 'string', description: 'Start date (ISO format)' },
                end_date: { type: 'string', description: 'End date (ISO format)' }
              }
            },
            include_projections: { type: 'boolean', description: 'Include future projections', default: true },
            include_velocity_analysis: { type: 'boolean', description: 'Include velocity analysis', default: true },
            aggregation_period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Aggregation period', default: 'weekly' }
          },
          required: ['profile_id']
        }
      },
      {
        name: 'generate_gap_analysis',
        description: 'Generate comprehensive gap analysis between current and target profiles',
        inputSchema: {
          type: 'object',
          properties: {
            current_profile_id: { type: 'string', description: 'Current profile ID' },
            target_profile_id: { type: 'string', description: 'Target profile ID' },
            include_priority_matrix: { type: 'boolean', description: 'Include priority matrix', default: true },
            include_visualizations: { type: 'boolean', description: 'Include visualizations', default: true },
            minimum_gap_score: { type: 'number', description: 'Minimum gap score threshold (0-100)', default: 0 }
          },
          required: ['current_profile_id', 'target_profile_id']
        }
      },
      {
        name: 'generate_priority_matrix',
        description: 'Generate 2x2 priority matrix for gap remediation planning',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            target_profile_id: { type: 'string', description: 'Target profile ID (optional)' },
            matrix_type: { 
              type: 'string', 
              enum: ['effort_impact', 'risk_feasibility', 'cost_benefit'],
              description: 'Type of priority matrix',
              default: 'effort_impact'
            },
            include_recommendations: { type: 'boolean', description: 'Include recommendations', default: true },
            include_resource_estimates: { type: 'boolean', description: 'Include resource estimates', default: true },
            max_items_per_quadrant: { type: 'number', description: 'Max items per quadrant (1-20)', default: 10 }
          },
          required: ['profile_id']
        }
      },
      {
        name: 'create_implementation_plan',
        description: 'Generate phased implementation roadmap with dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            gap_analysis_id: { type: 'string', description: 'Gap analysis ID' },
            timeline_months: { type: 'number', description: 'Timeline in months (1-36)' },
            available_resources: { type: 'number', description: 'Available resources (1-100)' },
            plan_name: { type: 'string', description: 'Plan name (optional)' },
            prioritization_strategy: { 
              type: 'string', 
              enum: ['risk_based', 'quick_wins', 'balanced', 'dependencies_first'],
              description: 'Prioritization strategy',
              default: 'balanced'
            },
            phase_duration: { type: 'number', description: 'Phase duration in months (1-6)', default: 3 },
            include_dependencies: { type: 'boolean', description: 'Include dependency analysis', default: true },
            include_milestones: { type: 'boolean', description: 'Include milestones', default: true }
          },
          required: ['gap_analysis_id', 'timeline_months', 'available_resources']
        }
      },
      {
        name: 'estimate_implementation_cost',
        description: 'Calculate detailed cost breakdown for implementation',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_ids: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'List of subcategory IDs'
            },
            organization_size: { 
              type: 'string', 
              enum: ['small', 'medium', 'large', 'enterprise'],
              description: 'Organization size'
            },
            include_ongoing_costs: { type: 'boolean', description: 'Include ongoing costs', default: true },
            include_risk_adjusted: { type: 'boolean', description: 'Include risk-adjusted estimates', default: true },
            currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'], description: 'Currency', default: 'USD' },
            labor_rate_override: { type: 'number', description: 'Override labor rate (optional)' },
            include_contingency: { type: 'boolean', description: 'Include contingency', default: true }
          },
          required: ['subcategory_ids', 'organization_size']
        }
      },
      {
        name: 'suggest_next_actions',
        description: 'Recommend prioritized actions based on available capacity',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            capacity_hours_per_week: { type: 'number', description: 'Available hours per week (1-168)' },
            time_horizon_weeks: { type: 'number', description: 'Time horizon in weeks (1-12)', default: 4 },
            focus_area: { 
              type: 'string', 
              enum: ['all', 'govern', 'identify', 'protect', 'detect', 'respond', 'recover'],
              description: 'Focus area',
              default: 'all'
            },
            optimization_goal: { 
              type: 'string', 
              enum: ['quick_wins', 'risk_reduction', 'compliance', 'balanced'],
              description: 'Optimization goal',
              default: 'balanced'
            },
            include_dependencies: { type: 'boolean', description: 'Include dependency analysis', default: true },
            include_justification: { type: 'boolean', description: 'Include justification', default: true }
          },
          required: ['profile_id', 'capacity_hours_per_week']
        }
      },
      {
        name: 'track_progress',
        description: 'Track implementation progress for NIST CSF subcategories with UPSERT operations',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'ID of the profile to track progress for' },
            updates: {
              type: 'array',
              description: 'Array of subcategory progress updates',
              items: {
                type: 'object',
                properties: {
                  subcategory_id: { type: 'string', description: 'ID of the subcategory to update' },
                  current_implementation: { type: 'string', description: 'Current implementation level description' },
                  current_maturity: { type: 'number', description: 'Current maturity level (1-5)' },
                  status: { 
                    type: 'string', 
                    enum: ['on_track', 'at_risk', 'behind', 'blocked', 'completed'],
                    description: 'Current status of the subcategory implementation'
                  },
                  is_blocked: { type: 'boolean', description: 'Whether this subcategory is blocked' },
                  blocking_reason: { type: 'string', description: 'Reason why the subcategory is blocked' },
                  notes: { type: 'string', description: 'Additional notes about the progress' }
                },
                required: ['subcategory_id']
              }
            }
          },
          required: ['profile_id', 'updates']
        }
      },
      {
        name: 'get_industry_benchmarks',
        description: 'Compare organization against industry benchmarks and peer organizations',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'ID of the profile to benchmark' },
            industry: {
              type: 'string',
              enum: ['Financial Services', 'Healthcare', 'Manufacturing', 'Retail', 'Technology', 'Government', 'Energy'],
              description: 'Industry sector'
            },
            organization_size: {
              type: 'string',
              enum: ['small', 'medium', 'large', 'enterprise'],
              description: 'Organization size'
            }
          },
          required: ['profile_id', 'industry', 'organization_size']
        }
      },
      {
        name: 'generate_report',
        description: 'Generate formatted reports for NIST CSF assessments and progress',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'ID of the profile to generate report for' },
            report_type: {
              type: 'string',
              enum: ['executive', 'technical', 'audit', 'progress'],
              description: 'Type of report to generate'
            },
            format: {
              type: 'string',
              enum: ['html', 'json', 'docx', 'pdf'],
              description: 'Output format for the report'
            },
            include_charts: { type: 'boolean', description: 'Include charts in HTML reports', default: true },
            include_recommendations: { type: 'boolean', description: 'Include recommendations', default: true },
            output_path: { type: 'string', description: 'Optional output directory path' }
          },
          required: ['profile_id', 'report_type', 'format']
        }
      },
      {
        name: 'compare_profiles',
        description: 'Compare multiple profiles to identify differences and similarities',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'array',
              description: 'Array of profile IDs to compare (2-5 profiles)',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 5
            }
          },
          required: ['profile_ids']
        }
      },
      {
        name: 'export_data',
        description: 'Export profile assessment data in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'ID of the profile to export' },
            format: {
              type: 'string',
              enum: ['csv', 'json', 'excel'],
              description: 'Export format'
            },
            include_assessments: { type: 'boolean', description: 'Include assessment data', default: true },
            include_progress: { type: 'boolean', description: 'Include progress tracking data', default: true },
            include_compliance: { type: 'boolean', description: 'Include compliance mapping data', default: true },
            include_milestones: { type: 'boolean', description: 'Include milestone data', default: true },
            output_path: { type: 'string', description: 'Optional output directory path' },
            return_as_base64: { type: 'boolean', description: 'Return as base64 string', default: false }
          },
          required: ['profile_id', 'format']
        }
      },
      {
        name: 'import_assessment',
        description: 'Import assessment data from CSV, Excel, or JSON files',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to the file to import' },
            format: {
              type: 'string',
              enum: ['csv', 'excel', 'json'],
              description: 'File format'
            },
            profile_id: { type: 'string', description: 'ID of the profile to import assessments into' },
            conflict_mode: {
              type: 'string',
              enum: ['skip', 'overwrite', 'merge'],
              description: 'How to handle conflicts with existing assessments',
              default: 'overwrite'
            },
            validate_only: {
              type: 'boolean',
              description: 'Only validate the file without importing',
              default: false
            }
          },
          required: ['file_path', 'format', 'profile_id']
        }
      },
      {
        name: 'validate_evidence',
        description: 'Validate and store evidence files for assessments',
        inputSchema: {
          type: 'object',
          properties: {
            assessment_id: { type: 'string', description: 'ID of the assessment to attach evidence to' },
            evidence_files: {
              type: 'array',
              description: 'Array of evidence files to validate',
              items: {
                type: 'object',
                properties: {
                  file_path: { type: 'string', description: 'Path to the evidence file' },
                  evidence_type: {
                    type: 'string',
                    enum: ['screenshot', 'document', 'log', 'report', 'config', 'other'],
                    description: 'Type of evidence'
                  },
                  description: { type: 'string', description: 'Description of the evidence' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags for categorizing evidence'
                  }
                },
                required: ['file_path']
              }
            },
            profile_id: { type: 'string', description: 'Profile ID (optional if can be determined from assessment)' },
            subcategory_id: { type: 'string', description: 'Subcategory ID (optional if can be determined from assessment)' },
            uploaded_by: { type: 'string', description: 'Name or ID of the uploader' },
            auto_validate: {
              type: 'boolean',
              description: 'Automatically validate files based on type and size',
              default: false
            }
          },
          required: ['assessment_id', 'evidence_files']
        }
      },
      {
        name: 'get_implementation_template',
        description: 'Generate detailed implementation guide for NIST CSF subcategories',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_id: {
              type: 'string',
              description: 'NIST CSF subcategory ID (e.g., GV.OC-01)'
            },
            industry: {
              type: 'string',
              enum: ['financial_services', 'healthcare', 'manufacturing', 'technology', 'government', 'retail', 'energy'],
              description: 'Industry sector for specific guidance'
            },
            organization_size: {
              type: 'string',
              enum: ['small', 'medium', 'large', 'enterprise'],
              description: 'Organization size for resource planning'
            },
            include_examples: {
              type: 'boolean',
              description: 'Include example configurations',
              default: true
            },
            include_tools: {
              type: 'boolean',
              description: 'Include recommended tools',
              default: true
            },
            include_metrics: {
              type: 'boolean',
              description: 'Include success metrics',
              default: true
            }
          },
          required: ['subcategory_id']
        }
      },
      {
        name: 'generate_policy_template',
        description: 'Generate policy document templates based on NIST CSF subcategories',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_ids: {
              type: 'array',
              description: 'Array of NIST CSF subcategory IDs to cover in policy',
              items: {
                type: 'string'
              }
            },
            policy_type: {
              type: 'string',
              enum: ['security', 'operational', 'compliance', 'governance'],
              description: 'Type of policy to generate'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'structured'],
              description: 'Output format for the policy',
              default: 'markdown'
            },
            include_procedures: {
              type: 'boolean',
              description: 'Include detailed procedures section',
              default: true
            },
            include_compliance_mapping: {
              type: 'boolean',
              description: 'Include compliance framework mappings',
              default: true
            }
          },
          required: ['subcategory_ids']
        }
      },
      {
        name: 'generate_test_scenarios',
        description: 'Generate validation test cases for NIST CSF subcategories',
        inputSchema: {
          type: 'object',
          properties: {
            subcategory_id: {
              type: 'string',
              description: 'NIST CSF subcategory ID to generate tests for'
            },
            test_type: {
              type: 'string',
              enum: ['functional', 'security', 'compliance', 'performance', 'all'],
              description: 'Type of tests to generate',
              default: 'all'
            },
            include_scripts: {
              type: 'boolean',
              description: 'Include test script templates',
              default: true
            },
            include_tools: {
              type: 'boolean',
              description: 'Include recommended testing tools',
              default: true
            },
            severity_levels: {
              type: 'array',
              description: 'Severity levels to include',
              items: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical']
              },
              default: ['low', 'medium', 'high', 'critical']
            }
          },
          required: ['subcategory_id']
        }
      },
      // Question Bank Tools
      {
        name: 'get_assessment_questions',
        description: 'Retrieve comprehensive assessment questions based on NIST CSF 2.0 subcategories with context-aware customization',
        inputSchema: getAssessmentQuestionsTool.inputSchema
      },
      {
        name: 'validate_assessment_responses',
        description: 'Validate assessment responses for completeness, consistency, and data integrity with comprehensive error reporting',
        inputSchema: validateAssessmentResponsesTool.inputSchema
      },
      {
        name: 'get_question_context',
        description: 'Retrieve detailed context, guidance, and examples for specific NIST CSF assessment questions with sector and size-specific recommendations',
        inputSchema: getQuestionContextTool.inputSchema
      },
      {
        name: 'reset_organizational_data',
        description: resetOrganizationalDataTool.description,
        inputSchema: resetOrganizationalDataTool.inputSchema
      },
      {
        name: 'start_assessment_workflow',
        description: 'Start a comprehensive NIST CSF 2.0 assessment workflow with proper data collection',
        inputSchema: {
          type: 'object',
          properties: {
            org_name: { type: 'string', description: 'Organization name' },
            sector: { type: 'string', description: 'Industry sector' },
            size: { 
              type: 'string', 
              enum: ['small', 'medium', 'large', 'enterprise'],
              description: 'Organization size'
            },
            contact_name: { type: 'string', description: 'Contact person name' },
            contact_email: { type: 'string', description: 'Contact email address' },
            description: { type: 'string', description: 'Organization description' },
            assessment_scope: {
              type: 'string',
              enum: ['full', 'specific_functions'],
              default: 'full',
              description: 'Scope of assessment'
            },
            target_functions: {
              type: 'array',
              items: { type: 'string', enum: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'] },
              description: 'Target functions for specific scope'
            },
            timeline_weeks: {
              type: 'number',
              minimum: 1,
              maximum: 52,
              default: 8,
              description: 'Timeline in weeks'
            }
          },
          required: ['org_name', 'sector', 'size', 'contact_name', 'contact_email']
        }
      },
      {
        name: 'check_assessment_workflow_status',
        description: 'Check the status of an assessment workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string', description: 'Workflow ID to check' }
          },
          required: ['workflow_id']
        }
      }
    ],
  }));

  // Handle prompts list (required by MCP protocol)
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: []
  }));

  // Handle resources list (required by MCP protocol)  
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: []
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'query_framework': {
          const params = QueryFrameworkSchema.parse(args);
          const results: any[] = [];

          if (params.keyword) {
            // Search by keyword
            const elements = framework.searchElements(params.keyword);
            results.push(...elements.slice(0, params.limit));
          } else if (params.subcategory) {
            // Get specific subcategory
            const subcategory = framework.getSubcategory(params.subcategory);
            if (subcategory) results.push(subcategory);
          } else if (params.category) {
            // Get subcategories for category
            const subcategories = framework.getSubcategoriesForCategory(params.category);
            results.push(...subcategories.slice(0, params.limit));
          } else if (params.function) {
            // Get categories for function
            const categories = framework.getCategoriesForFunction(params.function);
            results.push(...categories.slice(0, params.limit));
          } else {
            // Get all functions
            const functions = framework.getFunctions();
            results.push(...functions);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data: results }, null, 2)
              }
            ]
          };
        }

        case 'get_element': {
          const params = GetElementSchema.parse(args);
          const element = framework.getElementById(params.element_id);
          
          if (!element) {
            throw new McpError(ErrorCode.InvalidRequest, `Element not found: ${params.element_id}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data: element }, null, 2)
              }
            ]
          };
        }

        case 'get_implementation_examples': {
          const params = GetElementSchema.parse(args);
          const examples = framework.getImplementationExamples(params.element_id);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data: examples }, null, 2)
              }
            ]
          };
        }

        case 'create_organization': {
          const params = CreateOrganizationSchema.parse(args);
          
          try {
            db.createOrganization({
              org_id: params.org_id,
              org_name: params.org_name,
              industry: params.industry,
              size: params.size,
              current_tier: params.current_tier as ImplementationTier | undefined,
              target_tier: params.target_tier as ImplementationTier | undefined
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ 
                    success: true, 
                    message: `Organization ${params.org_id} created successfully` 
                  }, null, 2)
                }
              ]
            };
          } catch (error: any) {
            if (error.message && error.message.includes('UNIQUE constraint')) {
              throw new McpError(ErrorCode.InvalidRequest, `Organization ${params.org_id} already exists`);
            }
            throw error;
          }
        }

        case 'record_implementation': {
          const params = RecordImplementationSchema.parse(args);
          
          const impl: SubcategoryImplementation = {
            org_id: params.org_id,
            subcategory_id: params.subcategory_id,
            implementation_status: params.implementation_status,
            maturity_level: params.maturity_level,
            notes: params.notes,
            assessed_by: params.assessed_by,
            last_assessed: new Date()
          };
          
          db.upsertImplementation(impl);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  success: true, 
                  message: 'Implementation status recorded' 
                }, null, 2)
              }
            ]
          };
        }

        case 'record_risk': {
          const params = RecordRiskSchema.parse(args);
          
          const risk: RiskAssessment = {
            org_id: params.org_id,
            element_id: params.element_id,
            risk_level: params.risk_level,
            likelihood: params.likelihood,
            impact: params.impact,
            mitigation_status: params.mitigation_status,
            mitigation_plan: params.mitigation_plan,
            risk_score: (params.likelihood * params.impact) / 5.0,
            assessment_date: new Date()
          };
          
          db.upsertRiskAssessment(risk);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  success: true, 
                  message: 'Risk assessment recorded' 
                }, null, 2)
              }
            ]
          };
        }

        case 'record_gap': {
          const params = RecordGapSchema.parse(args);
          
          const gap: GapAnalysis = {
            org_id: params.org_id,
            category_id: params.category_id,
            current_score: params.current_score,
            target_score: params.target_score,
            priority: params.priority,
            estimated_effort: params.estimated_effort,
            gap_score: params.target_score - params.current_score,
            analysis_date: new Date()
          };
          
          db.upsertGapAnalysis(gap);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  success: true, 
                  message: 'Gap analysis recorded' 
                }, null, 2)
              }
            ]
          };
        }

        case 'get_assessment': {
          const params = GetAssessmentSchema.parse(args);
          
          const profile = db.getProfile(params.profile_id);
          if (!profile) {
            throw new McpError(ErrorCode.InvalidRequest, `Profile not found: ${params.profile_id}`);
          }
          
          const org = db.getOrganization((profile as any).org_id);
          if (!org) {
            throw new McpError(ErrorCode.InvalidRequest, `Organization not found for profile: ${params.profile_id}`);
          }

          const data: any = { organization: org, profile };
          
          if (!params.assessment_type || params.assessment_type === 'implementations') {
            data.implementations = db.getProfileAssessments(params.profile_id);
          }
          if (!params.assessment_type || params.assessment_type === 'risks') {
            data.risks = db.getRiskAssessments((profile as any).org_id);
          }
          if (!params.assessment_type || params.assessment_type === 'gaps') {
            data.gaps = db.getGapAnalyses(params.profile_id);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data }, null, 2)
              }
            ]
          };
        }

        case 'get_framework_stats': {
          const frameworkStats = framework.getStats();
          const dbStats = db.getStats();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  success: true, 
                  data: {
                    framework: frameworkStats,
                    database: dbStats
                  }
                }, null, 2)
              }
            ]
          };
        }

        case 'csf_lookup': {
          const params = CSFLookupSchema.parse(args);
          const result = await csfLookup(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'search_framework': {
          const params = SearchFrameworkSchema.parse(args);
          const result = await searchFramework(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'get_related_subcategories': {
          const params = GetRelatedSubcategoriesSchema.parse(args);
          const result = await getRelatedSubcategories(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'create_profile': {
          const params = CreateProfileSchema.parse(args);
          const result = await createProfile(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'clone_profile': {
          const params = CloneProfileSchema.parse(args);
          const result = await cloneProfile(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'quick_assessment': {
          const params = QuickAssessmentSchema.parse(args);
          const result = await quickAssessment(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'assess_maturity': {
          const params = AssessMaturitySchema.parse(args);
          const result = await assessMaturity(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'calculate_risk_score': {
          const params = CalculateRiskScoreSchema.parse(args);
          const result = await calculateRiskScore(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'calculate_maturity_trend': {
          const params = CalculateMaturityTrendSchema.parse(args);
          const result = await calculateMaturityTrend(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'generate_gap_analysis': {
          const params = GenerateGapAnalysisSchema.parse(args);
          const result = await generateGapAnalysis(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'generate_priority_matrix': {
          const params = GeneratePriorityMatrixSchema.parse(args);
          const result = await generatePriorityMatrix(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'create_implementation_plan': {
          const params = CreateImplementationPlanSchema.parse(args);
          const result = await createImplementationPlan(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'estimate_implementation_cost': {
          const params = EstimateImplementationCostSchema.parse(args);
          const result = await estimateImplementationCost(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'suggest_next_actions': {
          const params = SuggestNextActionsSchema.parse(args);
          const result = await suggestNextActions(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'track_progress': {
          const result = await trackProgressTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'get_industry_benchmarks': {
          const result = await getIndustryBenchmarksTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'generate_report': {
          const result = await generateReportTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'compare_profiles': {
          const result = await compareProfilesTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'export_data': {
          const result = await exportDataTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'import_assessment': {
          const result = await importAssessmentTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'validate_evidence': {
          const result = await validateEvidenceTool.execute(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'get_implementation_template': {
          const result = await getImplementationTemplateTool.execute(args as any, db, framework);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'generate_policy_template': {
          const result = await generatePolicyTemplateTool.execute(args as any, db, framework);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'generate_test_scenarios': {
          // DOCKER WORKAROUND - Temporarily disabled due to TypeScript module resolution issue in Docker
          const result = { status: "temporarily_disabled", message: "generate_test_scenarios temporarily disabled for Docker compatibility - will be restored in future update" };
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        // Question Bank Tool Handlers
        case 'get_assessment_questions': {
          const result = await getAssessmentQuestions(args as any);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'validate_assessment_responses': {
          const result = await validateAssessmentResponses(args as any, db);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'get_question_context': {
          const result = await getQuestionContext(args as any);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'reset_organizational_data': {
          const result = await resetOrganizationalData(args as any);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'start_assessment_workflow': {
          const params = StartAssessmentWorkflowSchema.parse(args);
          const result = await startAssessmentWorkflow(params);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'check_assessment_workflow_status': {
          const params = CheckAssessmentWorkflowSchema.parse(args);
          const result = await checkAssessmentWorkflowStatus({ 
            workflow_id: params.workflow_id
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      if (error instanceof McpError) {
        throw error;
      }
      
      logger.error(`Tool execution error: ${name}`, error);
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });

  // ============================================================================
  // SERVER STARTUP
  // ============================================================================

  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  logger.info('NIST CSF 2.0 MCP Server running on stdio transport');

  // Setup graceful shutdown handlers
  setupShutdownHandlers(async () => {
    logger.info('Cleaning up resources...');
    try {
      closeDatabase();
      await server.close();
      logger.info('Resources cleaned up successfully');
    } catch (error) {
      logger.error('Error during cleanup', { error });
      throw error;
    }
  });

  // Keep the process alive - wait indefinitely for MCP messages
  await new Promise(() => {
    // This promise never resolves, keeping the server running
  });
}

// Run the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  removeLockFile();
  process.exit(1);
});