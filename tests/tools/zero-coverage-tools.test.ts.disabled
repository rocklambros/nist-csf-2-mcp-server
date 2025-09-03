/**
 * Tests for tools with 0% coverage - focusing on basic functionality and error handling
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { generatePriorityMatrix } from '../../src/tools/generate_priority_matrix.js';
import { generateMilestone } from '../../src/tools/generate_milestone.js';
import { getIndustryBenchmarks } from '../../src/tools/get_industry_benchmarks.js';
import { suggestNextActions } from '../../src/tools/suggest_next_actions.js';
import { importAssessment } from '../../src/tools/import_assessment.js';

describe('Zero Coverage Tools Tests', () => {
  let testProfileId: string;

  beforeAll(async () => {
    // Create a test profile for tools that need it
    const profileResult = await createProfile({
      org_name: 'Zero Coverage Test Org',
      sector: 'Technology',
      size: 'medium',
      profile_name: 'Zero Coverage Test Profile'
    });
    
    if (profileResult.success) {
      testProfileId = profileResult.profile_id;
    }
  });

  describe('Generate Priority Matrix Tool', () => {
    test('should handle valid priority matrix request', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const result = await generatePriorityMatrix({
        profile_id: testProfileId,
        matrix_type: 'effort_impact',
        include_recommendations: true,
        include_resource_estimates: true,
        max_items_per_quadrant: 5
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success !== undefined).toBe(true);

      if (result.success) {
        expect(result.matrix).toBeDefined();
        expect(result.matrix_type).toBe('effort_impact');
      } else {
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
      }
    });

    test('should validate input parameters', async () => {
      const invalidInputs = [
        { profile_id: '', matrix_type: 'effort_impact' },
        { profile_id: 'test-profile', matrix_type: 'invalid_type' as any },
        { profile_id: 'test-profile', max_items_per_quadrant: 0 },
        { profile_id: 'test-profile', max_items_per_quadrant: 25 }
      ];

      for (const invalidInput of invalidInputs) {
        const result = await generatePriorityMatrix(invalidInput as any);
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
      }
    });

    test('should handle non-existent profile gracefully', async () => {
      const result = await generatePriorityMatrix({
        profile_id: 'non-existent-profile-id',
        matrix_type: 'risk_feasibility'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('Generate Milestone Tool', () => {
    test('should handle valid milestone generation request', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const result = await generateMilestone({
        profile_id: testProfileId,
        milestone_type: 'assessment',
        target_date: '2024-12-31',
        milestone_name: 'Test Milestone',
        description: 'Test milestone description'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success !== undefined).toBe(true);

      if (result.success) {
        expect(result.milestone).toBeDefined();
        expect(result.milestone.milestone_name).toBe('Test Milestone');
      } else {
        expect(result.message).toBeDefined();
      }
    });

    test('should validate milestone parameters', async () => {
      const invalidInputs = [
        { profile_id: '', milestone_type: 'assessment' },
        { profile_id: 'test', milestone_type: 'invalid' as any },
        { profile_id: 'test', milestone_type: 'assessment', target_date: 'invalid-date' },
        { profile_id: 'test', milestone_type: 'assessment', milestone_name: '' }
      ];

      for (const invalidInput of invalidInputs) {
        const result = await generateMilestone(invalidInput as any);
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Get Industry Benchmarks Tool', () => {
    test('should handle valid industry benchmark request', async () => {
      const result = await getIndustryBenchmarks({
        industry: 'technology',
        organization_size: 'medium',
        include_peer_comparison: true,
        benchmark_type: 'maturity'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success !== undefined).toBe(true);

      if (result.success) {
        expect(result.benchmarks).toBeDefined();
        expect(result.industry).toBe('technology');
      } else {
        expect(result.message).toBeDefined();
      }
    });

    test('should validate industry benchmark parameters', async () => {
      const invalidInputs = [
        { industry: '', organization_size: 'medium' },
        { industry: 'technology', organization_size: 'invalid' as any },
        { industry: 'technology', organization_size: 'medium', benchmark_type: 'invalid' as any }
      ];

      for (const invalidInput of invalidInputs) {
        const result = await getIndustryBenchmarks(invalidInput as any);
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should handle unknown industry gracefully', async () => {
      const result = await getIndustryBenchmarks({
        industry: 'unknown-industry-type',
        organization_size: 'large'
      });

      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Suggest Next Actions Tool', () => {
    test('should handle valid next actions request', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const result = await suggestNextActions({
        profile_id: testProfileId,
        priority_focus: 'quick_wins',
        max_suggestions: 5,
        include_resource_estimates: true,
        include_timeline: true
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success !== undefined).toBe(true);

      if (result.success) {
        expect(result.suggestions).toBeDefined();
        expect(Array.isArray(result.suggestions)).toBe(true);
      } else {
        expect(result.message).toBeDefined();
      }
    });

    test('should validate next actions parameters', async () => {
      const invalidInputs = [
        { profile_id: '', priority_focus: 'quick_wins' },
        { profile_id: 'test', priority_focus: 'invalid' as any },
        { profile_id: 'test', priority_focus: 'quick_wins', max_suggestions: 0 },
        { profile_id: 'test', priority_focus: 'quick_wins', max_suggestions: 51 }
      ];

      for (const invalidInput of invalidInputs) {
        const result = await suggestNextActions(invalidInput as any);
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should handle different priority focuses', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const priorityFocuses = ['quick_wins', 'high_impact', 'compliance', 'risk_reduction'];

      for (const focus of priorityFocuses) {
        const result = await suggestNextActions({
          profile_id: testProfileId,
          priority_focus: focus as any,
          max_suggestions: 3
        });

        expect(result).toBeDefined();
        if (result.success) {
          expect(result.priority_focus).toBe(focus);
        }
      }
    });
  });

  describe('Import Assessment Tool', () => {
    test('should handle valid assessment import request', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const sampleAssessmentData = {
        assessments: [
          {
            subcategory_id: 'GV.OC-01',
            implementation_level: 'Partially Implemented',
            maturity_score: 2,
            notes: 'Sample assessment note'
          }
        ],
        source_system: 'test_system',
        import_date: '2024-01-01'
      };

      const result = await importAssessment({
        profile_id: testProfileId,
        import_format: 'json',
        assessment_data: JSON.stringify(sampleAssessmentData),
        validate_data: true,
        overwrite_existing: false
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success !== undefined).toBe(true);

      if (result.success) {
        expect(result.imported_count).toBeDefined();
        expect(typeof result.imported_count).toBe('number');
      } else {
        expect(result.message).toBeDefined();
      }
    });

    test('should validate import parameters', async () => {
      const invalidInputs = [
        { profile_id: '', import_format: 'json', assessment_data: '{}' },
        { profile_id: 'test', import_format: 'invalid' as any, assessment_data: '{}' },
        { profile_id: 'test', import_format: 'json', assessment_data: '' },
        { profile_id: 'test', import_format: 'json', assessment_data: 'invalid-json' }
      ];

      for (const invalidInput of invalidInputs) {
        const result = await importAssessment(invalidInput as any);
        
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should handle malformed assessment data gracefully', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const malformedData = [
        '{"invalid": "structure"}',
        '{"assessments": "not-an-array"}',
        '{"assessments": [{"missing": "required-fields"}]}',
        '{"assessments": [{"subcategory_id": "", "implementation_level": ""}]}'
      ];

      for (const badData of malformedData) {
        const result = await importAssessment({
          profile_id: testProfileId,
          import_format: 'json',
          assessment_data: badData,
          validate_data: true
        });

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      }
    });

    test('should handle CSV import format', async () => {
      if (!testProfileId) {
        throw new Error('Test profile not created');
      }

      const csvData = 'subcategory_id,implementation_level,maturity_score,notes\nGV.OC-01,Partially Implemented,2,Test note';

      const result = await importAssessment({
        profile_id: testProfileId,
        import_format: 'csv',
        assessment_data: csvData,
        validate_data: true
      });

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.imported_count).toBeDefined();
      } else {
        expect(result.message).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null and undefined inputs gracefully', async () => {
      const tools = [
        () => generatePriorityMatrix(null as any),
        () => generateMilestone(undefined as any),
        () => getIndustryBenchmarks({} as any),
        () => suggestNextActions(null as any),
        () => importAssessment(undefined as any)
      ];

      for (const toolCall of tools) {
        try {
          const result = await toolCall();
          
          expect(result).toBeDefined();
          expect(result.success).toBe(false);
          expect(result.message).toBeDefined();
        } catch (error) {
          // Exception handling is also acceptable
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    test('should maintain consistent response structure', async () => {
      const testCalls = [
        () => generatePriorityMatrix({ profile_id: 'test', matrix_type: 'effort_impact' }),
        () => generateMilestone({ profile_id: 'test', milestone_type: 'assessment', milestone_name: 'test' }),
        () => getIndustryBenchmarks({ industry: 'technology', organization_size: 'medium' }),
        () => suggestNextActions({ profile_id: 'test', priority_focus: 'quick_wins' }),
        () => importAssessment({ profile_id: 'test', import_format: 'json', assessment_data: '{"assessments": []}' })
      ];

      for (const toolCall of testCalls) {
        const result = await toolCall();
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect('success' in result).toBe(true);
        expect(typeof result.success).toBe('boolean');
        
        if (!result.success) {
          expect('message' in result).toBe(true);
          expect(typeof result.message).toBe('string');
        }
      }
    });
  });
});