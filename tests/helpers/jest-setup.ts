/**
 * Jest Setup File - Global test configuration and mocking
 */

import { jest } from '@jest/globals';
import type { CSFDatabase } from '../../src/db/database.js';

// Mock the database module at the top level
jest.mock('../../src/db/database.js');

// Mock the logger module to prevent console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    silent: true,
  }
}));

// Mock the framework loader module with proper structure
jest.mock('../../src/services/framework-loader.js', () => ({
  getFrameworkLoader: jest.fn(() => ({
    isLoaded: jest.fn(() => true),
    load: jest.fn(() => Promise.resolve()),
    getFunction: jest.fn(),
    getCategory: jest.fn(), 
    getSubcategory: jest.fn(),
    searchElements: jest.fn(),
    getRelatedSubcategories: jest.fn(),
    getAllFunctions: jest.fn(() => []),
    getAllCategories: jest.fn(() => []),
    getAllSubcategories: jest.fn(() => []),
    getFunctions: jest.fn(() => []),
    getElementsByType: jest.fn(() => []),
    getCategoriesForFunction: jest.fn(() => []),
    getImplementationExamples: jest.fn(() => []),
    getRelationships: jest.fn(() => []),
  })),
  FrameworkLoader: jest.fn()
}));

// Global database mock factory
export function createMockDatabase(): Partial<CSFDatabase> {
  return {
    transaction: jest.fn((fn: () => any) => {
      try {
        return fn();
      } catch (error) {
        throw error;
      }
    }),
    
    // Organization methods
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
    updateOrganization: jest.fn(),
    
    // Profile methods
    getProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    getProfilesByOrganization: jest.fn(),
    
    // Assessment methods
    createBulkAssessments: jest.fn(),
    getAssessments: jest.fn(),
    updateAssessment: jest.fn(),
    
    // Framework methods
    getFunction: jest.fn(),
    getCategory: jest.fn(),
    getSubcategory: jest.fn(),
    getAllSubcategories: jest.fn(),
    
    // Gap analysis methods
    createGapAnalysis: jest.fn(),
    getGapAnalysis: jest.fn(),
    
    // Risk assessment methods
    calculateRiskScore: jest.fn(),
    getRiskAssessment: jest.fn(),
    
    // Implementation plan methods
    createImplementationPlan: jest.fn(),
    getImplementationPlan: jest.fn(),
    
    // Progress tracking methods
    updateProgressTracking: jest.fn(),
    getProgressTracking: jest.fn(),
    
    // Evidence methods
    addEvidence: jest.fn(),
    getEvidence: jest.fn(),
    
    // Report methods
    generateReport: jest.fn(),
    
    // Utility methods
    close: jest.fn(),
    backup: jest.fn(),
  };
}

// Global test utilities
export const testUtils = {
  /**
   * Create mock organization data
   */
  createMockOrganization: (overrides: any = {}) => ({
    org_id: 'test-org-123',
    org_name: 'Test Organization',
    industry: 'Technology',
    size: 'medium',
    current_tier: 'Tier1',
    target_tier: 'Tier3',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock profile data
   */
  createMockProfile: (overrides: any = {}) => ({
    profile_id: 'test-profile-123',
    org_id: 'test-org-123',
    profile_name: 'Test Profile',
    profile_type: 'current',
    description: 'Test profile for unit testing',
    created_by: 'test-user',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock assessment data
   */
  createMockAssessment: (overrides: any = {}) => ({
    profile_id: 'test-profile-123',
    subcategory_id: 'GV.OC-01',
    implementation_level: 2,
    maturity_score: 3,
    confidence_level: 'medium',
    notes: 'Test assessment',
    assessed_by: 'test-user',
    assessed_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create mock framework element
   */
  createMockFrameworkElement: (type: 'function' | 'category' | 'subcategory', overrides: any = {}) => {
    const base = {
      function: {
        element_identifier: 'GV',
        title: 'GOVERN',
        text: 'Establish and monitor cybersecurity governance',
        element_type: 'function',
        ...overrides
      },
      category: {
        element_identifier: 'GV.OC',
        title: 'Organizational Context',
        text: 'The organizational context is understood',
        element_type: 'category',
        parent_id: 'GV',
        ...overrides
      },
      subcategory: {
        element_identifier: 'GV.OC-01',
        title: 'Organizational mission understood',
        text: 'The organizational mission is understood and informs cybersecurity risk management',
        element_type: 'subcategory',
        parent_id: 'GV.OC',
        ...overrides
      }
    };
    return base[type];
  },

  /**
   * Assert success response format
   */
  assertSuccessResponse: (response: any, expectedData?: any) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    if (expectedData) {
      expect(response).toMatchObject(expectedData);
    }
  },

  /**
   * Assert error response format
   */
  assertErrorResponse: (response: any, expectedMessage?: string) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    
    if (expectedMessage) {
      expect(response.error).toContain(expectedMessage);
    }
  }
};

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.resetAllMocks();
});

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in test:', reason);
});

export default {};