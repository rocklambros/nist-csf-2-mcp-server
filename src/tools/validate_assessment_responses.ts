/**
 * MCP Tool: validate_assessment_responses
 * Validates assessment responses for completeness, consistency, and data integrity
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { questionBankService } from '../services/question-bank.js';
import { logger } from '../utils/enhanced-logger.js';

// Input validation schemas
const QuestionResponseSchema = z.object({
  subcategory_id: z.string().min(1)
    .describe('NIST CSF subcategory ID (e.g., GV.OC-01)'),
  response_value: z.union([z.number(), z.string()])
    .describe('Response value - number for ratings, string for text responses'),
  confidence_level: z.enum(['low', 'medium', 'high']).optional()
    .describe('Confidence in the assessment response'),
  evidence: z.string().optional()
    .describe('Supporting evidence or documentation for the response'),
  notes: z.string().optional()
    .describe('Additional notes or context for the response'),
  assessed_by: z.string().optional()
    .describe('Person or team who performed the assessment'),
  assessment_date: z.string().optional()
    .describe('Date of assessment (ISO format)')
});

const ValidateAssessmentResponsesSchema = z.object({
  profile_id: z.string().min(1)
    .describe('Profile ID for the organization being assessed'),
  responses: z.array(QuestionResponseSchema).min(1)
    .describe('Array of assessment responses to validate'),
  assessment_type: z.enum(['detailed', 'quick', 'custom']).default('detailed')
    .describe('Type of assessment for validation context'),
  require_all_questions: z.boolean().default(false)
    .describe('Whether all questions must be answered for validation to pass'),
  validate_against_previous: z.boolean().default(true)
    .describe('Compare responses against previous assessments for consistency'),
  check_evidence_requirements: z.boolean().default(false)
    .describe('Require evidence for certain critical responses')
});

type ValidateAssessmentResponsesParams = z.infer<typeof ValidateAssessmentResponsesSchema>;

/**
 * Validate assessment responses for completeness and consistency
 */
export async function validateAssessmentResponses(params: ValidateAssessmentResponsesParams, db = getDatabase()) {
  const startTime = Date.now();
  
  try {
    // Validate input parameters
    const validatedParams = ValidateAssessmentResponsesSchema.parse(params);
    
    logger.info('Validating assessment responses', {
      profile_id: validatedParams.profile_id,
      response_count: validatedParams.responses.length,
      assessment_type: validatedParams.assessment_type,
      require_all_questions: validatedParams.require_all_questions
    });

    // Verify profile exists
    const profile = await getProfile(validatedParams.profile_id, db);
    if (!profile) {
      throw new Error(`Profile ${validatedParams.profile_id} not found`);
    }

    // Get expected questions for this assessment type
    const expectedQuestions = await questionBankService.getAssessmentQuestions({
      assessment_type: validatedParams.assessment_type
    });

    // Perform validation checks
    const validationResults = {
      is_valid: true,
      missing_required: [] as string[],
      invalid_responses: [] as any[],
      warnings: [] as string[],
      completeness_percentage: 0,
      validation_summary: {
        total_expected: expectedQuestions.length,
        total_received: validatedParams.responses.length,
        required_answered: 0,
        optional_answered: 0,
        invalid_count: 0
      }
    };

    // Check for required questions
    const requiredQuestions = expectedQuestions.filter(q => q.required);
    const answeredSubcategories = new Set(validatedParams.responses.map(r => r.subcategory_id));
    
    for (const requiredQ of requiredQuestions) {
      if (!answeredSubcategories.has(requiredQ.subcategory_id)) {
        validationResults.missing_required.push(requiredQ.subcategory_id);
      } else {
        validationResults.validation_summary.required_answered++;
      }
    }

    // Validate individual responses
    for (const response of validatedParams.responses) {
      const question = expectedQuestions.find(q => q.subcategory_id === response.subcategory_id);
      
      if (!question) {
        validationResults.warnings.push(`Response for unknown subcategory: ${response.subcategory_id}`);
        continue;
      }

      // Validate response value
      const validationError = validateResponseValue(response, question);
      if (validationError) {
        validationResults.invalid_responses.push({
          subcategory_id: response.subcategory_id,
          issue: validationError.issue,
          expected: validationError.expected,
          received: validationError.received
        });
        validationResults.validation_summary.invalid_count++;
      } else {
        // Count valid responses
        if (question.required) {
          validationResults.validation_summary.required_answered++;
        } else {
          validationResults.validation_summary.optional_answered++;
        }
      }

      // Check evidence requirements
      if (validatedParams.check_evidence_requirements && isCriticalResponse(response, question) && !response.evidence) {
        validationResults.warnings.push(`Critical response for ${response.subcategory_id} should include evidence`);
      }
    }

    // Check against previous assessments if requested
    if (validatedParams.validate_against_previous) {
      const consistencyWarnings = await checkConsistencyWithPrevious(validatedParams.profile_id, validatedParams.responses, db);
      validationResults.warnings.push(...consistencyWarnings);
    }

    // Calculate completeness
    validationResults.completeness_percentage = Math.round(
      (answeredSubcategories.size / expectedQuestions.length) * 100
    );

    // Determine overall validity
    validationResults.is_valid = 
      validationResults.missing_required.length === 0 &&
      validationResults.invalid_responses.length === 0 &&
      (!validatedParams.require_all_questions || validationResults.completeness_percentage === 100);

    const response = {
      success: true,
      validation_results: validationResults,
      profile_id: validatedParams.profile_id,
      assessment_type: validatedParams.assessment_type,
      validation_timestamp: new Date().toISOString(),
      validation_duration_ms: Date.now() - startTime
    };

    logger.info('Assessment responses validated', {
      profile_id: validatedParams.profile_id,
      is_valid: validationResults.is_valid,
      completeness: validationResults.completeness_percentage,
      missing_required: validationResults.missing_required.length,
      invalid_responses: validationResults.invalid_responses.length,
      warnings: validationResults.warnings.length,
      duration: Date.now() - startTime
    });

    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to validate assessment responses', {
      error: errorMessage,
      profile_id: params.profile_id,
      duration: Date.now() - startTime
    });

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input parameters',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          received: 'received' in e ? (e as any).received : 'unknown'
        }))
      };
    }

    return {
      success: false,
      error: 'Failed to validate assessment responses',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate individual response value against question options
 */
function validateResponseValue(response: any, question: any) {
  const validValues = question.options.map((opt: any) => opt.value);
  
  if (question.question_type === 'maturity_rating' || question.question_type === 'implementation_status') {
    // Must be a number within valid range
    if (typeof response.response_value !== 'number') {
      return {
        issue: 'Response must be a number',
        expected: 'number',
        received: typeof response.response_value
      };
    }
    
    if (!validValues.includes(response.response_value)) {
      return {
        issue: 'Response value not in valid options',
        expected: validValues,
        received: response.response_value
      };
    }
  }

  return null;
}

/**
 * Check if response is for a critical subcategory requiring evidence
 */
function isCriticalResponse(response: any, _question: any): boolean {
  // Critical subcategories that should have evidence for low scores
  const criticalSubcategories = ['GV.OC-01', 'GV.RM-01', 'ID.AM-01', 'PR.AC-01'];
  
  return criticalSubcategories.includes(response.subcategory_id) && 
         typeof response.response_value === 'number' && 
         response.response_value < 2;
}

/**
 * Check consistency with previous assessments
 */
async function checkConsistencyWithPrevious(profileId: string, responses: any[], db: any): Promise<string[]> {
  const warnings: string[] = [];
  
  try {
    // Get previous assessments for comparison
    const previousAssessments = await db.prepare(`
      SELECT subcategory_id, implementation_level, assessed_at as assessment_date
      FROM assessments 
      WHERE profile_id = ? 
      AND assessed_at < datetime('now')
      ORDER BY assessed_at DESC
      LIMIT 100
    `).all(profileId);

    // Check for significant changes without explanation
    for (const response of responses) {
      const previous = previousAssessments.find((p: any) => p.subcategory_id === response.subcategory_id);
      
      if (previous && typeof response.response_value === 'number') {
        const difference = Math.abs(response.response_value - previous.implementation_level);
        
        // Flag significant changes (> 2 levels) without notes
        if (difference > 2 && !response.notes) {
          warnings.push(`Significant change in ${response.subcategory_id} (${previous.implementation_level} → ${response.response_value}) should include explanation`);
        }
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Could not check consistency with previous assessments', { error: errorMessage });
  }
  
  return warnings;
}

/**
 * Get profile information
 */
async function getProfile(profileId: string, db: any) {
  try {
    return await db.prepare(`
      SELECT profile_id, profile_name, profile_type, org_id
      FROM profiles 
      WHERE profile_id = ?
    `).get(profileId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Could not retrieve profile', { profile_id: profileId, error: errorMessage });
    return null;
  }
}

// Export tool definition for MCP server
export const validateAssessmentResponsesTool = {
  name: 'validate_assessment_responses',
  description: 'Validate assessment responses for completeness, consistency, and data integrity with comprehensive error reporting',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        minLength: 1,
        description: 'Profile ID for the organization being assessed'
      },
      responses: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            subcategory_id: {
              type: 'string',
              minLength: 1,
              description: 'NIST CSF subcategory ID (e.g., GV.OC-01)'
            },
            response_value: {
              oneOf: [
                { type: 'number' },
                { type: 'string' }
              ],
              description: 'Response value - number for ratings, string for text responses'
            },
            confidence_level: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Confidence in the assessment response'
            },
            evidence: {
              type: 'string',
              description: 'Supporting evidence or documentation for the response'
            },
            notes: {
              type: 'string',
              description: 'Additional notes or context for the response'
            },
            assessed_by: {
              type: 'string',
              description: 'Person or team who performed the assessment'
            },
            assessment_date: {
              type: 'string',
              description: 'Date of assessment (ISO format)'
            }
          },
          required: ['subcategory_id', 'response_value']
        },
        description: 'Array of assessment responses to validate'
      },
      assessment_type: {
        type: 'string',
        enum: ['detailed', 'quick', 'custom'],
        default: 'detailed',
        description: 'Type of assessment for validation context'
      },
      require_all_questions: {
        type: 'boolean',
        default: false,
        description: 'Whether all questions must be answered for validation to pass'
      },
      validate_against_previous: {
        type: 'boolean',
        default: true,
        description: 'Compare responses against previous assessments for consistency'
      },
      check_evidence_requirements: {
        type: 'boolean',
        default: false,
        description: 'Require evidence for certain critical responses'
      }
    },
    required: ['profile_id', 'responses']
  }
};