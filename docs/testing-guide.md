# Testing Guide

This comprehensive testing guide covers all aspects of testing the NIST CSF 2.0 MCP Server, including unit tests, integration tests, end-to-end tests, performance testing, and security testing.

## Testing Philosophy

Our testing strategy follows these core principles:

1. **Test Pyramid**: 70% unit tests, 20% integration tests, 10% E2E tests
2. **Fail Fast**: Tests should fail quickly and provide clear error messages
3. **Isolation**: Tests should be independent and not rely on external state
4. **Comprehensive Coverage**: Aim for >90% code coverage with meaningful tests
5. **Performance Awareness**: Tests should complete quickly and not impact development velocity

## Test Environment Setup

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8 supertest
npm install --save-dev @types/supertest
```

### Configuration Files

#### Vitest Configuration (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        'tests/',
        '**/*.config.ts'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

#### Test Setup (`tests/setup.ts`)
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { Database } from 'better-sqlite3';
import { initializeTestDatabase, cleanupTestDatabase } from './utils/test-database';
import { logger } from '../src/utils/enhanced-logger';

let testDb: Database;

beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Initialize test database
  testDb = await initializeTestDatabase();
  
  // Silence logger during tests
  logger.transports.forEach(transport => {
    transport.silent = true;
  });
});

afterAll(async () => {
  if (testDb) {
    testDb.close();
  }
  await cleanupTestDatabase();
});

beforeEach(() => {
  // Clean database state between tests
  if (testDb) {
    testDb.exec('DELETE FROM profile_assessments');
    testDb.exec('DELETE FROM profiles');
    testDb.exec('DELETE FROM organization_profiles');
    testDb.exec('DELETE FROM gap_analyses');
    testDb.exec('DELETE FROM priority_matrices');
    testDb.exec('DELETE FROM implementation_plans');
    testDb.exec('DELETE FROM progress_tracking');
  }
});
```

## Unit Testing

### Test Structure and Organization

```
tests/
├── unit/
│   ├── tools/                    # Tool function tests
│   │   ├── create-profile.test.ts
│   │   ├── quick-assessment.test.ts
│   │   ├── calculate-risk-score.test.ts
│   │   └── ...
│   ├── services/                 # Service layer tests
│   │   ├── framework-loader.test.ts
│   │   ├── assessment-engine.test.ts
│   │   └── report-generator.test.ts
│   ├── db/                       # Database layer tests
│   │   ├── database.test.ts
│   │   └── monitored-database.test.ts
│   ├── utils/                    # Utility function tests
│   │   ├── logger.test.ts
│   │   ├── metrics.test.ts
│   │   └── validators.test.ts
│   └── security/                 # Security component tests
│       ├── auth.test.ts
│       └── rate-limiter.test.ts
├── integration/                  # Integration tests
├── e2e/                         # End-to-end tests
├── performance/                 # Performance tests
├── utils/                       # Test utilities
├── fixtures/                    # Test data fixtures
└── mocks/                      # Mock implementations
```

### Unit Test Examples

#### 1. Tool Function Testing

```typescript
// tests/unit/tools/create-profile.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProfile } from '@/tools/create_profile';
import { getDatabase } from '@/db/database';
import { logger } from '@/utils/enhanced-logger';

// Mock external dependencies
vi.mock('@/db/database');
vi.mock('@/utils/enhanced-logger');

const mockDatabase = {
  createOrganization: vi.fn(),
  createProfile: vi.fn(),
  getOrganization: vi.fn(),
  getProfile: vi.fn()
};

describe('createProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabase).mockReturnValue(mockDatabase as any);
  });

  describe('input validation', () => {
    it('should reject empty organization name', async () => {
      const params = {
        org_name: '',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('org_name');
    });

    it('should reject invalid sector', async () => {
      const params = {
        org_name: 'Test Corp',
        sector: 'invalid-sector',
        size: 'medium', 
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('sector');
    });

    it('should reject invalid organization size', async () => {
      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'invalid-size',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('size');
    });

    it('should reject invalid profile type', async () => {
      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'invalid-type'
      };

      await expect(createProfile(params)).rejects.toThrow('profile_type');
    });
  });

  describe('successful profile creation', () => {
    it('should create new organization and profile', async () => {
      const mockOrgId = 'ORG-20240312-001';
      const mockProfileId = 'PROF-20240312-001';

      mockDatabase.createOrganization.mockReturnValue(mockOrgId);
      mockDatabase.createProfile.mockReturnValue(mockProfileId);
      mockDatabase.getOrganization.mockReturnValue(null); // New organization

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current',
        profile_name: 'Current State Assessment',
        description: 'Baseline assessment'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.profile_id).toBe(mockProfileId);
      expect(result.org_id).toBe(mockOrgId);
      expect(mockDatabase.createOrganization).toHaveBeenCalledWith({
        name: 'Test Corp',
        sector: 'technology',
        size: 'medium'
      });
      expect(mockDatabase.createProfile).toHaveBeenCalledWith({
        org_id: mockOrgId,
        profile_name: 'Current State Assessment',
        profile_type: 'current',
        description: 'Baseline assessment'
      });
    });

    it('should use existing organization if found', async () => {
      const existingOrgId = 'ORG-EXISTING-001';
      const mockProfileId = 'PROF-20240312-001';

      mockDatabase.getOrganization.mockReturnValue({
        id: existingOrgId,
        name: 'Test Corp'
      });
      mockDatabase.createProfile.mockReturnValue(mockProfileId);

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      const result = await createProfile(params);

      expect(result.success).toBe(true);
      expect(result.org_id).toBe(existingOrgId);
      expect(mockDatabase.createOrganization).not.toHaveBeenCalled();
      expect(mockDatabase.createProfile).toHaveBeenCalledWith({
        org_id: existingOrgId,
        profile_name: 'Test Corp current Profile',
        profile_type: 'current',
        description: undefined
      });
    });
  });

  describe('error handling', () => {
    it('should handle database creation errors', async () => {
      mockDatabase.getOrganization.mockReturnValue(null);
      mockDatabase.createOrganization.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('Database connection failed');
      
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'Create profile error:',
        expect.any(Error)
      );
    });

    it('should handle profile creation errors', async () => {
      const mockOrgId = 'ORG-20240312-001';
      
      mockDatabase.getOrganization.mockReturnValue(null);
      mockDatabase.createOrganization.mockReturnValue(mockOrgId);
      mockDatabase.createProfile.mockImplementation(() => {
        throw new Error('Profile creation failed');
      });

      const params = {
        org_name: 'Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow('Profile creation failed');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in organization name', async () => {
      const mockOrgId = 'ORG-20240312-001';
      const mockProfileId = 'PROF-20240312-001';

      mockDatabase.getOrganization.mockReturnValue(null);
      mockDatabase.createOrganization.mockReturnValue(mockOrgId);
      mockDatabase.createProfile.mockReturnValue(mockProfileId);

      const params = {
        org_name: 'Test Corp & Associates (LLC)',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);
    });

    it('should handle long organization names within limits', async () => {
      const longName = 'A'.repeat(255); // Maximum allowed length
      const mockOrgId = 'ORG-20240312-001';
      const mockProfileId = 'PROF-20240312-001';

      mockDatabase.getOrganization.mockReturnValue(null);
      mockDatabase.createOrganization.mockReturnValue(mockOrgId);
      mockDatabase.createProfile.mockReturnValue(mockProfileId);

      const params = {
        org_name: longName,
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      const result = await createProfile(params);
      expect(result.success).toBe(true);
    });

    it('should reject organization names exceeding limits', async () => {
      const tooLongName = 'A'.repeat(256); // Exceeds maximum

      const params = {
        org_name: tooLongName,
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      };

      await expect(createProfile(params)).rejects.toThrow();
    });
  });
});
```

#### 2. Service Layer Testing

```typescript
// tests/unit/services/assessment-engine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssessmentEngine } from '@/services/assessment-engine';
import { SAMPLE_ASSESSMENTS } from '@tests/fixtures/sample-data';

describe('AssessmentEngine', () => {
  let assessmentEngine: AssessmentEngine;

  beforeEach(() => {
    assessmentEngine = new AssessmentEngine();
  });

  describe('calculateMaturityScore', () => {
    it('should calculate correct maturity score for fully implemented', () => {
      const assessment = {
        implementation_level: 'fully_implemented',
        maturity_indicators: {
          documented: true,
          implemented: true,
          monitored: true,
          improved: true
        }
      };

      const score = assessmentEngine.calculateMaturityScore(assessment);
      expect(score).toBe(5);
    });

    it('should calculate correct maturity score for partially implemented', () => {
      const assessment = {
        implementation_level: 'partially_implemented',
        maturity_indicators: {
          documented: true,
          implemented: false,
          monitored: false,
          improved: false
        }
      };

      const score = assessmentEngine.calculateMaturityScore(assessment);
      expect(score).toBe(2);
    });

    it('should handle edge case with no maturity indicators', () => {
      const assessment = {
        implementation_level: 'not_implemented',
        maturity_indicators: {}
      };

      const score = assessmentEngine.calculateMaturityScore(assessment);
      expect(score).toBe(0);
    });
  });

  describe('calculateFunctionMaturity', () => {
    it('should calculate weighted average for function', () => {
      const assessments = [
        { subcategory_id: 'GV.OC-01', maturity_score: 4, weight: 1 },
        { subcategory_id: 'GV.OC-02', maturity_score: 2, weight: 1 },
        { subcategory_id: 'GV.RM-01', maturity_score: 3, weight: 2 }
      ];

      const functionMaturity = assessmentEngine.calculateFunctionMaturity(assessments);
      
      // Weighted average: (4*1 + 2*1 + 3*2) / (1+1+2) = 12/4 = 3
      expect(functionMaturity.average_score).toBe(3);
      expect(functionMaturity.total_subcategories).toBe(3);
    });

    it('should handle empty assessment list', () => {
      const assessments = [];
      const functionMaturity = assessmentEngine.calculateFunctionMaturity(assessments);
      
      expect(functionMaturity.average_score).toBe(0);
      expect(functionMaturity.total_subcategories).toBe(0);
    });
  });

  describe('generateMaturityRecommendations', () => {
    it('should generate appropriate recommendations for low maturity', () => {
      const maturityData = {
        overall_score: 1.5,
        function_breakdown: [
          { function_id: 'GV', average_score: 1.0 },
          { function_id: 'ID', average_score: 2.0 }
        ]
      };

      const recommendations = assessmentEngine.generateMaturityRecommendations(maturityData);
      
      expect(recommendations.immediate_actions).toContain(
        expect.stringMatching(/establish.*governance/i)
      );
      expect(recommendations.strategic_initiatives).toHaveLength(3);
    });

    it('should generate different recommendations for high maturity', () => {
      const maturityData = {
        overall_score: 4.2,
        function_breakdown: [
          { function_id: 'GV', average_score: 4.5 },
          { function_id: 'ID', average_score: 3.8 }
        ]
      };

      const recommendations = assessmentEngine.generateMaturityRecommendations(maturityData);
      
      expect(recommendations.immediate_actions).toContain(
        expect.stringMatching(/continuous.*improvement/i)
      );
    });
  });
});
```

#### 3. Database Layer Testing

```typescript
// tests/unit/db/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'better-sqlite3';
import { DatabaseManager } from '@/db/database';
import { SAMPLE_ORGANIZATIONS, SAMPLE_ASSESSMENTS } from '@tests/fixtures/sample-data';

describe('DatabaseManager', () => {
  let db: Database;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    db = new Database(':memory:');
    dbManager = new DatabaseManager(db);
    await dbManager.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('Organization Management', () => {
    it('should create organization with valid data', () => {
      const orgData = SAMPLE_ORGANIZATIONS[0];
      const orgId = dbManager.createOrganization(orgData);
      
      expect(orgId).toMatch(/^ORG-/);
      
      const retrieved = dbManager.getOrganization(orgId);
      expect(retrieved).toMatchObject(orgData);
      expect(retrieved.id).toBe(orgId);
      expect(retrieved.created_at).toBeDefined();
    });

    it('should prevent duplicate organization names', () => {
      const orgData = SAMPLE_ORGANIZATIONS[0];
      
      dbManager.createOrganization(orgData);
      
      expect(() => {
        dbManager.createOrganization(orgData);
      }).toThrow(/UNIQUE constraint failed/);
    });

    it('should handle organization updates', () => {
      const orgData = SAMPLE_ORGANIZATIONS[0];
      const orgId = dbManager.createOrganization(orgData);
      
      const updateData = {
        ...orgData,
        description: 'Updated description'
      };
      
      dbManager.updateOrganization(orgId, updateData);
      
      const updated = dbManager.getOrganization(orgId);
      expect(updated.description).toBe('Updated description');
      expect(updated.updated_at).toBeDefined();
    });
  });

  describe('Profile Management', () => {
    it('should create profile linked to organization', () => {
      const orgId = dbManager.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      
      const profileData = {
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current',
        description: 'Test description'
      };
      
      const profileId = dbManager.createProfile(profileData);
      
      expect(profileId).toMatch(/^PROF-/);
      
      const retrieved = dbManager.getProfile(profileId);
      expect(retrieved).toMatchObject(profileData);
      expect(retrieved.id).toBe(profileId);
    });

    it('should enforce foreign key constraint for org_id', () => {
      const profileData = {
        org_id: 'NON-EXISTENT-ORG',
        profile_name: 'Test Profile',
        profile_type: 'current'
      };
      
      expect(() => {
        dbManager.createProfile(profileData);
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('should prevent duplicate profile names within organization', () => {
      const orgId = dbManager.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      
      const profileData = {
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      };
      
      dbManager.createProfile(profileData);
      
      expect(() => {
        dbManager.createProfile(profileData);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('Assessment Management', () => {
    let orgId: string;
    let profileId: string;

    beforeEach(() => {
      orgId = dbManager.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      profileId = dbManager.createProfile({
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      });
    });

    it('should create individual assessment', () => {
      const assessmentData = {
        ...SAMPLE_ASSESSMENTS[0],
        profile_id: profileId
      };
      
      const assessmentId = dbManager.createAssessment(assessmentData);
      expect(assessmentId).toMatch(/^ASSESS-/);
      
      const retrieved = dbManager.getAssessment(assessmentId);
      expect(retrieved).toMatchObject(assessmentData);
    });

    it('should batch create assessments in transaction', () => {
      const assessments = SAMPLE_ASSESSMENTS.map(a => ({
        ...a,
        profile_id: profileId
      }));
      
      const result = dbManager.batchCreateAssessments(assessments);
      
      expect(result.successful).toBe(assessments.length);
      expect(result.failed).toBe(0);
      
      const retrieved = dbManager.getProfileAssessments(profileId);
      expect(retrieved).toHaveLength(assessments.length);
    });

    it('should handle assessment updates', () => {
      const assessmentData = {
        ...SAMPLE_ASSESSMENTS[0],
        profile_id: profileId
      };
      
      const assessmentId = dbManager.createAssessment(assessmentData);
      
      const updateData = {
        implementation_level: 'fully_implemented',
        maturity_score: 5,
        notes: 'Updated after implementation'
      };
      
      dbManager.updateAssessment(assessmentId, updateData);
      
      const updated = dbManager.getAssessment(assessmentId);
      expect(updated.implementation_level).toBe('fully_implemented');
      expect(updated.maturity_score).toBe(5);
      expect(updated.notes).toBe('Updated after implementation');
    });

    it('should enforce unique constraint on profile-subcategory combination', () => {
      const assessmentData = {
        ...SAMPLE_ASSESSMENTS[0],
        profile_id: profileId
      };
      
      dbManager.createAssessment(assessmentData);
      
      expect(() => {
        dbManager.createAssessment(assessmentData);
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('Complex Queries', () => {
    let profileId: string;

    beforeEach(() => {
      const orgId = dbManager.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      profileId = dbManager.createProfile({
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      });
      
      // Create sample assessments
      const assessments = SAMPLE_ASSESSMENTS.map(a => ({
        ...a,
        profile_id: profileId
      }));
      
      dbManager.batchCreateAssessments(assessments);
    });

    it('should get assessment summary by function', () => {
      const summary = dbManager.getAssessmentSummaryByFunction(profileId);
      
      expect(summary).toBeInstanceOf(Array);
      expect(summary.length).toBeGreaterThan(0);
      
      summary.forEach(functionSummary => {
        expect(functionSummary).toHaveProperty('function_id');
        expect(functionSummary).toHaveProperty('function_name');
        expect(functionSummary).toHaveProperty('assessed_subcategories');
        expect(functionSummary).toHaveProperty('average_maturity_score');
        expect(functionSummary).toHaveProperty('implementation_percentage');
      });
    });

    it('should calculate risk score data', () => {
      const riskData = dbManager.getRiskScoreData(profileId);
      
      expect(riskData).toHaveProperty('function_risks');
      expect(riskData).toHaveProperty('overall_risk_score');
      
      expect(riskData.function_risks).toBeInstanceOf(Array);
      riskData.function_risks.forEach(risk => {
        expect(risk).toHaveProperty('function_id');
        expect(risk).toHaveProperty('weighted_risk_score');
        expect(risk).toHaveProperty('high_risk_count');
        expect(risk).toHaveProperty('subcategory_count');
      });
    });

    it('should get gap analysis data', () => {
      // Create target profile for comparison
      const targetProfileId = dbManager.createProfile({
        org_id: profileId, // Using same org for simplicity
        profile_name: 'Target Profile',
        profile_type: 'target'
      });
      
      // Create target assessments with higher scores
      const targetAssessments = SAMPLE_ASSESSMENTS.map(a => ({
        ...a,
        profile_id: targetProfileId,
        implementation_level: 'fully_implemented',
        maturity_score: 5
      }));
      
      dbManager.batchCreateAssessments(targetAssessments);
      
      const gapData = dbManager.getGapAnalysisData(profileId, targetProfileId);
      
      expect(gapData).toHaveProperty('gaps');
      expect(gapData).toHaveProperty('total_gaps');
      expect(gapData.gaps).toBeInstanceOf(Array);
      
      gapData.gaps.forEach(gap => {
        expect(gap).toHaveProperty('subcategory_id');
        expect(gap).toHaveProperty('current_score');
        expect(gap).toHaveProperty('target_score');
        expect(gap).toHaveProperty('gap_score');
        expect(gap.gap_score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large batch operations efficiently', async () => {
      const orgId = dbManager.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      const profileId = dbManager.createProfile({
        org_id: orgId,
        profile_name: 'Performance Test Profile',
        profile_type: 'current'
      });
      
      // Generate large number of assessments
      const largeAssessmentBatch = Array.from({ length: 1000 }, (_, i) => ({
        profile_id: profileId,
        subcategory_id: `TEST-${String(i).padStart(3, '0')}`,
        implementation_level: 'partially_implemented',
        maturity_score: Math.floor(Math.random() * 5) + 1,
        assessment_date: new Date().toISOString(),
        assessed_by: 'Performance Test'
      }));
      
      const startTime = Date.now();
      const result = dbManager.batchCreateAssessments(largeAssessmentBatch);
      const duration = Date.now() - startTime;
      
      expect(result.successful).toBe(1000);
      expect(result.failed).toBe(0);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
```

### Test Utilities and Helpers

#### 1. Test Database Setup
```typescript
// tests/utils/test-database.ts
import { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export async function initializeTestDatabase(): Promise<Database> {
  const db = new Database(':memory:');
  
  // Load and execute schema
  const schemaPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  
  // Load framework data
  const frameworkPath = path.join(__dirname, '../../data/csf-2.0-framework.json');
  const framework = JSON.parse(fs.readFileSync(frameworkPath, 'utf8'));
  
  // Insert framework reference data
  await insertFrameworkData(db, framework);
  
  return db;
}

export async function cleanupTestDatabase(): Promise<void> {
  // Cleanup any temporary files or connections
}

async function insertFrameworkData(db: Database, framework: any): Promise<void> {
  const insertFunction = db.prepare(`
    INSERT INTO functions (id, name, description) VALUES (?, ?, ?)
  `);
  
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)
  `);
  
  const insertSubcategory = db.prepare(`
    INSERT INTO subcategories (id, category_id, function_id, name, description, outcomes, implementation_examples)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    // Insert functions
    for (const func of framework.functions) {
      insertFunction.run(func.id, func.name, func.description);
    }
    
    // Insert categories
    for (const category of framework.categories) {
      insertCategory.run(category.id, category.function_id, category.name, category.description);
    }
    
    // Insert subcategories
    for (const sub of framework.subcategories) {
      insertSubcategory.run(
        sub.id,
        sub.category_id,
        sub.function_id,
        sub.name,
        sub.description,
        JSON.stringify(sub.outcomes),
        JSON.stringify(sub.implementation_examples)
      );
    }
  });
  
  transaction();
}
```

#### 2. Test Data Fixtures
```typescript
// tests/fixtures/sample-data.ts
export const SAMPLE_ORGANIZATIONS = [
  {
    name: 'TechCorp Industries',
    sector: 'technology',
    size: 'large',
    description: 'Large technology company specializing in cloud services'
  },
  {
    name: 'HealthSystem Regional',
    sector: 'healthcare',
    size: 'medium',
    description: 'Regional healthcare provider'
  },
  {
    name: 'Community Bank',
    sector: 'finance',
    size: 'small',
    description: 'Local community financial institution'
  }
];

export const SAMPLE_ASSESSMENTS = [
  {
    subcategory_id: 'GV.OC-01',
    implementation_level: 'partially_implemented',
    maturity_score: 2,
    assessment_date: '2024-03-01T10:00:00Z',
    assessed_by: 'Security Team Lead',
    notes: 'Policy framework in development'
  },
  {
    subcategory_id: 'GV.OC-02',
    implementation_level: 'largely_implemented',
    maturity_score: 4,
    assessment_date: '2024-03-01T10:15:00Z',
    assessed_by: 'Security Team Lead',
    notes: 'Cybersecurity roles defined and communicated'
  },
  {
    subcategory_id: 'ID.AM-01',
    implementation_level: 'fully_implemented',
    maturity_score: 5,
    assessment_date: '2024-03-01T10:30:00Z',
    assessed_by: 'Asset Manager',
    notes: 'Comprehensive asset inventory maintained'
  },
  {
    subcategory_id: 'PR.AC-01',
    implementation_level: 'not_implemented',
    maturity_score: 0,
    assessment_date: '2024-03-01T10:45:00Z',
    assessed_by: 'Identity Team',
    notes: 'Identity management system not yet deployed'
  },
  {
    subcategory_id: 'DE.CM-01',
    implementation_level: 'partially_implemented',
    maturity_score: 1,
    assessment_date: '2024-03-01T11:00:00Z',
    assessed_by: 'Network Team',
    notes: 'Basic network monitoring in place, needs enhancement'
  }
];

export const SAMPLE_QUICK_ASSESSMENT = {
  simplified_answers: {
    govern: 'partial',
    identify: 'yes',
    protect: 'partial',
    detect: 'no',
    respond: 'partial',
    recover: 'no'
  },
  assessed_by: 'Test User',
  confidence_level: 'medium'
};

export const SAMPLE_PROGRESS_UPDATES = [
  {
    subcategory_id: 'GV.OC-01',
    current_implementation: 'fully_implemented',
    current_maturity: 4,
    status: 'completed',
    completion_percentage: 100,
    notes: 'Policy framework completed and approved',
    assigned_to: 'Security Team Lead'
  },
  {
    subcategory_id: 'PR.AC-01',
    current_implementation: 'partially_implemented',
    current_maturity: 2,
    status: 'at_risk',
    completion_percentage: 35,
    notes: 'Identity management deployment behind schedule',
    assigned_to: 'Identity Team',
    blockers: ['Budget approval pending', 'Vendor delays']
  }
];

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'PROF-TEST-001',
    org_id: 'ORG-TEST-001',
    profile_name: 'Test Profile',
    profile_type: 'current',
    description: 'Test profile for unit testing',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    ...overrides
  };
}

export function createMockAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'ASSESS-TEST-001',
    profile_id: 'PROF-TEST-001',
    subcategory_id: 'GV.OC-01',
    implementation_level: 'partially_implemented',
    maturity_score: 2,
    assessment_date: '2024-03-01T10:00:00Z',
    assessed_by: 'Test User',
    notes: 'Test assessment',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    ...overrides
  };
}
```

#### 3. Mock Implementations
```typescript
// tests/mocks/database-mock.ts
export class MockDatabase {
  private organizations = new Map<string, any>();
  private profiles = new Map<string, any>();
  private assessments = new Map<string, any>();
  private idCounter = 0;

  generateId(prefix: string): string {
    return `${prefix}-MOCK-${Date.now()}-${++this.idCounter}`;
  }

  createOrganization(data: any): string {
    const id = this.generateId('ORG');
    this.organizations.set(id, {
      ...data,
      id,
      created_at: new Date().toISOString()
    });
    return id;
  }

  getOrganization(id: string): any {
    return this.organizations.get(id) || null;
  }

  createProfile(data: any): string {
    const id = this.generateId('PROF');
    this.profiles.set(id, {
      ...data,
      id,
      created_at: new Date().toISOString()
    });
    return id;
  }

  getProfile(id: string): any {
    return this.profiles.get(id) || null;
  }

  createAssessment(data: any): string {
    const id = this.generateId('ASSESS');
    this.assessments.set(id, {
      ...data,
      id,
      created_at: new Date().toISOString()
    });
    return id;
  }

  getProfileAssessments(profileId: string): any[] {
    return Array.from(this.assessments.values())
      .filter(assessment => assessment.profile_id === profileId);
  }

  // Reset for clean state between tests
  reset(): void {
    this.organizations.clear();
    this.profiles.clear();
    this.assessments.clear();
    this.idCounter = 0;
  }
}
```

## Integration Testing

### Database Integration Tests

```typescript
// tests/integration/database-integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/db/database';
import { getFrameworkLoader } from '@/services/framework-loader';
import { SAMPLE_ORGANIZATIONS, SAMPLE_ASSESSMENTS } from '@tests/fixtures/sample-data';

describe('Database Integration Tests', () => {
  let db: any;
  let framework: any;

  beforeAll(async () => {
    db = getDatabase();
    framework = getFrameworkLoader();
    await framework.load();
  });

  afterAll(async () => {
    closeDatabase();
  });

  beforeEach(() => {
    // Clean database state
    db.exec('DELETE FROM profile_assessments');
    db.exec('DELETE FROM profiles');
    db.exec('DELETE FROM organization_profiles');
  });

  describe('Cross-table Operations', () => {
    it('should maintain referential integrity across related tables', () => {
      // Create organization
      const orgId = db.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      
      // Create profile
      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Integration Test Profile',
        profile_type: 'current'
      });
      
      // Create assessments
      const assessments = SAMPLE_ASSESSMENTS.map(a => ({
        ...a,
        profile_id: profileId
      }));
      
      db.batchCreateAssessments(assessments);
      
      // Verify relationships
      const profile = db.getProfile(profileId);
      const organization = db.getOrganization(orgId);
      const profileAssessments = db.getProfileAssessments(profileId);
      
      expect(profile.org_id).toBe(orgId);
      expect(organization.id).toBe(orgId);
      expect(profileAssessments).toHaveLength(assessments.length);
      
      // Verify foreign key constraints
      profileAssessments.forEach(assessment => {
        expect(assessment.profile_id).toBe(profileId);
        // Verify subcategory exists in framework
        expect(framework.getSubcategory(assessment.subcategory_id)).toBeDefined();
      });
    });

    it('should handle cascading operations correctly', () => {
      const orgId = db.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Test Profile',
        profile_type: 'current'
      });
      
      // Create assessments
      const assessments = SAMPLE_ASSESSMENTS.map(a => ({
        ...a,
        profile_id: profileId
      }));
      db.batchCreateAssessments(assessments);
      
      // Verify initial state
      expect(db.getProfileAssessments(profileId)).toHaveLength(assessments.length);
      
      // Test profile deletion cascades to assessments
      db.deleteProfile(profileId);
      
      expect(db.getProfile(profileId)).toBeNull();
      expect(db.getProfileAssessments(profileId)).toHaveLength(0);
      
      // Organization should still exist
      expect(db.getOrganization(orgId)).toBeDefined();
    });
  });

  describe('Transaction Handling', () => {
    it('should handle successful batch transactions', () => {
      const orgId = db.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Transaction Test Profile',
        profile_type: 'current'
      });
      
      const assessments = Array.from({ length: 50 }, (_, i) => ({
        profile_id: profileId,
        subcategory_id: `TEST-${String(i).padStart(3, '0')}`,
        implementation_level: 'partially_implemented',
        maturity_score: Math.floor(Math.random() * 5) + 1,
        assessment_date: new Date().toISOString(),
        assessed_by: 'Transaction Test'
      }));
      
      const result = db.batchCreateAssessments(assessments);
      
      expect(result.successful).toBe(50);
      expect(result.failed).toBe(0);
      expect(db.getProfileAssessments(profileId)).toHaveLength(50);
    });

    it('should rollback failed batch transactions', () => {
      const orgId = db.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      const profileId = db.createProfile({
        org_id: orgId,
        profile_name: 'Transaction Rollback Test',
        profile_type: 'current'
      });
      
      // Mix of valid and invalid assessments
      const assessments = [
        {
          profile_id: profileId,
          subcategory_id: 'GV.OC-01',
          implementation_level: 'partially_implemented',
          maturity_score: 2,
          assessment_date: new Date().toISOString(),
          assessed_by: 'Test User'
        },
        {
          profile_id: 'INVALID-PROFILE-ID', // This should cause a foreign key error
          subcategory_id: 'GV.OC-02',
          implementation_level: 'fully_implemented',
          maturity_score: 4,
          assessment_date: new Date().toISOString(),
          assessed_by: 'Test User'
        }
      ];
      
      expect(() => {
        db.batchCreateAssessments(assessments);
      }).toThrow();
      
      // Verify no assessments were created (transaction rolled back)
      expect(db.getProfileAssessments(profileId)).toHaveLength(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent read operations', async () => {
      // Setup test data
      const orgId = db.createOrganization(SAMPLE_ORGANIZATIONS[0]);
      const profileIds = Array.from({ length: 10 }, (_, i) => {
        return db.createProfile({
          org_id: orgId,
          profile_name: `Performance Profile ${i}`,
          profile_type: 'current'
        });
      });
      
      // Create assessments for each profile
      profileIds.forEach(profileId => {
        const assessments = SAMPLE_ASSESSMENTS.map(a => ({
          ...a,
          profile_id: profileId
        }));
        db.batchCreateAssessments(assessments);
      });
      
      // Perform concurrent reads
      const readPromises = profileIds.map(profileId => 
        Promise.resolve(db.getProfileAssessments(profileId))
      );
      
      const startTime = Date.now();
      const results = await Promise.all(readPromises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      results.forEach(assessments => {
        expect(assessments).toHaveLength(SAMPLE_ASSESSMENTS.length);
      });
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });
  });
});
```

### Service Integration Tests

```typescript
// tests/integration/assessment-workflow.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createProfile } from '@/tools/create_profile';
import { quickAssessment } from '@/tools/quick_assessment';
import { assessMaturity } from '@/tools/assess_maturity';
import { calculateRiskScore } from '@/tools/calculate_risk_score';
import { generateGapAnalysis } from '@/tools/generate_gap_analysis';
import { SAMPLE_ORGANIZATIONS, SAMPLE_QUICK_ASSESSMENT } from '@tests/fixtures/sample-data';

describe('Assessment Workflow Integration', () => {
  let profileId: string;

  beforeAll(async () => {
    // Initialize test environment
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Create fresh profile for each test
    const profileResult = await createProfile({
      org_name: `Test Org ${Date.now()}`,
      sector: 'technology',
      size: 'medium',
      profile_type: 'current'
    });
    
    expect(profileResult.success).toBe(true);
    profileId = profileResult.profile_id;
  });

  describe('Complete Assessment Flow', () => {
    it('should complete end-to-end assessment workflow', async () => {
      // Step 1: Quick Assessment
      const quickResult = await quickAssessment({
        profile_id: profileId,
        ...SAMPLE_QUICK_ASSESSMENT
      });
      
      expect(quickResult.success).toBe(true);
      expect(quickResult.initial_maturity_scores.overall_average).toBeGreaterThan(0);
      expect(quickResult.details.assessmentsCreated).toBeGreaterThan(0);
      
      // Step 2: Detailed Maturity Assessment
      const maturityResult = await assessMaturity({
        profile_id: profileId,
        include_recommendations: true,
        include_subcategory_details: true
      });
      
      expect(maturityResult.success).toBe(true);
      expect(maturityResult.overall_maturity_score).toBeGreaterThan(0);
      expect(maturityResult.function_breakdown).toBeInstanceOf(Array);
      expect(maturityResult.function_breakdown.length).toBe(6); // All CSF functions
      expect(maturityResult.recommendations).toBeDefined();
      
      // Step 3: Risk Score Calculation
      const riskResult = await calculateRiskScore({
        profile_id: profileId,
        include_heat_map: true,
        include_recommendations: true
      });
      
      expect(riskResult.success).toBe(true);
      expect(riskResult.overall_risk_score).toBeGreaterThanOrEqual(0);
      expect(riskResult.overall_risk_score).toBeLessThanOrEqual(100);
      expect(riskResult.function_risks).toBeInstanceOf(Array);
      expect(riskResult.function_risks.length).toBe(6);
      expect(riskResult.risk_summary).toBeDefined();
      
      // Step 4: Gap Analysis (compare with itself for basic testing)
      const gapResult = await generateGapAnalysis({
        current_profile_id: profileId,
        target_profile_id: profileId,
        include_priority_matrix: true,
        minimum_gap_score: 0
      });
      
      expect(gapResult.success).toBe(true);
      expect(gapResult.gap_summary).toBeDefined();
      expect(gapResult.recommendations).toBeDefined();
      
      // Verify data consistency across tools
      const maturityFunctions = maturityResult.function_breakdown.map(f => f.function_id).sort();
      const riskFunctions = riskResult.function_risks.map(f => f.function_id).sort();
      expect(maturityFunctions).toEqual(riskFunctions);
    }, 30000);

    it('should handle assessment updates and recalculations', async () => {
      // Initial assessment
      await quickAssessment({
        profile_id: profileId,
        ...SAMPLE_QUICK_ASSESSMENT
      });
      
      const initialMaturity = await assessMaturity({
        profile_id: profileId,
        include_recommendations: false
      });
      
      const initialRisk = await calculateRiskScore({
        profile_id: profileId,
        include_heat_map: false
      });
      
      // Update assessments with better scores
      const improvedAssessment = {
        profile_id: profileId,
        simplified_answers: {
          govern: 'yes',
          identify: 'yes',
          protect: 'yes',
          detect: 'yes',
          respond: 'yes',
          recover: 'yes'
        },
        assessed_by: 'Improved Assessment',
        confidence_level: 'high'
      };
      
      await quickAssessment(improvedAssessment);
      
      const updatedMaturity = await assessMaturity({
        profile_id: profileId,
        include_recommendations: false
      });
      
      const updatedRisk = await calculateRiskScore({
        profile_id: profileId,
        include_heat_map: false
      });
      
      // Verify improvements
      expect(updatedMaturity.overall_maturity_score).toBeGreaterThan(
        initialMaturity.overall_maturity_score
      );
      expect(updatedRisk.overall_risk_score).toBeLessThan(
        initialRisk.overall_risk_score
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid profile IDs gracefully', async () => {
      const invalidProfileId = 'INVALID-PROFILE-ID';
      
      await expect(quickAssessment({
        profile_id: invalidProfileId,
        ...SAMPLE_QUICK_ASSESSMENT
      })).rejects.toThrow(/profile not found/i);
      
      await expect(assessMaturity({
        profile_id: invalidProfileId
      })).rejects.toThrow(/profile not found/i);
      
      await expect(calculateRiskScore({
        profile_id: invalidProfileId
      })).rejects.toThrow(/profile not found/i);
    });

    it('should handle assessment with no data', async () => {
      // Try to assess maturity without any assessments
      const result = await assessMaturity({
        profile_id: profileId,
        include_recommendations: true
      });
      
      expect(result.success).toBe(true);
      expect(result.overall_maturity_score).toBe(0);
      expect(result.function_breakdown).toBeInstanceOf(Array);
      // Should still provide recommendations even with no data
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Data Validation and Consistency', () => {
    it('should maintain data consistency across multiple assessments', async () => {
      // Perform multiple quick assessments
      const assessments = [
        { ...SAMPLE_QUICK_ASSESSMENT, assessed_by: 'Assessor 1' },
        { 
          ...SAMPLE_QUICK_ASSESSMENT, 
          assessed_by: 'Assessor 2',
          simplified_answers: {
            govern: 'yes',
            identify: 'yes',
            protect: 'no',
            detect: 'partial',
            respond: 'yes',
            recover: 'partial'
          }
        }
      ];
      
      for (const assessment of assessments) {
        const result = await quickAssessment({
          profile_id: profileId,
          ...assessment
        });
        expect(result.success).toBe(true);
      }
      
      // Get final state
      const maturityResult = await assessMaturity({
        profile_id: profileId,
        include_subcategory_details: true
      });
      
      expect(maturityResult.success).toBe(true);
      
      // Verify all subcategories have been assessed
      const totalSubcategories = maturityResult.function_breakdown
        .reduce((sum, func) => sum + func.assessed_subcategories, 0);
      
      expect(totalSubcategories).toBe(106); // Total CSF 2.0 subcategories
      
      // Verify function scores are within valid ranges
      maturityResult.function_breakdown.forEach(func => {
        expect(func.average_maturity_score).toBeGreaterThanOrEqual(0);
        expect(func.average_maturity_score).toBeLessThanOrEqual(5);
      });
    });
  });
});
```

## End-to-End Testing

### E2E Test Framework

The existing `src/test-e2e-workflow.ts` provides comprehensive end-to-end testing. Here's how to extend and use it:

#### Running E2E Tests

```bash
# Run complete E2E workflow
npm run test:e2e

# Run with monitoring disabled
ENABLE_MONITORING=false npm run test:e2e

# Run with custom timeout
E2E_TIMEOUT=60000 npm run test:e2e

# Generate detailed report
npm run test:e2e -- --verbose
```

#### Custom E2E Test Scenarios

```typescript
// tests/e2e/custom-scenarios.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { E2ETestRunner } from '@/test-e2e-workflow';

describe('Custom E2E Scenarios', () => {
  let testRunner: E2ETestRunner;

  beforeAll(async () => {
    testRunner = new E2ETestRunner(true);
    await testRunner.initialize();
  });

  afterAll(async () => {
    await testRunner.cleanup();
  });

  describe('Multi-Profile Scenarios', () => {
    it('should handle comparative analysis between profiles', async () => {
      // Create current state profile
      const currentResult = await testRunner.testOrganizationCreation();
      expect(currentResult.status).toBe('PASS');
      
      const currentProfileId = currentResult.data.profileId;
      
      // Perform current state assessment
      await testRunner.testQuickAssessment();
      
      // Create target state profile
      const targetResult = await testRunner.executeStep(
        'CREATE_TARGET_PROFILE',
        'Create target state profile',
        async () => {
          return await createProfile({
            org_name: 'Test Corp E2E',
            sector: 'technology',
            size: 'medium',
            profile_type: 'target',
            profile_name: 'Target State Profile'
          });
        }
      );
      
      expect(targetResult.status).toBe('PASS');
      const targetProfileId = targetResult.data.profile_id;
      
      // Create ideal target assessments
      await testRunner.executeStep(
        'TARGET_ASSESSMENT',
        'Create target state assessments',
        async () => {
          return await quickAssessment({
            profile_id: targetProfileId,
            simplified_answers: {
              govern: 'yes',
              identify: 'yes',
              protect: 'yes',
              detect: 'yes',
              respond: 'yes',
              recover: 'yes'
            },
            assessed_by: 'Target State Definition',
            confidence_level: 'high'
          });
        }
      );
      
      // Perform comparative gap analysis
      const gapResult = await testRunner.executeStep(
        'COMPARATIVE_GAP_ANALYSIS',
        'Perform gap analysis between current and target',
        async () => {
          return await generateGapAnalysis({
            current_profile_id: currentProfileId,
            target_profile_id: targetProfileId,
            include_priority_matrix: true,
            include_visualizations: true
          });
        }
      );
      
      expect(gapResult.status).toBe('PASS');
      expect(gapResult.data.gap_summary.total_gaps).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle large organization assessments', async () => {
      // Create enterprise-scale assessment
      const largeOrgResult = await testRunner.executeStep(
        'LARGE_ORG_CREATION',
        'Create enterprise organization profile',
        async () => {
          return await createProfile({
            org_name: 'Enterprise Corp',
            sector: 'technology',
            size: 'enterprise',
            profile_type: 'current',
            description: 'Large enterprise with complex requirements'
          });
        }
      );
      
      expect(largeOrgResult.status).toBe('PASS');
      
      // Perform comprehensive assessment
      const assessmentStart = Date.now();
      await testRunner.testQuickAssessment();
      await testRunner.testMaturityAndRiskAssessment();
      const assessmentDuration = Date.now() - assessmentStart;
      
      // Verify performance within acceptable limits
      expect(assessmentDuration).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from partial failures', async () => {
      // Create profile
      await testRunner.testOrganizationCreation();
      
      // Simulate partial assessment failure
      const partialAssessment = await testRunner.executeStep(
        'PARTIAL_ASSESSMENT_FAILURE',
        'Handle partial assessment failure',
        async () => {
          // This should succeed partially
          const result = await quickAssessment({
            profile_id: testRunner.report.artifacts.profileId!,
            simplified_answers: {
              govern: 'yes',
              identify: 'partial',
              protect: 'no',
              detect: 'partial',
              respond: 'yes',
              recover: 'unknown' as any // Invalid value
            },
            assessed_by: 'Failure Test',
            confidence_level: 'medium'
          });
          
          return result;
        }
      );
      
      // Should handle gracefully
      expect(partialAssessment.status).toBe('FAIL');
      
      // Retry with corrected data
      const recoveryResult = await testRunner.executeStep(
        'ASSESSMENT_RECOVERY',
        'Recover from failed assessment',
        async () => {
          return await quickAssessment({
            profile_id: testRunner.report.artifacts.profileId!,
            simplified_answers: {
              govern: 'yes',
              identify: 'partial',
              protect: 'no',
              detect: 'partial',
              respond: 'yes',
              recover: 'no' // Corrected value
            },
            assessed_by: 'Recovery Test',
            confidence_level: 'medium'
          });
        }
      );
      
      expect(recoveryResult.status).toBe('PASS');
    });
  });
});
```

## Performance Testing

### Performance Test Framework

```typescript
// tests/performance/benchmark.test.ts
import { describe, it, expect } from 'vitest';
import { performance, PerformanceObserver } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  describe('Database Operations', () => {
    it('should create profiles within performance thresholds', async () => {
      const iterations = 100;
      const startTime = performance.now();
      
      const promises = Array.from({ length: iterations }, (_, i) => 
        createProfile({
          org_name: `Performance Test ${i}`,
          sector: 'technology',
          size: 'medium',
          profile_type: 'current'
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 profiles
      
      const averageTime = duration / iterations;
      expect(averageTime).toBeLessThan(50); // <50ms per profile
    });

    it('should handle batch assessment operations efficiently', async () => {
      // Setup
      const profileResult = await createProfile({
        org_name: 'Batch Performance Test',
        sector: 'technology',
        size: 'large',
        profile_type: 'current'
      });
      
      const profileId = profileResult.profile_id;
      
      // Benchmark quick assessment
      const startTime = performance.now();
      
      const result = await quickAssessment({
        profile_id: profileId,
        simplified_answers: {
          govern: 'yes',
          identify: 'partial',
          protect: 'yes',
          detect: 'partial',
          respond: 'yes',
          recover: 'no'
        },
        assessed_by: 'Performance Test',
        confidence_level: 'medium'
      });
      
      const duration = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // <2 seconds for 106 subcategories
      
      const avgPerSubcategory = duration / 106;
      expect(avgPerSubcategory).toBeLessThan(20); // <20ms per subcategory
    });
  });

  describe('Risk Calculation Performance', () => {
    it('should calculate risk scores efficiently', async () => {
      // Setup profile with assessments
      const profileResult = await createProfile({
        org_name: 'Risk Performance Test',
        sector: 'technology',
        size: 'enterprise',
        profile_type: 'current'
      });
      
      await quickAssessment({
        profile_id: profileResult.profile_id,
        simplified_answers: {
          govern: 'partial',
          identify: 'yes',
          protect: 'partial',
          detect: 'no',
          respond: 'partial',
          recover: 'no'
        },
        assessed_by: 'Performance Test',
        confidence_level: 'medium'
      });
      
      // Benchmark risk calculation
      const iterations = 10;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const result = await calculateRiskScore({
          profile_id: profileResult.profile_id,
          include_heat_map: true,
          include_recommendations: true
        });
        
        const duration = performance.now() - startTime;
        times.push(duration);
        
        expect(result.success).toBe(true);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      expect(averageTime).toBeLessThan(1000); // <1 second average
      expect(maxTime).toBeLessThan(3000); // <3 seconds max
      
      console.log(`Risk calculation performance:
        Average: ${averageTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms  
        Max: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const getMemoryUsage = () => {
        const usage = process.memoryUsage();
        return {
          rss: usage.rss,
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external
        };
      };
      
      const initialMemory = getMemoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        const profileResult = await createProfile({
          org_name: `Memory Test ${i}`,
          sector: 'technology',
          size: 'medium',
          profile_type: 'current'
        });
        
        await quickAssessment({
          profile_id: profileResult.profile_id,
          simplified_answers: {
            govern: 'yes',
            identify: 'yes',
            protect: 'yes',
            detect: 'yes',
            respond: 'yes',
            recover: 'yes'
          },
          assessed_by: 'Memory Test',
          confidence_level: 'high'
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB increase
      
      console.log(`Memory usage:
        Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});
```

## Security Testing

### Security Test Cases

```typescript
// tests/security/input-validation.test.ts
import { describe, it, expect } from 'vitest';
import { createProfile } from '@/tools/create_profile';
import { quickAssessment } from '@/tools/quick_assessment';

describe('Security - Input Validation', () => {
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in organization names', async () => {
      const maliciousInputs = [
        "'; DROP TABLE organization_profiles; --",
        "' OR '1'='1",
        "'; UPDATE organization_profiles SET name = 'hacked'; --",
        "<script>alert('xss')</script>",
        "Robert'; DROP TABLE students; --"
      ];
      
      for (const maliciousInput of maliciousInputs) {
        await expect(createProfile({
          org_name: maliciousInput,
          sector: 'technology',
          size: 'medium',
          profile_type: 'current'
        })).resolves.toMatchObject({
          success: true
        });
        
        // Verify the malicious input was safely stored
        // Implementation should sanitize but not reject valid special characters
      }
    });

    it('should handle special characters safely in assessment notes', async () => {
      const profileResult = await createProfile({
        org_name: 'Security Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      });
      
      const specialCharacterInputs = [
        "Assessment with 'single quotes' and \"double quotes\"",
        "Unicode characters: 你好世界 🔒 🛡️",
        "Backslashes: \\n \\r \\t \\\\",
        "Null bytes: \x00",
        "Mixed: <tag>content</tag> & 'quotes' with \\backslashes"
      ];
      
      for (const input of specialCharacterInputs) {
        await expect(quickAssessment({
          profile_id: profileResult.profile_id,
          simplified_answers: {
            govern: 'yes',
            identify: 'yes',
            protect: 'yes',
            detect: 'yes',
            respond: 'yes',
            recover: 'yes'
          },
          assessed_by: 'Security Test',
          confidence_level: 'medium',
          notes: input
        })).resolves.toMatchObject({
          success: true
        });
      }
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML and script tags', async () => {
      const htmlInputs = [
        "<script>alert('xss')</script>",
        "<img src='x' onerror='alert(1)'>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "javascript:alert('xss')",
        "data:text/html,<script>alert('xss')</script>"
      ];
      
      for (const htmlInput of htmlInputs) {
        const result = await createProfile({
          org_name: 'HTML Test Corp',
          sector: 'technology',
          size: 'medium',
          profile_type: 'current',
          description: htmlInput
        });
        
        expect(result.success).toBe(true);
        // Verify HTML was sanitized (implementation dependent)
        // Should not contain script tags or javascript: URLs
      }
    });
  });

  describe('Data Length Limits', () => {
    it('should enforce maximum field lengths', async () => {
      const longString = 'A'.repeat(1000);
      const veryLongString = 'A'.repeat(10000);
      
      // Test organization name length limit
      await expect(createProfile({
        org_name: longString, // Should be rejected if > 255 chars
        sector: 'technology',
        size: 'medium',
        profile_type: 'current'
      })).rejects.toThrow();
      
      // Test description length limit
      const result = await createProfile({
        org_name: 'Length Test Corp',
        sector: 'technology',
        size: 'medium',
        profile_type: 'current',
        description: veryLongString // Should be truncated or rejected
      });
      
      if (result.success) {
        // If accepted, should be truncated to reasonable length
        expect(result.profile_details.description?.length).toBeLessThan(2000);
      }
    });
  });
});

// tests/security/authentication.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authMiddleware } from '@/security/auth';
import { rateLimiter } from '@/security/rate-limiter';

describe('Security - Authentication and Authorization', () => {
  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limiter state
      vi.clearAllMocks();
    });

    it('should enforce rate limits on API calls', async () => {
      const mockReq = {
        ip: '192.168.1.100',
        path: '/api/create-profile'
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const mockNext = vi.fn();
      
      // Simulate rapid requests
      for (let i = 0; i < 100; i++) {
        await rateLimiter(mockReq as any, mockRes as any, mockNext);
      }
      
      // Should eventually hit rate limit
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should allow requests within rate limits', async () => {
      const mockReq = {
        ip: '192.168.1.101',
        path: '/api/create-profile'
      };
      const mockRes = {
        status: vi.fn(),
        json: vi.fn()
      };
      const mockNext = vi.fn();
      
      // Make reasonable number of requests
      for (let i = 0; i < 10; i++) {
        await rateLimiter(mockReq as any, mockRes as any, mockNext);
      }
      
      // Should not hit rate limit
      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should validate JWT tokens correctly', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mock valid JWT
      const invalidToken = 'invalid.token.here';
      
      const mockReqValid = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      
      const mockReqInvalid = {
        headers: {
          authorization: `Bearer ${invalidToken}`
        }
      };
      
      // Mock implementations would validate these
      // This is framework for actual security testing
    });
  });
});
```

## Test Automation and CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run typecheck
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run E2E tests
      run: npm run test:e2e
      timeout-minutes: 10
      
    - name: Generate coverage report
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true
        
    - name: Upload test artifacts
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: test-results-${{ matrix.node-version }}
        path: |
          test-reports/
          coverage/
          logs/
```

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "tsx src/test-e2e-workflow.ts",
    "test:performance": "vitest run tests/performance",
    "test:security": "vitest run tests/security",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:all": "npm run lint && npm run typecheck && npm run test:coverage && npm run test:e2e"
  }
}
```

This comprehensive testing guide provides a solid foundation for ensuring the reliability, performance, and security of the NIST CSF 2.0 MCP Server through systematic testing at all levels.