/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  // ES module compatible module name mapping
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(.*)/db/database\\.js$': '<rootDir>/src/db/database.ts',
    '^(.*)/db/database$': '<rootDir>/src/db/database.ts',
    '^(.*)/db/monitored-database\\.js$': '<rootDir>/src/db/monitored-database.ts', 
    '^(.*)/db/monitored-database$': '<rootDir>/src/db/monitored-database.ts',
    '^(.*)/services/framework-loader\\.js$': '<rootDir>/src/services/framework-loader.ts',
    '^(.*)/services/framework-loader$': '<rootDir>/src/services/framework-loader.ts',
  },
  testTimeout: 30000,
  // Transform configuration for ES module compatibility
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    }],
  },
  // Setup files for test environment
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/jest-setup.ts'],
  // Focus on core functionality tests for coverage
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.comprehensive\\.test\\.ts$',
    '\\.backup$',
    'tests/validation/transaction.validation.test.ts',
    'tests/tools/reporting-tools.test.ts', 
    'tests/performance/',
    'tests/simple-db.test.ts',
    'tests/tools/.*simple.*\\.test\\.ts$',
    'tests/tools/.*unit\\.test\\.ts$',
    'tests/security/',
    'tests/integration/',
    'tests/e2e/',
    'tests/services/',
    'tests/validation/'
  ],
  // Mock handling
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  // CI-specific configurations
  verbose: process.env.CI !== 'true',
  silent: process.env.CI === 'true',
  maxWorkers: process.env.CI === 'true' ? 2 : '50%',
};