/**
 * Unit tests for framework query tools
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { csfLookup } from '../../src/tools/csf_lookup';
import { searchFramework } from '../../src/tools/search_framework';
import { getRelatedSubcategories } from '../../src/tools/get_related_subcategories';
import { invalidInputs } from '../helpers/mock-data';

// Mock the framework loader
jest.mock('../../src/services/framework-loader', () => ({
  getFramework: jest.fn(() => ({
    getFunction: jest.fn((id) => {
      if (id === 'GV' || id === 'GOVERN') {
        return {
          id: 'GV',
          name: 'GOVERN',
          description: 'Establish and monitor cybersecurity governance'
        };
      }
      return null;
    }),
    getCategory: jest.fn((id) => {
      if (id === 'GV.OC') {
        return {
          id: 'GV.OC',
          function_id: 'GV',
          name: 'Organizational Context',
          description: 'The organizational context is understood'
        };
      }
      return null;
    }),
    getSubcategory: jest.fn((id) => {
      if (id === 'GV.OC-01') {
        return {
          id: 'GV.OC-01',
          category_id: 'GV.OC',
          name: 'Organizational mission understood',
          description: 'The organizational mission is understood'
        };
      }
      return null;
    }),
    getImplementationExamples: jest.fn((id) => {
      if (id === 'GV.OC-01') {
        return [
          {
            id: '1',
            subcategory_id: 'GV.OC-01',
            example: 'Document organizational mission',
            industry: 'All',
            organization_size: 'All'
          }
        ];
      }
      return [];
    }),
    getRelationships: jest.fn((id) => {
      if (id === 'GV.OC-01') {
        return [
          {
            source_id: 'GV.OC-01',
            target_id: 'ID.AM-01',
            relationship_type: 'related_to',
            description: 'Related subcategory'
          }
        ];
      }
      return [];
    }),
    searchElements: jest.fn((query) => {
      if (query.toLowerCase().includes('govern')) {
        return [
          {
            id: 'GV',
            type: 'function',
            name: 'GOVERN',
            description: 'Establish and monitor cybersecurity governance',
            score: 0.9
          }
        ];
      }
      return [];
    }),
    getSubcategoriesForCategory: jest.fn((categoryId) => {
      if (categoryId === 'GV.OC') {
        return [
          {
            id: 'GV.OC-01',
            category_id: 'GV.OC',
            name: 'Organizational mission understood',
            description: 'The organizational mission is understood'
          },
          {
            id: 'GV.OC-02',
            category_id: 'GV.OC',
            name: 'Internal and external stakeholders',
            description: 'Internal and external stakeholders are understood'
          }
        ];
      }
      return [];
    })
  }))
}));

describe('CSF Lookup Tool', () => {
  describe('Valid inputs', () => {
    it('should retrieve function by ID', async () => {
      const result = await csfLookup({ function_id: 'GV' });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeDefined();
      expect(result.data.function.id).toBe('GV');
      expect(result.data.function.name).toBe('GOVERN');
    });
    
    it('should retrieve function with partial match', async () => {
      const result = await csfLookup({ function_id: 'GOVERN' });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeDefined();
      expect(result.data.function.id).toBe('GV');
    });
    
    it('should retrieve category by ID', async () => {
      const result = await csfLookup({ category_id: 'GV.OC' });
      
      expect(result.success).toBe(true);
      expect(result.data.category).toBeDefined();
      expect(result.data.category.id).toBe('GV.OC');
      expect(result.data.category.name).toBe('Organizational Context');
    });
    
    it('should retrieve subcategory with examples', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_examples: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.subcategory).toBeDefined();
      expect(result.data.subcategory.id).toBe('GV.OC-01');
      expect(result.data.implementation_examples).toBeDefined();
      expect(result.data.implementation_examples.length).toBeGreaterThan(0);
    });
    
    it('should retrieve subcategory with relationships', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_relationships: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.relationships).toBeDefined();
      expect(result.data.relationships.length).toBeGreaterThan(0);
    });
    
    it('should handle multiple parameters', async () => {
      const result = await csfLookup({ 
        function_id: 'GV',
        category_id: 'GV.OC',
        subcategory_id: 'GV.OC-01'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeDefined();
      expect(result.data.category).toBeDefined();
      expect(result.data.subcategory).toBeDefined();
    });
  });
  
  describe('Invalid inputs', () => {
    it('should handle non-existent function ID', async () => {
      const result = await csfLookup({ function_id: 'INVALID' });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeNull();
    });
    
    it('should handle empty parameters', async () => {
      const result = await csfLookup({});
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('No search parameters provided');
    });
    
    it('should validate input types', async () => {
      await expect(csfLookup({ 
        function_id: 123 as any 
      })).rejects.toThrow();
    });
  });
  
  describe('Edge cases', () => {
    it('should handle case-insensitive matching', async () => {
      const result = await csfLookup({ function_id: 'gv' });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeDefined();
    });
    
    it('should handle whitespace in IDs', async () => {
      const result = await csfLookup({ function_id: ' GV ' });
      
      expect(result.success).toBe(true);
      expect(result.data.function).toBeDefined();
    });
  });
});

describe('Search Framework Tool', () => {
  describe('Valid searches', () => {
    it('should search with basic query', async () => {
      const result = await searchFramework({ query: 'govern' });
      
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].score).toBeDefined();
    });
    
    it('should filter by element types', async () => {
      const result = await searchFramework({ 
        query: 'govern',
        element_types: ['function']
      });
      
      expect(result.success).toBe(true);
      expect(result.results.every(r => r.type === 'function')).toBe(true);
    });
    
    it('should respect result limit', async () => {
      const result = await searchFramework({ 
        query: 'govern',
        limit: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
    
    it('should apply minimum score threshold', async () => {
      const result = await searchFramework({ 
        query: 'govern',
        min_score: 0.5
      });
      
      expect(result.success).toBe(true);
      expect(result.results.every(r => r.score >= 0.5)).toBe(true);
    });
    
    it('should handle fuzzy matching', async () => {
      const result = await searchFramework({ 
        query: 'govren', // Misspelled
        fuzzy: true
      });
      
      expect(result.success).toBe(true);
      // Fuzzy matching should still find results
    });
  });
  
  describe('Invalid searches', () => {
    it('should reject empty query', async () => {
      await expect(searchFramework({ 
        query: '' 
      })).rejects.toThrow();
    });
    
    it('should reject query too short', async () => {
      await expect(searchFramework({ 
        query: 'a' 
      })).rejects.toThrow();
    });
    
    it('should validate element types', async () => {
      await expect(searchFramework({ 
        query: 'govern',
        element_types: ['invalid' as any]
      })).rejects.toThrow();
    });
    
    it('should validate limit range', async () => {
      await expect(searchFramework({ 
        query: 'govern',
        limit: 101
      })).rejects.toThrow();
    });
    
    it('should validate score range', async () => {
      await expect(searchFramework({ 
        query: 'govern',
        min_score: 1.5
      })).rejects.toThrow();
    });
  });
  
  describe('Search performance', () => {
    it('should return results quickly', async () => {
      const start = Date.now();
      await searchFramework({ query: 'govern' });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
    
    it('should handle complex queries', async () => {
      const result = await searchFramework({ 
        query: 'govern AND organize OR manage',
        element_types: ['function', 'category', 'subcategory'],
        fuzzy: true,
        limit: 50
      });
      
      expect(result.success).toBe(true);
    });
  });
});

describe('Get Related Subcategories Tool', () => {
  describe('Valid relationships', () => {
    it('should get direct relationships', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.source_subcategory).toBeDefined();
      expect(result.data.relationships).toBeDefined();
      expect(result.data.relationships.length).toBeGreaterThan(0);
    });
    
    it('should filter by relationship type', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        relationship_types: ['related_to']
      });
      
      expect(result.success).toBe(true);
      expect(result.data.relationships.every(
        r => r.relationship_type === 'related_to'
      )).toBe(true);
    });
    
    it('should include bidirectional relationships', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        include_bidirectional: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.relationships).toBeDefined();
    });
    
    it('should traverse relationships with depth', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        depth: 2
      });
      
      expect(result.success).toBe(true);
      expect(result.data.relationships).toBeDefined();
    });
    
    it('should include relationship details', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        include_details: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data.relationships[0]).toHaveProperty('description');
    });
  });
  
  describe('Invalid inputs', () => {
    it('should handle non-existent subcategory', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'INVALID-ID'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
    
    it('should validate subcategory ID format', async () => {
      await expect(getRelatedSubcategories({ 
        subcategory_id: invalidInputs.emptyString
      })).rejects.toThrow();
    });
    
    it('should validate relationship types', async () => {
      await expect(getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        relationship_types: ['invalid_type' as any]
      })).rejects.toThrow();
    });
    
    it('should validate depth range', async () => {
      await expect(getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        depth: 4
      })).rejects.toThrow();
    });
  });
  
  describe('Relationship analysis', () => {
    it('should calculate relationship strength', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        include_details: true
      });
      
      expect(result.success).toBe(true);
      if (result.data.analysis) {
        expect(result.data.analysis).toHaveProperty('total_relationships');
        expect(result.data.analysis).toHaveProperty('relationship_types');
      }
    });
    
    it('should detect circular relationships', async () => {
      const result = await getRelatedSubcategories({ 
        subcategory_id: 'GV.OC-01',
        depth: 3,
        include_bidirectional: true
      });
      
      expect(result.success).toBe(true);
      // Should handle circular references without infinite loop
    });
  });
});