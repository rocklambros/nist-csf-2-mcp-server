/**
 * Simplified Jest Setup - No complex mocking, real database with test isolation
 */

import * as fs from 'fs';
import * as path from 'path';
import { beforeEach, afterEach, afterAll, jest } from '@jest/globals';

// Test database configuration
const TEST_DB_PATH = path.join(process.cwd(), 'test-database.db');

// Global setup for all tests
beforeEach(() => {
  // Ensure clean test environment
  process.env.NODE_ENV = 'test';
  
  // Set test database path
  process.env.TEST_DB_PATH = TEST_DB_PATH;
  
  // Clean up any existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (error) {
      // Ignore if file doesn't exist or can't be deleted
    }
  }
});

afterEach(() => {
  // Cleanup test database after each test
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

// Global cleanup
afterAll(() => {
  // Final cleanup
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (error) {
      // Ignore final cleanup errors
    }
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);