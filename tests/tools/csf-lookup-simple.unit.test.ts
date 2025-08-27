/**
 * CSF Lookup Tool - Simple Unit Tests
 * Testing core functionality with proper ES module mocking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { csfLookup, CSFLookupParams } from '../../src/tools/csf_lookup.js';
import { testUtils } from '../helpers/jest-setup.js';

// Mock the framework loader service
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

const mockFrameworkLoader = {
  isLoaded: jest.fn(),
  load: jest.fn(),
  getFunction: jest.fn(),
  getCategory: jest.fn(),
  getSubcategory: jest.fn(),
  getCategoriesForFunction: jest.fn(),
  getSubcategoriesForCategory: jest.fn(),
  searchElements: jest.fn()
};

describe('CSF Lookup Tool - Simple Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the framework loader
    const { getFrameworkLoader } = require('../../src/services/framework-loader.js');
    getFrameworkLoader.mockReturnValue(mockFrameworkLoader);
    
    // Setup default mocks
    mockFrameworkLoader.isLoaded.mockReturnValue(true);
  });

  describe('function lookup', () => {
    it('should retrieve function by ID successfully', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV'
      };

      // Mock framework loader response
      const mockFunction = testUtils.createMockFrameworkElement('function', {
        element_identifier: 'GV',
        title: 'GOVERN',
        text: 'Establish and monitor cybersecurity governance'
      });
      
      mockFrameworkLoader.getFunction.mockReturnValue(mockFunction);
      mockFrameworkLoader.getCategoriesForFunction.mockReturnValue([]);

      const result = await csfLookup(params);

      testUtils.assertSuccessResponse(result, {
        success: true
      });
      expect(result.data).toBeDefined();
      expect(result.count).toBe(1);
      expect(result.data[0].element.element_identifier).toBe('GV');
      expect(result.data[0].element.title).toBe('GOVERN');
      expect(mockFrameworkLoader.getFunction).toHaveBeenCalledWith('GV');
    });

    it('should handle non-existent function ID', async () => {
      const params: CSFLookupParams = {
        function_id: 'INVALID'
      };

      // Mock framework loader to return null
      mockFrameworkLoader.getFunction.mockReturnValue(null);
      mockFrameworkLoader.getFunctions.mockReturnValue([]);

      const result = await csfLookup(params);

      // Should return success with empty results, not an error
      testUtils.assertSuccessResponse(result, {
        success: true
      });
      expect(result.count).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(mockFrameworkLoader.getFunction).toHaveBeenCalledWith('INVALID');
    });
  });

  describe('category lookup', () => {
    it('should retrieve category by ID successfully', async () => {
      const params: CSFLookupParams = {
        category_id: 'GV.OC'
      };

      // Mock framework loader response
      mockFrameworkLoader.getCategory.mockReturnValue(
        testUtils.createMockFrameworkElement('category', {
          id: 'GV.OC',
          function_id: 'GV',
          name: 'Organizational Context',
          description: 'The organizational context is understood'
        })
      );

      const result = await csfLookup(params);

      testUtils.assertSuccessResponse(result, {
        success: true
      });
      expect(result.data?.category).toBeDefined();
      expect(result.data.category.id).toBe('GV.OC');
      expect(result.data.category.name).toBe('Organizational Context');
      expect(mockFrameworkLoader.getCategory).toHaveBeenCalledWith('GV.OC');
    });

    it('should handle non-existent category ID', async () => {
      const params: CSFLookupParams = {
        category_id: 'INVALID.INVALID'
      };

      mockFrameworkLoader.getCategory.mockReturnValue(null);

      const result = await csfLookup(params);

      testUtils.assertErrorResponse(result, 'Category not found');
    });
  });

  describe('subcategory lookup', () => {
    it('should retrieve subcategory by ID successfully', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'GV.OC-01',
        include_examples: true
      };

      // Mock framework loader responses
      mockFrameworkLoader.getSubcategory.mockReturnValue(
        testUtils.createMockFrameworkElement('subcategory', {
          id: 'GV.OC-01',
          category_id: 'GV.OC',
          name: 'Organizational mission understood',
          description: 'The organizational mission is understood and informs cybersecurity risk management'
        })
      );

      mockFrameworkLoader.getImplementationExamples.mockReturnValue([
        {
          id: 'ex1',
          subcategory_id: 'GV.OC-01',
          example: 'Develop and document organizational mission statement'
        }
      ]);

      const result = await csfLookup(params);

      testUtils.assertSuccessResponse(result, {
        success: true
      });
      expect(result.data?.subcategory).toBeDefined();
      expect(result.data.subcategory.id).toBe('GV.OC-01');
      expect(result.data.implementation_examples).toBeDefined();
      expect(result.data.implementation_examples).toHaveLength(1);
    });

    it('should handle non-existent subcategory ID', async () => {
      const params: CSFLookupParams = {
        subcategory_id: 'INVALID.INVALID-01'
      };

      mockFrameworkLoader.getSubcategory.mockReturnValue(null);

      const result = await csfLookup(params);

      testUtils.assertErrorResponse(result, 'Subcategory not found');
    });
  });

  describe('input validation', () => {
    it('should handle empty parameters', async () => {
      const params: CSFLookupParams = {};

      const result = await csfLookup(params);

      testUtils.assertErrorResponse(result, 'At least one lookup parameter must be provided');
    });

    it('should validate parameter types', async () => {
      const result = await csfLookup({ function_id: '' });

      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle framework loader errors gracefully', async () => {
      const params: CSFLookupParams = {
        function_id: 'GV'
      };

      // Mock framework loader to throw error
      mockFrameworkLoader.getFunction.mockImplementation(() => {
        throw new Error('Framework loader error');
      });

      const result = await csfLookup(params);

      testUtils.assertErrorResponse(result);
      expect(result.error).toContain('error');
    });
  });
});