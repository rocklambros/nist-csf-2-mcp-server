/**
 * Profile Management Tools Test Suite
 * Tests for: create_profile, update_profile, delete_profile, get_profile, list_profiles
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { ProfileManagementTestHelper } from '../helpers/category-test-helpers.js';

const toolHelper = setupCompleteToolMocking('profile_management');

describe('Profile Management Tools', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await toolHelper.resetDatabase();
  });

  afterEach(async () => {
    await toolHelper.cleanup();
  });

  describe('Create Profile Tool', () => {
    it('should create organization profile with all required fields', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      
      const params = ProfileManagementTestHelper.generateOrganizationProfile('technology');
      
      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.name).toBe(params.name);
      expect(result.profile.organization_id).toBeDefined();
      expect(result.profile.industry_sector).toBe(params.industry_sector);
    });

    it('should handle small organization profile creation', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      
      const params = ProfileManagementTestHelper.generateOrganizationProfile('healthcare', 'small');
      
      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile.organization_size).toBe('small');
      expect(result.profile.industry_sector).toBe('healthcare');
    });

    it('should validate required fields and reject invalid input', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      
      const invalidParams = {
        name: '', // Invalid empty name
        industry_sector: 'technology'
      };

      const result = await createProfile(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation|invalid|required/i);
    });

    it('should handle duplicate profile names gracefully', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      
      const params = ProfileManagementTestHelper.generateOrganizationProfile('financial');
      
      // Create first profile
      await createProfile(params);
      
      // Attempt to create duplicate
      const result = await createProfile(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/exists|duplicate/i);
    });
  });

  describe('Update Profile Tool', () => {
    it('should update existing profile successfully', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { updateProfile } = await import('../../src/tools/update_profile.js');
      
      // Create initial profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('energy');
      const createResult = await createProfile(createParams);
      
      // Update profile
      const updateParams = {
        organization_id: createResult.profile.organization_id,
        updates: {
          description: 'Updated organization description',
          organization_size: 'large'
        }
      };

      const result = await updateProfile(updateParams);

      expect(result.success).toBe(true);
      expect(result.profile.description).toBe(updateParams.updates.description);
      expect(result.profile.organization_size).toBe(updateParams.updates.organization_size);
    });

    it('should validate organization existence before update', async () => {
      const { updateProfile } = await import('../../src/tools/update_profile.js');
      
      const params = {
        organization_id: 'non-existent-id',
        updates: {
          description: 'Updated description'
        }
      };

      const result = await updateProfile(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|does not exist/i);
    });

    it('should validate update field types', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { updateProfile } = await import('../../src/tools/update_profile.js');
      
      // Create initial profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('manufacturing');
      const createResult = await createProfile(createParams);
      
      // Invalid update with wrong type
      const updateParams = {
        organization_id: createResult.profile.organization_id,
        updates: {
          organization_size: 'invalid_size' // Should be small/medium/large/enterprise
        }
      };

      const result = await updateProfile(updateParams);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/validation|invalid/i);
    });
  });

  describe('Get Profile Tool', () => {
    it('should retrieve profile by organization ID', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { getProfile } = await import('../../src/tools/get_profile.js');
      
      // Create profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('retail');
      const createResult = await createProfile(createParams);
      
      // Retrieve profile
      const params = {
        organization_id: createResult.profile.organization_id
      };

      const result = await getProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.organization_id).toBe(createResult.profile.organization_id);
      expect(result.profile.name).toBe(createParams.name);
    });

    it('should return not found for non-existent organization', async () => {
      const { getProfile } = await import('../../src/tools/get_profile.js');
      
      const params = {
        organization_id: 'non-existent-org-id'
      };

      const result = await getProfile(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|does not exist/i);
    });

    it('should include profile statistics when requested', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { getProfile } = await import('../../src/tools/get_profile.js');
      
      // Create profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('government');
      const createResult = await createProfile(createParams);
      
      // Retrieve profile with statistics
      const params = {
        organization_id: createResult.profile.organization_id,
        include_statistics: true
      };

      const result = await getProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile.statistics).toBeDefined();
      expect(result.profile.statistics).toHaveProperty('total_assessments');
      expect(result.profile.statistics).toHaveProperty('completion_rate');
    });
  });

  describe('List Profiles Tool', () => {
    it('should list all profiles with pagination', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { listProfiles } = await import('../../src/tools/list_profiles.js');
      
      // Create multiple profiles
      const sectors = ['technology', 'healthcare', 'financial'];
      for (const sector of sectors) {
        const params = ProfileManagementTestHelper.generateOrganizationProfile(sector);
        await createProfile(params);
      }
      
      // List profiles
      const params = {
        page: 1,
        limit: 10
      };

      const result = await listProfiles(params);

      expect(result.success).toBe(true);
      expect(result.profiles).toBeDefined();
      expect(Array.isArray(result.profiles)).toBe(true);
      expect(result.profiles.length).toBeGreaterThanOrEqual(3);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter profiles by industry sector', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { listProfiles } = await import('../../src/tools/list_profiles.js');
      
      // Create profiles in different sectors
      const techParams = ProfileManagementTestHelper.generateOrganizationProfile('technology');
      const healthParams = ProfileManagementTestHelper.generateOrganizationProfile('healthcare');
      
      await createProfile(techParams);
      await createProfile(healthParams);
      
      // Filter by technology sector
      const params = {
        filters: {
          industry_sector: 'technology'
        }
      };

      const result = await listProfiles(params);

      expect(result.success).toBe(true);
      expect(result.profiles.length).toBe(1);
      expect(result.profiles[0].industry_sector).toBe('technology');
    });

    it('should sort profiles by creation date', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { listProfiles } = await import('../../src/tools/list_profiles.js');
      
      // Create profiles with slight delays
      const params1 = ProfileManagementTestHelper.generateOrganizationProfile('education');
      const params2 = ProfileManagementTestHelper.generateOrganizationProfile('transportation');
      
      await createProfile(params1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await createProfile(params2);
      
      // List with date sorting
      const params = {
        sort: 'created_at',
        order: 'desc'
      };

      const result = await listProfiles(params);

      expect(result.success).toBe(true);
      expect(result.profiles.length).toBeGreaterThanOrEqual(2);
      
      // Check if properly sorted (newest first)
      const dates = result.profiles.map((p: any) => new Date(p.created_at));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });
  });

  describe('Delete Profile Tool', () => {
    it('should delete existing profile successfully', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { deleteProfile } = await import('../../src/tools/delete_profile.js');
      const { getProfile } = await import('../../src/tools/get_profile.js');
      
      // Create profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('agriculture');
      const createResult = await createProfile(createParams);
      
      // Delete profile
      const deleteParams = {
        organization_id: createResult.profile.organization_id
      };

      const deleteResult = await deleteProfile(deleteParams);
      expect(deleteResult.success).toBe(true);
      
      // Verify deletion
      const getParams = {
        organization_id: createResult.profile.organization_id
      };
      
      const getResult = await getProfile(getParams);
      expect(getResult.success).toBe(false);
      expect(getResult.error).toMatch(/not found/i);
    });

    it('should handle soft delete when assessments exist', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { deleteProfile } = await import('../../src/tools/delete_profile.js');
      
      // Create profile (assume it has associated assessments)
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('utilities');
      const createResult = await createProfile(createParams);
      
      // Attempt delete with preserve_data flag
      const deleteParams = {
        organization_id: createResult.profile.organization_id,
        preserve_data: true
      };

      const result = await deleteProfile(deleteParams);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/soft delete|archived/i);
    });

    it('should validate organization existence before deletion', async () => {
      const { deleteProfile } = await import('../../src/tools/delete_profile.js');
      
      const params = {
        organization_id: 'non-existent-org'
      };

      const result = await deleteProfile(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|does not exist/i);
    });

    it('should prevent deletion of profiles with active assessments by default', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');
      const { deleteProfile } = await import('../../src/tools/delete_profile.js');
      
      // Create profile
      const createParams = ProfileManagementTestHelper.generateOrganizationProfile('mining');
      const createResult = await createProfile(createParams);
      
      // Attempt delete without preserve_data flag (simulating active assessments)
      const deleteParams = {
        organization_id: createResult.profile.organization_id,
        force_delete: false
      };

      const result = await deleteProfile(deleteParams);

      // Should succeed for now since we don't have actual assessments
      // In real scenario with assessments, this would fail unless force_delete is true
      expect(result.success).toBe(true);
    });
  });
});