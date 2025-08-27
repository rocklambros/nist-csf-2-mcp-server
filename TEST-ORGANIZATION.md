# Test Organization and Execution Guide

This document describes the comprehensive test organization system for the NIST CSF 2.0 MCP Server.

## Test Categories and Structure

### 📋 Test Types

#### 1. Unit Tests (`*.unit.test.ts`)
- **Purpose**: Test individual functions, classes, and modules in isolation
- **Location**: `tests/**/*.unit.test.ts`
- **Command**: `npm run test:unit`
- **Characteristics**: 
  - Fast execution (< 100ms per test)
  - Mock all external dependencies
  - High code coverage target (90%+)
  - No database or network calls

#### 2. Integration Tests (`tests/integration/`, `tests/validation/`)
- **Purpose**: Test component interactions and database operations
- **Location**: `tests/integration/**/*.test.ts`, `tests/validation/**/*.test.ts`
- **Command**: `npm run test:integration`
- **Characteristics**:
  - Test database interactions
  - Validate business logic workflows
  - Transaction and data consistency testing
  - Medium execution time (< 5s per test)

#### 3. End-to-End Tests (`tests/e2e/`)
- **Purpose**: Test complete user workflows and system behavior
- **Location**: `tests/e2e/**/*.test.ts`
- **Command**: `npm run test:e2e`
- **Characteristics**:
  - Full system integration
  - Real database operations
  - Complete workflow validation
  - Longer execution time (< 30s per test)

#### 4. Security Tests (`tests/security/`)
- **Purpose**: Validate security controls and vulnerability protection
- **Location**: `tests/security/**/*.test.ts`
- **Command**: `npm run test:security`
- **Characteristics**:
  - Authentication and authorization testing
  - Input validation and injection protection
  - Rate limiting and abuse prevention
  - Security configuration validation

#### 5. Performance Tests (`tests/performance/`)
- **Purpose**: Validate system performance and scalability
- **Location**: `tests/performance/**/*.test.ts`
- **Command**: `npm run test:performance`
- **Characteristics**:
  - Load testing and benchmarking
  - Memory and CPU usage validation
  - Response time measurement
  - Scalability testing

## 🚀 Test Execution Commands

### Individual Test Categories
```bash
# Unit tests - fastest, run frequently during development
npm run test:unit

# Integration tests - database and component integration
npm run test:integration  

# End-to-end tests - complete workflow validation
npm run test:e2e

# Security tests - authentication and vulnerability testing
npm run test:security

# Performance tests - benchmarking and load testing
npm run test:performance

# Tool-specific tests
npm run test:tools

# Service layer tests
npm run test:services
```

### Combined Test Execution
```bash
# Run all test categories sequentially
npm run test:all

# Continuous Integration mode
npm run test:ci

# Watch mode for development
npm run test:watch

# Generate comprehensive coverage report
npm run test:coverage

# Default test command
npm test
```

## 📊 Test Configuration

### Jest Configuration Features

#### Project-Based Organization
The Jest configuration uses projects to categorize tests:

```javascript
projects: [
  {
    displayName: 'unit',
    testMatch: ['<rootDir>/tests/**/*.unit.test.ts']
  },
  {
    displayName: 'integration', 
    testMatch: ['<rootDir>/tests/integration/**/*.test.ts']
  },
  {
    displayName: 'e2e',
    testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
    testTimeout: 60000
  }
  // ... additional projects
]
```

#### Coverage Configuration
- **Reporters**: Text, LCOV, HTML, JSON Summary
- **Thresholds**: 
  - Branches: 70%
  - Functions: 75% 
  - Lines: 80%
  - Statements: 80%

#### CI/CD Optimizations
- **Parallel Execution**: `maxWorkers=2` in CI
- **Silent Mode**: Reduced output in CI environments
- **Coverage Reports**: Multiple format generation

## 🏗️ Test File Naming Conventions

### Naming Patterns
- **Unit Tests**: `component-name.unit.test.ts`
- **Integration Tests**: `component-name.integration.test.ts`
- **E2E Tests**: `workflow-name.e2e.test.ts`
- **Security Tests**: `feature-name.security.test.ts`
- **Performance Tests**: `benchmark-name.performance.test.ts`

### Examples
```
tests/
├── tools/
│   ├── create-profile.unit.test.ts
│   ├── gap-analysis.unit.test.ts
│   └── csf-lookup.unit.test.ts
├── integration/
│   ├── database.integration.test.ts
│   └── transaction.integration.test.ts
├── e2e/
│   ├── assessment-workflow.e2e.test.ts
│   └── report-generation.e2e.test.ts
├── security/
│   ├── authentication.security.test.ts
│   └── validation.security.test.ts
└── performance/
    ├── benchmark.performance.test.ts
    └── load-test.performance.test.ts
```

## 🔄 CI/CD Pipeline Integration

### GitHub Actions Workflow
The CI pipeline executes tests in the following order:

1. **Lint and Type Check**
   - ESLint validation
   - TypeScript compilation
   - Project build verification

2. **Unit Tests**
   - Fast isolated testing
   - High coverage validation
   - Early failure detection

3. **Integration Tests**
   - Database interaction testing
   - Component integration validation
   - Transaction consistency checks

4. **End-to-End Tests**
   - Complete workflow validation
   - System integration testing
   - User journey verification

5. **Security Tests**
   - Authentication testing
   - Vulnerability scanning
   - Security control validation

6. **Performance Tests**
   - Benchmarking
   - Load testing
   - Performance regression detection

7. **Coverage Report Generation**
   - Comprehensive coverage analysis
   - Multi-format report generation
   - Quality gate validation

### Pipeline Triggers
- **Push to main/develop**: Full pipeline execution
- **Pull Requests**: Complete test validation
- **Manual Triggers**: On-demand execution

## 📈 Coverage and Quality Metrics

### Coverage Targets by Test Type
- **Unit Tests**: 90%+ coverage of individual components
- **Integration Tests**: 80%+ coverage of component interactions
- **E2E Tests**: 70%+ coverage of complete workflows
- **Overall Target**: 80%+ comprehensive coverage

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance benchmarks must be satisfied

## 🛠️ Development Workflow

### Local Development
```bash
# Install dependencies
npm ci

# Start watch mode during development
npm run test:watch

# Run specific test category
npm run test:unit

# Generate coverage report
npm run test:coverage
```

### Pre-commit Checklist
1. Run unit tests: `npm run test:unit`
2. Check TypeScript: `npm run typecheck`
3. Run linting: `npm run lint`
4. Run relevant integration tests

### Pre-push Checklist
1. Run all tests: `npm run test:all`
2. Generate coverage: `npm run test:coverage`
3. Verify no regressions in performance tests

## 🔧 Troubleshooting

### Common Issues

#### Test Timeouts
- **Cause**: Database operations or async operations taking too long
- **Solution**: Increase timeout in jest config or optimize test setup

#### Memory Issues
- **Cause**: Large test suites or memory leaks
- **Solution**: Run tests with `--runInBand` or optimize mocking

#### Database Lock Issues
- **Cause**: Parallel database access in tests
- **Solution**: Use `--runInBand` for integration tests

#### Coverage Discrepancies
- **Cause**: Different test execution modes
- **Solution**: Use consistent Jest configuration across environments

### Debug Commands
```bash
# Run with debug output
DEBUG=* npm run test:unit

# Run single test file
npx jest tests/tools/create-profile.unit.test.ts

# Run with verbose output
npm run test:unit -- --verbose

# Update snapshots
npm run test:unit -- --updateSnapshot
```

## 📝 Test Writing Guidelines

### Unit Test Best Practices
1. **Arrange-Act-Assert Pattern**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: Each test should validate one behavior
4. **Comprehensive Mocking**: Mock all external dependencies
5. **Edge Cases**: Test boundary conditions and error scenarios

### Integration Test Best Practices
1. **Real Dependencies**: Use actual database and services where appropriate
2. **Data Cleanup**: Ensure proper test data cleanup
3. **Transaction Isolation**: Use transactions for data consistency
4. **Realistic Scenarios**: Test with realistic data and workflows

### E2E Test Best Practices
1. **Complete Workflows**: Test entire user journeys
2. **Data Consistency**: Validate data integrity across operations
3. **Error Handling**: Test failure scenarios and recovery
4. **Performance Validation**: Include basic performance assertions

This comprehensive test organization system ensures high-quality, reliable software with excellent coverage and robust validation across all system components.