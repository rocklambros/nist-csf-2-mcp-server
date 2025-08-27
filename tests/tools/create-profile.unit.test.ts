/**
 * Create Profile Tool - Unit Tests
 * Testing actual MCP tool implementation for coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createProfile, CreateProfileParams } from '../../src/tools/create_profile.js';
import { getDatabase } from '../../src/db/database.js';
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

// Mock the database
jest.mock('../../src/db/database.js');
jest.mock('../../src/services/framework-loader.js');
jest.mock('../../src/utils/logger.js');

// Get the mocked database function
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('Create Profile Tool - Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
  });

  describe('createProfile function', () => {
    it('should create new organization and profile successfully', async () => {
      const params: CreateProfileParams = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium',
        profile_type: 'current',
        description: 'Test organization profile'
      };

      // Mock transaction to execute callback
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      
      // Mock organization lookup (first call returns null, second returns created org)
      mockDb.getOrganization!.mockReturnValueOnce(null);
      mockDb.createOrganization!.mockReturnValue('org-test-organization-abcd');
      mockDb.getOrganization!.mockReturnValueOnce(testUtils.createMockOrganization({
        org_id: 'org-test-organization-abcd',
        org_name: 'Test Organization',
        industry: 'Technology',
        size: 'medium'
      }));
      
      // Mock profile creation
      mockDb.createProfile!.mockReturnValue('org-test-organization-abcd-current-xyz123');
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile({
        profile_id: 'org-test-organization-abcd-current-xyz123',
        org_id: 'org-test-organization-abcd',
        profile_name: 'Test Organization - Current Profile',
        profile_type: 'current'
      }));

      const result = await createProfile(params);

      testUtils.assertSuccessResponse(result, {
        success: true,
        message: expect.stringContaining('Successfully created current profile')
      });
      expect(result.profile_id).toMatch(/org-test-organization-.*-current-.*/);
      expect(result.org_id).toMatch(/org-test-organization-.*/);
      expect(result.details?.organization).toBeDefined();
      expect(result.details?.profile).toBeDefined();
      
      expect(mockDb.createOrganization).toHaveBeenCalledWith(expect.objectContaining({
        org_name: 'Test Organization',
        industry: 'Technology', 
        size: 'medium'
      }));
      expect(mockDb.createProfile).toHaveBeenCalledWith(expect.objectContaining({
        profile_type: 'current'
      }));
    });

    it('should create profile for existing organization', async () => {
      const params: CreateProfileParams = {
        org_name: 'Existing Organization',
        sector: 'Healthcare',
        size: 'large',
        profile_type: 'target'
      };

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.getOrganization.mockReturnValueOnce({
        org_id: 'org-existing-organization-1234',
        org_name: 'Existing Organization',
        industry: 'Healthcare',
        size: 'large'
      }).mockReturnValueOnce({
        org_id: 'org-existing-organization-1234',
        org_name: 'Existing Organization',
        industry: 'Healthcare',
        size: 'large'
      });
      mockDb.getProfile.mockReturnValue({
        profile_id: 'org-existing-organization-1234-target-abc789',
        org_id: 'org-existing-organization-1234',
        profile_name: 'Existing Organization - Target Profile',
        profile_type: 'target'
      });

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(mockDb.createOrganization).not.toHaveBeenCalled(); // Should not create org since it exists
      expect(mockDb.createProfile).toHaveBeenCalledWith(expect.objectContaining({
        profile_type: 'target'
      }));
    });

    it('should initialize baseline assessments for baseline profile type', async () => {
      const params: CreateProfileParams = {
        org_name: 'Baseline Org',
        sector: 'Financial',
        size: 'small',
        profile_type: 'baseline'
      };

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValueOnce({
        org_id: 'org-baseline-org-5678',
        org_name: 'Baseline Org'
      });
      mockDb.getProfile.mockReturnValue({
        profile_id: 'org-baseline-org-5678-baseline-def456',
        profile_type: 'baseline'
      });

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(mockDb.createBulkAssessments).toHaveBeenCalledWith(
        expect.stringMatching(/.*-baseline-.*/),
        expect.arrayContaining([
          expect.objectContaining({
            subcategory_id: expect.stringMatching(/^(GV|ID|PR|DE|RS|RC)\./),
            maturity_score: expect.any(Number),
            implementation_level: expect.stringMatching(/not_implemented|partially_implemented|largely_implemented|fully_implemented/)
          })
        ])
      );
    });

    it('should handle validation errors for invalid input', async () => {
      const params = {
        org_name: '', // Invalid empty name
        sector: 'Technology',
        size: 'invalid_size', // Invalid size
        profile_type: 'current'
      } as any;

      const result = await createProfile(params);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(mockDb.createOrganization).not.toHaveBeenCalled();
      expect(mockDb.createProfile).not.toHaveBeenCalled();
    });

    it('should handle database unique constraint errors', async () => {
      const params: CreateProfileParams = {
        org_name: 'Duplicate Org',
        sector: 'Technology',
        size: 'medium',
        profile_type: 'current'
      };

      const uniqueError = new Error('UNIQUE constraint failed: profiles.profile_id');
      mockDb.transaction.mockImplementation(() => {
        throw uniqueError;
      });

      const result = await createProfile(params);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Profile already exists');
    });

    it('should handle general database errors', async () => {
      const params: CreateProfileParams = {
        org_name: 'Error Org',
        sector: 'Technology',
        size: 'medium',
        profile_type: 'current'
      };

      mockDb.transaction.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await createProfile(params);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database connection failed');
    });

    it('should use default values correctly', async () => {
      const params: CreateProfileParams = {
        org_name: 'Default Test Org',
        sector: 'Education',
        size: 'enterprise'
        // profile_type not specified, should default to 'current'
      };

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValueOnce({
        org_id: 'org-default-test-org-9999',
        org_name: 'Default Test Org'
      });
      mockDb.getProfile.mockReturnValue({
        profile_id: 'org-default-test-org-9999-current-xyz789',
        profile_type: 'current'
      });

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(mockDb.createProfile).toHaveBeenCalledWith(expect.objectContaining({
        profile_type: 'current', // Should default to 'current'
        profile_name: expect.stringContaining('Current Profile'),
        description: expect.stringContaining('current security profile')
      }));
    });

    it('should generate proper organization and profile IDs', async () => {
      const params: CreateProfileParams = {
        org_name: 'Special!@#$%^&*()Chars Name',
        sector: 'Technology',
        size: 'medium',
        profile_type: 'custom'
      };

      mockDb.transaction.mockImplementation((callback: () => any) => callback());
      mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValueOnce({
        org_id: expect.stringMatching(/^org-special-chars-name-[a-z0-9]{4}$/),
      });
      mockDb.getProfile.mockReturnValue({
        profile_id: expect.stringMatching(/^org-special-chars-name-[a-z0-9]{4}-custom-[a-z0-9]+$/),
      });

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.org_id).toMatch(/^org-special-chars-name-[a-z0-9]{4}$/);
      expect(result.profile_id).toMatch(/^org-special-chars-name-[a-z0-9]{4}-custom-[a-z0-9]+$/);
    });

    it('should handle all organization sizes', async () => {
      const sizes: Array<'small' | 'medium' | 'large' | 'enterprise'> = ['small', 'medium', 'large', 'enterprise'];
      
      for (const size of sizes) {
        const params: CreateProfileParams = {
          org_name: `Test ${size} Org`,
          sector: 'Technology',
          size: size,
          profile_type: 'current'
        };

        mockDb.transaction.mockImplementation((callback: () => any) => callback());
        mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValueOnce({
          org_id: `org-test-${size}-org-1234`,
          size: size
        });
        mockDb.getProfile.mockReturnValue({
          profile_id: `org-test-${size}-org-1234-current-abc123`,
        });

        const result = await createProfile(params);

        expect(result.success).toBe(true);
        expect(mockDb.createOrganization).toHaveBeenCalledWith(expect.objectContaining({
          size: size
        }));
      }
    });

    it('should handle all profile types', async () => {
      const profileTypes: Array<'baseline' | 'target' | 'current' | 'custom'> = ['baseline', 'target', 'current', 'custom'];
      
      for (const profileType of profileTypes) {
        jest.clearAllMocks();
        
        const params: CreateProfileParams = {
          org_name: `Test ${profileType} Org`,
          sector: 'Technology',
          size: 'medium',
          profile_type: profileType
        };

        mockDb.transaction.mockImplementation((callback: () => any) => callback());
        mockDb.getOrganization.mockReturnValueOnce(null).mockReturnValueOnce({
          org_id: `org-test-${profileType}-org-5678`
        });
        mockDb.getProfile.mockReturnValue({
          profile_id: `org-test-${profileType}-org-5678-${profileType}-def789`,
          profile_type: profileType
        });

        const result = await createProfile(params);

        expect(result.success).toBe(true);
        expect(mockDb.createProfile).toHaveBeenCalledWith(expect.objectContaining({
          profile_type: profileType
        }));

        // Baseline profiles should initialize assessments
        if (profileType === 'baseline') {
          expect(mockDb.createBulkAssessments).toHaveBeenCalled();
        } else {
          expect(mockDb.createBulkAssessments).not.toHaveBeenCalled();
        }
      }
    });
  });
});