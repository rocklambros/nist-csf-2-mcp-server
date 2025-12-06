/**
 * Parameter Schema Validation Test
 * Tests new organization_id and analysis_name parameters in generate_gap_analysis
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { getDatabase } from '../../src/db/database.js';

// Mock dependencies
jest.mock('../../src/db/database.js', () => ({
  getDatabase: jest.fn()
}));
jest.mock('../../src/utils/logger.js');

const mockDb = {
  getProfile: jest.fn(),
  getAssessments: jest.fn(),
  getProfileAssessments: jest.fn(),
  createGapAnalysis: jest.fn(),
  getGapAnalysisById: jest.fn(),
  generateGapAnalysis: jest.fn(),
  getGapAnalysisDetails: jest.fn(),
  transaction: jest.fn()
};

// Mock the framework loader module
jest.mock('../../src/services/framework-loader.js', () => {
  const mockLoader = {
    isLoaded: () => true,
    load: () => Promise.resolve(),
    getElementsByType: () => [
      { element_identifier: 'GV.OC-01', function: 'GV', title: 'Organizational Context' }
    ]
  };
  return {
    getFrameworkLoader: () => mockLoader
  };
});

describe('Parameter Schema Validation - New Parameters', () => {
  const testOrgId = 'test-org-123';
  const currentProfileId = 'current-profile-456';
  const targetProfileId = 'target-profile-789';
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.MockedFunction<typeof getDatabase>).mockReturnValue(mockDb as any);

    // Mock successful profile lookups - use mockImplementation for multiple calls
    (mockDb.getProfile as jest.Mock).mockImplementation((profileId: any) => {
      if (profileId === currentProfileId) {
        return { id: currentProfileId, org_id: testOrgId, profile_type: 'current', profile_name: 'Current Profile' };
      } else if (profileId === targetProfileId) {
        return { id: targetProfileId, org_id: testOrgId, profile_type: 'target', profile_name: 'Target Profile' };
      }
      return null;
    });

    // Mock assessment data
    mockDb.getProfileAssessments.mockReturnValue([
      {
        subcategory_id: 'GV.OC-01',
        current_maturity: 2,
        current_implementation: 'partially_implemented',
        target_maturity: 4,
        target_implementation: 'fully_implemented'
      }
    ]);

    // Mock the actual methods called by generateGapAnalysis
    mockDb.generateGapAnalysis.mockReturnValue([
      {
        subcategory_id: 'GV.OC-01',
        current_maturity: 2,
        target_maturity: 4,
        gap_score: 2
      }
    ]);

    mockDb.getGapAnalysisDetails.mockReturnValue([
      {
        subcategory_id: 'GV.OC-01',
        subcategory_name: 'Organizational Context',
        function_id: 'GV',
        category_id: 'GV.OC',
        current_implementation: 'partially_implemented',
        target_implementation: 'fully_implemented',
        current_maturity: 2,
        target_maturity: 4,
        gap_score: 2,
        risk_score: 3,
        effort_score: 2,
        priority_rank: 1,
        improvement_required: 'Implement governance controls'
      }
    ]);

    // Legacy mocks for backward compatibility
    mockDb.createGapAnalysis.mockReturnValue('gap-123');
    mockDb.getGapAnalysisById.mockReturnValue({
      id: 'gap-123',
      analysis_name: 'Test Analysis',
      analysis_date: new Date().toISOString(),
      current_profile_id: currentProfileId,
      target_profile_id: targetProfileId
    });

    // Mock transaction wrapper
    (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
  });

  describe('New Parameter Support', () => {
    it('should accept and validate organization_id parameter', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        organization_id: testOrgId,
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
      expect(mockDb.getProfile).toHaveBeenCalledWith(currentProfileId);
      expect(mockDb.getProfile).toHaveBeenCalledWith(targetProfileId);
    });

    it('should accept and handle analysis_name parameter', async () => {
      const customAnalysisName = 'Custom Parameter Test Analysis';
      
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        analysis_name: customAnalysisName,
        include_priority_matrix: true,
        include_visualizations: false,
        minimum_gap_score: 1
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
    });

    it('should handle both new parameters together', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        organization_id: testOrgId,
        analysis_name: 'Combined Parameters Test',
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
    });

    it('should maintain backward compatibility without new parameters', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
    });

    it('should reject invalid organization_id for security', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        organization_id: 'invalid-org-id-12345',
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      });

      expect(result.success).toBe(false);
      // Error message is in recommendations.immediate_actions for this implementation
      expect(result.recommendations.immediate_actions.length).toBeGreaterThan(0);
      expect(result.recommendations.immediate_actions[0]).toContain('Organization ID mismatch');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate minimum gap score range', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        organization_id: testOrgId,
        analysis_name: 'High Threshold Test',
        include_priority_matrix: false,
        include_visualizations: false,
        minimum_gap_score: 50
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
    });

    it('should handle analysis_name parameter properly', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: currentProfileId,
        target_profile_id: targetProfileId,
        organization_id: testOrgId,
        analysis_name: 'Valid Analysis Name',
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      });

      expect(result.success).toBe(true);
      expect(result.analysis_id).toBeDefined();
    });
  });
});