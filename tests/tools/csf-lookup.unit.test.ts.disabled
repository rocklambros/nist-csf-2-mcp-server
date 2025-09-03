/**
 * CSF Lookup Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { csfLookup, CSFLookupParams } from '../../src/tools/csf_lookup.js';

// Mock the framework loader service
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

const mockFrameworkLoader = {
  isLoaded: jest.fn(),
  load: jest.fn(),
  getFunctions: jest.fn(),
  getFunction: jest.fn(),
  getCategory: jest.fn(),
  getSubcategory: jest.fn(),
  getCategoriesForFunction: jest.fn(),
  getSubcategoriesForCategory: jest.fn(),
  getImplementationExamples: jest.fn(),
  getRelationships: jest.fn(),
  getElementsByType: jest.fn()
};

describe('CSF Lookup Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the framework loader
    const { getFrameworkLoader } = require('../../src/services/framework-loader.js');
    getFrameworkLoader.mockReturnValue(mockFrameworkLoader);
  });

  describe('csfLookup function', () => {
    it('should lookup specific subcategory with examples and relationships', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'GV.OC-01',
        include_examples: true,
        include_relationships: true
      };

      // Mock framework loader responses
      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getSubcategory.mockReturnValue({
        element_identifier: 'GV.OC-01',
        element_type: 'subcategory',
        title: 'Organizational cybersecurity governance',
        text: 'The organization has a cybersecurity governance program.'
      });
      mockFrameworkLoader.getCategory.mockReturnValue({
        element_identifier: 'GV.OC',
        element_type: 'category',
        title: 'Organizational Context'
      });
      mockFrameworkLoader.getImplementationExamples.mockReturnValue([
        {
          element_identifier: 'GV.OC-01.001',
          element_type: 'implementation_example',
          text: 'Establish cybersecurity governance structure'
        }
      ]);
      mockFrameworkLoader.getRelationships.mockReturnValue([
        {
          source_element_identifier: 'GV.OC-01',
          dest_element_identifier: 'GV.OC-02',
          relationship_type: 'supports'
        }
      ]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC-01');
      expect(result.data[0].parent?.element_identifier).toBe('GV.OC');
      expect(result.data[0].examples).toHaveLength(1);
      expect(result.data[0].relationships).toHaveLength(1);
    });

    it('should lookup category with child subcategories', async () => {
      const params: CSFLookupParams = {
        category_id: 'GV.OC',
        include_relationships: true
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getCategory.mockReturnValue({
        element_identifier: 'GV.OC',
        element_type: 'category',
        title: 'Organizational Context'
      });
      mockFrameworkLoader.getFunction.mockReturnValue({
        element_identifier: 'GV',
        element_type: 'function',
        title: 'Govern'
      });
      mockFrameworkLoader.getSubcategoriesForCategory.mockReturnValue([
        {
          element_identifier: 'GV.OC-01',
          element_type: 'subcategory',
          title: 'Organizational cybersecurity governance'
        },
        {
          element_identifier: 'GV.OC-02',
          element_type: 'subcategory',
          title: 'Cybersecurity roles and responsibilities'
        }
      ]);
      mockFrameworkLoader.getRelationships.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC');
      expect(result.data[0].parent?.element_identifier).toBe('GV');
      expect(result.data[0].children).toHaveLength(2);
      expect(result.data[0].children?.[0].element_identifier).toBe('GV.OC-01');
    });

    it('should lookup function with child categories', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV',
        include_relationships: false
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getFunction.mockReturnValue({
        element_identifier: 'GV',
        element_type: 'function',
        title: 'Govern',
        text: 'Develop and implement the organizational governance and risk management strategy'
      });
      mockFrameworkLoader.getCategoriesForFunction.mockReturnValue([
        {
          element_identifier: 'GV.OC',
          element_type: 'category',
          title: 'Organizational Context'
        },
        {
          element_identifier: 'GV.SC',
          element_type: 'category',
          title: 'Supply Chain Risk Management'
        }
      ]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV');
      expect(result.data[0].children).toHaveLength(2);
      expect(result.data[0].relationships).toBeUndefined();
    });

    it('should return all functions when no specific ID provided', async () => {
      const params: CSFLookupParams = {};

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getFunctions.mockReturnValue([
        {
          element_identifier: 'GV',
          element_type: 'function',
          title: 'Govern'
        },
        {
          element_identifier: 'ID',
          element_type: 'function',
          title: 'Identify'
        },
        {
          element_identifier: 'PR',
          element_type: 'function',
          title: 'Protect'
        }
      ]);
      mockFrameworkLoader.getCategoriesForFunction.mockImplementation((funcId: string) => {
        if (funcId === 'GV') return [{ element_identifier: 'GV.OC' }];
        if (funcId === 'ID') return [{ element_identifier: 'ID.AM' }];
        if (funcId === 'PR') return [{ element_identifier: 'PR.AC' }];
        return [];
      });

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.data.map((d: any) => d.element.element_identifier)).toEqual(['GV', 'ID', 'PR']);
    });

    it('should load framework if not already loaded', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV'
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(false);
      mockFrameworkLoader.load.mockResolvedValue(undefined);
      mockFrameworkLoader.getFunction.mockReturnValue({
        element_identifier: 'GV',
        element_type: 'function',
        title: 'Govern'
      });
      mockFrameworkLoader.getCategoriesForFunction.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(mockFrameworkLoader.load).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle partial matching for functions', async () => {
      const params: CSFLookupParams = {
        function_id: 'govern' // lowercase, should match 'GV'
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getFunction.mockReturnValue(null); // No exact match
      mockFrameworkLoader.getFunctions.mockReturnValue([
        {
          element_identifier: 'GV',
          element_type: 'function',
          title: 'Govern',
          text: 'Governance function'
        },
        {
          element_identifier: 'ID',
          element_type: 'function',
          title: 'Identify'
        }
      ]);
      mockFrameworkLoader.getCategoriesForFunction.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV');
    });

    it('should handle partial matching for categories', async () => {
      const params: CSFLookupParams = {
        category_id: 'organizational' // should match 'GV.OC'
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getCategory.mockReturnValue(null); // No exact match
      mockFrameworkLoader.getElementsByType.mockReturnValue([
        {
          element_identifier: 'GV.OC',
          element_type: 'category',
          title: 'Organizational Context'
        },
        {
          element_identifier: 'GV.SC',
          element_type: 'category',
          title: 'Supply Chain'
        }
      ]);
      mockFrameworkLoader.getFunction.mockReturnValue({
        element_identifier: 'GV',
        element_type: 'function',
        title: 'Govern'
      });
      mockFrameworkLoader.getSubcategoriesForCategory.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC');
    });

    it('should handle partial matching for subcategories', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'cybersecurity governance' // should match 'GV.OC-01'
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getSubcategory.mockReturnValue(null); // No exact match
      mockFrameworkLoader.getElementsByType.mockReturnValue([
        {
          element_identifier: 'GV.OC-01',
          element_type: 'subcategory',
          title: 'Organizational cybersecurity governance'
        },
        {
          element_identifier: 'GV.OC-02',
          element_type: 'subcategory',
          title: 'Cybersecurity roles'
        }
      ]);
      mockFrameworkLoader.getCategory.mockReturnValue({
        element_identifier: 'GV.OC',
        element_type: 'category'
      });

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC-01');
    });

    it('should handle framework loading errors', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV'
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(false);
      mockFrameworkLoader.load.mockRejectedValue(new Error('Failed to load framework'));

      const result = await csfLookup(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load framework');
    });

    it('should handle unknown errors', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV'
      };

      mockFrameworkLoader.isLoaded.mockImplementation(() => {
        throw 'Unknown error type'; // Non-Error object
      });

      const result = await csfLookup(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should exclude examples when include_examples is false', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'GV.OC-01',
        include_examples: false,
        include_relationships: true
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getSubcategory.mockReturnValue({
        element_identifier: 'GV.OC-01',
        element_type: 'subcategory'
      });
      mockFrameworkLoader.getCategory.mockReturnValue({ element_identifier: 'GV.OC' });
      mockFrameworkLoader.getRelationships.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.data[0].examples).toBeUndefined();
      expect(mockFrameworkLoader.getImplementationExamples).not.toHaveBeenCalled();
    });

    it('should exclude relationships when include_relationships is false', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'GV.OC-01',
        include_examples: true,
        include_relationships: false
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getSubcategory.mockReturnValue({
        element_identifier: 'GV.OC-01',
        element_type: 'subcategory'
      });
      mockFrameworkLoader.getCategory.mockReturnValue({ element_identifier: 'GV.OC' });
      mockFrameworkLoader.getImplementationExamples.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.data[0].relationships).toBeUndefined();
      expect(mockFrameworkLoader.getRelationships).not.toHaveBeenCalled();
    });

    it('should use default values for boolean parameters', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'GV.OC-01'
        // include_examples and include_relationships not specified, should default to true
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getSubcategory.mockReturnValue({
        element_identifier: 'GV.OC-01',
        element_type: 'subcategory'
      });
      mockFrameworkLoader.getCategory.mockReturnValue({ element_identifier: 'GV.OC' });
      mockFrameworkLoader.getImplementationExamples.mockReturnValue([]);
      mockFrameworkLoader.getRelationships.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(mockFrameworkLoader.getImplementationExamples).toHaveBeenCalled();
      expect(mockFrameworkLoader.getRelationships).toHaveBeenCalled();
    });

    it('should handle multiple partial matches', async () => {
      const params: CSFLookupParams = {
        function_id: 'e' // should match 'DE', 'RE', etc.
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(true);
      mockFrameworkLoader.getFunction.mockReturnValue(null);
      mockFrameworkLoader.getFunctions.mockReturnValue([
        { element_identifier: 'GV', title: 'Govern' },
        { element_identifier: 'DE', title: 'Detect' },
        { element_identifier: 'RE', title: 'Recover' }
      ]);
      mockFrameworkLoader.getCategoriesForFunction.mockReturnValue([]);

      const result = await csfLookup(params);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2); // DE and RE should match
      expect(result.data.map((d: any) => d.element.element_identifier)).toEqual(expect.arrayContaining(['DE', 'RE']));
    });
  });
});