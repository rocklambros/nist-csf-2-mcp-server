#!/usr/bin/env node
/**
 * NIST CSF 2.0 MCP Server with Security Middleware
 * Secure server implementation with authentication, validation, and rate limiting
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// Security middleware
import { authMiddleware } from './security/auth.js';
import { rateLimiter } from './security/rate-limiter.js';
import { securityLogger } from './security/logger.js';
import { validateToolParams, SecurityError } from './security/validators.js';

// Services
import { logger } from './utils/logger.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { initializeFramework } from './services/framework-loader.js';

// Tool imports (existing tools)
import { csfLookup } from './tools/csf_lookup.js';
import { searchFramework } from './tools/search_framework.js';
import { getRelatedSubcategories } from './tools/get_related_subcategories.js';
import { createProfile } from './tools/create_profile.js';
import { cloneProfile } from './tools/clone_profile.js';
import { quickAssessment } from './tools/quick_assessment.js';
import { assessMaturity } from './tools/assess_maturity.js';
import { calculateRiskScore } from './tools/calculate_risk_score.js';
import { calculateMaturityTrend } from './tools/calculate_maturity_trend.js';
import { generateGapAnalysis } from './tools/generate_gap_analysis.js';
import { generatePriorityMatrix } from './tools/generate_priority_matrix.js';
import { createImplementationPlan } from './tools/create_implementation_plan.js';
import { estimateImplementationCost } from './tools/estimate_implementation_cost.js';
import { suggestNextActions } from './tools/suggest_next_actions.js';
import { trackProgressTool } from './tools/track_progress.js';
import { checkComplianceDriftTool } from './tools/check_compliance_drift.js';
import { mapComplianceTool } from './tools/map_compliance.js';
import { getIndustryBenchmarksTool } from './tools/get_industry_benchmarks.js';
import { generateReportTool } from './tools/generate_report.js';
import { compareProfilesTool } from './tools/compare_profiles.js';
import { exportDataTool } from './tools/export_data.js';
import { importAssessmentTool } from './tools/import_assessment.js';
import { validateEvidenceTool } from './tools/validate_evidence.js';
import { getImplementationTemplateTool } from './tools/get_implementation_template.js';
import { generatePolicyTemplateTool } from './tools/generate_policy_template.js';
import { generateTestScenariosTool } from './tools/generate_test_scenarios.js';

// Environment configuration
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 8080;
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_AUTH = process.env.ENABLE_AUTH !== 'false';
const ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING !== 'false';
const ENABLE_SECURITY_HEADERS = process.env.ENABLE_SECURITY_HEADERS !== 'false';
const ENABLE_CORS = process.env.ENABLE_CORS === 'true';

// Tool registry with security permissions
const TOOL_REGISTRY = new Map<string, {
  handler: (args: any, db: any, framework?: any) => Promise<any>;
  requiresAuth: boolean;
  requiredScope?: string;
  rateLimit?: { requests: number; window: number };
}>();

// Register all tools with security configuration
function registerTools() {
  // Framework query tools
  TOOL_REGISTRY.set('csf_lookup', {
    handler: csfLookup,
    requiresAuth: false,
    rateLimit: { requests: 100, window: 60 }
  });
  
  TOOL_REGISTRY.set('search_framework', {
    handler: searchFramework,
    requiresAuth: false,
    rateLimit: { requests: 50, window: 60 }
  });
  
  TOOL_REGISTRY.set('get_related_subcategories', {
    handler: getRelatedSubcategories,
    requiresAuth: false,
    rateLimit: { requests: 50, window: 60 }
  });
  
  // Profile management tools (require authentication)
  TOOL_REGISTRY.set('create_profile', {
    handler: createProfile,
    requiresAuth: true,
    requiredScope: 'profile:write',
    rateLimit: { requests: 20, window: 60 }
  });
  
  TOOL_REGISTRY.set('clone_profile', {
    handler: cloneProfile,
    requiresAuth: true,
    requiredScope: 'profile:write',
    rateLimit: { requests: 20, window: 60 }
  });
  
  // Assessment tools
  TOOL_REGISTRY.set('quick_assessment', {
    handler: quickAssessment,
    requiresAuth: true,
    requiredScope: 'assessment:write',
    rateLimit: { requests: 30, window: 60 }
  });
  
  TOOL_REGISTRY.set('assess_maturity', {
    handler: assessMaturity,
    requiresAuth: true,
    requiredScope: 'assessment:read',
    rateLimit: { requests: 50, window: 60 }
  });
  
  TOOL_REGISTRY.set('calculate_risk_score', {
    handler: calculateRiskScore,
    requiresAuth: true,
    requiredScope: 'assessment:read',
    rateLimit: { requests: 50, window: 60 }
  });
  
  // Analysis tools
  TOOL_REGISTRY.set('calculate_maturity_trend', {
    handler: calculateMaturityTrend,
    requiresAuth: true,
    requiredScope: 'assessment:read',
    rateLimit: { requests: 30, window: 60 }
  });
  
  TOOL_REGISTRY.set('generate_gap_analysis', {
    handler: generateGapAnalysis,
    requiresAuth: true,
    requiredScope: 'assessment:read',
    rateLimit: { requests: 20, window: 60 }
  });
  
  TOOL_REGISTRY.set('generate_priority_matrix', {
    handler: generatePriorityMatrix,
    requiresAuth: true,
    requiredScope: 'assessment:read',
    rateLimit: { requests: 20, window: 60 }
  });
  
  // Planning tools
  TOOL_REGISTRY.set('create_implementation_plan', {
    handler: createImplementationPlan,
    requiresAuth: true,
    requiredScope: 'planning:write',
    rateLimit: { requests: 10, window: 60 }
  });
  
  TOOL_REGISTRY.set('estimate_implementation_cost', {
    handler: estimateImplementationCost,
    requiresAuth: true,
    requiredScope: 'planning:read',
    rateLimit: { requests: 30, window: 60 }
  });
  
  TOOL_REGISTRY.set('suggest_next_actions', {
    handler: suggestNextActions,
    requiresAuth: true,
    requiredScope: 'planning:read',
    rateLimit: { requests: 30, window: 60 }
  });
  
  // Progress tracking tools
  TOOL_REGISTRY.set('track_progress', {
    handler: async (args, db) => trackProgressTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'progress:write',
    rateLimit: { requests: 50, window: 60 }
  });
  
  TOOL_REGISTRY.set('check_compliance_drift', {
    handler: async (args, db) => checkComplianceDriftTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'compliance:read',
    rateLimit: { requests: 30, window: 60 }
  });
  
  // Compliance tools
  TOOL_REGISTRY.set('map_compliance', {
    handler: async (args, db) => mapComplianceTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'compliance:write',
    rateLimit: { requests: 20, window: 60 }
  });
  
  TOOL_REGISTRY.set('get_industry_benchmarks', {
    handler: async (args, db) => getIndustryBenchmarksTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'benchmark:read',
    rateLimit: { requests: 20, window: 60 }
  });
  
  // Reporting tools
  TOOL_REGISTRY.set('generate_report', {
    handler: async (args, db) => generateReportTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'report:generate',
    rateLimit: { requests: 10, window: 60 }
  });
  
  TOOL_REGISTRY.set('compare_profiles', {
    handler: async (args, db) => compareProfilesTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'profile:read',
    rateLimit: { requests: 30, window: 60 }
  });
  
  // Data import/export tools (sensitive operations)
  TOOL_REGISTRY.set('export_data', {
    handler: async (args, db) => exportDataTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'data:export',
    rateLimit: { requests: 10, window: 60 }
  });
  
  TOOL_REGISTRY.set('import_assessment', {
    handler: async (args, db) => importAssessmentTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'data:import',
    rateLimit: { requests: 5, window: 60 }
  });
  
  TOOL_REGISTRY.set('validate_evidence', {
    handler: async (args, db) => validateEvidenceTool.execute(args, db),
    requiresAuth: true,
    requiredScope: 'evidence:validate',
    rateLimit: { requests: 20, window: 60 }
  });
  
  // Template generation tools
  TOOL_REGISTRY.set('get_implementation_template', {
    handler: async (args, db, framework) => getImplementationTemplateTool.execute(args, db, framework),
    requiresAuth: true,
    requiredScope: 'template:read',
    rateLimit: { requests: 20, window: 60 }
  });
  
  TOOL_REGISTRY.set('generate_policy_template', {
    handler: async (args, db, framework) => generatePolicyTemplateTool.execute(args, db, framework),
    requiresAuth: true,
    requiredScope: 'template:generate',
    rateLimit: { requests: 10, window: 60 }
  });
  
  TOOL_REGISTRY.set('generate_test_scenarios', {
    handler: async (args, db, framework) => generateTestScenariosTool.execute(args, db, framework),
    requiresAuth: true,
    requiredScope: 'test:generate',
    rateLimit: { requests: 10, window: 60 }
  });
}

// Create Express app with security middleware
function createExpressApp() {
  const app = express();
  
  // Basic middleware
  app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '1mb' }));
  
  // Security headers
  if (ENABLE_SECURITY_HEADERS) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));
  }
  
  // CORS configuration
  if (ENABLE_CORS) {
    const corsOptions = {
      origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : false,
      credentials: true,
      optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
  }
  
  // Security logging
  app.use(securityLogger.middleware());
  
  // Rate limiting
  if (ENABLE_RATE_LIMITING) {
    app.use(rateLimiter.middleware());
  }
  
  // Health check endpoint (no auth required)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV
    });
  });
  
  // MCP tool endpoint
  app.post('/tools/:toolName', async (req: Request, res: Response, next: NextFunction) => {
    const toolName = req.params.toolName;
    const toolConfig = TOOL_REGISTRY.get(toolName);
    
    if (!toolConfig) {
      return res.status(404).json({
        error: 'Tool not found',
        tool: toolName
      });
    }
    
    try {
      // Apply authentication if required
      if (ENABLE_AUTH && toolConfig.requiresAuth) {
        await new Promise<void>((resolve, reject) => {
          authMiddleware.authenticate()(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Check required scope
        if (toolConfig.requiredScope) {
          await new Promise<void>((resolve, reject) => {
            authMiddleware.requireScope(toolConfig.requiredScope!)(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
      
      // Validate tool parameters
      const validatedParams = validateToolParams(toolName, req.body);
      
      // Log tool call
      const startTime = Date.now();
      const clientId = (req as any).auth?.client_id || req.ip;
      
      // Execute tool
      const db = getDatabase();
      const framework = await initializeFramework();
      const result = await toolConfig.handler(validatedParams, db, framework);
      
      // Log successful execution
      securityLogger.logToolCall({
        client_id: clientId,
        tool_name: toolName,
        params: validatedParams,
        success: true,
        duration_ms: Date.now() - startTime
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      // Log failed execution
      const clientId = (req as any).auth?.client_id || req.ip;
      
      if (error instanceof SecurityError) {
        securityLogger.logValidationFailure({
          client_id: clientId,
          tool_name: toolName,
          validation_error: error.message,
          params: req.body
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message
        });
      }
      
      securityLogger.logToolCall({
        client_id: clientId,
        tool_name: toolName,
        params: req.body,
        success: false,
        error: error.message
      });
      
      // Don't expose internal errors
      logger.error(`Tool execution error: ${toolName}`, error);
      res.status(500).json({
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'An error occurred processing your request'
      });
    }
  });
  
  // List available tools
  app.get('/tools', (req: Request, res: Response) => {
    const tools = Array.from(TOOL_REGISTRY.keys()).map(name => {
      const config = TOOL_REGISTRY.get(name)!;
      return {
        name,
        requiresAuth: config.requiresAuth,
        requiredScope: config.requiredScope,
        rateLimit: config.rateLimit
      };
    });
    
    res.json({
      success: true,
      tools
    });
  });
  
  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);
    
    // Log security event for errors
    securityLogger.logSecurityEvent({
      timestamp: new Date().toISOString(),
      event: 'unhandled_error',
      level: 'error',
      path: req.path,
      method: req.method,
      ip: req.ip,
      error: NODE_ENV === 'development' ? err.message : 'Internal error'
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  });
  
  return app;
}

// Main server function
async function main() {
  logger.info('Starting NIST CSF 2.0 MCP Server with security features...');
  
  // Register all tools
  registerTools();
  
  // Initialize services
  const framework = await initializeFramework();
  const db = getDatabase();
  
  logger.info('Services initialized successfully');
  
  // Create Express app
  const app = createExpressApp();
  
  // Start HTTP server
  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Authentication: ${ENABLE_AUTH ? 'enabled' : 'disabled'}`);
    logger.info(`Rate limiting: ${ENABLE_RATE_LIMITING ? 'enabled' : 'disabled'}`);
    logger.info(`Security headers: ${ENABLE_SECURITY_HEADERS ? 'enabled' : 'disabled'}`);
    logger.info(`CORS: ${ENABLE_CORS ? 'enabled' : 'disabled'}`);
  });
  
  // Also support stdio transport for MCP compatibility
  if (process.env.USE_STDIO === 'true') {
    const mcpServer = new Server(
      {
        name: 'nist-csf-2-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Set up MCP handlers
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(TOOL_REGISTRY.keys()).map(name => ({
        name,
        description: `Execute ${name} tool`
      }))
    }));
    
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolConfig = TOOL_REGISTRY.get(name);
      
      if (!toolConfig) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
      
      try {
        // Validate parameters
        const validatedParams = validateToolParams(name, args);
        
        // Execute tool
        const result = await toolConfig.handler(validatedParams, db, framework);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        if (error instanceof SecurityError) {
          throw new McpError(ErrorCode.InvalidParams, error.message);
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
    
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    logger.info('MCP Server also running on stdio transport');
  }
  
  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down server...');
    
    // Close Express server
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close database
    closeDatabase();
    
    // Destroy rate limiter
    rateLimiter.destroy();
    
    // Give some time for cleanup
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    securityLogger.logSecurityEvent({
      timestamp: new Date().toISOString(),
      event: 'uncaught_exception',
      level: 'critical',
      error: error.message
    });
    shutdown();
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    securityLogger.logSecurityEvent({
      timestamp: new Date().toISOString(),
      event: 'unhandled_rejection',
      level: 'critical',
      error: String(reason)
    });
  });
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main, createExpressApp, registerTools };