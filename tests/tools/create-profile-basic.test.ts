/**
 * Basic tests for Create Profile tool - Critical functionality validation
 */

import { createProfile } from '../../src/tools/create_profile.js';
import { getDatabase, closeDatabase } from '../../src/db/database.js';

describe('Create Profile Tool - Basic Tests', () => {
  let db: any;

  beforeAll(() => {
    db = getDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('Profile Creation', () => {
    test('should create a basic profile successfully', async () => {
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

    test('should handle missing required parameters', async () => {
      const params = {
        sector: 'Technology',
        size: 'medium' as const
      };

      await expect(createProfile(params as any)).rejects.toThrow();
    });

    test('should handle invalid organization size', async () => {
      const params = {
        org_name: 'Test Organization',
        sector: 'Technology', 
        size: 'invalid_size' as any,
        profile_type: 'current' as const
      };

      await expect(createProfile(params)).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    test('should validate organization size enum', async () => {
      const validSizes = ['small', 'medium', 'large', 'enterprise'];
      
      for (const size of validSizes) {
        const params = {
          org_name: `Test Org ${size}`,
          sector: 'Technology',
          size: size as any,
          profile_type: 'current' as const
        };

        const result = await createProfile(params);
        expect(result.success).toBe(true);
      }
    });
  });
});