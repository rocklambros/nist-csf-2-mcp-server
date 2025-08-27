/**
 * Assessment Execution Tools Test Suite
 * Tests for: quick_assessment, assess_maturity, calculate_risk_score, get_assessment_questions, validate_assessment_responses
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { AssessmentExecutionTestHelper } from '../helpers/category-test-helpers.js';

const toolHelper = setupCompleteToolMocking('assessment_execution');

describe('Assessment Execution Tools', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await toolHelper.resetDatabase();
    await toolHelper.createTestOrganization();
  });

  afterEach(async () => {
    await toolHelper.cleanup();
  });

  describe('Quick Assessment Tool', () => {
    it('should perform rapid assessment with binary responses', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');
      
      const testCase = AssessmentExecutionTestHelper.generateAssessmentAnswers()[0];
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_type: 'rapid',
        responses: testCase.answers
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      expect(result.assessment).toBeDefined();
      expect(result.assessment.overall_score).toBeGreaterThanOrEqual(testCase.expectedScore.min);
      expect(result.assessment.overall_score).toBeLessThanOrEqual(testCase.expectedScore.max);
      expect(result.assessment.function_scores).toBeDefined();
      expect(result.assessment.function_scores).toHaveProperty('GV');
      expect(result.assessment.function_scores).toHaveProperty('ID');
      expect(result.assessment.function_scores).toHaveProperty('PR');
      expect(result.assessment.function_scores).toHaveProperty('DE');
      expect(result.assessment.function_scores).toHaveProperty('RS');
      expect(result.assessment.function_scores).toHaveProperty('RC');
    });

    it('should handle partial assessment responses', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_type: 'rapid',
        responses: {
          govern: 'yes',
          identify: 'partial',
          protect: 'no'
          // Missing detect, respond, recover
        }
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      expect(result.assessment.completeness_score).toBeLessThan(1.0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate prioritized recommendations', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');
      
      const lowMaturityAnswers = {
        govern: 'no',
        identify: 'no',
        protect: 'partial',
        detect: 'no',
        respond: 'no',
        recover: 'no'
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_type: 'rapid',
        responses: lowMaturityAnswers,
        include_recommendations: true
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('priority');
      expect(result.recommendations[0]).toHaveProperty('function');
      expect(result.recommendations[0]).toHaveProperty('description');
      expect(['high', 'medium', 'low']).toContain(result.recommendations[0].priority);
    });

    it('should validate organization existence', async () => {
      const { quickAssessment } = await import('../../src/tools/quick_assessment.js');
      
      const params = {
        organization_id: 'non-existent-org',
        assessment_type: 'rapid',
        responses: { govern: 'yes' }
      };

      const result = await quickAssessment(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/organization.*not found/i);
    });
  });

  describe('Assess Maturity Tool', () => {
    it('should perform comprehensive maturity assessment', async () => {
      const { assessMaturity } = await import('../../src/tools/assess_maturity.js');
      
      const comprehensiveAnswers = AssessmentExecutionTestHelper.generateComprehensiveAssessment();
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_data: comprehensiveAnswers,
        include_subcategory_scores: true
      };

      const result = await assessMaturity(params);

      expect(result.success).toBe(true);
      expect(result.maturity_assessment).toBeDefined();
      expect(result.maturity_assessment.overall_maturity_level).toBeGreaterThanOrEqual(1);
      expect(result.maturity_assessment.overall_maturity_level).toBeLessThanOrEqual(5);
      expect(result.maturity_assessment.function_maturity).toBeDefined();
      expect(result.maturity_assessment.subcategory_scores).toBeDefined();
      expect(Object.keys(result.maturity_assessment.subcategory_scores)).toContain('GV.OC-01');
    });

    it('should calculate maturity trends with historical data', async () => {
      const { assessMaturity } = await import('../../src/tools/assess_maturity.js');
      
      // Simulate previous assessment
      const previousAnswers = AssessmentExecutionTestHelper.generateComprehensiveAssessment('low');
      const currentAnswers = AssessmentExecutionTestHelper.generateComprehensiveAssessment('high');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_data: currentAnswers,
        compare_with_previous: true
      };

      const result = await assessMaturity(params);

      expect(result.success).toBe(true);
      expect(result.maturity_assessment.trend_analysis).toBeDefined();
      expect(result.maturity_assessment.improvement_areas).toBeDefined();
    });

    it('should provide industry benchmarking when available', async () => {
      const { assessMaturity } = await import('../../src/tools/assess_maturity.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_data: AssessmentExecutionTestHelper.generateComprehensiveAssessment(),
        include_industry_benchmark: true
      };

      const result = await assessMaturity(params);

      expect(result.success).toBe(true);
      if (result.maturity_assessment.industry_benchmark) {
        expect(result.maturity_assessment.industry_benchmark).toHaveProperty('sector_average');
        expect(result.maturity_assessment.industry_benchmark).toHaveProperty('percentile_ranking');
      }
    });

    it('should validate assessment data completeness', async () => {
      const { assessMaturity } = await import('../../src/tools/assess_maturity.js');
      
      const incompleteData = {
        // Missing many required assessment fields
        responses: {
          'GV.OC-01': 3
        }
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_data: incompleteData,
        require_completeness: true
      };

      const result = await assessMaturity(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/incomplete|validation|required/i);
    });
  });

  describe('Calculate Risk Score Tool', () => {
    it('should calculate comprehensive risk scores', async () => {
      const { calculateRiskScore } = await import('../../src/tools/calculate_risk_score.js');
      
      const riskFactors = AssessmentExecutionTestHelper.generateRiskFactors();
      const params = {
        organization_id: toolHelper.testOrgId,
        risk_factors: riskFactors,
        calculation_method: 'weighted_average'
      };

      const result = await calculateRiskScore(params);

      expect(result.success).toBe(true);
      expect(result.risk_assessment).toBeDefined();
      expect(result.risk_assessment.overall_risk_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_assessment.overall_risk_score).toBeLessThanOrEqual(100);
      expect(result.risk_assessment.risk_level).toMatch(/low|medium|high|critical/i);
      expect(result.risk_assessment.function_risks).toBeDefined();
    });

    it('should handle different risk calculation methods', async () => {
      const { calculateRiskScore } = await import('../../src/tools/calculate_risk_score.js');
      
      const riskFactors = AssessmentExecutionTestHelper.generateRiskFactors();
      const methods = ['simple_average', 'weighted_average', 'monte_carlo'];
      
      for (const method of methods) {
        const params = {
          organization_id: toolHelper.testOrgId,
          risk_factors: riskFactors,
          calculation_method: method
        };

        const result = await calculateRiskScore(params);
        
        expect(result.success).toBe(true);
        expect(result.risk_assessment.calculation_method).toBe(method);
      }
    });

    it('should provide risk mitigation recommendations', async () => {
      const { calculateRiskScore } = await import('../../src/tools/calculate_risk_score.js');
      
      const highRiskFactors = AssessmentExecutionTestHelper.generateRiskFactors('high');
      const params = {
        organization_id: toolHelper.testOrgId,
        risk_factors: highRiskFactors,
        include_recommendations: true
      };

      const result = await calculateRiskScore(params);

      expect(result.success).toBe(true);
      expect(result.risk_mitigation).toBeDefined();
      expect(result.risk_mitigation.high_priority_actions).toBeDefined();
      expect(Array.isArray(result.risk_mitigation.high_priority_actions)).toBe(true);
    });

    it('should validate risk factor inputs', async () => {
      const { calculateRiskScore } = await import('../../src/tools/calculate_risk_score.js');
      
      const invalidRiskFactors = {
        threat_level: 150, // Invalid: should be 0-100
        vulnerability_score: -5 // Invalid: should be non-negative
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        risk_factors: invalidRiskFactors
      };

      const result = await calculateRiskScore(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation|invalid|range/i);
    });
  });

  describe('Get Assessment Questions Tool', () => {
    it('should retrieve questions for specific subcategories', async () => {
      const { getAssessmentQuestions } = await import('../../src/tools/get_assessment_questions.js');
      
      const params = {
        subcategory_ids: ['GV.OC-01', 'ID.AM-01', 'PR.AC-01'],
        question_dimension: 'maturity'
      };

      const result = await getAssessmentQuestions(params);

      expect(result.success).toBe(true);
      expect(result.questions).toBeDefined();
      expect(Array.isArray(result.questions)).toBe(true);
      expect(result.questions.length).toBe(3); // One per subcategory
      
      result.questions.forEach((question: any) => {
        expect(question).toHaveProperty('subcategory_id');
        expect(question).toHaveProperty('question_text');
        expect(question).toHaveProperty('dimension');
        expect(question.dimension).toBe('maturity');
      });
    });

    it('should retrieve questions by function', async () => {
      const { getAssessmentQuestions } = await import('../../src/tools/get_assessment_questions.js');
      
      const params = {
        function_id: 'GV',
        question_dimension: 'risk'
      };

      const result = await getAssessmentQuestions(params);

      expect(result.success).toBe(true);
      expect(result.questions).toBeDefined();
      expect(result.questions.length).toBeGreaterThan(0);
      
      result.questions.forEach((question: any) => {
        expect(question.subcategory_id).toMatch(/^GV\./);
        expect(question.dimension).toBe('risk');
      });
    });

    it('should support all question dimensions', async () => {
      const { getAssessmentQuestions } = await import('../../src/tools/get_assessment_questions.js');
      
      const dimensions = ['risk', 'maturity', 'implementation', 'effectiveness'];
      
      for (const dimension of dimensions) {
        const params = {
          subcategory_ids: ['GV.OC-01'],
          question_dimension: dimension
        };

        const result = await getAssessmentQuestions(params);
        
        expect(result.success).toBe(true);
        expect(result.questions[0].dimension).toBe(dimension);
      }
    });

    it('should include response options for questions', async () => {
      const { getAssessmentQuestions } = await import('../../src/tools/get_assessment_questions.js');
      
      const params = {
        subcategory_ids: ['PR.AC-01'],
        question_dimension: 'implementation',
        include_response_options: true
      };

      const result = await getAssessmentQuestions(params);

      expect(result.success).toBe(true);
      expect(result.questions[0].response_options).toBeDefined();
      expect(Array.isArray(result.questions[0].response_options)).toBe(true);
      expect(result.questions[0].response_options.length).toBeGreaterThan(0);
    });
  });

  describe('Validate Assessment Responses Tool', () => {
    it('should validate complete assessment responses', async () => {
      const { validateAssessmentResponses } = await import('../../src/tools/validate_assessment_responses.js');
      
      const responses = AssessmentExecutionTestHelper.generateValidResponses();
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_responses: responses,
        validation_level: 'comprehensive'
      };

      const result = await validateAssessmentResponses(params);

      expect(result.success).toBe(true);
      expect(result.validation_results).toBeDefined();
      expect(result.validation_results.is_valid).toBe(true);
      expect(result.validation_results.completeness_score).toBeGreaterThan(0.8);
      expect(result.validation_results.consistency_score).toBeGreaterThan(0.7);
    });

    it('should detect inconsistent responses', async () => {
      const { validateAssessmentResponses } = await import('../../src/tools/validate_assessment_responses.js');
      
      const inconsistentResponses = AssessmentExecutionTestHelper.generateInconsistentResponses();
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_responses: inconsistentResponses,
        validation_level: 'strict'
      };

      const result = await validateAssessmentResponses(params);

      expect(result.success).toBe(true);
      expect(result.validation_results.consistency_issues).toBeDefined();
      expect(result.validation_results.consistency_issues.length).toBeGreaterThan(0);
      expect(result.validation_results.consistency_score).toBeLessThan(0.7);
    });

    it('should validate response data types and ranges', async () => {
      const { validateAssessmentResponses } = await import('../../src/tools/validate_assessment_responses.js');
      
      const invalidResponses = {
        'GV.OC-01': 6, // Invalid: should be 1-5
        'ID.AM-01': 'invalid_string', // Invalid: should be number
        'PR.AC-01': -1 // Invalid: should be positive
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_responses: invalidResponses
      };

      const result = await validateAssessmentResponses(params);

      expect(result.success).toBe(false);
      expect(result.validation_results.validation_errors).toBeDefined();
      expect(result.validation_results.validation_errors.length).toBeGreaterThan(0);
    });

    it('should provide improvement suggestions', async () => {
      const { validateAssessmentResponses } = await import('../../src/tools/validate_assessment_responses.js');
      
      const partialResponses = AssessmentExecutionTestHelper.generatePartialResponses();
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_responses: partialResponses,
        provide_suggestions: true
      };

      const result = await validateAssessmentResponses(params);

      expect(result.success).toBe(true);
      expect(result.improvement_suggestions).toBeDefined();
      expect(Array.isArray(result.improvement_suggestions)).toBe(true);
    });
  });
});