/**
 * MCP Tool: get_assessment_questions
 * Retrieves comprehensive assessment questions based on NIST CSF 2.0 subcategories
 */

import { z } from 'zod';
import { questionBankService } from '../services/question-bank.js';
import { logger } from '../utils/enhanced-logger.js';

// Input validation schema
const GetAssessmentQuestionsSchema = z.object({
  function: z.enum(['GV', 'ID', 'PR', 'DE', 'RS', 'RC']).optional()
    .describe('CSF function to focus on'),
  category: z.string().optional()
    .describe('Specific category ID (e.g., GV.OC, ID.AM)'),
  subcategory_ids: z.array(z.string()).optional()
    .describe('Specific subcategory IDs to include'),
  assessment_type: z.enum(['detailed', 'quick', 'custom']).default('detailed')
    .describe('Type of assessment - affects question depth and options'),
  organization_size: z.enum(['small', 'medium', 'large', 'enterprise']).optional()
    .describe('Organization size for context-appropriate questions'),
  include_conditional: z.boolean().default(false)
    .describe('Include questions with conditional logic'),
  include_examples: z.boolean().default(true)
    .describe('Include implementation examples with questions'),
  include_references: z.boolean().default(false)
    .describe('Include reference links and documentation'),
  language: z.string().default('en')
    .describe('Language for question text (currently only en supported)')
});

type GetAssessmentQuestionsParams = z.infer<typeof GetAssessmentQuestionsSchema>;

/**
 * Get comprehensive assessment questions for NIST CSF evaluation
 */
export async function getAssessmentQuestions(params: GetAssessmentQuestionsParams) {
  const startTime = Date.now();
  
  try {
    // Validate input parameters
    const validatedParams = GetAssessmentQuestionsSchema.parse(params);
    
    logger.info('Retrieving assessment questions', {
      function: validatedParams.function,
      category: validatedParams.category,
      assessment_type: validatedParams.assessment_type,
      organization_size: validatedParams.organization_size,
      subcategory_count: validatedParams.subcategory_ids?.length
    });

    // Get questions from question bank service
    const questions = await questionBankService.getAssessmentQuestions(validatedParams);

    const response = {
      success: true,
      total_questions: questions.length,
      assessment_type: validatedParams.assessment_type,
      questions: questions,
      metadata: {
        functions_covered: [...new Set(questions.map(q => q.function))],
        categories_covered: [...new Set(questions.map(q => q.category))],
        required_questions: questions.filter(q => q.required).length,
        optional_questions: questions.filter(q => !q.required).length,
        estimated_completion_time: estimateCompletionTime(questions.length, validatedParams.assessment_type),
        generation_time: Date.now() - startTime
      }
    };

    logger.info('Assessment questions retrieved successfully', {
      total_questions: response.total_questions,
      functions_covered: response.metadata.functions_covered.length,
      categories_covered: response.metadata.categories_covered.length,
      duration: Date.now() - startTime
    });

    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to retrieve assessment questions', {
      error: errorMessage,
      params,
      duration: Date.now() - startTime
    });

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input parameters',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          received: 'received' in e ? e.received : 'unknown'
        }))
      };
    }

    return {
      success: false,
      error: 'Failed to retrieve assessment questions',
      message: errorMessage
    };
  }
}

/**
 * Estimate completion time based on question count and type
 */
export function estimateCompletionTime(questionCount: number, assessmentType: string): string {
  let timePerQuestion = 2; // minutes
  
  switch (assessmentType) {
    case 'quick':
      timePerQuestion = 1;
      break;
    case 'detailed':
      timePerQuestion = 3;
      break;
    case 'custom':
      timePerQuestion = 2.5;
      break;
  }

  const totalMinutes = questionCount * timePerQuestion;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Export tool definition for MCP server
export const getAssessmentQuestionsTool = {
  name: 'get_assessment_questions',
  description: 'Retrieve comprehensive assessment questions based on NIST CSF 2.0 subcategories with context-aware customization',
  inputSchema: {
    type: 'object',
    properties: {
      function: {
        type: 'string',
        enum: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'],
        description: 'CSF function to focus on'
      },
      category: {
        type: 'string',
        description: 'Specific category ID (e.g., GV.OC, ID.AM)'
      },
      subcategory_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific subcategory IDs to include'
      },
      assessment_type: {
        type: 'string',
        enum: ['detailed', 'quick', 'custom'],
        default: 'detailed',
        description: 'Type of assessment - affects question depth and options'
      },
      organization_size: {
        type: 'string',
        enum: ['small', 'medium', 'large', 'enterprise'],
        description: 'Organization size for context-appropriate questions'
      },
      include_conditional: {
        type: 'boolean',
        default: false,
        description: 'Include questions with conditional logic'
      },
      include_examples: {
        type: 'boolean',
        default: true,
        description: 'Include implementation examples with questions'
      },
      include_references: {
        type: 'boolean',
        default: false,
        description: 'Include reference links and documentation'
      },
      language: {
        type: 'string',
        default: 'en',
        description: 'Language for question text (currently only en supported)'
      }
    }
  }
};