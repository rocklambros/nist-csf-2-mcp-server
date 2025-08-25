/**
 * Comprehensive tests for analysis tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testDb, testUtils } from '../setup.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { calculateRiskScore } from '../../src/tools/calculate_risk_score.js';
import { getImplementationGuidance } from '../../src/tools/get_implementation_guidance.js';
import { generateComplianceReport } from '../../src/tools/generate_compliance_report.js';
import { invalidInputs } from '../helpers/mock-data.js';

describe('Analysis Tools - Comprehensive Tests', () => {
  let testProfileId: string;
  let testOrgId: string;
  let targetProfileId: string;

  beforeAll(async () => {
    // Create test profiles for analysis
    const profile = await testUtils.createTestProfile({
      profile_name: 'Current State Profile',
      profile_type: 'current'
    });
    testProfileId = profile.profile_id;
    testOrgId = profile.org_id;

    const targetProfile = await testUtils.createTestProfile({
      profile_name: 'Target State Profile',
      profile_type: 'target',
      org_id: testOrgId
    });
    targetProfileId = targetProfile.profile_id;

    // Create test assessments for both profiles
    await testUtils.createTestAssessments(testProfileId, 8);
    await testUtils.createTestAssessments(targetProfileId, 8);
  });

  describe('Generate Gap Analysis Tool', () => {
    describe('Valid Input Tests', () => {
      test('should generate gap analysis between current and target profiles', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          include_recommendations: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          gap_analysis: expect.objectContaining({
            current_profile_id: testProfileId,
            target_profile_id: targetProfileId,
            overall_gap_score: expect.any(Number),
            function_gaps: expect.any(Object),
            total_gaps: expect.any(Number)
          }),
          recommendations: expect.any(Array)
        });

        expect(result.gap_analysis.overall_gap_score).toBeGreaterThanOrEqual(0);
        expect(result.gap_analysis.overall_gap_score).toBeLessThanOrEqual(5);
      });

      test('should generate gap analysis for single profile against framework baseline', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          baseline_tier: 'Tier2',
          include_priority_ranking: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          gap_analysis: expect.objectContaining({
            current_profile_id: testProfileId,
            baseline_tier: 'Tier2',
            priority_ranking: expect.any(Array)
          })
        });
      });

      test('should filter gap analysis by function', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          function_filter: 'GV'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.gap_analysis.function_filter).toBe('GV');
        
        // Verify only governance gaps are included
        Object.keys(result.gap_analysis.function_gaps).forEach(key => {
          expect(key).toBe('GV');
        });
      });

      test('should include effort estimates when requested', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          include_effort_estimates: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.gap_analysis).toHaveProperty('effort_estimates');
        expect(result.gap_analysis.effort_estimates).toHaveProperty('total_estimated_hours');
      });

      test('should generate timeline for gap closure', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          include_timeline: true,
          target_completion_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.gap_analysis).toHaveProperty('timeline');
        expect(result.gap_analysis.timeline).toHaveProperty('phases');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing current_profile_id', async () => {
        const result = await generateGapAnalysis.execute({
          target_profile_id: targetProfileId
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'current_profile_id');
      });

      test('should handle non-existent profiles', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: 'non-existent',
          target_profile_id: targetProfileId
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'not found');
      });

      test('should handle invalid baseline tier', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          baseline_tier: 'InvalidTier'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'baseline_tier');
      });

      test('should handle invalid function filter', async () => {
        const result = await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId,
          function_filter: 'INVALID'
        }, testDb);

        // Should succeed but return empty results
        expect(result.success).toBe(true);
        expect(Object.keys(result.gap_analysis.function_gaps)).toHaveLength(0);
      });
    });

    describe('Performance Tests', () => {
      test('should complete gap analysis within performance threshold', async () => {
        const startTime = Date.now();
        
        await generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });
  });

  describe('Calculate Risk Score Tool', () => {
    describe('Valid Input Tests', () => {
      test('should calculate risk score for profile', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          include_subcategory_risks: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          risk_assessment: expect.objectContaining({
            profile_id: testProfileId,
            overall_risk_score: expect.any(Number),
            risk_level: expect.any(String),
            function_risks: expect.any(Object)
          }),
          subcategory_risks: expect.any(Array)
        });

        expect(result.risk_assessment.overall_risk_score).toBeGreaterThanOrEqual(0);
        expect(result.risk_assessment.overall_risk_score).toBeLessThanOrEqual(1);
        expect(['Low', 'Medium', 'High', 'Critical']).toContain(result.risk_assessment.risk_level);
      });

      test('should calculate risk with custom threat factors', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          threat_factors: {
            external_threats: 0.8,
            internal_threats: 0.6,
            environmental_factors: 0.4,
            regulatory_pressure: 0.9
          },
          include_recommendations: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.risk_assessment.threat_factors).toBeDefined();
        expect(result.recommendations).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
      });

      test('should filter risk calculation by function', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          function_filter: 'ID',
          include_mitigation_strategies: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.risk_assessment.function_filter).toBe('ID');
        expect(result.mitigation_strategies).toBeDefined();
      });

      test('should include vulnerability assessment when requested', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          include_vulnerability_assessment: true,
          vulnerability_scan_date: new Date().toISOString()
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.risk_assessment).toHaveProperty('vulnerability_assessment');
        expect(result.risk_assessment.vulnerability_assessment).toHaveProperty('scan_date');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing profile_id', async () => {
        const result = await calculateRiskScore.execute({} as any, testDb);
        testUtils.assertErrorResponse(result, 'profile_id');
      });

      test('should handle invalid threat factor values', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          threat_factors: {
            external_threats: 2.0, // Invalid - should be 0-1
            internal_threats: 0.5
          }
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'threat_factors');
      });

      test('should handle XSS attempts in notes', async () => {
        const result = await calculateRiskScore.execute({
          profile_id: testProfileId,
          notes: invalidInputs.xssAttempt
        }, testDb);
        
        // Should succeed but sanitize input
        expect(result.success).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      test('should handle profile with no assessments', async () => {
        const emptyProfile = await testUtils.createTestProfile({
          profile_name: 'Empty Risk Profile'
        });

        const result = await calculateRiskScore.execute({
          profile_id: emptyProfile.profile_id
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.risk_assessment.overall_risk_score).toBe(1); // Maximum risk due to no controls
        expect(result.risk_assessment.risk_level).toBe('Critical');
      });
    });
  });

  describe('Get Implementation Guidance Tool', () => {
    describe('Valid Input Tests', () => {
      test('should get implementation guidance for subcategory', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'GV.OC-01',
          organization_size: 'medium',
          industry: 'Technology'
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          guidance: expect.objectContaining({
            subcategory_id: 'GV.OC-01',
            organization_size: 'medium',
            industry: 'Technology',
            implementation_steps: expect.any(Array),
            estimated_effort: expect.any(String)
          })
        });

        expect(result.guidance.implementation_steps.length).toBeGreaterThan(0);
      });

      test('should include technology recommendations when requested', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'ID.AM-01',
          organization_size: 'large',
          industry: 'Financial Services',
          include_technology_recommendations: true,
          budget_range: 'high'
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.guidance).toHaveProperty('technology_recommendations');
        expect(result.guidance.budget_range).toBe('high');
      });

      test('should customize guidance for organization maturity', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'PR.AC-01',
          organization_size: 'small',
          current_maturity_level: 1,
          target_maturity_level: 3,
          include_quick_wins: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.guidance.current_maturity_level).toBe(1);
        expect(result.guidance.target_maturity_level).toBe(3);
        expect(result.guidance).toHaveProperty('quick_wins');
      });

      test('should provide regulatory compliance guidance', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'GV.OC-01',
          organization_size: 'medium',
          regulatory_requirements: ['SOX', 'GDPR'],
          include_compliance_mapping: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.guidance.regulatory_requirements).toEqual(['SOX', 'GDPR']);
        expect(result.guidance).toHaveProperty('compliance_mapping');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing subcategory_id', async () => {
        const result = await getImplementationGuidance.execute({
          organization_size: 'medium'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'subcategory_id');
      });

      test('should handle invalid organization size', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'GV.OC-01',
          organization_size: 'invalid_size'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'organization_size');
      });

      test('should handle invalid maturity levels', async () => {
        const result = await getImplementationGuidance.execute({
          subcategory_id: 'GV.OC-01',
          organization_size: 'medium',
          current_maturity_level: 10,
          target_maturity_level: 15
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'maturity_level');
      });
    });

    describe('Performance Tests', () => {
      test('should generate guidance within performance threshold', async () => {
        const startTime = Date.now();
        
        await getImplementationGuidance.execute({
          subcategory_id: 'DE.CM-01',
          organization_size: 'large',
          industry: 'Healthcare'
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Generate Compliance Report Tool', () => {
    describe('Valid Input Tests', () => {
      test('should generate compliance report for profile', async () => {
        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'SOC2',
          include_evidence_requirements: true
        }, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          compliance_report: expect.objectContaining({
            profile_id: testProfileId,
            compliance_framework: 'SOC2',
            overall_compliance_percentage: expect.any(Number),
            compliant_controls: expect.any(Number),
            non_compliant_controls: expect.any(Number),
            control_mappings: expect.any(Array)
          }),
          evidence_requirements: expect.any(Array)
        });

        expect(result.compliance_report.overall_compliance_percentage).toBeGreaterThanOrEqual(0);
        expect(result.compliance_report.overall_compliance_percentage).toBeLessThanOrEqual(100);
      });

      test('should generate report for multiple frameworks', async () => {
        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_frameworks: ['ISO27001', 'NIST_800_53'],
          include_gap_analysis: true,
          include_remediation_plan: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.compliance_report.compliance_frameworks).toEqual(['ISO27001', 'NIST_800_53']);
        expect(result.compliance_report).toHaveProperty('gap_analysis');
        expect(result.compliance_report).toHaveProperty('remediation_plan');
      });

      test('should filter report by assessment date range', async () => {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();

        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'PCI_DSS',
          assessment_start_date: startDate,
          assessment_end_date: endDate,
          include_trend_analysis: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.compliance_report.assessment_start_date).toBe(startDate);
        expect(result.compliance_report.assessment_end_date).toBe(endDate);
        expect(result.compliance_report).toHaveProperty('trend_analysis');
      });

      test('should include executive summary when requested', async () => {
        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'HIPAA',
          include_executive_summary: true,
          include_risk_assessment: true
        }, testDb);

        expect(result.success).toBe(true);
        expect(result.compliance_report).toHaveProperty('executive_summary');
        expect(result.compliance_report).toHaveProperty('risk_assessment');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should handle missing profile_id', async () => {
        const result = await generateComplianceReport.execute({
          compliance_framework: 'SOC2'
        } as any, testDb);
        
        testUtils.assertErrorResponse(result, 'profile_id');
      });

      test('should handle invalid compliance framework', async () => {
        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'INVALID_FRAMEWORK'
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'compliance_framework');
      });

      test('should handle invalid date ranges', async () => {
        const result = await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'SOC2',
          assessment_start_date: new Date().toISOString(),
          assessment_end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }, testDb);
        
        testUtils.assertErrorResponse(result, 'date range');
      });
    });

    describe('Performance Tests', () => {
      test('should generate comprehensive report within time threshold', async () => {
        const startTime = Date.now();
        
        await generateComplianceReport.execute({
          profile_id: testProfileId,
          compliance_framework: 'ISO27001',
          include_evidence_requirements: true,
          include_gap_analysis: true,
          include_remediation_plan: true
        }, testDb);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      });
    });
  });

  describe('Database Transaction Tests', () => {
    test('should handle database connection errors gracefully', async () => {
      const mockDb = {
        prepare: () => ({ all: () => { throw new Error('Database connection lost'); } })
      };

      const result = await generateGapAnalysis.execute({
        current_profile_id: testProfileId,
        target_profile_id: targetProfileId
      }, mockDb as any);

      testUtils.assertErrorResponse(result, 'Database connection lost');
    });

    test('should handle concurrent analysis operations', async () => {
      const promises = [
        generateGapAnalysis.execute({
          current_profile_id: testProfileId,
          target_profile_id: targetProfileId
        }, testDb),
        calculateRiskScore.execute({
          profile_id: testProfileId
        }, testDb),
        getImplementationGuidance.execute({
          subcategory_id: 'GV.OC-01',
          organization_size: 'medium'
        }, testDb)
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent gap analysis format', async () => {
      const result = await generateGapAnalysis.execute({
        current_profile_id: testProfileId,
        target_profile_id: targetProfileId
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        gap_analysis: expect.objectContaining({
          current_profile_id: expect.any(String),
          target_profile_id: expect.any(String),
          overall_gap_score: expect.any(Number),
          function_gaps: expect.any(Object),
          analysis_date: expect.any(String),
          total_gaps: expect.any(Number)
        })
      });
    });

    test('should return consistent risk score format', async () => {
      const result = await calculateRiskScore.execute({
        profile_id: testProfileId
      }, testDb);

      expect(result).toMatchObject({
        success: true,
        risk_assessment: expect.objectContaining({
          profile_id: expect.any(String),
          overall_risk_score: expect.any(Number),
          risk_level: expect.any(String),
          function_risks: expect.any(Object),
          assessment_date: expect.any(String)
        })
      });
    });

    test('should return consistent error format', async () => {
      const result = await generateGapAnalysis.execute({
        current_profile_id: 'invalid'
      } as any, testDb);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });
  });
});