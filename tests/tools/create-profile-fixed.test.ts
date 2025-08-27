/**
 * Fixed Create Profile Tool Test with Proper Database Mocking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock';

// Setup complete mocking environment
const toolHelper = setupCompleteToolMocking('create_profile');

describe('Create Profile Tool - Fixed', () => {
  beforeEach(() => {
    // Clear all mocks and setup test database
    jest.clearAllMocks();
    toolHelper.beforeEachSetup();
  });

  afterEach(() => {
    toolHelper.afterEachCleanup();
  });

  describe('Valid profile creation', () => {
    it('should create a basic profile', async () => {
      // Dynamic import after mocks are set up
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        profile_name: 'Test Profile',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.details.organization).toBeDefined();
        expect(result.details.profile).toBeDefined();
        expect(result.details.organization.org_name).toBe(params.org_name);
        expect(result.details.profile.profile_name).toBe(params.profile_name);

        // Verify in database
        const org = toolHelper.getDatabase().get(
          'SELECT * FROM organization_profiles WHERE org_id = ?',
          [result.org_id]
        );
        expect(org).toBeTruthy();
        expect(org.org_name).toBe(params.org_name);

        const profile = toolHelper.getDatabase().get(
          'SELECT * FROM profiles WHERE profile_id = ?',
          [result.profile_id]
        );
        expect(profile).toBeTruthy();
        expect(profile.profile_name).toBe(params.profile_name);
      }
    });

    it('should create profile with all optional fields', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Comprehensive Test Org',
        sector: 'Financial Services',
        size: 'large' as const,
        profile_type: 'target' as const,
        profile_name: 'Detailed Test Profile',
        description: 'A comprehensive test profile with all fields',
        current_tier: 'Tier2',
        target_tier: 'Tier4',
        created_by: 'test-admin@example.com'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.details.profile.profile_type).toBe(params.profile_type);
        expect(result.details.profile.description).toBe(params.description);
        expect(result.details.profile.created_by).toBe(params.created_by);
        expect(result.details.organization.industry).toBe(params.sector);
        expect(result.details.organization.size).toBe(params.size);
      }
    });

    it('should generate unique IDs', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params1 = {
        org_name: 'Test Org 1',
        sector: 'Technology',
        size: 'small' as const,
        profile_name: 'Test Profile 1'
      };

      const params2 = {
        org_name: 'Test Org 2',
        sector: 'Healthcare',
        size: 'medium' as const,
        profile_name: 'Test Profile 2'
      };

      const result1 = await createProfile(params1);
      const result2 = await createProfile(params2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.org_id).not.toBe(result2.org_id);
        expect(result1.profile_id).not.toBe(result2.profile_id);
      }
    });

    it('should set profile as active by default', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Active Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        profile_name: 'Active Test Profile'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.details.profile.is_active).toBe(1); // SQLite stores boolean as integer

        // Verify in database
        const profile = toolHelper.getDatabase().get(
          'SELECT * FROM profiles WHERE profile_id = ?',
          [result.profile_id]
        );
        expect(profile.is_active).toBe(1); // SQLite stores boolean as integer
      }
    });
  });

  describe('Invalid inputs', () => {
    it('should reject empty organization name', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: '',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = await createProfile(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid size value', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'invalid-size' as any
      };

      const result = await createProfile(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid profile type', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'invalid-type' as any
      };

      const result = await createProfile(params);
      expect(result.success).toBe(false);
    });
  });

  describe('Database transactions', () => {
    it('should create both organization and profile atomically', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const initialOrgCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM organization_profiles'
      )[0].count;

      const initialProfileCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM profiles'
      )[0].count;

      const params = {
        org_name: 'Atomic Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        profile_name: 'Atomic Test Profile'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);

      // Both organization and profile should be created
      const finalOrgCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM organization_profiles'
      )[0].count;

      const finalProfileCount = toolHelper.getDatabase().query(
        'SELECT COUNT(*) as count FROM profiles'
      )[0].count;

      expect(finalOrgCount).toBe(initialOrgCount + 1);
      expect(finalProfileCount).toBe(initialProfileCount + 1);
    });

    it('should maintain referential integrity', async () => {
      const { createProfile } = await import('../../src/tools/create_profile.js');

      const params = {
        org_name: 'Referential Test Org',
        sector: 'Technology',
        size: 'large' as const,
        profile_name: 'Referential Test Profile'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);

      if (result.success) {
        // Verify foreign key relationship
        const profile = toolHelper.getDatabase().get(`
          SELECT p.*, o.org_name 
          FROM profiles p 
          JOIN organization_profiles o ON p.org_id = o.org_id 
          WHERE p.profile_id = ?
        `, [result.data.profile.profile_id]);

        expect(profile).toBeTruthy();
        expect(profile.org_name).toBe(params.org_name);
        expect(profile.org_id).toBe(result.org_id);
      }
    });
  });
});