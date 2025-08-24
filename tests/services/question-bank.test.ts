/**
 * Simplified unit tests for Question Bank Service
 * Tests the core question generation logic with minimal mocking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Simple mock data
const mockSubcategory = {
  element_identifier: 'GV.OC-01',
  element_type: 'subcategory',
  text: 'The organizational mission is understood and informs cybersecurity risk management',
  title: ''
};

const mockCategory = {
  element_identifier: 'GV.OC',
  element_type: 'category', 
  text: 'Organizational Context'
};

const mockFunction = {
  element_identifier: 'GV',
  element_type: 'function',
  text: 'GOVERN'
};

// Mock the dependencies with minimal setup
jest.mock('../../src/utils/enhanced-logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/services/framework-loader.js', () => ({
  getFrameworkLoader: jest.fn(() => ({
    getElementById: jest.fn((id) => {
      if (id === 'GV.OC-01') return mockSubcategory;
      if (id === 'GV.OC') return mockCategory;
      if (id === 'GV') return mockFunction;
      return null;
    }),
    getElementsByType: jest.fn(() => [mockSubcategory]),
    getImplementationExamples: jest.fn(() => []),
    getSubcategoriesForCategory: jest.fn(() => [mockSubcategory])
  }))
}));

describe('QuestionBankService - Simplified Tests', () => {
  let QuestionBankService: any;
  let questionBankService: any;

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const module = await import('../../src/services/question-bank.js');
    QuestionBankService = module.QuestionBankService;
    questionBankService = new QuestionBankService();
  });

  describe('getAssessmentQuestions', () => {
    it('should generate basic questions successfully', async () => {
      const result = await questionBankService.getAssessmentQuestions({
        assessment_type: 'detailed'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('subcategory_id');
      expect(result[0]).toHaveProperty('question_text');
      expect(result[0]).toHaveProperty('options');
    });

    it('should handle quick assessment type', async () => {
      const result = await questionBankService.getAssessmentQuestions({
        assessment_type: 'quick'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].question_type).toBe('implementation_status');
        expect(result[0].options).toHaveLength(4);
      }
    });

    it('should handle detailed assessment type', async () => {
      const result = await questionBankService.getAssessmentQuestions({
        assessment_type: 'detailed'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].question_type).toBe('maturity_rating');
        expect(result[0].options).toHaveLength(6);
      }
    });
  });

  describe('getQuestionContext', () => {
    it('should retrieve context for a subcategory', async () => {
      const result = await questionBankService.getQuestionContext({
        subcategory_id: 'GV.OC-01'
      });

      expect(result).toHaveProperty('subcategory_id', 'GV.OC-01');
      expect(result).toHaveProperty('subcategory_text');
      expect(result).toHaveProperty('risk_factors');
      expect(result).toHaveProperty('best_practices');
    });

    it('should include implementation examples when requested', async () => {
      const result = await questionBankService.getQuestionContext({
        subcategory_id: 'GV.OC-01',
        include_implementation_examples: true
      });

      expect(result).toHaveProperty('implementation_examples');
    });

    it('should handle missing subcategory', async () => {
      await expect(
        questionBankService.getQuestionContext({
          subcategory_id: 'INVALID-01'
        })
      ).rejects.toThrow('Subcategory INVALID-01 not found');
    });
  });
});