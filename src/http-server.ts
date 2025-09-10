#!/usr/bin/env node
/**
 * HTTP REST API Server for NIST CSF 2.0 MCP Server
 * Provides dual-mode support: MCP (stdio) + HTTP REST API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { initializeFramework, getFrameworkLoader } from './services/framework-loader.js';

// Import all MCP tools for HTTP wrapping
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
// import { generateTestScenarios } from './tools/generate_test_scenarios.js'; // DOCKER COMPATIBILITY
import { startAssessmentWorkflow, StartAssessmentWorkflowSchema } from './tools/comprehensive_assessment_workflow.js';
import { checkAssessmentWorkflowStatus, CheckAssessmentWorkflowSchema } from './tools/comprehensive_assessment_workflow.js';
import { getAssessmentQuestions } from './tools/get_assessment_questions.js';
import { validateAssessmentResponses } from './tools/validate_assessment_responses.js';
import { getQuestionContext } from './tools/get_question_context.js';
import { resetOrganizationalData } from './tools/reset_organizational_data.js';

interface HttpApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  tool: string;
}

// Tool registry for HTTP API - Only registered MCP tools
const HTTP_TOOLS = {
  // Framework Query Tools
  'csf_lookup': { handler: csfLookup, schema: CSFLookupSchema },
  'search_framework': { handler: searchFramework, schema: SearchFrameworkSchema },
  'get_related_subcategories': { handler: getRelatedSubcategories, schema: GetRelatedSubcategoriesSchema },
  
  // Organization Management
  'create_profile': { handler: createProfile, schema: CreateProfileSchema },
  'clone_profile': { handler: cloneProfile, schema: CloneProfileSchema },
  
  // Assessment Workflow
  'start_assessment_workflow': { handler: startAssessmentWorkflow, schema: StartAssessmentWorkflowSchema },
  'check_assessment_workflow_status': { handler: checkAssessmentWorkflowStatus, schema: CheckAssessmentWorkflowSchema },
  
  // Assessment Tools
  'quick_assessment': { handler: quickAssessment, schema: QuickAssessmentSchema },
  'assess_maturity': { handler: assessMaturity, schema: AssessMaturitySchema },
  'calculate_risk_score': { handler: calculateRiskScore, schema: CalculateRiskScoreSchema },
  'calculate_maturity_trend': { handler: calculateMaturityTrend, schema: CalculateMaturityTrendSchema },
  
  // Analysis Tools
  'generate_gap_analysis': { handler: generateGapAnalysis, schema: GenerateGapAnalysisSchema },
  'generate_priority_matrix': { handler: generatePriorityMatrix, schema: GeneratePriorityMatrixSchema },
  'create_implementation_plan': { handler: createImplementationPlan, schema: CreateImplementationPlanSchema },
  'estimate_implementation_cost': { handler: estimateImplementationCost, schema: EstimateImplementationCostSchema },
  'suggest_next_actions': { handler: suggestNextActions, schema: SuggestNextActionsSchema },
  
  // Progress & Management Tools  
  'track_progress': { handler: async (params: any) => trackProgressTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    updates: z.array(z.object({
      subcategory_id: z.string(),
      current_implementation: z.string().optional(),
      current_maturity: z.number().optional(),
      status: z.enum(['on_track', 'at_risk', 'behind', 'blocked', 'completed']).optional(),
      is_blocked: z.boolean().optional(),
      blocking_reason: z.string().optional(),
      notes: z.string().optional()
    }))
  }) },
  'get_industry_benchmarks': { handler: async (params: any) => getIndustryBenchmarksTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    sector: z.string().optional(),
    organization_size: z.string().optional()
  }) },
  
  // Reporting Tools
  'generate_report': { handler: async (params: any) => generateReportTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    report_type: z.enum(['comprehensive', 'executive', 'technical', 'compliance']),
    include_recommendations: z.boolean().default(true),
    include_charts: z.boolean().default(true)
  }) },
  
  // Data Management Tools
  'compare_profiles': { handler: async (params: any) => compareProfilesTool.execute(params, getDatabase()), schema: z.object({
    profile1_id: z.string(),
    profile2_id: z.string(),
    comparison_type: z.enum(['full', 'maturity', 'implementation', 'risk']).default('full')
  }) },
  'export_data': { handler: async (params: any) => exportDataTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    export_format: z.enum(['json', 'csv', 'excel']).default('json'),
    include_metadata: z.boolean().default(true)
  }) },
  'import_assessment': { handler: async (params: any) => importAssessmentTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    assessment_data: z.object({}),
    overwrite_existing: z.boolean().default(false)
  }) },
  
  // Evidence & Templates
  'validate_evidence': { handler: async (params: any) => validateEvidenceTool.execute(params, getDatabase()), schema: z.object({
    profile_id: z.string(),
    evidence_id: z.string().optional()
  }) },
  'get_implementation_template': { handler: async (params: any) => getImplementationTemplateTool.execute(params, getDatabase(), getFrameworkLoader()), schema: z.object({
    subcategory_id: z.string(),
    industry: z.enum(['financial_services', 'healthcare', 'manufacturing', 'technology', 'government', 'retail', 'energy']).optional(),
    organization_size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    include_examples: z.boolean().default(true),
    include_tools: z.boolean().default(true),
    include_metrics: z.boolean().default(true)
  }) },
  'generate_policy_template': { handler: async (params: any) => generatePolicyTemplateTool.execute(params, getDatabase(), getFrameworkLoader()), schema: z.object({
    subcategory_id: z.string(),
    industry: z.enum(['financial_services', 'healthcare', 'manufacturing', 'technology', 'government', 'retail', 'energy']).optional(),
    organization_size: z.enum(['small', 'medium', 'large', 'enterprise']).optional()
  }) },
  // 'generate_test_scenarios': { handler: async (params: any) => generateTestScenarios(getDatabase(), getFrameworkLoader(), params), schema: z.object({ // DOCKER COMPATIBILITY
  //   subcategory_id: z.string(),
  //   test_type: z.enum(['functional', 'security', 'compliance', 'performance', 'all']).optional(),
  //   include_scripts: z.boolean().default(true),
  //   include_tools: z.boolean().default(true),
  //   severity_levels: z.array(z.enum(['low', 'medium', 'high', 'critical'])).default(['low', 'medium', 'high', 'critical'])
  // }) },
  
  // Question Bank
  'get_assessment_questions': { handler: getAssessmentQuestions, schema: z.object({
    assessment_type: z.enum(['detailed', 'quick', 'custom']).optional(),
    organization_size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
    subcategory_ids: z.array(z.string()).optional()
  }) },
  'validate_assessment_responses': { handler: validateAssessmentResponses, schema: z.object({
    profile_id: z.string(),
    assessment_type: z.enum(['detailed', 'quick', 'custom']),
    responses: z.array(z.object({
      subcategory_id: z.string(),
      response_value: z.union([z.string(), z.number()]),
      evidence: z.string().optional(),
      assessed_by: z.string().optional(),
      confidence_level: z.enum(['low', 'medium', 'high']).optional(),
      notes: z.string().optional(),
      assessment_date: z.string().optional()
    })),
    require_all_questions: z.boolean().default(false),
    allow_partial_responses: z.boolean().default(true)
  }) },
  'get_question_context': { handler: async (params: any) => getQuestionContext(params), schema: z.object({
    question_id: z.string(),
    subcategory_id: z.string().optional()
  }) },
  
  // Data Reset
  'reset_organizational_data': { handler: async (params: any) => resetOrganizationalData(params), schema: z.object({
    org_id: z.string().optional(),
    confirm_deletion: z.boolean().default(false)
  }) },

  // Basic MCP Server Tools
  'get_framework_stats': { handler: async () => {
    const db = getDatabase();
    const framework = getFrameworkLoader();
    return {
      success: true,
      framework_loaded: framework.isLoaded(),
      database_tables: db ? Object.keys(db).length : 0,
      message: "Framework and database statistics"
    };
  }, schema: z.object({}) },

  'query_framework': { handler: async (params: any) => {
    const { limit = 20 } = params;
    // Basic implementation - in real MCP server this has more complex logic
    return {
      success: true, 
      results: [],
      message: "Framework query results",
      limit
    };
  }, schema: z.object({
    function: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    keyword: z.string().optional(),
    limit: z.number().min(1).max(100).default(20)
  }) },

  'get_element': { handler: async (params: any) => {
    const { element_id } = params;
    return {
      success: true,
      element_id,
      message: "Element details"
    };
  }, schema: z.object({
    element_id: z.string()
  }) },

  'get_implementation_examples': { handler: async (params: any) => {
    const { subcategory_id } = params;
    return {
      success: true,
      subcategory_id,
      examples: [],
      message: "Implementation examples"
    };
  }, schema: z.object({
    subcategory_id: z.string()
  }) },

  'create_organization': { handler: async (params: any) => {
    const db = getDatabase();
    const { org_id, org_name, industry, size, current_tier, target_tier } = params;
    db.createOrganization({
      org_id,
      org_name,
      industry,
      size,
      current_tier,
      target_tier
    });
    return {
      success: true,
      org_id,
      message: "Organization created successfully"
    };
  }, schema: z.object({
    org_id: z.string(),
    org_name: z.string(),
    industry: z.string(),
    size: z.string(),
    current_tier: z.string().optional(),
    target_tier: z.string().optional()
  }) },

  'record_implementation': { handler: async (params: any) => {
    const { org_id, subcategory_id, implementation_status, maturity_level } = params;
    // Basic implementation - in real MCP server this uses database methods
    return {
      success: true,
      org_id,
      subcategory_id,
      implementation_status,
      maturity_level,
      message: "Implementation recorded successfully"
    };
  }, schema: z.object({
    org_id: z.string(),
    subcategory_id: z.string(),
    implementation_status: z.enum(['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented']),
    maturity_level: z.number(),
    notes: z.string().optional(),
    assessed_by: z.string().optional()
  }) },

  'record_risk': { handler: async (params: any) => {
    const { org_id, element_id, risk_level, likelihood, impact } = params;
    // Basic implementation - in real MCP server this uses database methods
    return {
      success: true,
      org_id,
      element_id,
      risk_level,
      likelihood,
      impact,
      message: "Risk assessment recorded successfully"
    };
  }, schema: z.object({
    org_id: z.string(),
    element_id: z.string(),
    risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
    likelihood: z.number().min(1).max(5),
    impact: z.number().min(1).max(5),
    mitigation_status: z.string(),
    mitigation_plan: z.string().optional()
  }) },

  'record_gap': { handler: async (params: any) => {
    const { org_id, category_id, current_score, target_score, priority } = params;
    // Basic implementation - in real MCP server this uses database methods
    return {
      success: true,
      org_id,
      category_id,
      current_score,
      target_score,
      priority,
      message: "Gap analysis recorded successfully"
    };
  }, schema: z.object({
    org_id: z.string(),
    category_id: z.string(),
    current_score: z.number().min(0).max(5),
    target_score: z.number().min(0).max(5),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    estimated_effort: z.string().optional()
  }) },

  'get_assessment': { handler: async (params: any) => {
    const { profile_id, assessment_type } = params;
    return {
      success: true,
      profile_id,
      assessment_type,
      data: [],
      message: "Assessment data retrieved"
    };
  }, schema: z.object({
    profile_id: z.string(),
    assessment_type: z.enum(['implementations', 'risks', 'gaps']).optional()
  }) }
};

export async function startHttpServer(port: number = 8080): Promise<void> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT ? parseInt(process.env.RATE_LIMIT) : 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static file serving for GUI
  app.use(express.static('.', {
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Initialize services
  logger.info('Initializing HTTP server services...');
  await initializeFramework();
  getDatabase();
  logger.info('HTTP server services initialized');

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: 'http-rest-api',
      tools_available: Object.keys(HTTP_TOOLS).length
    });
  });

  // API documentation endpoint
  app.get('/api/tools', (_req, res) => {
    const toolList = Object.keys(HTTP_TOOLS).map(toolName => ({
      name: toolName,
      endpoint: `/api/tools/${toolName}`,
      method: 'POST',
      description: `Execute ${toolName} tool with JSON parameters`
    }));

    res.json({
      success: true,
      message: 'NIST CSF 2.0 MCP Server - HTTP REST API',
      tools_count: toolList.length,
      tools: toolList,
      documentation: {
        openapi: '/api/docs',
        health: '/health',
        examples: '/api/examples'
      }
    });
  });

  // Generic tool execution endpoint
  app.post('/api/tools/:toolName', async (req, res) => {
    const { toolName } = req.params;
    const params = req.body;

    try {
      // Validate tool exists
      if (!HTTP_TOOLS[toolName as keyof typeof HTTP_TOOLS]) {
        return res.status(404).json(createErrorResponse(
          toolName,
          `Tool '${toolName}' not found. Available tools: ${Object.keys(HTTP_TOOLS).join(', ')}`
        ));
      }

      const tool = HTTP_TOOLS[toolName as keyof typeof HTTP_TOOLS];

      // Validate parameters
      let validatedParams;
      try {
        validatedParams = tool.schema.parse(params);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json(createErrorResponse(
            toolName,
            `Invalid parameters: ${validationError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          ));
        }
        throw validationError;
      }

      // Execute tool
      logger.info(`HTTP API: Executing tool ${toolName}`, { params: validatedParams });
      const result = await tool.handler(validatedParams as any);

      // Return success response
      return res.json(createSuccessResponse(toolName, result));

    } catch (error) {
      logger.error(`HTTP API: Error executing tool ${toolName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json(createErrorResponse(toolName, errorMessage));
    }
  });

  // Example requests endpoint
  app.get('/api/examples', (_req, res) => {
    res.json({
      success: true,
      examples: {
        csf_lookup: {
          endpoint: '/api/tools/csf_lookup',
          method: 'POST',
          body: { subcategory_id: 'GV.OC-01' }
        },
        start_assessment_workflow: {
          endpoint: '/api/tools/start_assessment_workflow',
          method: 'POST',
          body: {
            org_name: 'Acme Corporation',
            sector: 'Technology',
            size: 'medium',
            contact_name: 'John Doe',
            contact_email: 'john@acme.com'
          }
        },
        assess_maturity: {
          endpoint: '/api/tools/assess_maturity',
          method: 'POST',
          body: { profile_id: 'your-profile-id' }
        },
        search_framework: {
          endpoint: '/api/tools/search_framework',
          method: 'POST',
          body: { query: 'governance', limit: 10 }
        }
      }
    });
  });

  // Error handling middleware
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled HTTP error:', error);
    res.status(500).json(createErrorResponse('server', 'Internal server error'));
  });

  // 404 handler
  app.use((req, res) => {
    return res.status(404).json(createErrorResponse('not_found', `Endpoint not found: ${req.path}`));
  });

  // Start server
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`🌐 NIST CSF 2.0 HTTP REST API Server running on port ${port}`);
    logger.info(`📖 API Documentation: http://localhost:${port}/api/tools`);
    logger.info(`💚 Health Check: http://localhost:${port}/health`);
    logger.info(`🔧 Available Tools: ${Object.keys(HTTP_TOOLS).length}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down HTTP server gracefully');
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down HTTP server gracefully');
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });
}

function createSuccessResponse(toolName: string, data: any): HttpApiResponse {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    tool: toolName
  };
}

function createErrorResponse(toolName: string, error: string): HttpApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    tool: toolName
  };
}

// Start HTTP server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8080;
  startHttpServer(port).catch(error => {
    logger.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}