# Development Guide

This comprehensive guide covers development workflows, coding standards, testing practices, and contribution guidelines for the NIST CSF 2.0 MCP Server.

## Development Environment Setup

### Prerequisites

- **Node.js** v18+ (recommended: v20 LTS)
- **npm** v9+ or **yarn** v3+
- **TypeScript** v5+
- **SQLite** v3.35+ (usually bundled with Node.js)
- **Git** v2.30+

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Initialize database
npm run db:init

# Load framework data
npm run db:seed

# Build the project
npm run build

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_PATH=./nist_csf.db
FRAMEWORK_DATA_PATH=./data/csf-2.0-framework.json

# Features
ENABLE_MONITORING=true
ANALYTICS_ENABLED=true
SECURITY_HEADERS_ENABLED=true
RATE_LIMIT_ENABLED=false

# Development
DEBUG_QUERIES=true
ENABLE_CORS=true
PRETTY_LOGS=true

# Testing
TEST_DATABASE_PATH=./test_nist_csf.db
E2E_TIMEOUT=30000
```

## Project Structure

```
nist-csf-2-mcp-server/
├── src/                           # Source code
│   ├── index.ts                   # Main entry point
│   ├── types/                     # TypeScript type definitions
│   │   └── index.ts               # Core types and interfaces
│   ├── db/                        # Database layer
│   │   ├── database.ts            # Database operations
│   │   ├── monitored-database.ts  # Performance monitoring wrapper
│   │   └── migrations/            # Database migration scripts
│   ├── services/                  # Business logic services
│   │   ├── framework-loader.ts    # CSF framework data loader
│   │   ├── assessment-engine.ts   # Assessment calculation logic
│   │   └── report-generator.ts    # Report generation service
│   ├── tools/                     # MCP tool implementations
│   │   ├── query_framework.ts     # Framework querying
│   │   ├── create_profile.ts      # Profile management
│   │   ├── quick_assessment.ts    # Rapid assessment
│   │   ├── assess_maturity.ts     # Maturity assessment
│   │   ├── calculate_risk_score.ts # Risk calculation
│   │   ├── generate_gap_analysis.ts # Gap analysis
│   │   ├── generate_priority_matrix.ts # Priority matrix
│   │   ├── create_implementation_plan.ts # Implementation planning
│   │   ├── estimate_implementation_cost.ts # Cost estimation
│   │   ├── track_progress.ts      # Progress tracking
│   │   ├── generate_report.ts     # Report generation
│   │   ├── export_data.ts         # Data export
│   │   └── compare_profiles.ts    # Profile comparison
│   ├── middleware/                # Express middleware
│   │   ├── monitoring.ts          # Performance monitoring
│   │   ├── validation.ts          # Input validation
│   │   └── error-handling.ts      # Error handling
│   ├── security/                  # Security components
│   │   ├── auth.ts                # Authentication
│   │   ├── rate-limiter.ts        # Rate limiting
│   │   └── logger.ts              # Security logging
│   ├── utils/                     # Utility functions
│   │   ├── enhanced-logger.ts     # Structured logging
│   │   ├── metrics.ts             # Performance metrics
│   │   ├── analytics.ts           # Usage analytics
│   │   └── validators.ts          # Common validators
│   └── test-e2e-workflow.ts       # End-to-end tests
├── data/                          # Static data files
│   └── csf-2.0-framework.json     # NIST CSF 2.0 data
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── fixtures/                  # Test fixtures
├── docs/                          # Documentation
│   ├── api/                       # API documentation
│   └── guides/                    # Development guides
├── migrations/                    # Database migrations
├── scripts/                       # Build and utility scripts
└── test-reports/                  # Test reports and coverage
```

## Development Workflow

### Branch Strategy

We follow **Git Flow** with these branch types:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features (`feature/assessment-improvements`)
- **`bugfix/*`**: Bug fixes (`bugfix/risk-calculation-error`)
- **`hotfix/*`**: Critical production fixes
- **`release/*`**: Release preparation (`release/v2.1.0`)

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation

3. **Test Changes**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run test:e2e
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new assessment feature

   - Implement advanced risk calculation
   - Add comprehensive unit tests
   - Update API documentation
   
   Closes #123"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request via GitHub
   ```

### Commit Message Format

We use **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(assessment): add quick assessment tool

Implement rapid assessment workflow using simplified questionnaire.
Includes comprehensive validation and error handling.

Closes #45

fix(database): resolve connection pool exhaustion

- Increase connection pool size
- Add proper connection cleanup
- Improve error handling for database operations

Breaking change: Database configuration format updated
```

## Coding Standards

### TypeScript Guidelines

#### 1. Type Safety
```typescript
// ✅ Good: Strict typing
interface AssessmentParams {
  profile_id: string;
  subcategory_id: string;
  implementation_level: 'not_implemented' | 'partially_implemented' | 'largely_implemented' | 'fully_implemented';
  maturity_score: number;
}

// ❌ Avoid: Using any
function processAssessment(data: any) {
  // ...
}

// ✅ Good: Generic constraints
function validateInput<T extends Record<string, unknown>>(data: T): T {
  // ...
  return data;
}
```

#### 2. Error Handling
```typescript
// ✅ Good: Custom error types
class ProfileNotFoundError extends Error {
  constructor(profileId: string) {
    super(`Profile not found: ${profileId}`);
    this.name = 'ProfileNotFoundError';
  }
}

// ✅ Good: Result pattern
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

async function createProfile(params: CreateProfileParams): Promise<Result<Profile>> {
  try {
    const profile = await profileService.create(params);
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

#### 3. Async/Await Patterns
```typescript
// ✅ Good: Proper error handling
async function processAssessments(profileId: string): Promise<AssessmentResult[]> {
  try {
    const assessments = await database.getAssessments(profileId);
    const results = await Promise.all(
      assessments.map(async (assessment) => {
        return await calculateMaturityScore(assessment);
      })
    );
    return results;
  } catch (error) {
    logger.error('Failed to process assessments', { profileId, error });
    throw new Error(`Assessment processing failed: ${error.message}`);
  }
}

// ✅ Good: Concurrent processing with error handling
async function batchUpdateProgress(updates: ProgressUpdate[]): Promise<BatchResult> {
  const results = await Promise.allSettled(
    updates.map(update => updateProgress(update))
  );
  
  const successful = results.filter(result => result.status === 'fulfilled');
  const failed = results.filter(result => result.status === 'rejected');
  
  return {
    successful: successful.length,
    failed: failed.length,
    errors: failed.map(result => result.reason)
  };
}
```

### Code Organization

#### 1. Module Structure
```typescript
// tool-template.ts
import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/enhanced-logger.js';

// 1. Schema definition
export const ToolParamsSchema = z.object({
  // ... schema definition
});

export type ToolParams = z.infer<typeof ToolParamsSchema>;

// 2. Types and interfaces
interface ToolResult {
  success: boolean;
  // ... result structure
}

// 3. Helper functions (private)
function validateInput(params: ToolParams): ValidationResult {
  // ... validation logic
}

// 4. Main function (exported)
export async function executeTool(params: ToolParams): Promise<ToolResult> {
  try {
    // ... implementation
  } catch (error) {
    logger.error('Tool execution failed', { params, error });
    throw error;
  }
}
```

#### 2. Database Patterns
```typescript
// ✅ Good: Parameterized queries
export function getProfileAssessments(profileId: string): ProfileAssessment[] {
  const stmt = this.db.prepare(`
    SELECT 
      pa.subcategory_id,
      pa.implementation_level,
      pa.maturity_score,
      pa.assessment_date,
      s.name as subcategory_name,
      s.function_id
    FROM profile_assessments pa
    JOIN subcategories s ON s.id = pa.subcategory_id
    WHERE pa.profile_id = ?
    ORDER BY s.function_id, s.id
  `);
  
  return stmt.all(profileId) as ProfileAssessment[];
}

// ✅ Good: Transaction handling
export function batchUpdateAssessments(profileId: string, assessments: Assessment[]): void {
  const transaction = this.db.transaction((assessments: Assessment[]) => {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profile_assessments 
      (profile_id, subcategory_id, implementation_level, maturity_score, assessment_date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const assessment of assessments) {
      stmt.run(
        profileId,
        assessment.subcategory_id,
        assessment.implementation_level,
        assessment.maturity_score,
        assessment.assessment_date
      );
    }
  });
  
  transaction(assessments);
}
```

### Validation Patterns

#### 1. Input Validation
```typescript
// ✅ Good: Zod schema validation
export const CreateProfileSchema = z.object({
  org_name: z.string().min(1).max(255),
  sector: z.enum(['technology', 'healthcare', 'finance', 'government', 'other']),
  size: z.enum(['small', 'medium', 'large', 'enterprise']),
  profile_type: z.enum(['current', 'target', 'comparative']),
  profile_name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional()
});

// Usage in tool function
export async function createProfile(params: unknown): Promise<CreateProfileResult> {
  // Validate input
  const validatedParams = CreateProfileSchema.parse(params);
  
  // Process with validated data
  return await processProfileCreation(validatedParams);
}
```

#### 2. Business Logic Validation
```typescript
// ✅ Good: Comprehensive validation
function validateAssessmentData(assessment: Assessment): ValidationResult {
  const errors: string[] = [];
  
  // Check maturity score range
  if (assessment.maturity_score < 0 || assessment.maturity_score > 5) {
    errors.push('Maturity score must be between 0 and 5');
  }
  
  // Check implementation level consistency
  if (assessment.implementation_level === 'fully_implemented' && assessment.maturity_score < 3) {
    errors.push('Fully implemented items should have maturity score >= 3');
  }
  
  // Check date validity
  const assessmentDate = new Date(assessment.assessment_date);
  if (assessmentDate > new Date()) {
    errors.push('Assessment date cannot be in the future');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Testing Strategy

### Test Pyramid

```
    E2E Tests (10%)
   ───────────────
  Integration Tests (20%)
 ─────────────────────────
Unit Tests (70%)
```

### Unit Testing

#### 1. Test Structure
```typescript
// tests/unit/tools/create-profile.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProfile } from '../../../src/tools/create_profile.js';
import { getDatabase } from '../../../src/db/database.js';

// Mock dependencies
vi.mock('../../../src/db/database.js');

describe('createProfile', () => {
  beforeEach(() => {
    // Setup test environment
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const params = {
        org_name: '',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('org_name is required');
    });

    it('should validate enum values', async () => {
      const params = {
        org_name: 'Test Corp',
        sector: 'invalid-sector',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('Invalid sector');
    });
  });

  describe('successful profile creation', () => {
    it('should create profile with valid parameters', async () => {
      const mockDb = {
        createOrganization: vi.fn().mockReturnValue({ id: 'ORG-001' }),
        createProfile: vi.fn().mockReturnValue({ id: 'PROF-001' })
      };
      
      vi.mocked(getDatabase).mockReturnValue(mockDb as any);

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile_id).toBe('PROF-001');
      expect(mockDb.createOrganization).toHaveBeenCalledWith({
        name: 'Test Corp',
        sector: 'technology',
        size: 'medium'
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = {
        createOrganization: vi.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        })
      };
      
      vi.mocked(getDatabase).mockReturnValue(mockDb as any);

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('Database connection failed');
    });
  });
});
```

#### 2. Test Utilities
```typescript
// tests/utils/test-helpers.ts
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'PROF-TEST-001',
    org_id: 'ORG-TEST-001',
    profile_name: 'Test Profile',
    profile_type: 'current',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    subcategory_id: 'GV.OC-01',
    implementation_level: 'partially_implemented',
    maturity_score: 2,
    assessment_date: new Date().toISOString(),
    assessed_by: 'Test User',
    ...overrides
  };
}

export async function setupTestDatabase(): Promise<Database> {
  const db = new Database(':memory:');
  // Initialize test schema and data
  await initializeTestSchema(db);
  return db;
}
```

### Integration Testing

#### 1. Database Integration
```typescript
// tests/integration/database.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Database } from 'better-sqlite3';
import { getDatabase } from '../../src/db/database.js';

describe('Database Integration', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // Clean database between tests
    db.exec('DELETE FROM profile_assessments');
    db.exec('DELETE FROM profiles');
    db.exec('DELETE FROM organization_profiles');
  });

  describe('Profile Management', () => {
    it('should create and retrieve organization profiles', () => {
      const orgData = {
        name: 'Integration Test Corp',
        sector: 'technology',
        size: 'medium',
        description: 'Test organization'
      };

      const orgId = db.createOrganization(orgData);
      const retrieved = db.getOrganization(orgId);

      expect(retrieved).toMatchObject(orgData);
      expect(retrieved.id).toBe(orgId);
    });

    it('should handle foreign key relationships', () => {
      // Create organization first
      const orgId = db.createOrganization({
        name: 'Test Corp',
        sector: 'technology',
        size: 'medium'
      });

      // Create profile
      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      });

      const profile = db.getProfile(profileId);
      expect(profile.org_id).toBe(orgId);
    });
  });

  describe('Assessment Operations', () => {
    it('should batch update assessments with transaction', () => {
      // Setup test data
      const orgId = db.createOrganization({
        name: 'Test Corp',
        sector: 'technology',
        size: 'medium'
      });

      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      });

      const assessments = [
        {
          subcategory_id: 'GV.OC-01',
          implementation_level: 'partially_implemented',
          maturity_score: 2
        },
        {
          subcategory_id: 'GV.OC-02',
          implementation_level: 'fully_implemented',
          maturity_score: 4
        }
      ];

      // Test batch update
      db.batchUpdateAssessments(profileId, assessments);

      const retrievedAssessments = db.getProfileAssessments(profileId);
      expect(retrievedAssessments).toHaveLength(2);
      expect(retrievedAssessments[0].implementation_level).toBe('partially_implemented');
    });
  });
});
```

### End-to-End Testing

#### 1. Complete Workflow Tests
```typescript
// src/test-e2e-workflow.ts (Enhanced version)
describe('E2E Cybersecurity Assessment Workflow', () => {
  let testRunner: E2ETestRunner;

  beforeAll(async () => {
    testRunner = new E2ETestRunner(true);
    await testRunner.initialize();
  });

  afterAll(async () => {
    await testRunner.cleanup();
  });

  it('should complete full assessment workflow', async () => {
    // Step 1: Create organization and profile
    const profileResult = await testRunner.testOrganizationCreation();
    expect(profileResult.status).toBe('PASS');
    expect(profileResult.data.profileId).toBeDefined();

    // Step 2: Perform quick assessment
    const assessmentResult = await testRunner.testQuickAssessment();
    expect(assessmentResult.status).toBe('PASS');
    expect(assessmentResult.data.overallAverage).toBeGreaterThan(0);

    // Step 3: Generate gap analysis
    const gapResult = await testRunner.testGapAnalysis();
    expect(gapResult.status).toBe('PASS');
    expect(gapResult.data.totalGaps).toBeGreaterThan(0);

    // Step 4: Create implementation plan
    const planResult = await testRunner.testImplementationPlan();
    expect(planResult.status).toBe('PASS');
    expect(planResult.data.totalPhases).toBeGreaterThan(0);

    // Step 5: Track progress
    const progressResult = await testRunner.testProgressTracking();
    expect(progressResult.status).toBe('PASS');
    expect(progressResult.data.overallCompletion).toBeGreaterThanOrEqual(0);

    // Validate complete workflow
    const report = testRunner.generateFinalReport();
    expect(report.summary.successRate).toBe(100);
  }, 60000); // 60 second timeout
});
```

### Testing Best Practices

#### 1. Test Data Management
```typescript
// tests/fixtures/sample-data.ts
export const SAMPLE_ORGANIZATIONS = [
  {
    name: 'TechCorp Industries',
    sector: 'technology',
    size: 'large',
    description: 'Large technology company'
  },
  {
    name: 'HealthSystem Regional',
    sector: 'healthcare',
    size: 'medium',
    description: 'Regional healthcare provider'
  }
];

export const SAMPLE_ASSESSMENTS = [
  {
    subcategory_id: 'GV.OC-01',
    implementation_level: 'partially_implemented',
    maturity_score: 2,
    notes: 'Policy framework in development'
  }
  // ... more sample data
];
```

#### 2. Mock Strategies
```typescript
// tests/mocks/database-mock.ts
export class MockDatabase {
  private data = new Map();

  createOrganization(orgData: OrganizationData): string {
    const id = `ORG-MOCK-${Date.now()}`;
    this.data.set(id, { ...orgData, id });
    return id;
  }

  getOrganization(id: string): Organization | null {
    return this.data.get(id) || null;
  }

  // ... other mock methods
}
```

## Performance Guidelines

### Database Optimization

#### 1. Query Optimization
```typescript
// ✅ Good: Use proper indexes
const stmt = db.prepare(`
  SELECT pa.*, s.name, s.function_id
  FROM profile_assessments pa
  JOIN subcategories s ON s.id = pa.subcategory_id
  WHERE pa.profile_id = ? 
    AND pa.assessment_date >= ?
  ORDER BY s.function_id, s.id
`);

// ✅ Good: Batch operations
const batchInsert = db.transaction((assessments: Assessment[]) => {
  const stmt = db.prepare(`
    INSERT INTO profile_assessments 
    (profile_id, subcategory_id, implementation_level, maturity_score)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const assessment of assessments) {
    stmt.run(
      assessment.profile_id,
      assessment.subcategory_id,
      assessment.implementation_level,
      assessment.maturity_score
    );
  }
});
```

#### 2. Memory Management
```typescript
// ✅ Good: Streaming for large datasets
export function* getAssessmentsStream(profileId: string): Generator<Assessment> {
  const stmt = db.prepare(`
    SELECT * FROM profile_assessments 
    WHERE profile_id = ?
    ORDER BY subcategory_id
  `);
  
  for (const row of stmt.iterate(profileId)) {
    yield row as Assessment;
  }
}

// Usage
for (const assessment of getAssessmentsStream(profileId)) {
  await processAssessment(assessment);
}
```

### Monitoring and Observability

#### 1. Performance Monitoring
```typescript
// src/utils/performance-monitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  startTiming(operation: string): () => number {
    const start = process.hrtime.bigint();
    
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  private recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0
    };

    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);

    this.metrics.set(operation, existing);
  }

  getMetrics(): Record<string, PerformanceMetric & { avgTime: number }> {
    const result: Record<string, PerformanceMetric & { avgTime: number }> = {};
    
    for (const [operation, metric] of this.metrics) {
      result[operation] = {
        ...metric,
        avgTime: metric.totalTime / metric.count
      };
    }
    
    return result;
  }
}
```

#### 2. Usage in Tools
```typescript
import { performanceMonitor } from '../utils/performance-monitor.js';

export async function calculateRiskScore(params: RiskScoreParams): Promise<RiskResult> {
  const endTiming = performanceMonitor.startTiming('calculate_risk_score');
  
  try {
    // ... implementation
    const result = await performRiskCalculation(params);
    
    logger.info('Risk calculation completed', {
      profileId: params.profile_id,
      duration: endTiming(),
      riskScore: result.overall_risk_score
    });
    
    return result;
  } catch (error) {
    endTiming(); // Still record timing on error
    throw error;
  }
}
```

## Debugging and Troubleshooting

### Logging Strategy

#### 1. Structured Logging
```typescript
// src/utils/enhanced-logger.ts usage
logger.info('Profile created successfully', {
  operation: 'create_profile',
  profileId: result.profile_id,
  organizationId: result.org_id,
  duration: endTiming(),
  metadata: {
    sector: params.sector,
    size: params.size,
    profileType: params.profile_type
  }
});

logger.error('Risk calculation failed', {
  operation: 'calculate_risk_score',
  profileId: params.profile_id,
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack
  },
  context: {
    threatWeights: params.threat_weights,
    includeHeatMap: params.include_heat_map
  }
});
```

#### 2. Debug Configuration
```typescript
// Development debugging
if (process.env.NODE_ENV === 'development') {
  logger.debug('Detailed assessment data', {
    assessments: assessments.map(a => ({
      subcategory: a.subcategory_id,
      implementation: a.implementation_level,
      maturity: a.maturity_score
    }))
  });
}
```

### Common Issues and Solutions

#### 1. Database Lock Issues
```bash
# If you encounter "database is locked" errors:
rm nist_csf.db-wal nist_csf.db-shm
```

#### 2. Memory Issues with Large Datasets
```typescript
// Use streaming for large operations
async function processLargeAssessmentBatch(profileId: string): Promise<void> {
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const batch = db.getAssessmentsBatch(profileId, offset, batchSize);
    if (batch.length === 0) break;
    
    await processBatch(batch);
    offset += batchSize;
    
    // Allow garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}
```

## Contribution Guidelines

### Pull Request Process

1. **Fork and Branch**
   - Fork the repository
   - Create feature branch from `develop`
   - Use descriptive branch names

2. **Development**
   - Follow coding standards
   - Add comprehensive tests
   - Update documentation

3. **Testing**
   - All tests must pass
   - Achieve >90% code coverage
   - E2E tests must pass

4. **Review Process**
   - Submit PR with detailed description
   - Address review feedback
   - Ensure CI checks pass

5. **Merge**
   - Squash commits if needed
   - Merge to `develop`
   - Delete feature branch

### Code Review Checklist

#### For Authors
- [ ] Code follows style guidelines
- [ ] Comprehensive test coverage
- [ ] Documentation updated
- [ ] No breaking changes (or marked as such)
- [ ] Performance impact considered
- [ ] Security implications reviewed

#### For Reviewers
- [ ] Logic correctness
- [ ] Error handling adequacy
- [ ] Test quality and coverage
- [ ] Performance implications
- [ ] Security considerations
- [ ] Documentation accuracy

### Release Process

1. **Version Bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**
   - Document all changes
   - Follow semantic versioning
   - Include migration notes if needed

3. **Create Release Branch**
   ```bash
   git checkout -b release/v2.1.0
   ```

4. **Final Testing**
   - Run full test suite
   - Perform manual testing
   - Validate E2E workflows

5. **Merge to Main**
   - Create PR from release branch
   - Merge after approval
   - Tag release

This development guide provides a comprehensive foundation for contributing to the NIST CSF 2.0 MCP Server project while maintaining high code quality and reliability standards.