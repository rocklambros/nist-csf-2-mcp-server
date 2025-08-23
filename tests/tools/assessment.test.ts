/**
 * Unit tests for assessment tools
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { quickAssessment } from '../../src/tools/quick_assessment';
import { assessMaturity } from '../../src/tools/assess_maturity';
import { calculateRiskScore } from '../../src/tools/calculate_risk_score';
import { trackProgressTool } from '../../src/tools/track_progress';
import { TestDatabase } from '../helpers/test-db';
import { 
  mockOrganization, 
  mockProfile, 
  generateMockAssessments,
  invalidInputs 
} from '../helpers/mock-data';

describe('Quick Assessment Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testDb.insertTestData('organizations', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Valid assessments', () => {
    it('should perform quick assessment with all yes answers', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        },
        assessed_by: 'test-assessor'
      };
      
      const result = await quickAssessment(params);
      
      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.overall_score).toBeGreaterThan(0.8);
      expect(result.data.assessments_created).toBeGreaterThan(0);
    });
    
    it('should perform quick assessment with mixed answers', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'partial' as const,
          detect: 'no' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        },
        assessed_by: 'test-assessor',
        confidence_level: 'medium' as const
      };
      
      const result = await quickAssessment(params);
      
      expect(result.success).toBe(true);
      expect(result.data.summary.overall_score).toBeGreaterThan(0.2);
      expect(result.data.summary.overall_score).toBeLessThan(0.8);
    });
    
    it('should include notes for each function', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        },
        assessed_by: 'test-assessor',
        notes: {
          govern: 'Strong governance in place',
          identify: 'Asset management complete',
          protect: 'Access controls implemented',
          detect: 'Monitoring active',
          respond: 'Incident response plan tested',
          recover: 'Recovery procedures documented'
        }
      };
      
      const result = await quickAssessment(params);
      
      expect(result.success).toBe(true);
      expect(result.data.function_scores).toBeDefined();
    });
    
    it('should handle all no answers', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'no' as const,
          identify: 'no' as const,
          protect: 'no' as const,
          detect: 'no' as const,
          respond: 'no' as const,
          recover: 'no' as const
        },
        assessed_by: 'test-assessor',
        confidence_level: 'high' as const
      };
      
      const result = await quickAssessment(params);
      
      expect(result.success).toBe(true);
      expect(result.data.summary.overall_score).toBeLessThan(0.2);
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.recommendations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Invalid inputs', () => {
    it('should reject invalid profile ID', async () => {
      const params = {
        profile_id: 'non-existent',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        }
      };
      
      const result = await quickAssessment(params);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
    
    it('should reject invalid answer values', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'maybe' as any,
          identify: 'yes' as const,
          protect: 'yes' as const,
          detect: 'yes' as const,
          respond: 'yes' as const,
          recover: 'yes' as const
        }
      };
      
      await expect(quickAssessment(params)).rejects.toThrow();
    });
    
    it('should reject missing required answers', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'yes' as const,
          // Missing other functions
        } as any
      };
      
      await expect(quickAssessment(params)).rejects.toThrow();
    });
  });
});

describe('Assess Maturity Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testDb.insertTestData('organizations', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
    
    // Add assessments with varying maturity
    const assessments = generateMockAssessments(20, mockProfile.profile_id);
    testDb.insertTestData('assessments', assessments);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Maturity calculation', () => {
    it('should calculate maturity tier for profile', async () => {
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_maturity).toBeDefined();
      expect(result.data.overall_maturity.tier).toBeDefined();
      expect(result.data.overall_maturity.score).toBeGreaterThanOrEqual(0);
      expect(result.data.overall_maturity.score).toBeLessThanOrEqual(5);
    });
    
    it('should calculate per-function maturity', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        include_subcategory_details: true
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(result.data.function_maturity).toBeDefined();
      expect(Object.keys(result.data.function_maturity).length).toBeGreaterThan(0);
    });
    
    it('should include recommendations', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        include_recommendations: true
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });
    
    it('should include subcategory details when requested', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        include_subcategory_details: true
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(result.data.subcategory_details).toBeDefined();
      expect(Array.isArray(result.data.subcategory_details)).toBe(true);
    });
  });
  
  describe('Tier determination', () => {
    it('should identify Tier 1 for low maturity', async () => {
      // Clear existing assessments and add low maturity ones
      testDb.exec('DELETE FROM assessments');
      testDb.insertTestData('assessments', Array.from({ length: 10 }, (_, i) => ({
        assessment_id: `low-${i}`,
        profile_id: mockProfile.profile_id,
        subcategory_id: `GV.OC-0${i % 5 + 1}`,
        implementation_level: 'Not Implemented',
        maturity_score: 1
      })));
      
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_maturity.tier).toBe('Tier1');
    });
    
    it('should identify higher tiers for better maturity', async () => {
      // Clear existing assessments and add high maturity ones
      testDb.exec('DELETE FROM assessments');
      testDb.insertTestData('assessments', Array.from({ length: 10 }, (_, i) => ({
        assessment_id: `high-${i}`,
        profile_id: mockProfile.profile_id,
        subcategory_id: `GV.OC-0${i % 5 + 1}`,
        implementation_level: 'Fully Implemented',
        maturity_score: 4
      })));
      
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await assessMaturity(params);
      
      expect(result.success).toBe(true);
      expect(['Tier2', 'Tier3', 'Tier4']).toContain(result.data.overall_maturity.tier);
    });
  });
});

describe('Calculate Risk Score Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testDb.insertTestData('organizations', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
    
    // Add mixed assessments
    testDb.insertTestData('assessments', [
      {
        assessment_id: 'not-impl-1',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Not Implemented',
        maturity_score: 0
      },
      {
        assessment_id: 'partial-1',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'ID.AM-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 2
      },
      {
        assessment_id: 'full-1',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'PR.AC-01',
        implementation_level: 'Fully Implemented',
        maturity_score: 5
      }
    ]);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Risk calculation', () => {
    it('should calculate overall risk score', async () => {
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_risk).toBeDefined();
      expect(result.data.overall_risk.score).toBeGreaterThanOrEqual(0);
      expect(result.data.overall_risk.score).toBeLessThanOrEqual(100);
      expect(result.data.overall_risk.level).toBeDefined();
    });
    
    it('should apply custom threat weights', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        threat_weights: {
          govern: 2.0,
          identify: 1.8,
          protect: 1.6,
          detect: 1.4,
          respond: 1.2,
          recover: 1.0
        }
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.weighted_risks).toBeDefined();
    });
    
    it('should generate heat map data', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        include_heat_map: true
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.heat_map).toBeDefined();
      expect(Array.isArray(result.data.heat_map)).toBe(true);
    });
    
    it('should provide risk recommendations', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        include_recommendations: true
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.recommendations.critical_gaps).toBeDefined();
      expect(result.data.recommendations.priority_actions).toBeDefined();
    });
  });
  
  describe('Risk levels', () => {
    it('should identify critical risk for no implementations', async () => {
      // Clear and add only unimplemented assessments
      testDb.exec('DELETE FROM assessments');
      testDb.insertTestData('assessments', Array.from({ length: 10 }, (_, i) => ({
        assessment_id: `none-${i}`,
        profile_id: mockProfile.profile_id,
        subcategory_id: `GV.OC-0${i % 5 + 1}`,
        implementation_level: 'Not Implemented',
        maturity_score: 0
      })));
      
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_risk.level).toBe('Critical');
      expect(result.data.overall_risk.score).toBeGreaterThan(75);
    });
    
    it('should identify low risk for full implementations', async () => {
      // Clear and add only fully implemented assessments
      testDb.exec('DELETE FROM assessments');
      testDb.insertTestData('assessments', Array.from({ length: 10 }, (_, i) => ({
        assessment_id: `full-${i}`,
        profile_id: mockProfile.profile_id,
        subcategory_id: `GV.OC-0${i % 5 + 1}`,
        implementation_level: 'Fully Implemented',
        maturity_score: 5
      })));
      
      const params = {
        profile_id: mockProfile.profile_id
      };
      
      const result = await calculateRiskScore(params);
      
      expect(result.success).toBe(true);
      expect(result.data.overall_risk.level).toBe('Low');
      expect(result.data.overall_risk.score).toBeLessThan(25);
    });
  });
});

describe('Track Progress Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    testDb.insertTestData('organizations', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Progress tracking', () => {
    it('should track new progress entries', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_implementation: 'Partially Implemented',
            current_maturity: 3,
            status: 'on_track' as const,
            notes: 'Making good progress'
          }
        ]
      };
      
      const db = testDb.createAppDatabase();
      const result = await trackProgressTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.updates_processed).toBe(1);
      expect(result.summary).toBeDefined();
    });
    
    it('should update existing progress entries', async () => {
      // Insert initial progress
      testDb.insertTestData('progress_tracking', {
        progress_id: 'existing-progress',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        current_maturity: 2,
        status: 'on_track'
      });
      
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_implementation: 'Largely Implemented',
            current_maturity: 4,
            status: 'completed' as const
          }
        ]
      };
      
      const db = testDb.createAppDatabase();
      const result = await trackProgressTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.updates_processed).toBe(1);
      
      // Verify update
      const progress = testDb.get(
        'SELECT * FROM progress_tracking WHERE profile_id = ? AND subcategory_id = ?',
        [mockProfile.profile_id, 'GV.OC-01']
      );
      expect(progress.current_maturity).toBe(4);
      expect(progress.status).toBe('completed');
    });
    
    it('should handle blocked status', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'PR.AC-01',
            current_implementation: 'Partially Implemented',
            current_maturity: 2,
            status: 'blocked' as const,
            is_blocked: true,
            blocking_reason: 'Waiting for budget approval'
          }
        ]
      };
      
      const db = testDb.createAppDatabase();
      const result = await trackProgressTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.summary.blocked_items).toBe(1);
    });
    
    it('should track multiple updates in batch', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_maturity: 3,
            status: 'on_track' as const
          },
          {
            subcategory_id: 'ID.AM-01',
            current_maturity: 2,
            status: 'at_risk' as const
          },
          {
            subcategory_id: 'PR.AC-01',
            current_maturity: 4,
            status: 'completed' as const
          }
        ]
      };
      
      const db = testDb.createAppDatabase();
      const result = await trackProgressTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.updates_processed).toBe(3);
      expect(result.summary.on_track).toBe(1);
      expect(result.summary.at_risk).toBe(1);
      expect(result.summary.completed).toBe(1);
    });
  });
  
  describe('Invalid inputs', () => {
    it('should reject invalid profile ID', async () => {
      const params = {
        profile_id: 'non-existent',
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_maturity: 3,
            status: 'on_track' as const
          }
        ]
      };
      
      const db = testDb.createAppDatabase();
      const result = await trackProgressTool.execute(params, db);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
    
    it('should validate maturity range', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_maturity: 6, // Invalid: > 5
            status: 'on_track' as const
          }
        ]
      };
      
      await expect(trackProgressTool.execute(params, testDb.createAppDatabase()))
        .rejects.toThrow();
    });
    
    it('should validate status values', async () => {
      const params = {
        profile_id: mockProfile.profile_id,
        updates: [
          {
            subcategory_id: 'GV.OC-01',
            current_maturity: 3,
            status: 'invalid_status' as any
          }
        ]
      };
      
      await expect(trackProgressTool.execute(params, testDb.createAppDatabase()))
        .rejects.toThrow();
    });
  });
});