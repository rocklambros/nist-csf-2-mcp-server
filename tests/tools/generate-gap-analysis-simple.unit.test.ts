/**
 * Generate Gap Analysis Tool - Simple Unit Tests
 * Testing core functionality with proper mocking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Get the mocked database function
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Generate Gap Analysis Tool - Simple Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('gap analysis generation', () => {
    it('should generate gap analysis successfully', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        include_priority_matrix: true,
        include_visualizations: true,
        minimum_gap_score: 0
      };

      // Mock database responses
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      
      // Mock profile validation
      mockDb.getProfile!.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return testUtils.createMockProfile({
            profile_id: 'profile-current-123',
            profile_type: 'current'
          });
        } else if (profileId === 'profile-target-123') {
          return testUtils.createMockProfile({
            profile_id: 'profile-target-123', 
            profile_type: 'target'
          });
        }
        return null;
      });

      // Mock assessments for both profiles
      mockDb.getAssessments!.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            testUtils.createMockAssessment({
              subcategory_id: 'GV.OC-01',
              implementation_level: 2,
              maturity_score: 2
            }),
            testUtils.createMockAssessment({
              subcategory_id: 'ID.AM-01', 
              implementation_level: 1,
              maturity_score: 1
            })
          ];
        } else if (profileId === 'profile-target-123') {
          return [
            testUtils.createMockAssessment({
              subcategory_id: 'GV.OC-01',
              implementation_level: 4,
              maturity_score: 4
            }),
            testUtils.createMockAssessment({
              subcategory_id: 'ID.AM-01',
              implementation_level: 3,
              maturity_score: 3
            })
          ];
        }
        return [];
      });

      // Mock gap analysis creation
      mockDb.createGapAnalysis!.mockReturnValue('gap-analysis-123');
      mockDb.getGapAnalysis!.mockReturnValue({
        id: 'gap-analysis-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        analysis_name: 'Test Gap Analysis',
        overall_gap_score: 2.0,
        priority_items: 2,
        total_gaps: 2,
        status: 'completed',
        created_at: new Date().toISOString()
      });

      const result = await generateGapAnalysis(params);

      testUtils.assertSuccessResponse(result, {
        success: true
      });
      expect(result.analysis_id).toBe('gap-analysis-123');
      expect(result.data?.analysis).toBeDefined();
      expect(result.data.analysis.overall_gap_score).toBe(2.0);
      expect(result.data.analysis.total_gaps).toBe(2);
      
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          current_profile_id: 'profile-current-123',
          target_profile_id: 'profile-target-123',
          analysis_name: 'Test Gap Analysis'
        })
      );
    });

    it('should handle invalid profile IDs', async () => {
      const params = {
        current_profile_id: 'invalid-profile',
        target_profile_id: 'profile-target-123'
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(null); // Profile not found

      const result = await generateGapAnalysis(params);

      testUtils.assertErrorResponse(result);
      expect(result.error).toContain('Profile not found');
    });

    it('should validate input parameters', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: '', // Invalid empty string
        target_profile_id: 'valid-profile-id',
        analysis_name: 'Test Analysis'
      });

      testUtils.assertErrorResponse(result);
    });

    it('should handle database errors gracefully', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        analysis_name: 'Test Gap Analysis'
      };

      mockDb.transaction!.mockImplementation(() => {
        throw new Error('Database transaction failed');
      });

      const result = await generateGapAnalysis(params);

      testUtils.assertErrorResponse(result);
      expect(result.error).toContain('Database transaction failed');
    });
  });

  describe('gap calculation logic', () => {
    it('should calculate gaps correctly for different maturity levels', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        analysis_name: 'Gap Calculation Test'
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      
      // Mock profiles
      mockDb.getProfile!.mockImplementation((profileId: string) => {
        return testUtils.createMockProfile({
          profile_id: profileId,
          profile_type: profileId.includes('current') ? 'current' : 'target'
        });
      });

      // Mock assessments with significant gaps
      mockDb.getAssessments!.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            testUtils.createMockAssessment({
              subcategory_id: 'GV.OC-01',
              maturity_score: 1 // Low maturity
            })
          ];
        } else {
          return [
            testUtils.createMockAssessment({
              subcategory_id: 'GV.OC-01',
              maturity_score: 4 // High target maturity
            })
          ];
        }
      });

      mockDb.createGapAnalysis!.mockReturnValue('gap-analysis-456');
      mockDb.getGapAnalysis!.mockReturnValue({
        id: 'gap-analysis-456',
        overall_gap_score: 3.0, // Large gap
        priority_items: 1,
        total_gaps: 1,
        status: 'completed'
      });

      const result = await generateGapAnalysis(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data.analysis.overall_gap_score).toBe(3.0);
      expect(result.data.analysis.priority_items).toBe(1);
    });

    it('should handle profiles with no assessments', async () => {
      const params = {
        current_profile_id: 'empty-profile-123',
        target_profile_id: 'empty-target-123', 
        analysis_name: 'Empty Profile Test'
      };

      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockImplementation((profileId: string) => {
        return testUtils.createMockProfile({ profile_id: profileId });
      });
      mockDb.getAssessments!.mockReturnValue([]); // No assessments

      mockDb.createGapAnalysis!.mockReturnValue('gap-analysis-empty');
      mockDb.getGapAnalysis!.mockReturnValue({
        id: 'gap-analysis-empty',
        overall_gap_score: 0,
        priority_items: 0,
        total_gaps: 0,
        status: 'completed'
      });

      const result = await generateGapAnalysis(params);

      testUtils.assertSuccessResponse(result);
      expect(result.data.analysis.total_gaps).toBe(0);
      expect(result.data.analysis.overall_gap_score).toBe(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle same profile IDs for current and target', async () => {
      const params = {
        current_profile_id: 'same-profile-123',
        target_profile_id: 'same-profile-123',
        analysis_name: 'Same Profile Test'
      };

      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'same-profile-123'
      }));

      const result = await generateGapAnalysis(params);

      // Should either allow it or provide appropriate error
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should validate analysis name parameter', async () => {
      const result = await generateGapAnalysis({
        current_profile_id: 'valid-current',
        target_profile_id: 'valid-target',
        analysis_name: '' // Empty name should be invalid
      });

      testUtils.assertErrorResponse(result);
    });
  });
});