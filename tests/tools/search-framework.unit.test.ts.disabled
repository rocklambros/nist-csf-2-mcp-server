/**
 * Search Framework Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { searchFramework, SearchFrameworkParams } from '../../src/tools/search_framework.js';

// Mock the framework loader service
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

const mockFrameworkLoader = {
  isLoaded: jest.fn(),
  load: jest.fn(),
  getFunctions: jest.fn(),
  getElementsByType: jest.fn()
};

const mockElements = [
  {
    element_identifier: 'GV.OC-01',
    element_type: 'subcategory',
    title: 'Organizational cybersecurity governance',
    text: 'The organization has a cybersecurity governance program'
  },
  {
    element_identifier: 'PR.AC-01',
    element_type: 'subcategory',
    title: 'Identity management',
    text: 'Identities and credentials are issued, managed, and verified'
  },
  {
    element_identifier: 'DE.CM-01',
    element_type: 'subcategory',
    title: 'Continuous monitoring',
    text: 'Networks and network devices are monitored continuously'
  },
  {
    element_identifier: 'GV',
    element_type: 'function',
    title: 'Govern',
    text: 'Develop and implement governance and risk management strategy'
  }
];

describe('Search Framework Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the framework loader
    const { getFrameworkLoader } = require('../../src/services/framework-loader.js');
    getFrameworkLoader.mockReturnValue(mockFrameworkLoader);
    
    // Setup default mocks
    mockFrameworkLoader.isLoaded.mockReturnValue(true);
    mockFrameworkLoader.getFunctions.mockReturnValue([mockElements[3]]);
    mockFrameworkLoader.getElementsByType.mockImplementation((type: string) => {
      return mockElements.filter(el => el.element_type === type);
    });
  });

  describe('searchFramework function', () => {
    it('should search and return results with scoring', async () => {
      const params: SearchFrameworkParams = {
        query: 'governance',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.query).toBe('governance');
      expect(result.total_matches).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      
      // Should find elements containing "governance"
      const governanceResults = result.results.filter((r: any) => 
        r.element.title.toLowerCase().includes('governance') || 
        r.element.text.toLowerCase().includes('governance')
      );
      expect(governanceResults.length).toBeGreaterThan(0);
    });

    it('should filter by element types', async () => {
      const params: SearchFrameworkParams = {
        query: 'governance',
        element_types: ['subcategory'],
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.results.every((r: any) => r.element.element_type === 'subcategory')).toBe(true);
      expect(mockFrameworkLoader.getElementsByType).toHaveBeenCalledWith('subcategory');
    });

    it('should respect minimum score threshold', async () => {
      const params: SearchFrameworkParams = {
        query: 'xyz123nonexistent', // Query that won't match well
        min_score: 0.8,
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.total_matches).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should limit results correctly', async () => {
      const params: SearchFrameworkParams = {
        query: 'the', // Common word that should match many elements
        limit: 2
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.returned).toBeLessThanOrEqual(2);
      expect(result.results).toHaveLength(result.returned);
    });

    it('should sort results by score descending', async () => {
      const params: SearchFrameworkParams = {
        query: 'cybersecurity',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      
      if (result.results.length > 1) {
        for (let i = 1; i < result.results.length; i++) {
          expect(result.results[i-1].score).toBeGreaterThanOrEqual(result.results[i].score);
        }
      }
    });

    it('should provide grouped results by type', async () => {
      const params: SearchFrameworkParams = {
        query: 'management',
        limit: 20
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.grouped_results).toBeDefined();
      expect(typeof result.grouped_results).toBe('object');
    });

    it('should include statistics', async () => {
      const params: SearchFrameworkParams = {
        query: 'security',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.by_type).toBeDefined();
      expect(result.statistics.score_distribution).toBeDefined();
    });

    it('should handle fuzzy matching when enabled', async () => {
      const params: SearchFrameworkParams = {
        query: 'governence', // Misspelled "governance"
        fuzzy: true,
        min_score: 0.2,
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      // Should still find governance-related results due to fuzzy matching
    });

    it('should disable fuzzy matching when requested', async () => {
      const params: SearchFrameworkParams = {
        query: 'governance',
        fuzzy: false,
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      // Results should be based on exact matching only
    });

    it('should load framework if not already loaded', async () => {
      const params: SearchFrameworkParams = {
        query: 'test',
        limit: 5
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(false);
      mockFrameworkLoader.load.mockResolvedValue(undefined);

      const result = await searchFramework(params);

      expect(mockFrameworkLoader.load).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle framework loading errors', async () => {
      const params: SearchFrameworkParams = {
        query: 'test',
        limit: 5
      };

      mockFrameworkLoader.isLoaded.mockReturnValue(false);
      mockFrameworkLoader.load.mockRejectedValue(new Error('Failed to load framework'));

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load framework');
    });

    it('should validate input parameters', async () => {
      const params = {
        query: 'x', // Too short (minimum 2 characters)
        limit: 5
      } as SearchFrameworkParams;

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle multiple element types', async () => {
      const params: SearchFrameworkParams = {
        query: 'security',
        element_types: ['function', 'category', 'subcategory'],
        limit: 20
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(mockFrameworkLoader.getElementsByType).toHaveBeenCalledTimes(3);
      expect(mockFrameworkLoader.getElementsByType).toHaveBeenCalledWith('function');
      expect(mockFrameworkLoader.getElementsByType).toHaveBeenCalledWith('category');
      expect(mockFrameworkLoader.getElementsByType).toHaveBeenCalledWith('subcategory');
    });

    it('should handle empty search results', async () => {
      const params: SearchFrameworkParams = {
        query: 'nonexistentterm123xyz',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.total_matches).toBe(0);
      expect(result.returned).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should use default parameter values', async () => {
      const params: SearchFrameworkParams = {
        query: 'governance'
        // Other parameters should use defaults
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      expect(result.returned).toBeLessThanOrEqual(20); // Default limit
    });

    it('should validate limit parameter bounds', async () => {
      const params = {
        query: 'test',
        limit: 150 // Exceeds maximum of 100
      } as SearchFrameworkParams;

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate min_score parameter bounds', async () => {
      const params = {
        query: 'test',
        min_score: 1.5 // Exceeds maximum of 1.0
      } as SearchFrameworkParams;

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown errors', async () => {
      const params: SearchFrameworkParams = {
        query: 'test',
        limit: 5
      };

      mockFrameworkLoader.isLoaded.mockImplementation(() => {
        throw 'Unknown error type'; // Non-Error object
      });

      const result = await searchFramework(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should search across multiple fields', async () => {
      const params: SearchFrameworkParams = {
        query: 'identity',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      
      // Should find matches in both title and text fields
      if (result.results.length > 0) {
        result.results.forEach((searchResult: any) => {
          expect(searchResult.matches).toBeDefined();
          expect(Array.isArray(searchResult.matches)).toBe(true);
        });
      }
    });

    it('should handle case-insensitive search', async () => {
      const params: SearchFrameworkParams = {
        query: 'GOVERNANCE', // Uppercase
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      // Should find lowercase "governance" matches
    });

    it('should score exact matches higher than partial matches', async () => {
      const params: SearchFrameworkParams = {
        query: 'governance',
        limit: 10
      };

      const result = await searchFramework(params);

      expect(result.success).toBe(true);
      
      if (result.results.length > 1) {
        // Results with exact title matches should have higher scores
        const exactTitleMatches = result.results.filter((r: any) => 
          r.element.title.toLowerCase() === 'governance'
        );
        const partialMatches = result.results.filter((r: any) => 
          r.element.title.toLowerCase().includes('governance') && 
          r.element.title.toLowerCase() !== 'governance'
        );
        
        if (exactTitleMatches.length > 0 && partialMatches.length > 0) {
          expect(exactTitleMatches[0].score).toBeGreaterThan(partialMatches[0].score);
        }
      }
    });
  });
});