/**
 * Input validation middleware for MCP server tools
 * Implements comprehensive validation for all tool parameters
 */

import * as path from 'path';
import { z } from 'zod';

/**
 * Security error class for validation failures
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Base validator class for all tools
 */
export abstract class BaseTool {
  protected baseDir: string;
  protected maxSize: number;
  
  constructor(baseDir?: string, maxSize?: number) {
    this.baseDir = baseDir ? path.resolve(baseDir) : path.resolve('/app/data');
    this.maxSize = maxSize || 1024 * 1024; // Default 1MB
  }

  /**
   * Abstract method that must be implemented by each tool
   */
  abstract validateParams(params: Record<string, any>): Record<string, any>;
  
  /**
   * Execute tool with validation
   */
  async execute(params: Record<string, any>): Promise<Record<string, any>> {
    // ALWAYS validate first
    const validatedParams = this.validateParams(params);
    return this._executeImpl(validatedParams);
  }
  
  /**
   * Abstract method for actual tool implementation
   */
  protected abstract _executeImpl(params: Record<string, any>): Promise<Record<string, any>>;
  
  /**
   * Common validation utilities
   */
  protected validatePath(filepath: string, allowedExtensions?: string[]): string {
    // Type check
    if (typeof filepath !== 'string') {
      throw new SecurityError('Path must be a string');
    }
    
    // Path traversal prevention
    if (filepath.includes('..') || filepath.startsWith('/')) {
      throw new SecurityError('Path traversal detected');
    }
    
    // Invalid character check
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filepath)) {
      throw new SecurityError('Invalid characters in path');
    }
    
    // Extension validation if specified
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = path.extname(filepath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new SecurityError(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
      }
    }
    
    // Canonicalize and verify path
    const fullPath = path.resolve(this.baseDir, filepath);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new SecurityError('Access denied - path escapes base directory');
    }
    
    return fullPath;
  }
  
  /**
   * Validate string with max length and pattern
   */
  protected validateString(value: any, maxLength: number, pattern?: RegExp): string {
    if (typeof value !== 'string') {
      throw new SecurityError('Value must be a string');
    }
    
    if (value.length > maxLength) {
      throw new SecurityError(`String exceeds maximum length of ${maxLength}`);
    }
    
    if (pattern && !pattern.test(value)) {
      throw new SecurityError('String does not match required pattern');
    }
    
    return value;
  }
  
  /**
   * Validate number within range
   */
  protected validateNumber(value: any, min: number, max: number): number {
    const num = Number(value);
    
    if (isNaN(num)) {
      throw new SecurityError('Value must be a number');
    }
    
    if (num < min || num > max) {
      throw new SecurityError(`Number must be between ${min} and ${max}`);
    }
    
    return num;
  }
  
  /**
   * Validate enum value
   */
  protected validateEnum<T>(value: any, allowedValues: T[]): T {
    if (!allowedValues.includes(value)) {
      throw new SecurityError(`Invalid value. Allowed: ${allowedValues.join(', ')}`);
    }
    
    return value;
  }
  
  /**
   * Sanitize SQL input to prevent injection
   */
  protected sanitizeSql(value: string): string {
    // Remove dangerous SQL keywords and characters
    const dangerous = /(\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE|UNION|SELECT)\b|--|;|'|")/gi;
    if (dangerous.test(value)) {
      throw new SecurityError('Potential SQL injection detected');
    }
    
    return value;
  }
  
  /**
   * Sanitize command input to prevent injection
   */
  protected sanitizeCommand(value: string): string {
    // Check for command injection characters
    const dangerous = /[;&|`$()<>\\]/;
    if (dangerous.test(value)) {
      throw new SecurityError('Potential command injection detected');
    }
    
    return value;
  }
}

/**
 * Specific validators for each tool category
 */

// Assessment tool validators
export const AssessmentSchema = z.object({
  profile_id: z.string().max(100),
  function: z.enum(['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER']).optional(),
  category: z.string().max(100).optional(),
  implementation_level: z.enum(['Not Implemented', 'Partially Implemented', 'Fully Implemented', 'Optimized']).optional(),
  notes: z.string().max(5000).optional(),
  evidence: z.array(z.string()).max(10).optional()
});

// Import tool validators
export const ImportSchema = z.object({
  file_path: z.string().max(500),
  format: z.enum(['csv', 'excel', 'json']),
  profile_id: z.string().max(100),
  conflict_mode: z.enum(['skip', 'overwrite', 'merge']).optional(),
  validate_only: z.boolean().optional()
});

// Evidence validation schema
export const EvidenceSchema = z.object({
  file_path: z.string().max(500),
  evidence_type: z.enum(['screenshot', 'document', 'log', 'report', 'scan_result', 'configuration', 'other']),
  profile_id: z.string().max(100),
  subcategory_id: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional()
});

// Policy generation schema
export const PolicySchema = z.object({
  policy_type: z.enum([
    'information_security',
    'access_control',
    'incident_response',
    'business_continuity',
    'data_protection',
    'acceptable_use',
    'vendor_management',
    'change_management'
  ]),
  organization_name: z.string().max(200),
  industry: z.enum([
    'financial_services',
    'healthcare',
    'government',
    'retail',
    'manufacturing',
    'technology',
    'education'
  ]).optional(),
  compliance_frameworks: z.array(z.string()).max(10).optional(),
  include_procedures: z.boolean().optional(),
  include_templates: z.boolean().optional(),
  format: z.enum(['markdown', 'structured']).optional()
});

// Template generation schema
export const TemplateSchema = z.object({
  subcategory_id: z.string().max(100),
  industry: z.enum([
    'financial_services',
    'healthcare',
    'government',
    'retail',
    'manufacturing',
    'technology',
    'education',
    'general'
  ]).optional(),
  organization_size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  maturity_level: z.enum(['initial', 'developing', 'defined', 'managed', 'optimized']).optional(),
  include_examples: z.boolean().optional(),
  include_metrics: z.boolean().optional(),
  format: z.enum(['detailed', 'summary', 'checklist']).optional()
});

// Test scenario schema
export const TestScenarioSchema = z.object({
  subcategory_id: z.string().max(100),
  scenario_type: z.enum([
    'validation',
    'penetration',
    'compliance',
    'performance',
    'disaster_recovery',
    'incident_response'
  ]).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  include_scripts: z.boolean().optional(),
  script_language: z.enum(['bash', 'python', 'javascript', 'powershell']).optional(),
  target_environment: z.enum(['development', 'staging', 'production']).optional()
});

// Report generation schema
export const ReportSchema = z.object({
  profile_id: z.string().max(100),
  report_type: z.enum([
    'executive_summary',
    'detailed_assessment',
    'gap_analysis',
    'implementation_roadmap',
    'compliance_matrix',
    'maturity_assessment'
  ]),
  include_charts: z.boolean().optional(),
  include_recommendations: z.boolean().optional(),
  format: z.enum(['markdown', 'json', 'structured']).optional(),
  custom_sections: z.array(z.string()).max(10).optional()
});

// Profile comparison schema
export const CompareSchema = z.object({
  profile1_id: z.string().max(100),
  profile2_id: z.string().max(100),
  comparison_type: z.enum(['gap', 'maturity', 'coverage']).optional(),
  include_details: z.boolean().optional()
});

/**
 * Validate tool parameters based on tool name
 */
export function validateToolParams(toolName: string, params: Record<string, any>): Record<string, any> {
  const validators: Record<string, z.ZodSchema> = {
    'create_assessment': AssessmentSchema,
    'update_assessment': AssessmentSchema.partial().extend({ assessment_id: z.string() }),
    'import_assessment': ImportSchema,
    'validate_evidence': EvidenceSchema,
    'generate_policy_template': PolicySchema,
    'get_implementation_template': TemplateSchema,
    'generate_test_scenarios': TestScenarioSchema,
    'generate_report': ReportSchema,
    'compare_profiles': CompareSchema
  };
  
  const validator = validators[toolName];
  if (!validator) {
    throw new SecurityError(`No validator found for tool: ${toolName}`);
  }
  
  try {
    return validator.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new SecurityError(`Validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * File size validation
 */
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): void {
  if (size > maxSize) {
    throw new SecurityError(`File size ${size} exceeds maximum allowed size of ${maxSize} bytes`);
  }
}

/**
 * MIME type validation
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new SecurityError(`MIME type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
}