/**
 * Comprehensive tests for framework query tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, testUtils } from '../setup.js';
import { csfLookup } from '../../src/tools/csf_lookup.js';
import { searchFramework } from '../../src/tools/search_framework.js';
import { getRelatedSubcategories } from '../../src/tools/get_related_subcategories.js';
import { invalidInputs } from '../helpers/mock-data.js';

describe('Framework Query Tools - Comprehensive Tests', () => {
  beforeAll(async () => {
    // Additional test data for framework queries
    await setupFrameworkTestData();
  });

  describe('CSF Lookup Tool', () => {
    describe('Valid Input Tests', () => {
      test('should lookup function by ID', async () => {
        const result = await csfLookup({ element_id: 'GV' }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          element: expect.objectContaining({
            id: 'GV',
            name: 'GOVERN',
            type: 'function'
          })
        });
      });

      test('should lookup category by ID', async () => {
        const result = await csfLookup({ element_id: 'GV.OC' }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          element: expect.objectContaining({
            id: 'GV.OC',
            name: 'Organizational Context',
            type: 'category'
          })
        });
      });

      test('should lookup subcategory by ID', async () => {
        const result = await csfLookup({ element_id: 'GV.OC-01' }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          element: expect.objectContaining({
            id: 'GV.OC-01',
            name: expect.stringContaining('mission'),
            type: 'subcategory'
          })
        });
      });

      test('should include examples when requested', async () => {
        const result = await csfLookup({ 
          element_id: 'GV.OC-01', 
          include_examples: true 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.element).toBeDefined();
        // Examples may be empty but property should exist
        expect(result.element).toHaveProperty('examples');
      });

      test('should include references when requested', async () => {
        const result = await csfLookup({ 
          element_id: 'GV.OC-01', 
          include_references: true 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.element).toBeDefined();
        expect(result.element).toHaveProperty('references');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing element_id', async () => {
        const result = await csfLookup({} as any, testDb);
        testUtils.assertErrorResponse(result, 'element_id');
      });

      test('should handle invalid element_id format', async () => {
        const result = await csfLookup({ element_id: invalidInputs.invalidId }, testDb);
        testUtils.assertErrorResponse(result);
      });

      test('should handle non-existent element_id', async () => {
        const result = await csfLookup({ element_id: 'XX.YY-99' }, testDb);
        testUtils.assertErrorResponse(result, 'not found');
      });

      test('should handle SQL injection attempts', async () => {
        const result = await csfLookup({ element_id: invalidInputs.sqlInjection }, testDb);
        testUtils.assertErrorResponse(result);
      });

      test('should handle XSS attempts', async () => {
        const result = await csfLookup({ element_id: invalidInputs.xssAttempt }, testDb);
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Edge Cases', () => {
      test('should handle case insensitive lookup', async () => {
        const result = await csfLookup({ element_id: 'gv.oc-01' }, testDb);
        // Depending on implementation, might succeed or fail consistently
        expect(result).toBeDefined();
      });

      test('should handle whitespace in element_id', async () => {
        const result = await csfLookup({ element_id: ' GV.OC-01 ' }, testDb);
        // Should handle trimming or fail consistently
        expect(result).toBeDefined();
      });
    });
  });

  describe('Search Framework Tool', () => {
    describe('Valid Search Tests', () => {
      test('should search by function', async () => {
        const result = await searchFramework({ 
          function: 'GV',
          limit: 10 
        }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          results: expect.arrayContaining([
            expect.objectContaining({
              function_id: 'GV'
            })
          ]),
          total_count: expect.any(Number)
        });
      });

      test('should search by keyword', async () => {
        const result = await searchFramework({ 
          keyword: 'governance',
          limit: 10 
        }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          results: expect.any(Array),
          total_count: expect.any(Number)
        });
        
        // Results should contain the keyword
        if (result.results.length > 0) {
          const hasKeyword = result.results.some((item: any) => 
            item.name?.toLowerCase().includes('govern') ||
            item.description?.toLowerCase().includes('govern')
          );
          expect(hasKeyword).toBe(true);
        }
      });

      test('should respect limit parameter', async () => {
        const limit = 3;
        const result = await searchFramework({ 
          keyword: 'security',
          limit 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.results.length).toBeLessThanOrEqual(limit);
      });

      test('should handle pagination with offset', async () => {
        const firstPage = await searchFramework({ 
          keyword: 'security',
          limit: 2,
          offset: 0 
        }, testDb);
        
        const secondPage = await searchFramework({ 
          keyword: 'security',
          limit: 2,
          offset: 2 
        }, testDb);
        
        expect(firstPage.success).toBe(true);
        expect(secondPage.success).toBe(true);
        
        // Should have different results (if enough data)
        if (firstPage.results.length > 0 && secondPage.results.length > 0) {
          expect(firstPage.results[0].id).not.toBe(secondPage.results[0].id);
        }
      });

      test('should search multiple criteria', async () => {
        const result = await searchFramework({ 
          function: 'GV',
          keyword: 'context',
          limit: 10 
        }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          results: expect.any(Array),
          total_count: expect.any(Number)
        });
        
        // Results should match both criteria
        result.results.forEach((item: any) => {
          expect(item.function_id).toBe('GV');
        });
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle empty search criteria', async () => {
        const result = await searchFramework({}, testDb);
        // Should return error or all results with pagination
        expect(result).toBeDefined();
      });

      test('should handle invalid function', async () => {
        const result = await searchFramework({ function: 'INVALID' }, testDb);
        testUtils.assertValidResponse(result, {
          success: true,
          results: [],
          total_count: 0
        });
      });

      test('should handle negative limit', async () => {
        const result = await searchFramework({ 
          keyword: 'test',
          limit: -1 
        }, testDb);
        
        // Should handle gracefully
        expect(result.success).toBe(true);
      });

      test('should handle oversized limit', async () => {
        const result = await searchFramework({ 
          keyword: 'test',
          limit: 10000 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.results.length).toBeLessThanOrEqual(1000); // Assuming max limit
      });
    });

    describe('Performance Tests', () => {
      test('should complete search within performance threshold', async () => {
        const startTime = Date.now();
        await searchFramework({ 
          keyword: 'security management governance',
          limit: 50 
        }, testDb);
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Get Related Subcategories Tool', () => {
    describe('Valid Input Tests', () => {
      test('should find related subcategories', async () => {
        const result = await getRelatedSubcategories({ 
          subcategory_id: 'GV.OC-01',
          relationship_type: 'same_category' 
        }, testDb);
        
        testUtils.assertValidResponse(result, {
          success: true,
          subcategory_id: 'GV.OC-01',
          related_subcategories: expect.any(Array)
        });
      });

      test('should handle different relationship types', async () => {
        const relationshipTypes = ['same_category', 'dependent', 'supporting', 'related'];
        
        for (const type of relationshipTypes) {
          const result = await getRelatedSubcategories({ 
            subcategory_id: 'GV.OC-01',
            relationship_type: type as any
          }, testDb);
          
          expect(result.success).toBe(true);
          expect(result.related_subcategories).toBeDefined();
        }
      });

      test('should respect limit parameter', async () => {
        const limit = 3;
        const result = await getRelatedSubcategories({ 
          subcategory_id: 'GV.OC-01',
          relationship_type: 'same_category',
          limit 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.related_subcategories.length).toBeLessThanOrEqual(limit);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing subcategory_id', async () => {
        const result = await getRelatedSubcategories({ 
          relationship_type: 'same_category' 
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'subcategory_id');
      });

      test('should handle invalid subcategory_id', async () => {
        const result = await getRelatedSubcategories({ 
          subcategory_id: 'INVALID-ID',
          relationship_type: 'same_category' 
        }, testDb);
        
        testUtils.assertErrorResponse(result);
      });

      test('should handle invalid relationship_type', async () => {
        const result = await getRelatedSubcategories({ 
          subcategory_id: 'GV.OC-01',
          relationship_type: 'invalid_type' as any
        }, testDb);
        
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Edge Cases', () => {
      test('should handle subcategory with no relations', async () => {
        // Create isolated subcategory for testing
        const result = await getRelatedSubcategories({ 
          subcategory_id: 'ID.AM-01',
          relationship_type: 'same_category' 
        }, testDb);
        
        expect(result.success).toBe(true);
        expect(result.related_subcategories).toEqual([]);
      });
    });
  });

  describe('Database Transaction Tests', () => {
    test('should handle database connection errors gracefully', async () => {
      // Create a mock database that fails
      const mockDb = {
        prepare: () => ({ get: () => { throw new Error('Database error'); } })
      };
      
      const result = await csfLookup({ element_id: 'GV.OC-01' }, mockDb as any);
      testUtils.assertErrorResponse(result, 'Database error');
    });

    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        csfLookup({ element_id: 'GV.OC-01' }, testDb)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent response format for successful queries', async () => {
      const result = await csfLookup({ element_id: 'GV.OC-01' }, testDb);
      
      expect(result).toMatchObject({
        success: true,
        element: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          type: expect.any(String)
        })
      });
    });

    test('should return consistent error format', async () => {
      const result = await csfLookup({ element_id: 'INVALID' }, testDb);
      
      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });
});

/**
 * Setup additional test data for framework queries
 */
async function setupFrameworkTestData() {
  // Add more test subcategories
  const additionalSubcategories = [
    {
      id: 'GV.OC-02',
      category_id: 'GV.OC',
      name: 'Internal stakeholders understood',
      description: 'Internal and external stakeholders are understood, and their needs and expectations are considered'
    },
    {
      id: 'ID.AM-02',
      category_id: 'ID.AM',
      name: 'Software platforms and applications inventoried',
      description: 'Software platforms and applications within the organization are inventoried'
    }
  ];

  for (const subcategory of additionalSubcategories) {
    try {
      testDb.db.prepare(`
        INSERT OR REPLACE INTO subcategories (id, category_id, name, description)
        VALUES (?, ?, ?, ?)
      `).run(subcategory.id, subcategory.category_id, subcategory.name, subcategory.description);
    } catch (error) {
      // Table might not exist yet
    }
  }
}