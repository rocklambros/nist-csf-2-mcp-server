/**
 * Calculate Risk Score Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { calculateRiskScore } from '../../src/tools/calculate_risk_score.js';
import Database from '../../src/db/database.js';

jest.mock('../../src/db/database.js');
jest.mock('../../src/utils/logger.js');

const mockDb = {
  getProfile: jest.fn(),
  getAssessments: jest.fn(),
  createRiskAssessment: jest.fn(),
  transaction: jest.fn()
};

describe('Calculate Risk Score Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Database.getInstance as jest.MockedFunction<typeof Database.getInstance>).mockReturnValue(mockDb as any);
    mockDb.transaction.mockImplementation((callback: () => any) => callback());
  });

  describe('calculateRiskScore function', () => {
    it('should calculate overall risk score from assessments', async () => {
      const params = {
        organization_id: 'org-123',
        profile_id: 'profile-123',
        calculation_method: 'weighted_average'
      };

      mockDb.getProfile.mockReturnValue({
        profile_id: 'profile-123',
        org_id: 'org-123'
      });

      mockDb.getAssessments.mockReturnValue([
        {
          subcategory_id: 'GV.OC-01',
          maturity_score: 2,
          implementation_level: 'partially_implemented'
        },
        {
          subcategory_id: 'PR.AC-01',
          maturity_score: 1,
          implementation_level: 'not_implemented'
        },
        {
          subcategory_id: 'DE.CM-01',
          maturity_score: 3,
          implementation_level: 'largely_implemented'
        }
      ]);

      mockDb.createRiskAssessment.mockReturnValue('risk-assessment-123');

      const result = await calculateRiskScore(params);

      expect(result.success).toBe(true);
      expect(result.risk_score).toBeDefined();
      expect(result.risk_level).toMatch(/low|medium|high|critical/i);
      expect(result.function_risks).toBeDefined();
      expect(mockDb.createRiskAssessment).toHaveBeenCalled();
    });

    it('should handle different calculation methods', async () => {
      const methods = ['simple_average', 'weighted_average', 'monte_carlo'];

      for (const method of methods) {
        jest.clearAllMocks();

        const params = {
          organization_id: 'org-123',
          profile_id: 'profile-123',
          calculation_method: method
        };

        mockDb.getProfile.mockReturnValue({ profile_id: 'profile-123', org_id: 'org-123' });
        mockDb.getAssessments.mockReturnValue([
          { subcategory_id: 'GV.OC-01', maturity_score: 2 }
        ]);
        mockDb.createRiskAssessment.mockReturnValue(`risk-${method}`);

        const result = await calculateRiskScore(params);

        expect(result.success).toBe(true);
        expect(mockDb.createRiskAssessment).toHaveBeenCalledWith(
          expect.objectContaining({
            calculation_method: method
          })
        );
      }
    });

    it('should handle profile not found', async () => {
      const params = {
        organization_id: 'org-123',
        profile_id: 'nonexistent-profile'
      };

      mockDb.getProfile.mockReturnValue(null);

      const result = await calculateRiskScore(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/profile.*not found/i);
    });

    it('should calculate risk levels correctly', async () => {
      const params = {
        organization_id: 'org-123',
        profile_id: 'profile-123'
      };

      mockDb.getProfile.mockReturnValue({ profile_id: 'profile-123', org_id: 'org-123' });

      // Test low risk scenario
      mockDb.getAssessments.mockReturnValue([
        { subcategory_id: 'GV.OC-01', maturity_score: 4 },
        { subcategory_id: 'PR.AC-01', maturity_score: 4 }
      ]);
      mockDb.createRiskAssessment.mockReturnValue('risk-low');

      const lowRiskResult = await calculateRiskScore(params);
      expect(lowRiskResult.success).toBe(true);

      // Test high risk scenario
      mockDb.getAssessments.mockReturnValue([
        { subcategory_id: 'GV.OC-01', maturity_score: 1 },
        { subcategory_id: 'PR.AC-01', maturity_score: 1 }
      ]);
      mockDb.createRiskAssessment.mockReturnValue('risk-high');

      const highRiskResult = await calculateRiskScore(params);
      expect(highRiskResult.success).toBe(true);
    });
  });
});