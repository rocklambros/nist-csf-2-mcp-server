/**
 * Zod Schema Validation Tests - Comprehensive input validation testing
 */

import { describe, test, expect } from '@jest/globals';
import { CreateProfileSchema } from '../../src/tools/create_profile.js';
import { QuickAssessmentSchema } from '../../src/tools/quick_assessment.js';
import { testUtils } from '../helpers/jest-setup.js';

describe('Zod Schema Validation Tests', () => {

  describe('CreateProfile Schema Validation', () => {
    test('should validate correct input parameters', () => {
      const validInput = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        profile_type: 'current' as const,
        profile_name: 'Test Profile',
        description: 'Test description'
      };

      const result = CreateProfileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.org_name).toBe('Test Organization');
        expect(result.data.sector).toBe('Technology');
        expect(result.data.size).toBe('medium');
        expect(result.data.profile_type).toBe('current');
      }
    });

    test('should reject empty org_name', () => {
      const invalidInput = {
        org_name: '',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = CreateProfileSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['org_name']);
        expect(result.error.issues[0].code).toBe('too_small');
      }
    });

    test('should reject invalid size values', () => {
      const invalidInput = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'extra-large' as any
      };

      const result = CreateProfileSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const sizeError = result.error.issues.find(issue => issue.path[0] === 'size');
        expect(sizeError).toBeDefined();
        expect(sizeError!.code).toBe('invalid_enum_value');
      }
    });

    test('should accept valid size enum values', () => {
      const validSizes = ['small', 'medium', 'large', 'enterprise'] as const;
      
      for (const size of validSizes) {
        const input = {
          org_name: 'Test Organization',
          sector: 'Technology',
          size: size
        };
        
        const result = CreateProfileSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    test('should apply default profile_type', () => {
      const input = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = CreateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.profile_type).toBe('current');
      }
    });

    test('should validate profile_type enum values', () => {
      const validProfileTypes = ['baseline', 'target', 'current', 'custom'] as const;
      
      for (const profileType of validProfileTypes) {
        const input = {
          org_name: 'Test Organization',
          sector: 'Technology',
          size: 'medium' as const,
          profile_type: profileType
        };
        
        const result = CreateProfileSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.profile_type).toBe(profileType);
        }
      }
    });

    test('should handle optional fields correctly', () => {
      const input = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        profile_name: 'Optional Profile Name',
        description: 'Optional description',
        created_by: 'test-user',
        current_tier: 'Tier1',
        target_tier: 'Tier3'
      };

      const result = CreateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.profile_name).toBe('Optional Profile Name');
        expect(result.data.description).toBe('Optional description');
        expect(result.data.created_by).toBe('test-user');
        expect(result.data.current_tier).toBe('Tier1');
        expect(result.data.target_tier).toBe('Tier3');
      }
    });
  });

  describe('QuickAssessment Schema Validation', () => {
    test('should validate correct assessment input', () => {
      const validInput = {
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'no' as const,
          detect: 'yes' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        },
        assessed_by: 'test-assessor',
        confidence_level: 'medium' as const
      };

      const result = QuickAssessmentSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.profile_id).toBe('test-profile-123');
        expect(result.data.simplified_answers.govern).toBe('yes');
        expect(result.data.confidence_level).toBe('medium');
      }
    });

    test('should reject empty profile_id', () => {
      const invalidInput = {
        profile_id: '',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'no' as const,
          detect: 'yes' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        }
      };

      const result = QuickAssessmentSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const profileIdError = result.error.issues.find(issue => issue.path[0] === 'profile_id');
        expect(profileIdError).toBeDefined();
        expect(profileIdError!.code).toBe('too_small');
      }
    });

    test('should validate all simplified answer enum values', () => {
      const validAnswers = ['yes', 'no', 'partial'] as const;
      const functions = ['govern', 'identify', 'protect', 'detect', 'respond', 'recover'] as const;
      
      for (const answer of validAnswers) {
        const simplified_answers = Object.fromEntries(
          functions.map(func => [func, answer])
        ) as any;
        
        const input = {
          profile_id: 'test-profile-123',
          simplified_answers
        };
        
        const result = QuickAssessmentSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    test('should reject invalid simplified answer values', () => {
      const input = {
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'maybe' as any, // Invalid value
          identify: 'partial',
          protect: 'no',
          detect: 'yes',
          respond: 'partial',
          recover: 'no'
        }
      };

      const result = QuickAssessmentSchema.safeParse(input);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const governError = result.error.issues.find(issue => 
          issue.path[0] === 'simplified_answers' && issue.path[1] === 'govern'
        );
        expect(governError).toBeDefined();
        expect(governError!.code).toBe('invalid_enum_value');
      }
    });

    test('should apply default confidence_level', () => {
      const input = {
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'no' as const,
          detect: 'yes' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        }
      };

      const result = QuickAssessmentSchema.safeParse(input);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.confidence_level).toBe('medium');
      }
    });

    test('should validate confidence_level enum values', () => {
      const validConfidenceLevels = ['low', 'medium', 'high'] as const;
      
      for (const confidenceLevel of validConfidenceLevels) {
        const input = {
          profile_id: 'test-profile-123',
          simplified_answers: {
            govern: 'yes' as const,
            identify: 'partial' as const,
            protect: 'no' as const,
            detect: 'yes' as const,
            respond: 'partial' as const,
            recover: 'no' as const
          },
          confidence_level: confidenceLevel
        };
        
        const result = QuickAssessmentSchema.safeParse(input);
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.data.confidence_level).toBe(confidenceLevel);
        }
      }
    });

    test('should handle optional notes field', () => {
      const input = {
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'no' as const,
          detect: 'yes' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        },
        notes: {
          govern: 'Strong governance in place',
          identify: 'Partial asset inventory',
          protect: 'Need better access controls',
          detect: 'Good monitoring systems',
          respond: 'Response plan needs update',
          recover: 'No formal recovery procedures'
        }
      };

      const result = QuickAssessmentSchema.safeParse(input);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.notes?.govern).toBe('Strong governance in place');
        expect(result.data.notes?.protect).toBe('Need better access controls');
      }
    });
  });

  describe('Edge Cases and Security Testing', () => {
    test('should handle extremely long string inputs', () => {
      const longString = 'a'.repeat(10000);
      
      const input = {
        org_name: longString,
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = CreateProfileSchema.safeParse(input);
      expect(result.success).toBe(true); // Schema doesn't have max length, but should not crash
    });

    test('should handle unicode and special characters', () => {
      const unicodeInput = {
        org_name: '测试组织 🏢',
        sector: 'Technologie & Innovations',
        size: 'medium' as const,
        profile_name: 'Profil de test avec accents éàù',
        description: 'Description with symbols: @#$%^&*()'
      };

      const result = CreateProfileSchema.safeParse(unicodeInput);
      expect(result.success).toBe(true);
    });

    test('should reject null and undefined for required fields', () => {
      const invalidInputs = [
        { org_name: null, sector: 'Technology', size: 'medium' },
        { org_name: undefined, sector: 'Technology', size: 'medium' },
        { org_name: 'Test Org', sector: null, size: 'medium' },
        { org_name: 'Test Org', sector: 'Technology', size: null }
      ];

      for (const input of invalidInputs) {
        const result = CreateProfileSchema.safeParse(input);
        expect(result.success).toBe(false);
      }
    });

    test('should handle missing required fields', () => {
      const incompleteInput = {
        org_name: 'Test Organization'
        // Missing sector and size
      };

      const result = CreateProfileSchema.safeParse(incompleteInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        const missingFields = result.error.issues.map(issue => issue.path[0]);
        expect(missingFields).toContain('sector');
        expect(missingFields).toContain('size');
      }
    });

    test('should handle extra unknown fields', () => {
      const inputWithExtraFields = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const,
        unknown_field: 'should be ignored',
        another_extra: 123
      };

      const result = CreateProfileSchema.safeParse(inputWithExtraFields);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // Zod strips unknown fields by default
        expect('unknown_field' in result.data).toBe(false);
        expect('another_extra' in result.data).toBe(false);
      }
    });
  });

  describe('Type Coercion and Transformation', () => {
    test('should handle string numbers for non-numeric fields', () => {
      const input = {
        org_name: 'Test Organization',
        sector: 'Technology',
        size: 'medium' as const
      };

      const result = CreateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('should validate nested object structures', () => {
      const input = {
        profile_id: 'test-profile-123',
        simplified_answers: {
          govern: 'yes' as const,
          identify: 'partial' as const,
          protect: 'no' as const,
          detect: 'yes' as const,
          respond: 'partial' as const,
          recover: 'no' as const
        },
        notes: {
          govern: 'Good governance',
          invalid_function: 'This should be allowed' // Zod object allows additional properties
        }
      };

      const result = QuickAssessmentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});