/**
 * Comprehensive tests for Create Profile tool - Organization and profile management
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { getDatabase, closeDatabase } from '../../src/db/database.js';

describe('Create Profile Tool', () => {
  let db: any;

  beforeAll(() => {
    // Use test database path if available
    const testDbPath = process.env.TEST_DB_PATH || ':memory:';
    db = getDatabase(testDbPath);
  }, 30000);

  afterAll(() => {
    try {
      closeDatabase();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Clean up test data before each test
    try {
      db.prepare('DELETE FROM profiles WHERE profile_name LIKE ?').run('%test%');
      db.prepare('DELETE FROM organization_profiles WHERE org_name LIKE ?').run('%test%');
    } catch (error) {
      // Tables might not exist yet, ignore
    }
  });

  describe('Basic Profile Creation', () => {
    test('should create a profile successfully with required fields', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'current' as const,
        description: 'Test profile for validation',
        created_by: 'test-user'
      };

      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.profile_id).toBeDefined();
      expect(result.organization_id).toBeDefined();
      expect(result.message).toContain('successfully');
    });

    test('should create profile with all organization sizes', async () => {
      const sizes = ['small', 'medium', 'large', 'enterprise'] as const;
      
      for (const size of sizes) {
        const params = {
          org_name: `Test Org ${size}`,
          sector: 'Technology',
          size: size,
          profile_type: 'current' as const
        };

        const result = await createProfile(params);
        expect(result.success).toBe(true);
        expect(result.profile_id).toBeDefined();
      }
    });

    test('should create profile with all profile types', async () => {
      const profileTypes = ['baseline', 'target', 'current', 'custom'] as const;
      
      for (const profileType of profileTypes) {
        const params = {
          org_name: `Test Org ${profileType}`,
          sector: 'Technology', 
          size: 'medium' as const,
          profile_type: profileType
        };

        const result = await createProfile(params);
        expect(result.success).toBe(true);
        expect(result.profile_id).toBeDefined();
      }
    });
  });

  describe('Input Validation', () => {
    test('should reject missing required org_name', async () => {
      const params = {
        sector: 'Technology',
        size: 'medium' as const
      };

      await expect(createProfile(params as any)).rejects.toThrow();
    });

    test('should reject missing required sector', async () => {
      const params = {
        org_name: 'Test Organization',
        size: 'medium' as const
      };

      await expect(createProfile(params as any)).rejects.toThrow();
    });

    test('should reject missing required size', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology'
      };

      await expect(createProfile(params as any)).rejects.toThrow();
    });

    test('should reject invalid organization size', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology', 
        size: 'invalid_size' as any,
        profile_type: 'current' as const
      };

      await expect(createProfile(params)).rejects.toThrow();
    });

    test('should reject invalid profile type', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'invalid_type' as any
      };

      await expect(createProfile(params)).rejects.toThrow();
    });
  });

  describe('Organization Management', () => {
    test('should create new organization when it does not exist', async () => {
      const params = {
        org_name: 'New Test Organization',
        sector: 'Healthcare',
        size: 'large' as const,
        profile_type: 'baseline' as const
      };

      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.organization_id).toBeDefined();
      expect(result.organization_created).toBe(true);
    });

    test('should reuse existing organization when it exists', async () => {
      const params = {
        org_name: 'Existing Test Org',
        sector: 'Financial Services',
        size: 'enterprise' as const,
        profile_type: 'target' as const
      };

      // Create first profile
      const result1 = await createProfile(params);
      expect(result1.success).toBe(true);

      // Create second profile for same organization  
      const result2 = await createProfile({
        ...params,
        profile_type: 'current' as const
      });

      expect(result2.success).toBe(true);
      expect(result2.organization_id).toBe(result1.organization_id);
      expect(result2.organization_created).toBe(false);
    });
  });

  describe('Profile Metadata', () => {
    test('should handle optional profile metadata correctly', async () => {
      const params = {
        org_name: 'Metadata Test Org',
        sector: 'Manufacturing',
        size: 'medium' as const,
        profile_name: 'Custom Profile Name',
        description: 'Detailed profile description for testing',
        created_by: 'integration-test-suite',
        current_tier: 'Tier 2 - Risk Informed',
        target_tier: 'Tier 4 - Adaptive'
      };

      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.profile_name).toBe(params.profile_name);
      expect(result.details).toBeDefined();
      expect(result.details.created_by).toBe(params.created_by);
    });

    test('should generate profile name when not provided', async () => {
      const params = {
        org_name: 'Auto Name Test Org',
        sector: 'Government',
        size: 'small' as const
      };

      const result = await createProfile(params);
      
      expect(result.success).toBe(true);
      expect(result.profile_name).toBeDefined();
      expect(result.profile_name.length).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    test('should persist profile data correctly', async () => {
      const params = {
        org_name: 'Database Test Org',
        sector: 'Retail',
        size: 'medium' as const,
        profile_type: 'current' as const
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);

      // Verify data was persisted
      const profile = db.getProfile(result.profile_id);
      expect(profile).toBeDefined();
      expect(profile.profile_name).toBeDefined();
      
      const organization = db.getOrganization(result.organization_id);
      expect(organization).toBeDefined();
      expect(organization.org_name).toBe(params.org_name);
      expect(organization.industry).toBe(params.sector);
    });

    test('should maintain referential integrity', async () => {
      const params = {
        org_name: 'Integrity Test Org',
        sector: 'Energy',
        size: 'large' as const
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);

      // Verify foreign key relationships
      const profile = db.getProfile(result.profile_id);
      const organization = db.getOrganization(profile.org_id);
      
      expect(organization).toBeDefined();
      expect(organization.org_id).toBe(profile.org_id);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in organization name', async () => {
      const params = {
        org_name: 'Test Org & Company (Ñiño) - Special!',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);
    });

    test('should handle very long input strings', async () => {
      const params = {
        org_name: 'Test Organization'.repeat(10), // Long name
        sector: 'Technology',
        size: 'medium' as const,
        description: 'Very long description that tests the database field limits and ensures proper handling of extended content in the assessment system'.repeat(5)
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);
    });

    test('should generate unique profile IDs for concurrent requests', async () => {
      const params = {
        org_name: 'Concurrent Test Org',
        sector: 'Technology',
        size: 'medium' as const
      };

      const promises = Array.from({ length: 5 }, () => createProfile(params));
      const results = await Promise.all(promises);

      const profileIds = results.map(r => r.profile_id);
      const uniqueIds = new Set(profileIds);
      
      expect(uniqueIds.size).toBe(5); // All IDs should be unique
    });
  });
});