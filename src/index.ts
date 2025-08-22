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
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { logger } from './utils/logger.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { initializeFramework } from './services/framework-loader.js';
import type { 
  ToolResponse,
  SubcategoryImplementation,
  RiskAssessment,
  GapAnalysis,
  OrganizationProfile
} from './types/index.js';

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
  org_id: z.string(),
  assessment_type: z.enum(['implementations', 'risks', 'gaps']).optional()
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function main() {
  logger.info('Starting NIST CSF 2.0 MCP Server...');

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
        description: 'Get assessment data for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'string', description: 'Organization ID' },
            assessment_type: { 
              type: 'string', 
              enum: ['implementations', 'risks', 'gaps'],
              description: 'Type of assessment to retrieve'
            }
          },
          required: ['org_id']
        }
      },
      {
        name: 'get_framework_stats',
        description: 'Get framework and database statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ],
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
            db.createOrganization(params);
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
            if (error.message.includes('UNIQUE constraint')) {
              throw new McpError(ErrorCode.InvalidRequest, `Organization ${params.org_id} already exists`);
            }
            throw error;
          }
        }

        case 'record_implementation': {
          const params = RecordImplementationSchema.parse(args);
          
          const impl: SubcategoryImplementation = {
            ...params,
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
            ...params,
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
            ...params,
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
          
          const org = db.getOrganization(params.org_id);
          if (!org) {
            throw new McpError(ErrorCode.InvalidRequest, `Organization not found: ${params.org_id}`);
          }

          let data: any = { organization: org };
          
          if (!params.assessment_type || params.assessment_type === 'implementations') {
            data.implementations = db.getImplementations(params.org_id);
          }
          if (!params.assessment_type || params.assessment_type === 'risks') {
            data.risks = db.getRiskAssessments(params.org_id);
          }
          if (!params.assessment_type || params.assessment_type === 'gaps') {
            data.gaps = db.getGapAnalyses(params.org_id);
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

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    closeDatabase();
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down server...');
    closeDatabase();
    await server.close();
    process.exit(0);
  });
}

// Run the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});