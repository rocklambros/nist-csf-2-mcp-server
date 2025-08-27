/**
 * Comprehensive integration tests with realistic data
 * Tests complete workflows with proper foreign key relationships
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestDatabase } from '../helpers/test-db';

// Mock the database module to use our test database
let testDb: TestDatabase;

jest.mock('../../src/db/database.js', () => {
  const originalModule = jest.requireActual('../../src/db/database.js');
  return {
    ...originalModule,
    getDatabase: jest.fn(() => {
      if (testDb) {
        return testDb.createAppDatabase();
      }
      throw new Error('Test database not initialized');
    })
  };
});

describe('Comprehensive Integration Tests', () => {
  let testData: any;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testData = testDb.loadRealisticTestData();
  });
  
  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });
  
  describe('Complete Data Integrity', () => {
    it('should have loaded complete realistic dataset', () => {
      // Check organization
      const org = testDb.get(
        'SELECT * FROM organization_profiles WHERE org_id = ?',
        [testData.organization.org_id]
      );
      expect(org).toBeTruthy();
      expect(org.org_name).toBe('Acme Financial Services');
      
      // Check profile
      const profile = testDb.get(
        'SELECT * FROM profiles WHERE profile_id = ?',
        [testData.profile.profile_id]
      );
      expect(profile).toBeTruthy();
      expect(profile.org_id).toBe(testData.organization.org_id);
      
      // Check assessments
      const assessments = testDb.query(
        'SELECT COUNT(*) as count FROM assessments WHERE profile_id = ?',
        [testData.profile.profile_id]
      );
      expect(assessments[0].count).toBe(7); // All CSF functions covered
      
      // Check progress tracking
      const progress = testDb.query(
        'SELECT COUNT(*) as count FROM progress_tracking WHERE profile_id = ?',
        [testData.profile.profile_id]
      );
      expect(progress[0].count).toBe(2);
      
      // Check gap analysis
      const gaps = testDb.query(
        'SELECT COUNT(*) as count FROM gap_analysis WHERE org_id = ?',
        [testData.organization.org_id]
      );
      expect(gaps[0].count).toBe(2);
    });
    
    it('should maintain referential integrity', () => {
      // Test foreign key relationships with complex query
      const result = testDb.query(`
        SELECT 
          op.org_name,
          p.profile_name,
          a.implementation_level,
          pt.status,
          ga.priority
        FROM organization_profiles op
        JOIN profiles p ON op.org_id = p.org_id
        JOIN assessments a ON p.profile_id = a.profile_id
        LEFT JOIN progress_tracking pt ON p.profile_id = pt.profile_id AND a.subcategory_id = pt.subcategory_id
        LEFT JOIN gap_analysis ga ON op.org_id = ga.org_id
        WHERE op.org_id = ?
      `, [testData.organization.org_id]);
      
      expect(result.length).toBeGreaterThan(0);
      
      // Verify all results have consistent organization data
      result.forEach(row => {
        expect(row.org_name).toBe('Acme Financial Services');
        expect(row.profile_name).toBe('Current Security Posture Assessment');
      });
    });
  });
  
  describe('Assessment Analytics', () => {
    it('should calculate maturity scores by function', () => {
      const functionScores = testDb.query(`
        SELECT 
          c.function_id,
          f.name as function_name,
          AVG(a.maturity_score) as avg_maturity,
          COUNT(a.assessment_id) as assessment_count
        FROM assessments a
        JOIN subcategories s ON a.subcategory_id = s.id
        JOIN categories c ON s.category_id = c.id
        JOIN functions f ON c.function_id = f.id
        WHERE a.profile_id = ?
        GROUP BY c.function_id, f.name
        ORDER BY avg_maturity DESC
      `, [testData.profile.profile_id]);
      
      expect(functionScores.length).toBeGreaterThan(0);
      
      // Verify expected high performers
      const identifyFunction = functionScores.find(f => f.function_id === 'ID');
      expect(identifyFunction?.avg_maturity).toBe(5); // Fully implemented
      
      const protectFunction = functionScores.find(f => f.function_id === 'PR');
      expect(protectFunction?.avg_maturity).toBe(4); // Largely implemented
    });
    
    it('should identify priority gaps for improvement', () => {
      const priorityGaps = testDb.query(`
        SELECT 
          ga.category_id,
          c.name as category_name,
          ga.current_score,
          ga.target_score,
          ga.gap_score,
          ga.priority,
          ga.estimated_effort
        FROM gap_analysis ga
        JOIN categories c ON ga.category_id = c.id
        WHERE ga.org_id = ? 
        ORDER BY 
          CASE ga.priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          ga.gap_score DESC
      `, [testData.organization.org_id]);
      
      expect(priorityGaps.length).toBe(2);
      
      // High priority gap should be first
      expect(priorityGaps[0].priority).toBe('high');
      expect(priorityGaps[0].gap_score).toBe(2.0);
      expect(priorityGaps[0].category_id).toBe('DE.AE');
    });
  });
  
  describe('Progress Tracking Analytics', () => {
    it('should track implementation progress over time', () => {
      const progressSummary = testDb.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN status = 'on_track' THEN 1 ELSE 0 END) as on_track,
          SUM(CASE WHEN status = 'at_risk' THEN 1 ELSE 0 END) as at_risk,
          SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked,
          AVG(completion_percentage) as avg_completion,
          AVG(current_maturity) as avg_current_maturity,
          AVG(target_maturity) as avg_target_maturity
        FROM progress_tracking
        WHERE profile_id = ?
      `, [testData.profile.profile_id]);
      
      const summary = progressSummary[0];
      expect(summary.total_items).toBe(2);
      expect(summary.on_track).toBe(1);
      expect(summary.at_risk).toBe(1);
      expect(summary.blocked).toBe(1);
      expect(summary.avg_completion).toBe(52.5); // Average of 80% and 25%
    });
    
    it('should identify blocked items with reasons', () => {
      const blockedItems = testDb.query(`
        SELECT 
          pt.subcategory_id,
          s.name as subcategory_name,
          pt.blocking_reason,
          pt.status,
          pt.completion_percentage,
          pt.days_since_update
        FROM progress_tracking pt
        JOIN subcategories s ON pt.subcategory_id = s.id
        WHERE pt.profile_id = ? AND pt.is_blocked = 1
        ORDER BY pt.days_since_update DESC
      `, [testData.profile.profile_id]);
      
      expect(blockedItems.length).toBe(1);
      expect(blockedItems[0].subcategory_id).toBe('DE.AE-01');
      expect(blockedItems[0].blocking_reason).toContain('Budget approval pending');
      expect(blockedItems[0].days_since_update).toBe(8);
    });
  });
  
  describe('Risk Assessment Integration', () => {
    it('should correlate risks with current implementations', () => {
      const riskAssessment = testDb.query(`
        SELECT 
          ra.element_id,
          ra.risk_level,
          ra.risk_score,
          ra.mitigation_status,
          a.implementation_level,
          a.maturity_score,
          pt.status as progress_status,
          pt.completion_percentage
        FROM risk_assessments ra
        LEFT JOIN assessments a ON ra.element_id = a.subcategory_id AND a.profile_id = ?
        LEFT JOIN progress_tracking pt ON ra.element_id = pt.subcategory_id AND pt.profile_id = ?
        WHERE ra.org_id = ?
        ORDER BY ra.risk_score DESC
      `, [testData.profile.profile_id, testData.profile.profile_id, testData.organization.org_id]);
      
      expect(riskAssessment.length).toBe(2);
      
      // Highest risk should be the detection capability gap
      const highestRisk = riskAssessment[0];
      expect(highestRisk.element_id).toBe('DE.AE-01');
      expect(highestRisk.risk_score).toBe(16);
      expect(highestRisk.implementation_level).toBe('partially_implemented');
      expect(highestRisk.progress_status).toBe('at_risk');
    });
    
    it('should show risk mitigation effectiveness', () => {
      const mitigationAnalysis = testDb.query(`
        SELECT 
          ra.element_id,
          ra.risk_score as initial_risk,
          ra.residual_risk,
          (ra.risk_score - ra.residual_risk) as risk_reduction,
          ra.mitigation_status,
          a.maturity_score
        FROM risk_assessments ra
        JOIN assessments a ON ra.element_id = a.subcategory_id
        WHERE ra.org_id = ? AND a.profile_id = ?
      `, [testData.organization.org_id, testData.profile.profile_id]);
      
      expect(mitigationAnalysis.length).toBe(2);
      
      // Verify risk reduction calculations
      mitigationAnalysis.forEach(item => {
        expect(item.risk_reduction).toBeGreaterThan(0);
        expect(item.residual_risk).toBeLessThan(item.initial_risk);
      });
    });
  });
  
  describe('Implementation Planning', () => {
    it('should link implementation plans to gap analysis', () => {
      const implementationOverview = testDb.query(`
        SELECT 
          ip.plan_name,
          ip.status,
          ip.estimated_cost,
          ga.category_id,
          ga.gap_score,
          ga.priority
        FROM implementation_plans ip
        JOIN gap_analysis ga ON ip.gap_analysis_id = ga.id
        WHERE ip.org_id = ?
      `, [testData.organization.org_id]);
      
      expect(implementationOverview.length).toBe(1);
      
      const plan = implementationOverview[0];
      expect(plan.plan_name).toContain('Detection & Response');
      expect(plan.status).toBe('approved');
      expect(plan.category_id).toBe('DE.AE');
      expect(plan.gap_score).toBe(2.0);
    });
    
    it('should track milestone progress against plans', () => {
      const milestoneTracking = testDb.query(`
        SELECT 
          pm.milestone_name,
          pm.target_date,
          pm.status,
          pm.completion_percentage,
          COUNT(DISTINCT json_each.value) as subcategory_count
        FROM progress_milestones pm,
             json_each(pm.subcategories_involved)
        WHERE pm.profile_id = ?
        GROUP BY pm.id, pm.milestone_name, pm.target_date, pm.status, pm.completion_percentage
        ORDER BY pm.target_date
      `, [testData.profile.profile_id]);
      
      expect(milestoneTracking.length).toBe(2);
      
      // First milestone should be SIEM implementation
      const firstMilestone = milestoneTracking[0];
      expect(firstMilestone.milestone_name).toContain('SIEM Implementation');
      expect(firstMilestone.subcategory_count).toBeGreaterThan(0);
    });
  });
});