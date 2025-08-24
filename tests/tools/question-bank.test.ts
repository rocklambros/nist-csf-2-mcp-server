/**
 * Simplified unit tests for Question Bank tools
 * Tests the MCP tool functions with minimal mocking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies with simple implementations
jest.mock('../../src/utils/enhanced-logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(), 
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/db/database.js', () => ({
  getDatabase: jest.fn(() => ({
    prepare: jest.fn((sql) => {
      if (sql.includes('profiles')) {
        return {
          get: jest.fn(() => ({ profile_id: 'test-profile', name: 'Test Profile' })),
          all: jest.fn(() => []),
          run: jest.fn(() => ({ changes: 1 }))
        };
      }
      return {
        all: jest.fn(() => []),
        get: jest.fn(() => null),
        run: jest.fn(() => ({ changes: 0 }))
      };
    }),
    close: jest.fn()
  }))
}));

jest.mock('../../src/services/question-bank.js', () => ({
  questionBankService: {
    getAssessmentQuestions: jest.fn(() => Promise.resolve([
      {
        subcategory_id: 'GV.OC-01',
        question_text: 'Test question',
        question_type: 'maturity_rating',
        options: [
          { value: 0, label: 'Not Implemented' },
          { value: 1, label: 'Basic' }
        ],
        function: 'GV',
        category: 'GV.OC',
        required: true
      }
    ])),
    getQuestionContext: jest.fn((params) => {
      const baseContext = {
        subcategory_id: 'GV.OC-01',
        subcategory_text: 'Test subcategory text',
        category_text: 'Test category text',
        function_text: 'Test function text',
        risk_factors: ['Test risk'],
        best_practices: ['Test practice'],
        related_subcategories: ['GV.OC-02']
      };

      if (params.include_implementation_examples) {
        return Promise.resolve({
          ...baseContext,
          implementation_examples: ['Example implementation']
        });
      }

      return Promise.resolve(baseContext);
    })
  }
}));

describe('Question Bank Tools - Simplified Tests', () => {
  let getAssessmentQuestions: any;
  let validateAssessmentResponses: any;
  let getQuestionContext: any;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Dynamic imports to ensure mocks are applied
    const toolsModule1 = await import('../../src/tools/get_assessment_questions.js');
    const toolsModule2 = await import('../../src/tools/validate_assessment_responses.js');
    const toolsModule3 = await import('../../src/tools/get_question_context.js');
    
    getAssessmentQuestions = toolsModule1.getAssessmentQuestions;
    validateAssessmentResponses = toolsModule2.validateAssessmentResponses;
    getQuestionContext = toolsModule3.getQuestionContext;
  });

  describe('get_assessment_questions', () => {
    it('should return assessment questions successfully', async () => {
      const result = await getAssessmentQuestions({
        assessment_type: 'detailed'
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('total_questions');
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('should handle validation errors', async () => {
      const result = await getAssessmentQuestions({
        assessment_type: 'invalid_type' // This should trigger validation error
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    it('should calculate completion time', async () => {
      const result = await getAssessmentQuestions({
        assessment_type: 'detailed'
      });

      if (result.success) {
        expect(result.metadata).toHaveProperty('estimated_completion_time');
        expect(typeof result.metadata.estimated_completion_time).toBe('string');
      }
    });
  });

  describe('validate_assessment_responses', () => {
    it('should validate complete responses', async () => {
      const validResponses = [
        {
          subcategory_id: 'GV.OC-01',
          response_value: 1, // Use valid option value from mock
          notes: 'Test implementation'
        }
      ];

      const result = await validateAssessmentResponses({
        profile_id: 'test-profile',
        responses: validResponses
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('validation_results');
      expect(result.validation_results).toHaveProperty('is_valid');
    });

    it('should handle validation errors for invalid input', async () => {
      const result = await validateAssessmentResponses({
        // Missing required fields
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('get_question_context', () => {
    it('should return question context successfully', async () => {
      const result = await getQuestionContext({
        subcategory_id: 'GV.OC-01'
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('context');
      expect(result.context).toHaveProperty('subcategory_id', 'GV.OC-01');
      expect(result.context).toHaveProperty('risk_factors');
      expect(result.context).toHaveProperty('best_practices');
    });

    it('should handle validation errors', async () => {
      const result = await getQuestionContext({
        subcategory_id: '' // Invalid empty ID
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    it('should include implementation examples when requested', async () => {
      const result = await getQuestionContext({
        subcategory_id: 'GV.OC-01',
        include_implementation_examples: true
      });

      if (result.success) {
        expect(result.context).toHaveProperty('implementation_examples');
      }
    });
  });
});