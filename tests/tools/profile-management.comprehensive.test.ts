/**
 * Comprehensive tests for profile management tools
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { testDb, testUtils, performanceUtils } from '../setup.js';
import { createProfile } from '../../src/tools/create_profile.js';
import { cloneProfile } from '../../src/tools/clone_profile.js';
import { compareProfilesTool } from '../../src/tools/compare_profiles.js';
import { invalidInputs, generateMockProfiles } from '../helpers/mock-data.js';

describe('Profile Management Tools - Comprehensive Tests', () => {
  beforeEach(() => {
    // Clean profiles between tests
    try {
      testDb.db.prepare('DELETE FROM profiles').run();
      testDb.db.prepare('DELETE FROM organizations').run();
    } catch (error) {
      // Tables might not exist
    }
  });

  describe('Create Profile Tool', () => {
    describe('Valid Input Tests', () => {
      test('should create profile with minimal required fields', async () => {
        const profileData = {
          org_name: 'Test Organization',
          profile_name: 'Test Profile',
          industry: 'Technology',
          size: 'medium'
        };

        const result = await createProfile.execute(profileData, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          profile: expect.objectContaining({
            profile_id: expect.any(String),
            org_id: expect.any(String),
            profile_name: 'Test Profile',
            created_by: expect.any(String)
          }),
          organization: expect.objectContaining({
            org_id: expect.any(String),
            org_name: 'Test Organization',
            industry: 'Technology',
            size: 'medium'
          })
        });

        // Verify data was actually saved
        const savedProfile = testDb.db.prepare(`
          SELECT * FROM profiles WHERE profile_id = ?
        `).get(result.profile.profile_id);
        
        expect(savedProfile).toBeTruthy();
        expect(savedProfile.profile_name).toBe('Test Profile');
      });

      test('should create profile with all optional fields', async () => {
        const profileData = {
          org_name: 'Complete Test Org',
          profile_name: 'Complete Test Profile',
          industry: 'Healthcare',
          size: 'large',
          profile_type: 'target',
          description: 'Comprehensive test profile',
          created_by: 'test-admin',
          current_tier: 'Tier2',
          target_tier: 'Tier4'
        };

        const result = await createProfile.execute(profileData, testDb);

        expect(result.success).toBe(true);
        expect(result.profile.profile_type).toBe('target');
        expect(result.profile.description).toBe('Comprehensive test profile');
        expect(result.profile.created_by).toBe('test-admin');
        expect(result.organization.current_tier).toBe('Tier2');
        expect(result.organization.target_tier).toBe('Tier4');
      });

      test('should handle different industry types', async () => {
        const industries = ['Technology', 'Healthcare', 'Financial', 'Manufacturing', 'Government'];

        for (const industry of industries) {
          const profileData = {
            org_name: `${industry} Org`,
            profile_name: `${industry} Profile`,
            industry,
            size: 'medium'
          };

          const result = await createProfile.execute(profileData, testDb);
          expect(result.success).toBe(true);
          expect(result.organization.industry).toBe(industry);
        }
      });

      test('should handle different organization sizes', async () => {
        const sizes = ['small', 'medium', 'large', 'enterprise'];

        for (const size of sizes) {
          const profileData = {
            org_name: `${size} Organization`,
            profile_name: `${size} Profile`,
            industry: 'Technology',
            size
          };

          const result = await createProfile.execute(profileData, testDb);
          expect(result.success).toBe(true);
          expect(result.organization.size).toBe(size);
        }
      });

      test('should handle different profile types', async () => {
        const types = ['current', 'target', 'baseline'];

        for (const profile_type of types) {
          const profileData = {
            org_name: `Org for ${profile_type}`,
            profile_name: `${profile_type} Profile`,
            industry: 'Technology',
            size: 'medium',
            profile_type
          };

          const result = await createProfile.execute(profileData, testDb);
          expect(result.success).toBe(true);
          expect(result.profile.profile_type).toBe(profile_type);
        }
      });
    });

    describe('Invalid Input Tests', () => {
      test('should reject missing required fields', async () => {
        const requiredFields = ['org_name', 'profile_name', 'industry', 'size'];

        for (const field of requiredFields) {
          const profileData = {
            org_name: 'Test Org',
            profile_name: 'Test Profile',
            industry: 'Technology',
            size: 'medium'
          };
          
          delete (profileData as any)[field];

          const result = await createProfile.execute(profileData, testDb);
          testUtils.assertErrorResponse(result, field);
        }
      });

      test('should reject invalid enum values', async () => {
        const invalidCases = [
          { field: 'industry', value: invalidInputs.invalidEnum },
          { field: 'size', value: invalidInputs.invalidEnum },
          { field: 'profile_type', value: invalidInputs.invalidEnum },
          { field: 'current_tier', value: invalidInputs.invalidEnum },
          { field: 'target_tier', value: invalidInputs.invalidEnum }
        ];

        for (const { field, value } of invalidCases) {
          const profileData = {
            org_name: 'Test Org',
            profile_name: 'Test Profile',
            industry: 'Technology',
            size: 'medium',
            [field]: value
          };

          const result = await createProfile.execute(profileData, testDb);
          testUtils.assertErrorResponse(result);
        }
      });

      test('should reject malicious input', async () => {
        const maliciousInputs = [
          { field: 'org_name', value: invalidInputs.sqlInjection },
          { field: 'profile_name', value: invalidInputs.xssAttempt },
          { field: 'description', value: invalidInputs.pathTraversal }
        ];

        for (const { field, value } of maliciousInputs) {
          const profileData = {
            org_name: 'Test Org',
            profile_name: 'Test Profile',
            industry: 'Technology',
            size: 'medium',
            [field]: value
          };

          const result = await createProfile.execute(profileData, testDb);
          // Should either sanitize or reject
          if (result.success) {
            expect(result.profile[field]).not.toBe(value);
          } else {
            testUtils.assertErrorResponse(result);
          }
        }
      });

      test('should reject oversized strings', async () => {
        const profileData = {
          org_name: invalidInputs.oversizedString,
          profile_name: 'Test Profile',
          industry: 'Technology',
          size: 'medium'
        };

        const result = await createProfile.execute(profileData, testDb);
        testUtils.assertErrorResponse(result);
      });

      test('should handle null and undefined values', async () => {
        const profileData = {
          org_name: null,
          profile_name: undefined,
          industry: 'Technology',
          size: 'medium'
        };

        const result = await createProfile.execute(profileData as any, testDb);
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Database Transaction Tests', () => {
      test('should rollback on organization creation failure', async () => {
        // Mock a scenario where profile creation might fail
        const profileData = {
          org_name: 'Test Org',
          profile_name: 'Test Profile',
          industry: 'Technology',
          size: 'medium'
        };

        // First create should succeed
        const result1 = await createProfile.execute(profileData, testDb);
        expect(result1.success).toBe(true);

        // Count records before second attempt
        const orgCountBefore = testDb.db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
        const profileCountBefore = testDb.db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;

        // Try to create with same name (might fail depending on constraints)
        const result2 = await createProfile.execute(profileData, testDb);
        
        const orgCountAfter = testDb.db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
        const profileCountAfter = testDb.db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;

        if (!result2.success) {
          // If failed, counts should remain the same (transaction rolled back)
          expect(orgCountAfter).toBe(orgCountBefore);
          expect(profileCountAfter).toBe(profileCountBefore);
        }
      });
    });

    describe('Performance Tests', () => {
      test('should create profile within performance threshold', async () => {
        const profileData = {
          org_name: 'Performance Test Org',
          profile_name: 'Performance Test Profile',
          industry: 'Technology',
          size: 'medium'
        };

        const { duration } = await performanceUtils.measureTime(async () => {
          await createProfile.execute(profileData, testDb);
        });

        expect(duration).toBeLessThan(500); // Should complete within 500ms
      });

      test('should handle concurrent profile creation', async () => {
        const promises = Array.from({ length: 5 }, (_, i) => {
          const profileData = {
            org_name: `Concurrent Org ${i}`,
            profile_name: `Concurrent Profile ${i}`,
            industry: 'Technology',
            size: 'medium'
          };
          return createProfile.execute(profileData, testDb);
        });

        const results = await Promise.all(promises);
        
        results.forEach((result, i) => {
          expect(result.success).toBe(true);
          expect(result.profile.profile_name).toBe(`Concurrent Profile ${i}`);
        });

        // Verify all profiles were created
        const profileCount = testDb.db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
        expect(profileCount).toBe(5);
      });
    });
  });

  describe('Clone Profile Tool', () => {
    let sourceProfile: any;

    beforeEach(async () => {
      // Create source profile for cloning tests
      sourceProfile = await testUtils.createTestProfile({
        profile_name: 'Source Profile',
        description: 'Profile to be cloned'
      });

      // Add some assessments to make cloning more meaningful
      await testUtils.createTestAssessments(sourceProfile.profile_id, 3);
    });

    describe('Valid Input Tests', () => {
      test('should clone profile with new name', async () => {
        const cloneData = {
          source_profile_id: sourceProfile.profile_id,
          new_profile_name: 'Cloned Profile',
          clone_assessments: true
        };

        const result = await cloneProfile.execute(cloneData, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          cloned_profile: expect.objectContaining({
            profile_id: expect.any(String),
            profile_name: 'Cloned Profile',
            org_id: sourceProfile.org_id
          }),
          assessments_cloned: expect.any(Number)
        });

        // Verify it's a different profile
        expect(result.cloned_profile.profile_id).not.toBe(sourceProfile.profile_id);
      });

      test('should clone profile without assessments', async () => {
        const cloneData = {
          source_profile_id: sourceProfile.profile_id,
          new_profile_name: 'Profile Without Assessments',
          clone_assessments: false
        };

        const result = await cloneProfile.execute(cloneData, testDb);

        expect(result.success).toBe(true);
        expect(result.assessments_cloned).toBe(0);
      });

      test('should clone to different organization', async () => {
        // Create target organization
        const targetOrg = await testUtils.createTestProfile({
          profile_name: 'Target Profile'
        });

        const cloneData = {
          source_profile_id: sourceProfile.profile_id,
          new_profile_name: 'Cross-Org Clone',
          target_org_id: targetOrg.org_id,
          clone_assessments: true
        };

        const result = await cloneProfile.execute(cloneData, testDb);

        expect(result.success).toBe(true);
        expect(result.cloned_profile.org_id).toBe(targetOrg.org_id);
      });
    });

    describe('Invalid Input Tests', () => {
      test('should reject missing source_profile_id', async () => {
        const cloneData = {
          new_profile_name: 'Missing Source'
        };

        const result = await cloneProfile.execute(cloneData as any, testDb);
        testUtils.assertErrorResponse(result, 'source_profile_id');
      });

      test('should reject non-existent source profile', async () => {
        const cloneData = {
          source_profile_id: 'non-existent-profile',
          new_profile_name: 'Cannot Clone'
        };

        const result = await cloneProfile.execute(cloneData, testDb);
        testUtils.assertErrorResponse(result, 'not found');
      });

      test('should reject invalid new_profile_name', async () => {
        const cloneData = {
          source_profile_id: sourceProfile.profile_id,
          new_profile_name: invalidInputs.emptyString
        };

        const result = await cloneProfile.execute(cloneData, testDb);
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Data Integrity Tests', () => {
      test('should maintain referential integrity after cloning', async () => {
        const cloneData = {
          source_profile_id: sourceProfile.profile_id,
          new_profile_name: 'Integrity Test Clone',
          clone_assessments: true
        };

        const result = await cloneProfile.execute(cloneData, testDb);
        expect(result.success).toBe(true);

        // Verify assessments are properly linked
        const clonedAssessments = testDb.db.prepare(`
          SELECT * FROM assessments WHERE profile_id = ?
        `).all(result.cloned_profile.profile_id);

        expect(clonedAssessments.length).toBeGreaterThan(0);
        clonedAssessments.forEach((assessment: any) => {
          expect(assessment.profile_id).toBe(result.cloned_profile.profile_id);
        });
      });
    });
  });

  describe('Compare Profiles Tool', () => {
    let profiles: any[];

    beforeEach(async () => {
      // Create multiple profiles for comparison
      profiles = [];
      for (let i = 0; i < 3; i++) {
        const profile = await testUtils.createTestProfile({
          profile_name: `Profile ${i}`,
          description: `Test profile ${i}`
        });
        await testUtils.createTestAssessments(profile.profile_id, 3);
        profiles.push(profile);
      }
    });

    describe('Valid Input Tests', () => {
      test('should compare two profiles', async () => {
        const compareData = {
          profile_ids: [profiles[0].profile_id, profiles[1].profile_id]
        };

        const result = await compareProfilesTool.execute(compareData, testDb);

        testUtils.assertValidResponse(result, {
          success: true,
          comparison_report: expect.objectContaining({
            profiles: expect.arrayContaining([
              expect.objectContaining({
                profile_id: profiles[0].profile_id
              })
            ]),
            summary: expect.any(Object)
          })
        });
      });

      test('should compare multiple profiles', async () => {
        const compareData = {
          profile_ids: profiles.map(p => p.profile_id)
        };

        const result = await compareProfilesTool.execute(compareData, testDb);

        expect(result.success).toBe(true);
        expect(result.comparison_report.profiles.length).toBe(3);
      });

      test('should include detailed comparison metrics', async () => {
        const compareData = {
          profile_ids: [profiles[0].profile_id, profiles[1].profile_id],
          include_details: true
        };

        const result = await compareProfilesTool.execute(compareData, testDb);

        expect(result.success).toBe(true);
        expect(result.comparison_report).toHaveProperty('detailed_comparison');
      });
    });

    describe('Invalid Input Tests', () => {
      test('should reject empty profile_ids array', async () => {
        const compareData = { profile_ids: [] };
        const result = await compareProfilesTool.execute(compareData, testDb);
        testUtils.assertErrorResponse(result);
      });

      test('should reject single profile for comparison', async () => {
        const compareData = { profile_ids: [profiles[0].profile_id] };
        const result = await compareProfilesTool.execute(compareData, testDb);
        testUtils.assertErrorResponse(result);
      });

      test('should handle non-existent profile IDs', async () => {
        const compareData = {
          profile_ids: ['non-existent-1', 'non-existent-2']
        };
        const result = await compareProfilesTool.execute(compareData, testDb);
        testUtils.assertErrorResponse(result);
      });
    });

    describe('Performance Tests', () => {
      test('should handle comparison of profiles with many assessments', async () => {
        // Create profiles with more assessments
        const heavyProfiles = [];
        for (let i = 0; i < 2; i++) {
          const profile = await testUtils.createTestProfile({
            profile_name: `Heavy Profile ${i}`
          });
          await testUtils.createTestAssessments(profile.profile_id, 20);
          heavyProfiles.push(profile);
        }

        const compareData = {
          profile_ids: heavyProfiles.map(p => p.profile_id)
        };

        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await compareProfilesTool.execute(compareData, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      const mockDb = {
        prepare: () => ({ run: () => { throw new Error('Connection lost'); } })
      };

      const profileData = {
        org_name: 'Test Org',
        profile_name: 'Test Profile',
        industry: 'Technology',
        size: 'medium'
      };

      const result = await createProfile.execute(profileData, mockDb as any);
      testUtils.assertErrorResponse(result);
    });

    test('should handle unicode characters in names', async () => {
      const profileData = {
        org_name: 'Tëst Órganizatiön 测试',
        profile_name: 'Tëst Pröfile 프로필',
        industry: 'Technology',
        size: 'medium'
      };

      const result = await createProfile.execute(profileData, testDb);
      expect(result.success).toBe(true);
      expect(result.organization.org_name).toBe(profileData.org_name);
      expect(result.profile.profile_name).toBe(profileData.profile_name);
    });

    test('should handle very long but valid names', async () => {
      const profileData = {
        org_name: 'A'.repeat(200), // Long but reasonable name
        profile_name: 'B'.repeat(200),
        industry: 'Technology',
        size: 'medium'
      };

      const result = await createProfile.execute(profileData, testDb);
      // Should either succeed or fail consistently with validation
      if (result.success) {
        expect(result.organization.org_name).toBe(profileData.org_name);
      } else {
        testUtils.assertErrorResponse(result);
      }
    });
  });
});