/**
 * Jest Test Setup
 * 
 * Global test configuration and utilities for comprehensive testing.
 */

import { beforeAll, afterAll } from '@jest/globals';

// Setup test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'warn';
  
  // Suppress console output in tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
  }
});

// Cleanup after all tests
afterAll(() => {
  // Restore console if mocked
  if (!process.env.DEBUG_TESTS) {
    (console.log as jest.Mock).mockRestore?.();
    (console.info as jest.Mock).mockRestore?.();
    (console.warn as jest.Mock).mockRestore?.();
  }
});

// Increase timeout for integration tests
jest.setTimeout(30000);