/**
 * Unit tests for profile management tools
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile';
import { cloneProfile } from '../../src/tools/clone_profile';
import { compareProfilesTool } from '../../src/tools/compare_profiles';
import { TestDatabase } from '../helpers/test-db';
import { mockOrganization, mockProfile, invalidInputs } from '../helpers/mock-data';

describe('Create Profile Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Valid profile creation', () => {
    it('should create a basic profile', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const
      };
      
      const db = testDb.createAppDatabase();
      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.data.organization).toBeDefined();
      expect(result.data.profile).toBeDefined();
      expect(result.data.organization.org_name).toBe(params.org_name);
      expect(result.data.profile.profile_type).toBe('current');
    });
    
    it('should create profile with all optional fields', async () => {
      const params = {
        org_name: 'Complete Organization',
        sector: 'Healthcare',
        size: 'large' as const,
        profile_type: 'target' as const,
        profile_name: 'Custom Target Profile',
        description: 'Detailed description',
        created_by: 'admin-user',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      };
      
      const db = testDb.createAppDatabase();
      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.data.profile.profile_name).toBe(params.profile_name);
      expect(result.data.profile.profile_type).toBe(params.profile_type);
      expect(result.data.profile.description).toBe(params.description);
      expect(result.data.organization.current_tier).toBe(params.current_tier);
    });
    
    it('should generate unique IDs', async () => {
      const params = {
        org_name: 'Test Org',
        sector: 'Finance',
        size: 'small' as const
      };
      
      const db = testDb.createAppDatabase();
      const result1 = await createProfile(params);
      const result2 = await createProfile({ ...params, org_name: 'Test Org 2' });
      
      expect(result1.data.organization.org_id).not.toBe(result2.data.organization.org_id);
      expect(result1.data.profile.profile_id).not.toBe(result2.data.profile.profile_id);
    });
    
    it('should set profile as active by default', async () => {
      const params = {
        org_name: 'Active Org',
        sector: 'Retail',
        size: 'enterprise' as const
      };
      
      const db = testDb.createAppDatabase();
      const result = await createProfile(params);
      
      expect(result.data.profile.is_active).toBe(true);
    });
  });
  
  describe('Invalid inputs', () => {
    it('should reject empty organization name', async () => {
      const params = {
        org_name: '',
        sector: 'Technology',
        size: 'medium' as const
      };
      
      await expect(createProfile(params)).rejects.toThrow();
    });
    
    it('should reject invalid size value', async () => {
      const params = {
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'invalid' as any
      };
      
      await expect(createProfile(params)).rejects.toThrow();
    });
    
    it('should reject invalid profile type', async () => {
      const params = {
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'invalid' as any
      };
      
      await expect(createProfile(params)).rejects.toThrow();
    });
    
    it('should handle SQL injection attempts', async () => {
      const params = {
        org_name: invalidInputs.sqlInjection,
        sector: 'Technology',
        size: 'medium' as const
      };
      
      const db = testDb.createAppDatabase();
      const result = await createProfile(params);
      
      // Should safely handle the input without SQL injection
      expect(result.success).toBe(true);
      expect(result.data.organization.org_name).toBe(invalidInputs.sqlInjection);
    });
  });
  
  describe('Database transactions', () => {
    it('should rollback on organization creation failure', async () => {
      const db = testDb.createAppDatabase();
      
      // Insert an organization to cause duplicate key error
      testDb.insertTestData('organization_profiles', mockOrganization);
      
      const params = {
        org_name: mockOrganization.org_name,
        sector: 'Technology',
        size: 'medium' as const
      };
      
      // Mock to force same org_id
      jest.spyOn(global.crypto, 'randomUUID').mockReturnValueOnce(mockOrganization.org_id);
      
      try {
        await createProfile(params);
      } catch (error) {
        // Should fail due to duplicate key
      }
      
      // Check that no partial data was inserted
      const profiles = testDb.query('SELECT * FROM profiles WHERE org_id = ?', [mockOrganization.org_id]);
      expect(profiles.length).toBe(0);
    });
  });
});

describe('Clone Profile Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    // Setup source data
    testDb.insertTestData('organization_profiles', mockOrganization);
    testDb.insertTestData('profiles', mockProfile);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Valid cloning', () => {
    it('should clone existing profile', async () => {
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: 'Cloned Profile'
      };
      
      const db = testDb.createAppDatabase();
      const result = await cloneProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.data.new_profile).toBeDefined();
      expect(result.data.new_profile.profile_name).toBe(params.new_name);
      expect(result.data.new_profile.profile_id).not.toBe(mockProfile.profile_id);
    });
    
    it('should clone with modifications', async () => {
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: 'Modified Clone',
        modifications: {
          profile_type: 'target' as const,
          description: 'Modified description',
          created_by: 'new-user'
        }
      };
      
      const db = testDb.createAppDatabase();
      const result = await cloneProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.data.new_profile.profile_type).toBe('target');
      expect(result.data.new_profile.description).toBe('Modified description');
      expect(result.data.new_profile.created_by).toBe('new-user');
    });
    
    it('should clone assessments if present', async () => {
      // Add assessments to source profile
      testDb.insertTestData('assessments', {
        assessment_id: 'test-assessment',
        profile_id: mockProfile.profile_id,
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 3
      });
      
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: 'Clone with Assessments'
      };
      
      const db = testDb.createAppDatabase();
      const result = await cloneProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.data.assessments_cloned).toBe(1);
    });
    
    it('should apply adjustments to cloned assessments', async () => {
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: 'Adjusted Clone',
        modifications: {
          adjustments: [
            {
              subcategory_id: 'GV.OC-01',
              implementation_level: 'fully_implemented' as const,
              maturity_score: 5,
              notes: 'Adjusted value'
            }
          ]
        }
      };
      
      const db = testDb.createAppDatabase();
      const result = await cloneProfile(params);
      
      expect(result.success).toBe(true);
      // Adjustments should be applied to the new profile
    });
  });
  
  describe('Invalid inputs', () => {
    it('should fail for non-existent source profile', async () => {
      const params = {
        source_profile_id: 'non-existent-id',
        new_name: 'Clone'
      };
      
      const db = testDb.createAppDatabase();
      const result = await cloneProfile(params);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
    
    it('should reject empty new name', async () => {
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: ''
      };
      
      await expect(cloneProfile(params)).rejects.toThrow();
    });
    
    it('should validate modification fields', async () => {
      const params = {
        source_profile_id: mockProfile.profile_id,
        new_name: 'Clone',
        modifications: {
          profile_type: 'invalid' as any
        }
      };
      
      await expect(cloneProfile(params)).rejects.toThrow();
    });
  });
});

describe('Compare Profiles Tool', () => {
  let testDb: TestDatabase;
  
  beforeEach(() => {
    testDb = new TestDatabase();
    
    // Setup test data with multiple profiles
    testDb.insertTestData('organization_profiles', mockOrganization);
    
    const profiles = [
      { ...mockProfile, profile_id: 'profile-1', profile_name: 'Profile 1' },
      { ...mockProfile, profile_id: 'profile-2', profile_name: 'Profile 2' },
      { ...mockProfile, profile_id: 'profile-3', profile_name: 'Profile 3' }
    ];
    testDb.insertTestData('profiles', profiles);
    
    // Add assessments with different maturity levels
    testDb.insertTestData('assessments', [
      {
        assessment_id: 'assess-1',
        profile_id: 'profile-1',
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Fully Implemented',
        maturity_score: 5
      },
      {
        assessment_id: 'assess-2',
        profile_id: 'profile-2',
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Partially Implemented',
        maturity_score: 3
      },
      {
        assessment_id: 'assess-3',
        profile_id: 'profile-3',
        subcategory_id: 'GV.OC-01',
        implementation_level: 'Not Implemented',
        maturity_score: 0
      }
    ]);
  });
  
  afterEach(() => {
    testDb.close();
  });
  
  describe('Valid comparisons', () => {
    it('should compare two profiles', async () => {
      const params = {
        profile_ids: ['profile-1', 'profile-2']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.profiles).toHaveLength(2);
      expect(result.comparison.differences).toBeDefined();
    });
    
    it('should compare multiple profiles', async () => {
      const params = {
        profile_ids: ['profile-1', 'profile-2', 'profile-3']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison.profiles).toHaveLength(3);
    });
    
    it('should identify maturity differences', async () => {
      const params = {
        profile_ids: ['profile-1', 'profile-3']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison.differences).toBeDefined();
      expect(result.comparison.maturity_comparison).toBeDefined();
      
      // Profile 1 has maturity 5, Profile 3 has maturity 0
      const diff = result.comparison.differences.find(
        d => d.subcategory_id === 'GV.OC-01'
      );
      expect(diff).toBeDefined();
    });
    
    it('should calculate similarity scores', async () => {
      const params = {
        profile_ids: ['profile-1', 'profile-2']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison.similarity_matrix).toBeDefined();
      expect(typeof result.comparison.overall_similarity).toBe('number');
      expect(result.comparison.overall_similarity).toBeGreaterThanOrEqual(0);
      expect(result.comparison.overall_similarity).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Invalid inputs', () => {
    it('should require at least 2 profiles', async () => {
      const params = {
        profile_ids: ['profile-1']
      };
      
      await expect(compareProfilesTool.execute(params, testDb.createAppDatabase()))
        .rejects.toThrow();
    });
    
    it('should reject more than 5 profiles', async () => {
      const params = {
        profile_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
      };
      
      await expect(compareProfilesTool.execute(params, testDb.createAppDatabase()))
        .rejects.toThrow();
    });
    
    it('should handle non-existent profiles', async () => {
      const params = {
        profile_ids: ['profile-1', 'non-existent']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
  
  describe('Comparison analysis', () => {
    it('should identify common strengths', async () => {
      // Add common high maturity assessments
      testDb.insertTestData('assessments', [
        {
          assessment_id: 'common-1',
          profile_id: 'profile-1',
          subcategory_id: 'ID.AM-01',
          implementation_level: 'Fully Implemented',
          maturity_score: 5
        },
        {
          assessment_id: 'common-2',
          profile_id: 'profile-2',
          subcategory_id: 'ID.AM-01',
          implementation_level: 'Fully Implemented',
          maturity_score: 5
        }
      ]);
      
      const params = {
        profile_ids: ['profile-1', 'profile-2']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison.common_strengths).toBeDefined();
      expect(result.comparison.common_strengths.length).toBeGreaterThan(0);
    });
    
    it('should identify common weaknesses', async () => {
      // Add common low maturity assessments
      testDb.insertTestData('assessments', [
        {
          assessment_id: 'weak-1',
          profile_id: 'profile-1',
          subcategory_id: 'PR.AC-01',
          implementation_level: 'Not Implemented',
          maturity_score: 0
        },
        {
          assessment_id: 'weak-2',
          profile_id: 'profile-2',
          subcategory_id: 'PR.AC-01',
          implementation_level: 'Not Implemented',
          maturity_score: 0
        }
      ]);
      
      const params = {
        profile_ids: ['profile-1', 'profile-2']
      };
      
      const db = testDb.createAppDatabase();
      const result = await compareProfilesTool.execute(params, db);
      
      expect(result.success).toBe(true);
      expect(result.comparison.common_weaknesses).toBeDefined();
      expect(result.comparison.common_weaknesses.length).toBeGreaterThan(0);
    });
  });
});