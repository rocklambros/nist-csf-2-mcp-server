/**
 * Database mocking utilities for tool tests
 * Provides proper database connection mocking patterns
 */

import { jest } from '@jest/globals';
import { TestDatabase } from './test-db';

// Global test database instance
let globalTestDb: TestDatabase | null = null;

/**
 * Initialize the global test database instance
 */
export function initializeTestDatabase(): TestDatabase {
  if (globalTestDb) {
    globalTestDb.close();
  }
  globalTestDb = new TestDatabase();
  return globalTestDb;
}

/**
 * Get the current test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!globalTestDb) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  return globalTestDb;
}

/**
 * Close and cleanup the test database
 */
export function closeTestDatabase(): void {
  if (globalTestDb) {
    globalTestDb.close();
    globalTestDb = null;
  }
}

/**
 * Mock the database module to use test database
 * Call this in your test files before importing tools
 */
export function mockDatabaseModule() {
  jest.mock('../../src/db/database.js', () => {
    const originalModule = jest.requireActual('../../src/db/database.js');
    return {
      ...originalModule,
      getDatabase: jest.fn(() => {
        const testDb = getTestDatabase();
        return testDb.createAppDatabase();
      }),
      // Mock CSFDatabase class methods if needed
      CSFDatabase: jest.fn().mockImplementation(() => {
        const testDb = getTestDatabase();
        return testDb.createAppDatabase();
      })
    };
  });
}

/**
 * Setup database mocking for a test suite
 * Use this in beforeEach/afterEach hooks
 */
export function setupDatabaseMocking() {
  let testDb: TestDatabase;

  const setup = () => {
    testDb = initializeTestDatabase();
    return testDb;
  };

  const cleanup = () => {
    if (testDb) {
      testDb.close();
    }
    closeTestDatabase();
  };

  return { setup, cleanup, getDb: () => testDb };
}

/**
 * Create a tool test helper with database mocking
 */
export function createToolTestHelper(toolName: string) {
  let testDb: TestDatabase;

  const beforeEachSetup = () => {
    testDb = initializeTestDatabase();
    
    // Load realistic test data
    const testData = testDb.loadRealisticTestData();
    return testData;
  };

  const afterEachCleanup = () => {
    if (testDb) {
      testDb.close();
    }
    closeTestDatabase();
  };

  const getDatabase = () => testDb;
  
  const getAppDatabase = () => testDb.createAppDatabase();

  return {
    beforeEachSetup,
    afterEachCleanup,
    getDatabase,
    getAppDatabase,
    toolName,
    // Add expected test methods
    resetDatabase: async () => {
      testDb = initializeTestDatabase();
      return testDb;
    },
    createTestOrganization: async () => {
      const testData = testDb.loadRealisticTestData();
      return testData.organizations[0];
    },
    createSampleAssessment: async () => {
      const testData = testDb.loadRealisticTestData();
      return testData.assessments[0];
    },
    createSampleReportData: async () => {
      const testData = testDb.loadRealisticTestData();
      return {
        profiles: testData.profiles,
        assessments: testData.assessments,
        organizations: testData.organizations
      };
    },
    cleanup: async () => {
      afterEachCleanup();
    }
  };
}

/**
 * Mock framework loader service for tool tests
 */
export function mockFrameworkLoader() {
  jest.mock('../../src/services/framework-loader.js', () => ({
    getFrameworkLoader: jest.fn(() => ({
      isLoaded: jest.fn(() => true),
      load: jest.fn(async () => Promise.resolve()),
      getElementById: jest.fn((id) => {
        const testDb = getTestDatabase();
        // Try subcategories first
        let result = testDb.get('SELECT * FROM subcategories WHERE id = ?', [id]);
        if (result) {
          return {
            element_identifier: result.id,
            element_type: 'subcategory',
            text: result.description,
            title: result.name
          };
        }
        
        // Try categories
        result = testDb.get('SELECT * FROM categories WHERE id = ?', [id]);
        if (result) {
          return {
            element_identifier: result.id,
            element_type: 'category',
            text: result.description,
            title: result.name
          };
        }
        
        // Try functions
        result = testDb.get('SELECT * FROM functions WHERE id = ?', [id]);
        if (result) {
          return {
            element_identifier: result.id,
            element_type: 'function',
            text: result.description,
            title: result.name
          };
        }
        
        return null;
      }),
      getElementsByType: jest.fn((type) => {
        const testDb = getTestDatabase();
        switch (type) {
          case 'function':
            return testDb.query('SELECT * FROM functions ORDER BY id').map(f => ({
              element_identifier: f.id,
              element_type: 'function',
              text: f.description,
              title: f.name
            }));
          case 'category':
            return testDb.query('SELECT * FROM categories ORDER BY id').map(c => ({
              element_identifier: c.id,
              element_type: 'category',
              text: c.description,
              title: c.name
            }));
          case 'subcategory':
            return testDb.query('SELECT * FROM subcategories ORDER BY id').map(s => ({
              element_identifier: s.id,
              element_type: 'subcategory',
              text: s.description,
              title: s.name
            }));
          default:
            return [];
        }
      }),
      getImplementationExamples: jest.fn((subcategoryId) => {
        const testDb = getTestDatabase();
        return testDb.query(
          'SELECT * FROM implementation_examples WHERE subcategory_id = ?',
          [subcategoryId]
        );
      }),
      getSubcategoriesForCategory: jest.fn((categoryId) => {
        const testDb = getTestDatabase();
        return testDb.query(
          'SELECT * FROM subcategories WHERE category_id = ?',
          [categoryId]
        );
      })
    }))
  }));
}

/**
 * Mock logger to prevent console output during tests
 */
export function mockLogger() {
  jest.mock('../../src/utils/logger.js', () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
  }));

  jest.mock('../../src/utils/enhanced-logger.js', () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
  }));
}

/**
 * Setup complete mocking environment for tool tests
 */
export function setupCompleteToolMocking(toolName: string) {
  // Mock all dependencies
  mockDatabaseModule();
  mockFrameworkLoader();
  mockLogger();
  
  // Create tool-specific helper
  const toolHelper = createToolTestHelper(toolName);
  
  return toolHelper;
}