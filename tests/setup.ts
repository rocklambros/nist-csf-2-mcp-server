/**
 * Global test setup and configuration
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { CSFDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'test.db');

// Global test database instance
export let testDb: CSFDatabase;

// Setup test environment
beforeAll(async () => {
  // Silence logger during tests
  logger.silent = true;
  
  // Create test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  testDb = new CSFDatabase(TEST_DB_PATH);
  
  // Initialize with test data if needed
  await initializeTestData();
});

// Clean up after all tests
afterAll(async () => {
  if (testDb) {
    testDb.close();
  }
  
  // Clean up test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Clean up between tests
beforeEach(() => {
  // Clear any test-specific data
  if (testDb) {
    // Clean up test data between tests
    cleanTestData();
  }
});

afterEach(() => {
  // Reset any global state
});

/**
 * Initialize test data
 */
async function initializeTestData(): Promise<void> {
  // Add framework data
  const functions = [
    { id: 'GV', name: 'GOVERN', description: 'Establish and monitor cybersecurity governance' },
    { id: 'ID', name: 'IDENTIFY', description: 'Identify assets and risks' },
    { id: 'PR', name: 'PROTECT', description: 'Implement safeguards' },
    { id: 'DE', name: 'DETECT', description: 'Implement detection activities' },
    { id: 'RS', name: 'RESPOND', description: 'Implement response activities' },
    { id: 'RC', name: 'RECOVER', description: 'Implement recovery activities' }
  ];

  const categories = [
    { id: 'GV.OC', function_id: 'GV', name: 'Organizational Context', description: 'The organization\'s context is understood' },
    { id: 'ID.AM', function_id: 'ID', name: 'Asset Management', description: 'Assets are managed consistent with priorities' }
  ];

  const subcategories = [
    {
      id: 'GV.OC-01',
      category_id: 'GV.OC',
      name: 'Organizational mission understood',
      description: 'The organizational mission is understood and informs cybersecurity risk management'
    },
    {
      id: 'ID.AM-01',
      category_id: 'ID.AM',
      name: 'Physical devices and systems are inventoried',
      description: 'Physical devices and systems within the organization are inventoried'
    }
  ];

  try {
    // Insert framework data
    for (const func of functions) {
      testDb.prepare(`
        INSERT OR REPLACE INTO functions (id, name, description)
        VALUES (?, ?, ?)
      `).run(func.id, func.name, func.description);
    }

    for (const category of categories) {
      testDb.prepare(`
        INSERT OR REPLACE INTO categories (id, function_id, name, description)
        VALUES (?, ?, ?, ?)
      `).run(category.id, category.function_id, category.name, category.description);
    }

    for (const subcategory of subcategories) {
      testDb.prepare(`
        INSERT OR REPLACE INTO subcategories (id, category_id, name, description)
        VALUES (?, ?, ?, ?)
      `).run(subcategory.id, subcategory.category_id, subcategory.name, subcategory.description);
    }
  } catch (error) {
    console.error('Failed to initialize test data:', error);
  }
}

/**
 * Clean test data between tests
 */
function cleanTestData(): void {
  const tablesToClean = [
    'organization_profiles',
    'profiles', 
    'assessments',
    'progress_tracking',
    'progress_milestones',
    'audit_evidence',
    'implementation_plans',
    'gap_analysis',
    'risk_assessments'
  ];

  try {
    testDb.prepare('BEGIN TRANSACTION').run();
    
    for (const table of tablesToClean) {
      try {
        // Skip views as they can't be modified directly
        if (table === 'organizations') continue;
        testDb.prepare(`DELETE FROM ${table}`).run();
      } catch (error) {
        // Table might not exist, continue
      }
    }
    
    testDb.prepare('COMMIT').run();
  } catch (error) {
    testDb.prepare('ROLLBACK').run();
    console.error('Failed to clean test data:', error);
  }
}

// Test utilities
export const testUtils = {
  /**
   * Create a test profile with organization
   */
  async createTestProfile(overrides: Partial<any> = {}): Promise<any> {
    const orgId = `test-org-${Date.now()}`;
    const profileId = `test-profile-${Date.now()}`;

    // Create organization
    testDb.prepare(`
      INSERT INTO organization_profiles (org_id, org_name, industry, size, current_tier, target_tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(orgId, 'Test Organization', 'Technology', 'medium', 'Tier1', 'Tier3');

    // Create profile
    const profileData = {
      profile_id: profileId,
      org_id: orgId,
      profile_name: 'Test Profile',
      profile_type: 'current',
      description: 'Test profile for unit testing',
      created_by: 'test-user',
      is_active: true,
      ...overrides
    };

    testDb.prepare(`
      INSERT INTO profiles (profile_id, org_id, profile_name, profile_type, description, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      profileData.profile_id,
      profileData.org_id,
      profileData.profile_name,
      profileData.profile_type,
      profileData.description,
      profileData.created_by,
      profileData.is_active ? 1 : 0
    );

    return profileData;
  },

  /**
   * Create test assessments
   */
  async createTestAssessments(profileId: string, count: number = 5): Promise<any[]> {
    const subcategories = ['GV.OC-01', 'ID.AM-01'];
    const levels = ['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented'];
    const assessments = [];

    for (let i = 0; i < count; i++) {
      const assessment = {
        profile_id: profileId,
        subcategory_id: subcategories[i % subcategories.length],
        implementation_level: levels[i % levels.length],
        maturity_score: (i % 4) + 1,
        notes: `Test assessment ${i}`,
        assessed_by: 'test-user'
      };

      testDb.prepare(`
        INSERT INTO assessments (profile_id, subcategory_id, implementation_level, maturity_score, notes, assessed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        assessment.profile_id,
        assessment.subcategory_id,
        assessment.implementation_level,
        assessment.maturity_score,
        assessment.notes,
        assessment.assessed_by
      );

      assessments.push(assessment);
    }

    return assessments;
  },

  /**
   * Assert response format
   */
  assertValidResponse(response: any, expectedSchema: any): void {
    expect(response).toBeDefined();
    expect(response).toMatchObject(expectedSchema);
  },

  /**
   * Assert error response format
   */
  assertErrorResponse(response: any, expectedMessage?: string): void {
    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.message).toBeDefined();
    
    if (expectedMessage) {
      expect(response.message).toContain(expectedMessage);
    }
  }
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  /**
   * Measure execution time
   */
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },

  /**
   * Run performance benchmark
   */
  async benchmark(name: string, fn: () => Promise<void>, iterations: number = 100): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { duration } = await performanceUtils.measureTime(fn);
      times.push(duration);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime
    };
  }
};