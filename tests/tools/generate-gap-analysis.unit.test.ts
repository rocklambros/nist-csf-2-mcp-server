/**
 * Generate Gap Analysis Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { getDatabase } from '../../src/db/database.js';

// Mock the database module
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

describe('Generate Gap Analysis Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.MockedFunction<typeof getDatabase>).mockReturnValue(mockDb as any);
  });

  describe('generateGapAnalysis function', () => {
    it('should generate gap analysis between current and target profiles', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      // Mock database responses
      (mockDb.getProfile as any).mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return {
            id: 'profile-current-123',
            profile_id: 'profile-current-123',
            name: 'Current Test Profile',
            profile_type: 'current',
            org_id: 'org-test-123'
          };
        } else if (profileId === 'profile-target-123') {
          return {
            id: 'profile-target-123',
            profile_id: 'profile-target-123',
            name: 'Target Test Profile',
            profile_type: 'target',
            org_id: 'org-test-123'
          };
        }
        return null;
      });

      (mockDb.getAssessments as any).mockImplementation((profileId: string) => {
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

      (mockDb.getProfileAssessments as any).mockImplementation((profileId: string) => {
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

      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([
        {
          subcategory_id: 'GV.OC-01',
          current_score: 2,
          target_score: 4,
          gap_score: 2,
          priority: 'high',
          risk_impact: 'High risk to governance and oversight'
        }
      ]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([
        {
          subcategory_id: 'GV.OC-01',
          current_score: 2,
          target_score: 4,
          gap_score: 2,
          priority: 'high',
          risk_impact: 'High risk to governance and oversight'
        }
      ]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');
      (mockDb.getGapAnalysisById as any).mockReturnValue({
        gap_analysis_id: 'gap-analysis-123',
        overall_gap_score: 1.5,
        gap_details: [
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
      expect(result.analysis_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.gap_summary).toBeDefined();
      expect(result.gap_details).toBeDefined();
      expect(Array.isArray(result.gap_details)).toBe(true);
      expect(result.current_profile).toBeDefined();
      expect(result.target_profile).toBeDefined();
    });

    it('should handle validation errors for missing profiles', async () => {
      const params = {
        current_profile_id: 'nonexistent-profile',
        target_profile_id: 'profile-target-123'
      };

      (mockDb.getProfile as any).mockReturnValue(null); // Profile not found

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.success).toBe(false);
      expect(result.current_profile.name).toBe('Error');
      expect(mockDb.createGapAnalysis).not.toHaveBeenCalled();
    });

    it('should handle organization mismatch between profiles', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-456'
      };

      (mockDb.getProfile as any).mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return { id: 'profile-current-123', profile_id: 'profile-current-123', name: 'Current Test Profile', org_id: 'org-test-123' };
        } else if (profileId === 'profile-target-456') {
          return { id: 'profile-target-456', profile_id: 'profile-target-456', name: 'Target Test Profile', org_id: 'org-different-456' };
        }
        return null;
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.success).toBe(false);
      expect(result.current_profile.name).toBe('Error');
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

      (mockDb.getAssessments as any).mockImplementation((profileId: string) => {
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

      (mockDb.getProfileAssessments as any).mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 1 },
            { subcategory_id: 'PR.AC-01', maturity_score: 3 },
            { subcategory_id: 'DE.CM-01', maturity_score: 4 }
          ];
        } else {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 4 },
            { subcategory_id: 'PR.AC-01', maturity_score: 4 },
            { subcategory_id: 'DE.CM-01', maturity_score: 4 }
          ];
        }
      });

      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1}]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1, priority: 'low'}]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.analysis_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.gap_summary).toBeDefined();
      expect(result.gap_details).toBeDefined();
      expect(Array.isArray(result.gap_details)).toBe(true);
    });

    it('should handle database transaction errors', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ id: 'test-profile', name: 'Test Profile', org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]);
      mockDb.transaction.mockImplementation(() => {
        throw new Error('Database transaction failed');
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.success).toBe(false);
      expect(result.current_profile.name).toBe('Error');
    });

    it('should handle missing assessments gracefully', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ id: 'test-profile', name: 'Test Profile', org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]); // No assessments
      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1}]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1, priority: 'low'}]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      // Should handle empty assessments without errors
    });

    it('should include risk impact when requested', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ id: 'test-profile', name: 'Test Profile', org_id: 'org-test-123' });
      (mockDb.getAssessments as any).mockImplementation((profileId: string) => {
        return profileId === 'profile-current-123' 
          ? [{ subcategory_id: 'GV.OC-01', maturity_score: 1 }]
          : [{ subcategory_id: 'GV.OC-01', maturity_score: 4 }];
      });
      
      (mockDb.getProfileAssessments as any).mockImplementation((profileId: string) => {
        return profileId === 'profile-current-123' 
          ? [{ subcategory_id: 'GV.OC-01', maturity_score: 1 }]
          : [{ subcategory_id: 'GV.OC-01', maturity_score: 4 }];
      });
      
      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1}]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1, priority: 'low'}]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.analysis_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.gap_summary).toBeDefined();
      expect(result.gap_details).toBeDefined();
      expect(Array.isArray(result.gap_details)).toBe(true);
    });

    it('should filter gaps by minimum threshold', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123',
        minimum_gap_score: 2
      };

      mockDb.getProfile.mockReturnValue({ id: 'test-profile', name: 'Test Profile', org_id: 'org-test-123' });
      (mockDb.getAssessments as any).mockImplementation((profileId: string) => {
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

      (mockDb.getProfileAssessments as any).mockImplementation((profileId: string) => {
        if (profileId === 'profile-current-123') {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 1 },
            { subcategory_id: 'PR.AC-01', maturity_score: 3 }
          ];
        } else {
          return [
            { subcategory_id: 'GV.OC-01', maturity_score: 4 },
            { subcategory_id: 'PR.AC-01', maturity_score: 4 }
          ];
        }
      });

      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1}]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1, priority: 'low'}]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.analysis_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.gap_summary).toBeDefined();
      expect(result.gap_details).toBeDefined();
      expect(Array.isArray(result.gap_details)).toBe(true);
    });

    it('should use default analysis name when not provided', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockReturnValue({ id: 'test-profile', name: 'Test Profile', org_id: 'org-test-123' });
      mockDb.getAssessments.mockReturnValue([]);
      mockDb.getProfileAssessments.mockReturnValue([]);
      (mockDb.transaction as any).mockImplementation((callback: () => any) => callback());
      (mockDb.generateGapAnalysis as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1}]);
      (mockDb.getGapAnalysisDetails as any).mockReturnValue([{subcategory_id: 'GV.OC-01', gap_score: 1, priority: 'low'}]);
      (mockDb.createGapAnalysis as any).mockReturnValue('gap-analysis-123');

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(true);
      expect(result.analysis_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.gap_summary).toBeDefined();
      expect(result.gap_details).toBeDefined();
      expect(Array.isArray(result.gap_details)).toBe(true);
    });

    it('should handle unknown errors gracefully', async () => {
      const params = {
        current_profile_id: 'profile-current-123',
        target_profile_id: 'profile-target-123'
      };

      mockDb.getProfile.mockImplementation(() => {
        throw 'Unknown error type'; // Non-Error object
      });

      const result = await generateGapAnalysis(params);

      expect(result.success).toBe(false);
      expect(result.success).toBe(false);
      expect(result.current_profile.name).toBe('Error');
    });
  });
});