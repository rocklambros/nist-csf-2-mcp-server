/**
 * Framework Lookup Tools Test Suite
 * Tests for: csf_lookup, search_framework, get_related_subcategories, 
 * get_question_context, get_implementation_guidance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { FrameworkLookupTestHelper } from '../helpers/category-test-helpers.js';

// Framework lookup tools don't require database, only framework loader
const toolHelper = setupCompleteToolMocking('framework_tools');

describe('Framework Lookup Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // No cleanup needed for framework-only tools
  });

  describe('CSF Lookup Tool', () => {
    it('should lookup specific CSF element by ID', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const params = {
        element_id: 'GV.OC-01'
      };

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.element).toBeDefined();
      FrameworkLookupTestHelper.validateFrameworkElement(result.element);
      expect(result.element.element_identifier).toBe('GV.OC-01');
    });

    it('should support partial matching', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const params = {
        element_id: 'GV.OC',
        partial_match: true
      };

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      expect(Array.isArray(result.elements)).toBe(true);
      expect(result.elements.length).toBeGreaterThan(0);
      
      result.elements.forEach((element: any) => {
        FrameworkLookupTestHelper.validateFrameworkElement(element);
        expect(element.element_identifier).toMatch(/^GV\.OC/);
      });
    });

    it('should return not found for invalid element ID', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const params = {
        element_id: 'INVALID-123'
      };

      const result = await csfLookup(params);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should reject empty element ID', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const params = {
        element_id: ''
      };

      const result = await csfLookup(params);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/validation|invalid|required/i);
    });
  });

  describe('Search Framework Tool', () => {
    it('should perform full-text search with ranking', async () => {
      const { searchFramework } = await import('../../src/tools/search_framework.js');
      
      const queries = FrameworkLookupTestHelper.generateSearchQueries();
      
      for (const testCase of queries) {
        const params = {
          search_query: testCase.query,
          max_results: 10
        };

        const result = await searchFramework(params);

        expect(result.success).toBe(true);
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);

        if (testCase.expectedResults.length > 0) {
          expect(result.results.length).toBeGreaterThan(0);
          
          // Verify ranking (first result should have highest relevance_score)
          if (result.results.length > 1) {
            expect(result.results[0].relevance_score).toBeGreaterThanOrEqual(
              result.results[1].relevance_score
            );
          }
        } else {
          expect(result.results.length).toBe(0);
        }

        result.results.forEach((item: any) => {
          expect(item).toHaveProperty('element_identifier');
          expect(item).toHaveProperty('relevance_score');
          expect(item.relevance_score).toBeGreaterThan(0);
          expect(item.relevance_score).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should support filtered search by function', async () => {
      const { searchFramework } = await import('../../src/tools/search_framework.js');
      
      const params = {
        search_query: 'management',
        filters: { function: 'GV' },
        max_results: 5
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      
      result.results.forEach((item: any) => {
        expect(item.element_identifier).toMatch(/^GV\./);
      });
    });

    it('should handle fuzzy matching for typos', async () => {
      const { searchFramework } = await import('../../src/tools/search_framework.js');
      
      const params = {
        search_query: 'governence', // Intentional typo
        fuzzy_matching: true,
        max_results: 5
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should reject empty search query', async () => {
      const { searchFramework } = await import('../../src/tools/search_framework.js');
      
      const params = {
        search_query: ''
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/validation|invalid|required/i);
    });
  });

  describe('Get Related Subcategories Tool', () => {
    it('should find related subcategories with relationship types', async () => {
      const { getRelatedSubcategories } = await import('../../src/tools/get_related_subcategories.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        relationship_types: ['similar', 'dependent', 'supporting']
      };

      const result = await getRelatedSubcategories(params);

      expect(result.success).toBe(true);
      expect(result.related_subcategories).toBeDefined();
      expect(Array.isArray(result.related_subcategories)).toBe(true);

      result.related_subcategories.forEach((item: any) => {
        expect(item).toHaveProperty('subcategory_id');
        expect(item).toHaveProperty('relationship_type');
        expect(item).toHaveProperty('relationship_strength');
        expect(['similar', 'dependent', 'supporting']).toContain(item.relationship_type);
        expect(item.relationship_strength).toBeGreaterThan(0);
        expect(item.relationship_strength).toBeLessThanOrEqual(1);
      });
    });

    it('should analyze dependencies between subcategories', async () => {
      const { getRelatedSubcategories } = await import('../../src/tools/get_related_subcategories.js');
      
      const params = {
        subcategory_id: 'ID.AM-01',
        relationship_types: ['dependent'],
        include_dependency_analysis: true
      };

      const result = await getRelatedSubcategories(params);

      expect(result.success).toBe(true);
      expect(result.dependency_analysis).toBeDefined();
      expect(result.dependency_analysis.prerequisites).toBeDefined();
      expect(result.dependency_analysis.dependents).toBeDefined();
    });

    it('should return empty results for isolated subcategories', async () => {
      const { getRelatedSubcategories } = await import('../../src/tools/get_related_subcategories.js');
      
      const params = {
        subcategory_id: 'ISOLATED-TEST', // Hypothetical isolated subcategory
        relationship_types: ['similar']
      };

      const result = await getRelatedSubcategories(params);

      expect(result.success).toBe(true);
      expect(result.related_subcategories).toBeDefined();
      expect(result.related_subcategories.length).toBe(0);
    });

    it('should reject invalid subcategory ID', async () => {
      const { getRelatedSubcategories } = await import('../../src/tools/get_related_subcategories.js');
      
      const params = {
        subcategory_id: 'INVALID-123',
        relationship_types: ['similar']
      };

      const result = await getRelatedSubcategories(params);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Get Question Context Tool', () => {
    it('should provide context for assessment questions', async () => {
      const { getQuestionContext } = await import('../../src/tools/get_question_context.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        question_dimension: 'risk'
      };

      const result = await getQuestionContext(params);

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context.subcategory_info).toBeDefined();
      expect(result.context.implementation_guidance).toBeDefined();
      expect(result.context.related_questions).toBeDefined();
    });

    it('should provide context for all question dimensions', async () => {
      const { getQuestionContext } = await import('../../src/tools/get_question_context.js');
      
      const dimensions = ['risk', 'maturity', 'implementation', 'effectiveness'];
      
      for (const dimension of dimensions) {
        const params = {
          subcategory_id: 'GV.OC-01',
          question_dimension: dimension
        };

        const result = await getQuestionContext(params);

        expect(result.success).toBe(true);
        expect(result.context.question_dimension).toBe(dimension);
      }
    });

    it('should reject invalid question dimension', async () => {
      const { getQuestionContext } = await import('../../src/tools/get_question_context.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        question_dimension: 'invalid_dimension'
      };

      const result = await getQuestionContext(params);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/validation|invalid/i);
    });
  });

  describe('Get Implementation Guidance Tool', () => {
    it('should provide implementation guidance for subcategories', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        organization_size: 'medium',
        industry_sector: 'Technology'
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance).toBeDefined();
      expect(result.guidance.implementation_examples).toBeDefined();
      expect(result.guidance.best_practices).toBeDefined();
      expect(result.guidance.common_pitfalls).toBeDefined();
    });

    it('should tailor guidance to organization size', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const sizes = ['small', 'medium', 'large', 'enterprise'];
      
      for (const size of sizes) {
        const params = {
          subcategory_id: 'GV.OC-01',
          organization_size: size,
          industry_sector: 'Technology'
        };

        const result = await getImplementationGuidance(params);

        expect(result.success).toBe(true);
        expect(result.guidance.organization_size).toBe(size);
        expect(result.guidance.implementation_examples).toBeDefined();
      }
    });

    it('should provide industry-specific guidance', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        organization_size: 'medium',
        industry_sector: 'Financial Services'
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(true);
      expect(result.guidance.industry_considerations).toBeDefined();
      expect(result.guidance.regulatory_considerations).toBeDefined();
    });

    it('should reject invalid organization size', async () => {
      const { getImplementationGuidance } = await import('../../src/tools/get_implementation_guidance.js');
      
      const params = {
        subcategory_id: 'GV.OC-01',
        organization_size: 'invalid_size',
        industry_sector: 'Technology'
      };

      const result = await getImplementationGuidance(params);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/validation|invalid/i);
    });
  });
});