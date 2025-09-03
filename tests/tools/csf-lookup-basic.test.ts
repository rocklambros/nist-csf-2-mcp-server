/**
 * Basic tests for CSF Lookup tool - Critical functionality validation
 */

import { csfLookup } from '../../src/tools/csf_lookup.js';
import { getFrameworkLoader } from '../../src/services/framework-loader.js';

describe('CSF Lookup Tool - Basic Tests', () => {
  beforeAll(async () => {
    // Ensure framework is loaded
    const framework = getFrameworkLoader();
    if (!framework.isLoaded()) {
      await framework.load();
    }
  });

  describe('Function Lookup', () => {
    test('should retrieve GV function', async () => {
      const result = await csfLookup({ function_id: 'GV' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV');
    });

    test('should handle invalid function', async () => {
      const result = await csfLookup({ function_id: 'INVALID' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Category Lookup', () => {
    test('should retrieve GV.OC category', async () => {
      const result = await csfLookup({ category_id: 'GV.OC' });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC');
    });
  });

  describe('Subcategory Lookup', () => {
    test('should retrieve GV.OC-01 subcategory', async () => {
      const result = await csfLookup({ 
        subcategory_id: 'GV.OC-01',
        include_examples: true,
        include_relationships: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].element.element_identifier).toBe('GV.OC-01');
      expect(result.data[0]).toHaveProperty('parent');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty parameters gracefully', async () => {
      const result = await csfLookup({});
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});