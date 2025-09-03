/**
 * Framework Loader Service - Unit Tests
 * Testing service layer implementation for coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FrameworkLoader, getFrameworkLoader, initializeFramework } from '../../src/services/framework-loader.js';
import { readFileSync } from 'fs';

// Mock fs module
jest.mock('fs');
jest.mock('../../src/utils/logger.js');

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockFrameworkData = {
  response: {
    elements: {
      elements: [
        {
          element_identifier: 'GV',
          element_type: 'function',
          title: 'Govern',
          text: 'Develop and implement governance'
        },
        {
          element_identifier: 'GV.OC',
          element_type: 'category',
          title: 'Organizational Context',
          text: 'Organizational context category'
        },
        {
          element_identifier: 'GV.OC-01',
          element_type: 'subcategory',
          title: 'Organizational cybersecurity governance',
          text: 'The organization has a cybersecurity governance program'
        },
        {
          element_identifier: 'GV.OC-01.001',
          element_type: 'implementation_example',
          title: 'Example implementation',
          text: 'Establish cybersecurity governance structure'
        }
      ],
      relationships: [
        {
          source_element_identifier: 'GV.OC-01',
          dest_element_identifier: 'GV.OC-02',
          relationship_type: 'supports'
        }
      ],
      documents: [
        {
          document_id: 'doc-1',
          title: 'NIST CSF 2.0',
          description: 'Framework documentation'
        }
      ]
    }
  }
};

describe('Framework Loader Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock logger
    const loggerModule = require('../../src/utils/logger.js');
    loggerModule.logger = mockLogger;
    
    // Reset singleton instance
    (global as any).__frameworkLoaderInstance = null;
  });

  describe('FrameworkLoader class', () => {
    it('should initialize with default or custom JSON path', () => {
      const defaultLoader = new FrameworkLoader();
      expect(defaultLoader).toBeInstanceOf(FrameworkLoader);
      
      const customLoader = new FrameworkLoader('/custom/path/framework.json');
      expect(customLoader).toBeInstanceOf(FrameworkLoader);
    });

    it('should load and parse framework JSON successfully', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      expect(readFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loading CSF framework'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Framework loaded successfully'));
      expect(loader.isLoaded()).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        'invalid json content'
      );

      await expect(loader.load()).rejects.toThrow('Failed to load CSF framework');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load framework:', expect.any(Error));
    });

    it('should handle file reading errors', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(loader.load()).rejects.toThrow('Failed to load CSF framework');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should build caches correctly after loading', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      // Test cache building
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Caches built.*functions.*categories.*subcategories/)
      );

      // Test cache access
      const functions = loader.getFunctions();
      expect(functions).toHaveLength(1);
      expect(functions[0].element_identifier).toBe('GV');

      const function_gv = loader.getFunction('GV');
      expect(function_gv?.element_identifier).toBe('GV');

      const category_gvoc = loader.getCategory('GV.OC');
      expect(category_gvoc?.element_identifier).toBe('GV.OC');

      const subcategory = loader.getSubcategory('GV.OC-01');
      expect(subcategory?.element_identifier).toBe('GV.OC-01');
    });

    it('should get categories for a function', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const categories = loader.getCategoriesForFunction('GV');
      expect(categories).toHaveLength(1);
      expect(categories[0].element_identifier).toBe('GV.OC');
    });

    it('should get subcategories for a category', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const subcategories = loader.getSubcategoriesForCategory('GV.OC');
      expect(subcategories).toHaveLength(1);
      expect(subcategories[0].element_identifier).toBe('GV.OC-01');
    });

    it('should get implementation examples for a subcategory', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const examples = loader.getImplementationExamples('GV.OC-01');
      expect(examples).toHaveLength(1);
      expect(examples[0].element_identifier).toBe('GV.OC-01.001');
    });

    it('should search elements by keyword', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const results = loader.searchElements('governance');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].element_identifier).toBe('GV.OC-01');
    });

    it('should get elements by type', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const functions = loader.getElementsByType('function');
      expect(functions).toHaveLength(1);
      expect(functions[0].element_identifier).toBe('GV');

      const categories = loader.getElementsByType('category');
      expect(categories).toHaveLength(1);
      expect(categories[0].element_identifier).toBe('GV.OC');
    });

    it('should get relationships for an element', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const relationships = loader.getRelationships('GV.OC-01');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].source_element_identifier).toBe('GV.OC-01');
    });

    it('should get element by ID', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const element = loader.getElementById('GV.OC-01');
      expect(element?.element_identifier).toBe('GV.OC-01');

      const nonExistent = loader.getElementById('NONEXISTENT');
      expect(nonExistent).toBeUndefined();
    });

    it('should get documents', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      const documents = loader.getDocuments();
      expect(documents).toHaveLength(1);
      expect(documents[0].document_id).toBe('doc-1');
    });

    it('should provide framework statistics', async () => {
      const loader = new FrameworkLoader();
      
      // Test stats when not loaded
      const statsBeforeLoad = loader.getStats();
      expect(statsBeforeLoad.loaded).toBe(false);
      expect(statsBeforeLoad.functions).toBe(0);

      // Load framework
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      // Test stats after loading
      const statsAfterLoad = loader.getStats();
      expect(statsAfterLoad.loaded).toBe(true);
      expect(statsAfterLoad.functions).toBe(1);
      expect(statsAfterLoad.categories).toBe(1);
      expect(statsAfterLoad.subcategories).toBe(1);
      expect(statsAfterLoad.implementationExamples).toBe(1);
      expect(statsAfterLoad.relationships).toBe(1);
      expect(statsAfterLoad.totalElements).toBe(4);
    });

    it('should validate element ID formats', async () => {
      const loader = new FrameworkLoader();

      // Test function ID validation
      expect(loader.validateElementId('GV', 'function')).toBe(true);
      expect(loader.validateElementId('INVALID', 'function')).toBe(false);

      // Test category ID validation
      expect(loader.validateElementId('GV.OC', 'category')).toBe(true);
      expect(loader.validateElementId('GV', 'category')).toBe(false);

      // Test subcategory ID validation
      expect(loader.validateElementId('GV.OC-01', 'subcategory')).toBe(true);
      expect(loader.validateElementId('GV.OC', 'subcategory')).toBe(false);

      // Test implementation example ID validation
      expect(loader.validateElementId('GV.OC-01.001', 'implementation_example')).toBe(true);
      expect(loader.validateElementId('first', 'implementation_example')).toBe(true);
      expect(loader.validateElementId('third', 'implementation_example')).toBe(true);
      expect(loader.validateElementId('GV.OC-01', 'implementation_example')).toBe(false);
    });

    it('should return empty arrays when framework not loaded', () => {
      const loader = new FrameworkLoader();

      expect(loader.getFunctions()).toHaveLength(0);
      expect(loader.searchElements('test')).toHaveLength(0);
      expect(loader.getElementsByType('function')).toHaveLength(0);
      expect(loader.getRelationships('GV.OC-01')).toHaveLength(0);
      expect(loader.getElementById('GV')).toBeUndefined();
      expect(loader.getDocuments()).toHaveLength(0);
    });

    it('should extract parent subcategory from implementation example ID', async () => {
      const loader = new FrameworkLoader();
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      await loader.load();

      // The extractParentSubcategory method is private, but we can test its effect
      // through implementation examples caching
      const examples = loader.getImplementationExamples('GV.OC-01');
      expect(examples).toHaveLength(1);
      expect(examples[0].element_identifier).toBe('GV.OC-01.001');
    });
  });

  describe('Singleton functions', () => {
    it('should return the same instance from getFrameworkLoader', () => {
      const loader1 = getFrameworkLoader();
      const loader2 = getFrameworkLoader();
      
      expect(loader1).toBe(loader2);
      expect(loader1).toBeInstanceOf(FrameworkLoader);
    });

    it('should initialize framework with initializeFramework', async () => {
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      const loader = await initializeFramework();
      
      expect(loader).toBeInstanceOf(FrameworkLoader);
      expect(loader.isLoaded()).toBe(true);
    });

    it('should not reload framework if already loaded', async () => {
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      const loader1 = await initializeFramework();
      expect(loader1.isLoaded()).toBe(true);

      // Clear the mock to ensure load() isn't called again
      jest.clearAllMocks();

      const loader2 = await initializeFramework();
      expect(loader2.isLoaded()).toBe(true);
      expect(readFileSync).not.toHaveBeenCalled(); // Should not load again
    });

    it('should allow custom JSON path', async () => {
      const customPath = '/custom/path/framework.json';
      
      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(mockFrameworkData)
      );

      const loader = getFrameworkLoader(customPath);
      await loader.load();

      expect(readFileSync).toHaveBeenCalledWith(customPath, 'utf-8');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing relationships gracefully', async () => {
      const loader = new FrameworkLoader();
      
      const dataWithoutRelationships = {
        response: {
          elements: {
            elements: mockFrameworkData.response.elements.elements,
            // relationships: undefined
          }
        }
      };

      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(dataWithoutRelationships)
      );

      await loader.load();

      const relationships = loader.getRelationships('GV.OC-01');
      expect(relationships).toHaveLength(0);
    });

    it('should handle missing documents gracefully', async () => {
      const loader = new FrameworkLoader();
      
      const dataWithoutDocuments = {
        response: {
          elements: {
            elements: mockFrameworkData.response.elements.elements,
            relationships: mockFrameworkData.response.elements.relationships
            // documents: undefined
          }
        }
      };

      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(dataWithoutDocuments)
      );

      await loader.load();

      const documents = loader.getDocuments();
      expect(documents).toHaveLength(0);
    });

    it('should handle malformed element identifiers', async () => {
      const loader = new FrameworkLoader();
      
      const dataWithMalformedIds = {
        response: {
          elements: {
            elements: [
              {
                element_identifier: 'MALFORMED-ID-001',
                element_type: 'implementation_example',
                title: 'Malformed example'
              }
            ]
          }
        }
      };

      (readFileSync as jest.MockedFunction<typeof readFileSync>).mockReturnValue(
        JSON.stringify(dataWithMalformedIds)
      );

      await loader.load();

      // Should not throw errors, but malformed examples won't be properly categorized
      const stats = loader.getStats();
      expect(stats.loaded).toBe(true);
    });
  });
});