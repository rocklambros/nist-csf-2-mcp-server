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
import { initializeFramework } from './services/framework-loader.js';

// Import all MCP tools for HTTP wrapping
import { csfLookup, CSFLookupSchema } from './tools/csf_lookup.js';
import { searchFramework, SearchFrameworkSchema } from './tools/search_framework.js';
import { createProfile, CreateProfileSchema } from './tools/create_profile.js';
import { quickAssessment, QuickAssessmentSchema } from './tools/quick_assessment.js';
import { assessMaturity, AssessMaturitySchema } from './tools/assess_maturity.js';
import { calculateRiskScore, CalculateRiskScoreSchema } from './tools/calculate_risk_score.js';
import { generateGapAnalysis, GenerateGapAnalysisSchema } from './tools/generate_gap_analysis.js';
import { generatePriorityMatrix, GeneratePriorityMatrixSchema } from './tools/generate_priority_matrix.js';
import { createImplementationPlan, CreateImplementationPlanSchema } from './tools/create_implementation_plan.js';
import { startAssessmentWorkflow, StartAssessmentWorkflowSchema } from './tools/comprehensive_assessment_workflow.js';
import { checkAssessmentWorkflowStatus, CheckAssessmentWorkflowSchema } from './tools/comprehensive_assessment_workflow.js';
import { getAssessmentQuestions } from './tools/get_assessment_questions.js';
import { validateAssessmentResponses } from './tools/validate_assessment_responses.js';

interface HttpApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  tool: string;
}

// Tool registry for HTTP API
const HTTP_TOOLS = {
  // Framework Query Tools
  'csf_lookup': { handler: csfLookup, schema: CSFLookupSchema },
  'search_framework': { handler: searchFramework, schema: SearchFrameworkSchema },
  
  // Organization Management
  'create_profile': { handler: createProfile, schema: CreateProfileSchema },
  
  // Assessment Workflow (NEW)
  'start_assessment_workflow': { handler: startAssessmentWorkflow, schema: StartAssessmentWorkflowSchema },
  'check_assessment_workflow_status': { handler: checkAssessmentWorkflowStatus, schema: CheckAssessmentWorkflowSchema },
  
  // Assessment Tools
  'quick_assessment': { handler: quickAssessment, schema: QuickAssessmentSchema },
  'assess_maturity': { handler: assessMaturity, schema: AssessMaturitySchema },
  'calculate_risk_score': { handler: calculateRiskScore, schema: CalculateRiskScoreSchema },
  
  // Analysis Tools
  'generate_gap_analysis': { handler: generateGapAnalysis, schema: GenerateGapAnalysisSchema },
  'generate_priority_matrix': { handler: generatePriorityMatrix, schema: GeneratePriorityMatrixSchema },
  'create_implementation_plan': { handler: createImplementationPlan, schema: CreateImplementationPlanSchema },
  
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