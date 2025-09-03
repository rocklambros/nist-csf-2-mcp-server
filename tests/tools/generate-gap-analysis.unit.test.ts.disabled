/**
 * Generate Gap Analysis Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import Database from '../../src/db/database.js';

// Mock the database module
jest.mock('../../src/db/database.js');
jest.mock('../../src/utils/logger.js');

const mockDb = {
  getProfile: jest.fn(),
  getAssessments: jest.fn(),
  createGapAnalysis: jest.fn(),
  getGapAnalysisById: jest.fn(),
  transaction: jest.fn()
};

describe('Generate Gap Analysis Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Database.getInstance as jest.MockedFunction<typeof Database.getInstance>).mockReturnValue(mockDb as any);
  });

  describe('generateGapAnalysis function', () => {
    it('should generate gap analysis between current and target profiles', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        analysis_name: 'Test Gap Analysis'
      };

      // Mock database responses
      mockDb.getProfile.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return {
            profile_id: 'profile-current-123',
            profile_type: 'current',
            org_id: 'org-test-123'
          };
        } else if (profileId === 'profile-target-123') {
          return {
            profile_id: 'profile-target-123',
            profile_type: 'target',
            org_id: 'org-test-123'
          };
        }
        return null;
      });

      mockDb.getAssessments.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            {
              subcategory_id: 'GV.OC-01',
              maturity_score: 2,
              implementation_level: 'partially_implemented'
            },
            {
              subcategory_id: 'PR.AC-01',
              maturity_score: 3,
              implementation_level: 'largely_implemented'
            }
          ];
        } else if (profileId === 'profile-target-123') {
          return [
            {
              subcategory_id: 'GV.OC-01',
              maturity_score: 4,
              implementation_level: 'fully_implemented'
            },
            {
              subcategory_id: 'PR.AC-01',
              maturity_score: 4,
              implementation_level: 'fully_implemented'
            }
          ];
        }
        return [];
      });

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');
      mockDb.getGapAnalysisById.mockReturnValue({
        gap_analysis_id: 'gap-analysis-123',
        overall_gap_score: 1.5,
        gaps: [
          {
            subcategory_id: 'GV.OC-01',
            current_score: 2,
            target_score: 4,
            gap_score: 2,
            priority: 'high'
          }
        ]
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.gap_analysis_id).toBe('gap-analysis-123');
      expect(result.gap_analysis.overall_gap_score).toBe(1.5);
      expect(result.gap_analysis.gaps).toHaveLength(1);
      expect(mockDb.createGapAnalysis).toHaveBeenCalled();
    });

    it('should handle validation errors for missing profiles', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'nonexistent-profile',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue(null); // Profile not found

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/profile.*not found/i);
      expect(mockDb.createGapAnalysis).not.toHaveBeenCalled();
    });

    it('should handle organization mismatch between profiles', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-456'
      };

      mockDb.getProfile.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return { profile_id: 'profile-current-123', org_id: 'org-test-123' };
        } else if (profileId === 'profile-target-456') {
          return { profile_id: 'profile-target-456', org_id: 'org-different-456' };
        }
        return null;
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/organization.*mismatch/i);
    });

    it('should calculate gap priorities correctly', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockImplementation(() => ({
        profile_id: 'test',
        org_id: 'org-test-123'
      }));

      mockDb.getAssessments.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 1 }, // Large gap
            { subcategory_id: 'PR.AC-01', maturity_score: 3 }, // Small gap
            { subcategory_id: 'DE.CM-01', maturity_score: 4 }  // No gap
          ];
        } else {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 4 },
            { subcategory_id: 'PR.AC-01', maturity_score: 4 },
            { subcategory_id: 'DE.CM-01', maturity_score: 4 }
          ];
        }
      });

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: expect.arrayContaining([
            expect.objectContaining({
              subcategory_id: 'GV.OC-01',
              gap_score: 3, // 4 - 1 = 3
              priority: 'high' // Large gap should be high priority
            }),
            expect.objectContaining({
              subcategory_id: 'PR.AC-01',
              gap_score: 1, // 4 - 3 = 1
              priority: 'low' // Small gap should be low priority
            })
          ])
        })
      );
    });

    it('should handle database transaction errors', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]);
      mockDb.transaction.mockImplementation(() => {
        throw new Error('Database transaction failed');
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database transaction failed');
    });

    it('should handle missing assessments gracefully', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]); // No assessments
      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      // Should handle empty assessments without errors
    });

    it('should include risk impact when requested', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        include_risk_impact: true
      };

      mockDb.getProfile.mockReturnValue({ org_id: 'org-test-123' });
      mockDb.getAssessments.mockImplementation((profileId: string) => {
        return profileId === 'profile-current-123' 
          ? [{ subcategory_id: 'GV.OC-01', maturity_score: 1 }]
          : [{ subcategory_id: 'GV.OC-01', maturity_score: 4 }];
      });
      
      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: expect.arrayContaining([
            expect.objectContaining({
              risk_impact: expect.any(String)
            })
          ])
        })
      );
    });

    it('should filter gaps by minimum threshold', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        minimum_gap_threshold: 2
      };

      mockDb.getProfile.mockReturnValue({ org_id: 'org-test-123' });
      mockDb.getAssessments.mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 1 }, // Gap = 3 (above threshold)
            { subcategory_id: 'PR.AC-01', maturity_score: 3 }  // Gap = 1 (below threshold)
          ];
        } else {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 4 },
            { subcategory_id: 'PR.AC-01', maturity_score: 4 }
          ];
        }
      });

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: expect.arrayContaining([
            expect.objectContaining({
              subcategory_id: 'GV.OC-01',
              gap_score: 3 // Should be included
            })
          ])
        })
      );
      
      // Should not include PR.AC-01 with gap_score of 1 (below threshold of 2)
      const createCall = mockDb.createGapAnalysis.mock.calls[0][0];
      const prGap = createCall.gaps.find((gap: any) => gap.subcategory_id === 'PR.AC-01');
      expect(prGap).toBeUndefined();
    });

    it('should use default analysis name when not provided', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
        // No analysis_name provided
      };

      mockDb.getProfile.mockReturnValue({ org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]);
      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.createGapAnalysis.mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(mockDb.createGapAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          analysis_name: expect.stringMatching(/Gap Analysis.*/)
        })
      );
    });

    it('should handle unknown errors gracefully', async () => {
      const params = {
        organization_id: 'org-test-123',
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockImplementation(() => {
        throw 'Unknown error type'; // Non-Error object
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});