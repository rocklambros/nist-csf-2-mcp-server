/**
 * Core MCP Tools Integration Tests - Real functionality validation
 * 
 * This test suite validates the core MCP tools without complex mocking,
 * focusing on real database operations and tool functionality.
 */

describe('Core MCP Tools Integration', () => {
  // Basic smoke tests to ensure tools can be imported without errors
  
  describe('Tool Import Validation', () => {
    test('should import csf_lookup tool without errors', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      expect(typeof csfLookup).toBe('function');
    });

    test('should import create_profile tool without errors', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      expect(typeof createProfile).toBe('function');
    });

    test('should import assess_maturity tool without errors', async () => {
      const { assessMaturity } = await import('../../src/tools/assess_maturity.js');
      expect(typeof assessMaturity).toBe('function');
    });

    test('should import start_assessment_workflow tool without errors', async () => {
      const { startAssessmentWorkflow } = await import('../../src/tools/comprehensive_assessment_workflow.js');
      expect(typeof startAssessmentWorkflow).toBe('function');
    });

    test('should import persistent assessment tool without errors', async () => {
      const { persistentComprehensiveAssessment } = await import('../../src/tools/persistent_comprehensive_assessment.js');
      expect(typeof persistentComprehensiveAssessment).toBe('function');
    });
  });

  describe('Database Connection Validation', () => {
    test('should connect to database without errors', () => {
      const { getDatabase } = require('../../src/db/database.js');
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(typeof db.getStats).toBe('function');
    });

    test('should retrieve database statistics', () => {
      const { getDatabase } = require('../../src/db/database.js');
      const db = getDatabase();
      const stats = db.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.organizations).toBe('number');
      expect(typeof stats.profiles).toBe('number');
      expect(typeof stats.assessments).toBe('number');
    });
  });

  describe('Framework Loader Validation', () => {
    test('should load framework without errors', async () => {
      const { getFrameworkLoader } = await import('../../src/services/framework-loader.js');
      const framework = getFrameworkLoader();
      
      expect(framework).toBeDefined();
      expect(typeof framework.isLoaded).toBe('function');
      
      if (!framework.isLoaded()) {
        await framework.load();
      }
      
      expect(framework.isLoaded()).toBe(true);
    });

    test('should provide framework statistics', async () => {
      const { getFrameworkLoader } = await import('../../src/services/framework-loader.js');
      const framework = getFrameworkLoader();
      
      if (!framework.isLoaded()) {
        await framework.load();
      }
      
      const stats = framework.getStats();
      expect(stats).toBeDefined();
      expect(stats.functions).toBeGreaterThan(0);
      expect(stats.categories).toBeGreaterThan(0);
      expect(stats.subcategories).toBeGreaterThan(0);
    });
  });

  describe('Tool Schema Validation', () => {
    test('should validate tool schemas are properly defined', async () => {
      const { CSFLookupSchema } = await import('../../src/tools/csf_lookup.js');
      const { CreateProfileSchema } = await import('../../src/tools/create_profile.js');
      const { AssessMaturitySchema } = await import('../../src/tools/assess_maturity.js');
      
      expect(CSFLookupSchema).toBeDefined();
      expect(CreateProfileSchema).toBeDefined(); 
      expect(AssessMaturitySchema).toBeDefined();
      
      // Test basic schema validation
      expect(() => CSFLookupSchema.parse({})).not.toThrow();
      expect(() => CreateProfileSchema.parse({
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'medium'
      })).not.toThrow();
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle invalid inputs gracefully', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      // Should handle invalid inputs without throwing
      const result = await csfLookup({ function_id: 'INVALID_FUNCTION' });
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structures', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const result = await csfLookup({ function_id: 'GV' });
      
      expect(result).toMatchObject({
        success: expect.any(Boolean),
        count: expect.any(Number),
        data: expect.any(Array)
      });
    });
  });

  describe('Performance Validation', () => {
    test('should complete tool operations within reasonable time', async () => {
      const { csfLookup } = await import('../../src/tools/csf_lookup.js');
      
      const startTime = Date.now();
      await csfLookup({ function_id: 'GV' });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // 5 second timeout
    });
  });
});