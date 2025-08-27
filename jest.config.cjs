/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
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
  // Simple module name mapping
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30000,
  // Transform configuration for CommonJS compatibility
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    }],
  },
  // Setup files for test environment
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/jest-setup.ts'],
  // Exclude problematic tests by default
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.comprehensive\\.test\\.ts$',
    '\\.backup$'
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