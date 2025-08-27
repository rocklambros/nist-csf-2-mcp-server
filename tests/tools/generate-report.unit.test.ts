/**
 * Generate Report Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { generateReport } from '../../src/tools/generate_report.js';
import Database from '../../src/db/database.js';

jest.mock('../../src/db/database.js');
jest.mock('../../src/utils/logger.js');

const mockDb = {
  getProfile: jest.fn(),
  getAssessments: jest.fn(),
  getGapAnalysisById: jest.fn(),
  createReport: jest.fn(),
  getReportById: jest.fn(),
  transaction: jest.fn()
};

describe('Generate Report Tool - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Database.getInstance as jest.MockedFunction<typeof Database.getInstance>).mockReturnValue(mockDb as any);
    mockDb.transaction.mockImplementation((callback: () => any) => callback());
  });

  describe('generateReport function', () => {
    it('should generate comprehensive assessment report', async () => {
      const params = {
        organization_id: 'org-123',
        report_type: 'assessment_summary',
        profile_id: 'profile-123',
        include_recommendations: true
      };

      mockDb.getProfile.mockReturnValue({
        profile_id: 'profile-123',
        org_id: 'org-123',
        profile_name: 'Test Profile'
      });

      mockDb.getAssessments.mockReturnValue([
        {
          subcategory_id: 'GV.OC-01',
          maturity_score: 3,
          implementation_level: 'largely_implemented'
        }
      ]);

      mockDb.createReport.mockReturnValue('report-123');
      mockDb.getReportById.mockReturnValue({
        report_id: 'report-123',
        title: 'Assessment Summary Report',
        sections: [
          {
            title: 'Executive Summary',
            content: 'Overall maturity assessment results'
          }
        ]
      });

      const result = await generateReport(params);

      expect(result.success).toBe(true);
      expect(result.report_id).toBe('report-123');
      expect(result.report.title).toBeDefined();
      expect(mockDb.createReport).toHaveBeenCalled();
    });

    it('should handle profile not found error', async () => {
      const params = {
        organization_id: 'org-123',
        report_type: 'assessment_summary',
        profile_id: 'nonexistent-profile'
      };

      mockDb.getProfile.mockReturnValue(null);

      const result = await generateReport(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/profile.*not found/i);
      expect(mockDb.createReport).not.toHaveBeenCalled();
    });

    it('should support different report types', async () => {
      const reportTypes = ['assessment_summary', 'gap_analysis', 'compliance_report'];

      for (const reportType of reportTypes) {
        jest.clearAllMocks();

        const params = {
          organization_id: 'org-123',
          report_type: reportType,
          profile_id: 'profile-123'
        };

        mockDb.getProfile.mockReturnValue({ profile_id: 'profile-123', org_id: 'org-123' });
        mockDb.getAssessments.mockReturnValue([]);
        mockDb.createReport.mockReturnValue(`report-${reportType}`);
        mockDb.getReportById.mockReturnValue({
          report_id: `report-${reportType}`,
          report_type: reportType
        });

        const result = await generateReport(params);

        expect(result.success).toBe(true);
        expect(mockDb.createReport).toHaveBeenCalledWith(
          expect.objectContaining({
            report_type: reportType
          })
        );
      }
    });
  });
});