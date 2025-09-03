/**
 * Comprehensive tests for CSF Lookup tool - Core MCP functionality validation
 */

import { csfLookup } from '../../src/tools/csf_lookup.js';
import { getFrameworkLoader } from '../../src/services/framework-loader.js';

describe('CSF Lookup Tool', () => {
  beforeAll(async () => {
    // Ensure framework is loaded
    const framework = getFrameworkLoader();
    if (!framework.isLoaded()) {
      await framework.load();
    }
  }, 30000); // Increased timeout for framework loading

  describe('Function Lookup', () => {
    test('should retrieve GV (GOVERN) function', async () => {
      const result = await csfLookup({ function_id: 'GV' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV');
      expect(result.data[0].element.title).toBe('GOVERN');
    });

    test('should retrieve all functions when no ID provided', async () => {
      const result = await csfLookup({});
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(6); // GV, ID, PR, DE, RS, RC
      expect(result.data.map(f => f.element.element_identifier)).toContain('GV');
      expect(result.data.map(f => f.element.element_identifier)).toContain('ID');
    });

    test('should handle invalid function ID gracefully', async () => {
      const result = await csfLookup({ function_id: 'INVALID' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    test('should handle partial function matches', async () => {
      const result = await csfLookup({ function_id: 'G' });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('Category Lookup', () => {
    test('should retrieve GV.OC category', async () => {
      const result = await csfLookup({ category_id: 'GV.OC' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC');
      expect(result.data[0].parent?.element_identifier).toBe('GV');
    });

    test('should include children subcategories for category', async () => {
      const result = await csfLookup({ category_id: 'GV.OC' });
      
      expect(result.success).toBe(true);
      expect(result.data[0].children).toBeDefined();
      expect(Array.isArray(result.data[0].children)).toBe(true);
    });

    test('should handle invalid category gracefully', async () => {
      const result = await csfLookup({ category_id: 'INVALID.CAT' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Subcategory Lookup', () => {
    test('should retrieve GV.OC-01 subcategory with full details', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_examples: true,
        include_relationships: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC-01');
      expect(result.data[0].parent).toBeDefined();
    });

    test('should include implementation examples when requested', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_examples: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].examples).toBeDefined();
    });

    test('should exclude examples when requested', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_examples: false
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].examples).toBeUndefined();
    });

    test('should include relationships when requested', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_relationships: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].relationships).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty parameters gracefully', async () => {
      const result = await csfLookup({});
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(6); // Returns all functions
    });

    test('should handle null/undefined inputs', async () => {
      const result = await csfLookup({ 
        function_id: undefined,
        category_id: undefined,
        subcategory_id: undefined
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(6);
    });

    test('should maintain consistent response structure', async () => {
      const result = await csfLookup({ function_id: 'GV' });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should complete lookup within reasonable time', async () => {
      const startTime = Date.now();
      
      await csfLookup({ function_id: 'GV' });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle multiple concurrent lookups', async () => {
      const promises = [
        csfLookup({ function_id: 'GV' }),
        csfLookup({ category_id: 'ID.AM' }),
        csfLookup({ subcategory_id: 'PR.AA-01' })
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });
});