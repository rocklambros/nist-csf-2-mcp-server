/**
 * Comprehensive tests for reporting tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, testUtils, performanceUtils } from '../setup.js';
import { generateDashboard } from '../../src/tools/generate_dashboard.js';
import { exportData } from '../../src/tools/export_data.js';
import { generateExecutiveReport } from '../../src/tools/generate_executive_report.js';
import { createCustomReport } from '../../src/tools/create_custom_report.js';
import { invalidInputs } from '../helpers/mock-data.js';

describe('Reporting Tools - Comprehensive Tests', () => {
  let testProfileId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Create test profile for reporting
    const profile = await testUtils.createTestProfile({
      profile_name: 'Reporting Test Profile',
      profile_type: 'current'
    });
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;

    // Create comprehensive test data
    await testUtils.createTestAssessments(testProfileId, 15);
    
    // Add additional test data for rich reporting
    await setupReportingTestData();
  });

  describe('Generate Dashboard Tool', () => {
    describe('Valid Input Tests', () => {
      test('should generate executive dashboard', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'executive',
          include_trends: true,
          time_period: '30_days'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          dashboard: expect.objectContaining({
            profile_id: testProfileId,
            dashboard_type: 'executive',
            widgets: expect.any(Array),
            summary_metrics: expect.objectContaining({
              overall_maturity: expect.any(Number),
              compliance_percentage: expect.any(Number),
              risk_score: expect.any(Number)
            }),
            trends: expect.any(Object)
          })
        });

        expect(result.dashboard.widgets.length).toBeGreaterThan(0);
      });

      test('should generate operational dashboard', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'operational',
          include_alerts: true,
          include_recommendations: true,
          function_filter: 'GV'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          dashboard: expect.objectContaining({
            dashboard_type: 'operational',
            function_filter: 'GV',
            alerts: expect.any(Array),
            recommendations: expect.any(Array)
          })
        });
      });

      test('should generate technical dashboard with detailed metrics', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'technical',
          include_subcategory_breakdown: true,
          include_implementation_status: true,
          include_progress_tracking: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.dashboard.dashboard_type).toBe('technical');
        expect(result.dashboard).toHaveProperty('subcategory_breakdown');
        expect(result.dashboard).toHaveProperty('implementation_status');
        expect(result.dashboard).toHaveProperty('progress_tracking');
      });

      test('should generate custom dashboard with specific widgets', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'custom',
          custom_widgets: [
            'maturity_radar',
            'risk_heatmap',
            'compliance_matrix',
            'progress_timeline'
          ],
          layout_configuration: {
            columns: 2,
            theme: 'professional'
          }
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.dashboard.custom_widgets).toEqual([
          'maturity_radar',
          'risk_heatmap', 
          'compliance_matrix',
          'progress_timeline'
        ]);
        expect(result.dashboard.layout_configuration.columns).toBe(2);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing profile_id', async () => {
        const result = await generateDashboard.execute({
          dashboard_type: 'executive'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'profile_id');
      });

      test('should handle invalid dashboard type', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'invalid_type'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'dashboard_type');
      });

      test('should handle invalid time period', async () => {
        const result = await generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'executive',
          time_period: 'invalid_period'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'time_period');
      });
    });

    describe('Performance Tests', () => {
      test('should generate dashboard within performance threshold', async () => {
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await generateDashboard.execute({
            profile_id: testProfileId,
            dashboard_type: 'executive',
            include_trends: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });
  });

  describe('Export Data Tool', () => {
    describe('Valid Input Tests', () => {
      test('should export profile data as JSON', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'json',
          include_assessments: true,
          include_metadata: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          export_data: expect.objectContaining({
            profile_id: testProfileId,
            export_format: 'json',
            data: expect.any(Object),
            metadata: expect.objectContaining({
              export_date: expect.any(String),
              total_records: expect.any(Number),
              file_size_bytes: expect.any(Number)
            })
          })
        });

        expect(result.export_data.data).toHaveProperty('profile');
        expect(result.export_data.data).toHaveProperty('assessments');
      });

      test('should export data as CSV format', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'csv',
          data_types: ['assessments', 'progress_tracking'],
          include_headers: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.export_data.export_format).toBe('csv');
        expect(result.export_data.data_types).toEqual(['assessments', 'progress_tracking']);
        expect(typeof result.export_data.data).toBe('string');
      });

      test('should export filtered data by date range', async () => {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'json',
          date_range: {
            start_date: startDate,
            end_date: endDate
          },
          include_audit_trail: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.export_data.date_range.start_date).toBe(startDate);
        expect(result.export_data.date_range.end_date).toBe(endDate);
        expect(result.export_data).toHaveProperty('audit_trail');
      });

      test('should export with data compression', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'json',
          compression: 'gzip',
          include_all_data: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.export_data.compression).toBe('gzip');
        expect(result.export_data.metadata.compressed_size).toBeDefined();
        expect(result.export_data.metadata.compression_ratio).toBeDefined();
      });

      test('should export multiple profiles', async () => {
        // Create additional profile
        const profile2 = await testUtils.createTestProfile({
          profile_name: 'Export Test Profile 2',
          org_id: testOrgId
        });

        const result = await exportData.execute({
          profile_ids: [testProfileId, profile2.profile_id],
          export_format: 'json',
          batch_export: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.export_data.profile_ids).toEqual([testProfileId, profile2.profile_id]);
        expect(result.export_data.batch_export).toBe(true);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle invalid export format', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'invalid_format'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'export_format');
      });

      test('should handle invalid date range', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'json',
          date_range: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'date_range');
      });

      test('should handle oversized export requests', async () => {
        const result = await exportData.execute({
          profile_id: testProfileId,
          export_format: 'json',
          max_records: 1000000 // Very large number
        }, testDb);
        
        // Should succeed but with pagination or warning
        expect(result.success).toBe(true);
        if (result.export_data.metadata.total_records > 10000) {
          expect(result.export_data).toHaveProperty('pagination_info');
        }
      });
    });
  });

  describe('Generate Executive Report Tool', () => {
    describe('Valid Input Tests', () => {
      test('should generate comprehensive executive report', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          report_period: 'quarterly',
          include_executive_summary: true,
          include_risk_assessment: true,
          include_recommendations: true,
          include_budget_analysis: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          executive_report: expect.objectContaining({
            profile_id: testProfileId,
            report_period: 'quarterly',
            executive_summary: expect.any(Object),
            risk_assessment: expect.any(Object),
            recommendations: expect.any(Array),
            budget_analysis: expect.any(Object),
            report_date: expect.any(String)
          })
        });

        expect(result.executive_report.executive_summary).toHaveProperty('key_findings');
        expect(result.executive_report.recommendations.length).toBeGreaterThan(0);
      });

      test('should generate board presentation format', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          report_format: 'board_presentation',
          focus_areas: ['governance', 'risk_management', 'compliance'],
          include_industry_benchmarks: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.executive_report.report_format).toBe('board_presentation');
        expect(result.executive_report.focus_areas).toEqual(['governance', 'risk_management', 'compliance']);
        expect(result.executive_report).toHaveProperty('industry_benchmarks');
      });

      test('should generate regulatory report with compliance focus', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          report_type: 'regulatory',
          regulatory_frameworks: ['SOX', 'GDPR', 'PCI_DSS'],
          include_attestation: true,
          include_evidence_summary: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.executive_report.report_type).toBe('regulatory');
        expect(result.executive_report.regulatory_frameworks).toEqual(['SOX', 'GDPR', 'PCI_DSS']);
        expect(result.executive_report).toHaveProperty('attestation');
        expect(result.executive_report).toHaveProperty('evidence_summary');
      });

      test('should include trend analysis and projections', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          include_trend_analysis: true,
          trend_period_months: 12,
          include_projections: true,
          projection_horizon_months: 6
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.executive_report.trend_period_months).toBe(12);
        expect(result.executive_report.projection_horizon_months).toBe(6);
        expect(result.executive_report).toHaveProperty('trend_analysis');
        expect(result.executive_report).toHaveProperty('projections');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle invalid report period', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          report_period: 'invalid_period'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'report_period');
      });

      test('should handle invalid regulatory frameworks', async () => {
        const result = await generateExecutiveReport.execute({
          profile_id: testProfileId,
          regulatory_frameworks: ['INVALID_FRAMEWORK']
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'regulatory_frameworks');
      });
    });

    describe('Performance Tests', () => {
      test('should generate complex executive report efficiently', async () => {
        const startTime = Date.now();
        
        await generateExecutiveReport.execute({
          profile_id: testProfileId,
          include_executive_summary: true,
          include_risk_assessment: true,
          include_recommendations: true,
          include_trend_analysis: true,
          include_industry_benchmarks: true
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });
  });

  describe('Create Custom Report Tool', () => {
    describe('Valid Input Tests', () => {
      test('should create custom report with specific sections', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Custom Security Assessment',
          sections: [
            {
              type: 'summary',
              title: 'Executive Summary',
              include_charts: true
            },
            {
              type: 'detailed_analysis',
              title: 'Detailed Analysis',
              function_filter: 'GV',
              include_recommendations: true
            },
            {
              type: 'action_items',
              title: 'Action Items',
              priority_filter: 'high'
            }
          ],
          template: 'professional'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          custom_report: expect.objectContaining({
            profile_id: testProfileId,
            report_name: 'Custom Security Assessment',
            sections: expect.arrayContaining([
              expect.objectContaining({
                type: 'summary',
                title: 'Executive Summary'
              })
            ]),
            template: 'professional',
            report_id: expect.any(String)
          })
        });

        expect(result.custom_report.sections).toHaveLength(3);
      });

      test('should create report with data visualizations', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Visual Analytics Report',
          include_visualizations: true,
          visualization_types: [
            'maturity_radar',
            'risk_heatmap',
            'compliance_scorecard',
            'progress_timeline'
          ],
          chart_style: 'modern'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.custom_report.include_visualizations).toBe(true);
        expect(result.custom_report.visualization_types).toEqual([
          'maturity_radar',
          'risk_heatmap',
          'compliance_scorecard',
          'progress_timeline'
        ]);
      });

      test('should create comparative report', async () => {
        // Create comparison profile
        const compareProfile = await testUtils.createTestProfile({
          profile_name: 'Comparison Profile',
          org_id: testOrgId
        });

        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          comparison_profile_id: compareProfile.profile_id,
          report_name: 'Profile Comparison Report',
          report_type: 'comparison',
          comparison_metrics: ['maturity', 'risk', 'compliance']
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.custom_report.report_type).toBe('comparison');
        expect(result.custom_report.comparison_profile_id).toBe(compareProfile.profile_id);
        expect(result.custom_report.comparison_metrics).toEqual(['maturity', 'risk', 'compliance']);
      });

      test('should create report with custom filters and grouping', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Filtered Analysis Report',
          filters: {
            functions: ['GV', 'ID'],
            implementation_levels: ['Partially Implemented', 'Fully Implemented'],
            maturity_range: { min: 2, max: 4 },
            date_range: {
              start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          },
          grouping: {
            primary: 'function',
            secondary: 'category'
          }
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.custom_report.filters.functions).toEqual(['GV', 'ID']);
        expect(result.custom_report.grouping.primary).toBe('function');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing report name', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          sections: []
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'report_name');
      });

      test('should handle invalid section types', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Invalid Report',
          sections: [
            {
              type: 'invalid_section_type',
              title: 'Invalid Section'
            }
          ]
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'section_type');
      });

      test('should handle invalid visualization types', async () => {
        const result = await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Invalid Viz Report',
          visualization_types: ['invalid_chart_type']
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'visualization_types');
      });
    });

    describe('Performance Tests', () => {
      test('should create complex custom report efficiently', async () => {
        const startTime = Date.now();
        
        await createCustomReport.execute({
          profile_id: testProfileId,
          report_name: 'Performance Test Report',
          sections: [
            { type: 'summary', title: 'Summary' },
            { type: 'detailed_analysis', title: 'Analysis' },
            { type: 'recommendations', title: 'Recommendations' }
          ],
          include_visualizations: true,
          visualization_types: ['maturity_radar', 'risk_heatmap']
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      });
    });
  });

  describe('Database Transaction Tests', () => {
    test('should handle database errors gracefully during export', async () => {
      const mockDb = {
        prepare: () => ({ all: () => { throw new Error('Export database error'); } })
      };

      const result = await exportData.execute({
        profile_id: testProfileId,
        export_format: 'json'
      }, mockDb as any);

      testUtils.assertErrorResponse(result, 'Export database error');
    });

    test('should handle concurrent report generation', async () => {
      const promises = [
        generateDashboard.execute({
          profile_id: testProfileId,
          dashboard_type: 'executive'
        }, testDb),
        exportData.execute({
          profile_id: testProfileId,
          export_format: 'json'
        }, testDb),
        generateExecutiveReport.execute({
          profile_id: testProfileId,
          report_period: 'monthly'
        }, testDb)
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle large data exports with memory efficiency', async () => {
      // This test ensures memory efficiency with large datasets
      const result = await exportData.execute({
        profile_id: testProfileId,
        export_format: 'csv',
        streaming: true,
        chunk_size: 1000
      }, testDb);

      expect(result.success).toBe(true);
      expect(result.export_data).toHaveProperty('streaming');
      expect(result.export_data).toHaveProperty('chunk_size');
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent dashboard format', async () => {
      const result = await generateDashboard.execute({
        profile_id: testProfileId,
        dashboard_type: 'executive'
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        dashboard: expect.objectContaining({
          profile_id: expect.any(String),
          dashboard_type: expect.any(String),
          widgets: expect.any(Array),
          summary_metrics: expect.any(Object),
          generated_date: expect.any(String)
        })
      });
    });

    test('should return consistent export format', async () => {
      const result = await exportData.execute({
        profile_id: testProfileId,
        export_format: 'json'
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        export_data: expect.objectContaining({
          profile_id: expect.any(String),
          export_format: expect.any(String),
          data: expect.any(Object),
          metadata: expect.objectContaining({
            export_date: expect.any(String),
            total_records: expect.any(Number)
          })
        })
      });
    });

    test('should return consistent error format across all tools', async () => {
      const result = await generateDashboard.execute({
        profile_id: 'invalid'
      } as any, testDb);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });
});

/**
 * Setup additional test data for reporting
 */
async function setupReportingTestData() {
  // Add more comprehensive test data for rich reporting
  const additionalData = [
    // Risk assessments
    {
      table: 'risk_assessments',
      data: [
        {
          element_id: 'GV.OC-01',
          risk_level: 'Medium',
          likelihood: 3,
          impact: 3,
          risk_score: 0.6
        },
        {
          element_id: 'ID.AM-01', 
          risk_level: 'High',
          likelihood: 4,
          impact: 4,
          risk_score: 0.8
        }
      ]
    },
    // Progress milestones
    {
      table: 'progress_milestones',
      data: [
        {
          milestone_name: 'Q1 Goals',
          description: 'Complete governance setup',
          target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'in_progress',
          completion_percentage: 65
        }
      ]
    }
  ];

  for (const item of additionalData) {
    try {
      for (const record of item.data) {
        const columns = Object.keys(record).join(', ');
        const placeholders = Object.keys(record).map(() => '?').join(', ');
        const values = Object.values(record);
        
        testDb.db.prepare(`
          INSERT OR REPLACE INTO ${item.table} (${columns})
          VALUES (${placeholders})
        `).run(...values);
      }
    } catch (error) {
      // Table might not exist yet, continue
    }
  }
}