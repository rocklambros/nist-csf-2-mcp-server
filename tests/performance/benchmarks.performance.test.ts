/**
 * Comprehensive performance benchmarks for MCP tools
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestDatabase } from '../helpers/test-db.js';
import { EnhancedMockDataGenerator } from '../helpers/enhanced-mock-data.js';

// Import all MCP tools for benchmarking
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';
import { uploadEvidence } from '../../src/tools/upload_evidence.js';
import { generateGapAnalysis } from '../../src/tools/generate_gap_analysis.js';
import { calculateRiskScore } from '../../src/tools/calculate_risk_score.js';
import { generateDashboard } from '../../src/tools/generate_dashboard.js';
import { exportData } from '../../src/tools/export_data.js';
import { generateAuditReport } from '../../src/tools/generate_audit_report.js';
import { searchFramework } from '../../src/tools/search_framework.js';
import { assessMaturity } from '../../src/tools/assess_maturity.js';

// Local utility functions
const performanceUtils = {
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },

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

const testUtils = {
  async createTestProfile(overrides: any = {}): Promise<any> {
    const orgId = `test-org-${Date.now()}`;
    const profileId = `test-profile-${Date.now()}`;

    // Create organization first
    testDb.insertTestData('organization_profiles', {
      org_id: orgId,
      org_name: 'Test Organization',
      industry: 'Technology',
      size: 'medium',
      current_tier: 'Tier1',
      target_tier: 'Tier3'
    });

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

    testDb.insertTestData('profiles', profileData);
    return profileData;
  },

  async createTestAssessments(profileId: string, count: number = 5): Promise<any[]> {
    const subcategories = ['GV.OC-01', 'GV.OC-02', 'ID.AM-01', 'PR.AC-01', 'DE.CM-01'];
    const levels = ['not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented'];
    const assessments = [];

    for (let i = 0; i < count; i++) {
      const assessment = {
        profile_id: profileId,
        subcategory_id: subcategories[i % subcategories.length],
        implementation_level: levels[i % levels.length],
        maturity_score: (i % 4) + 1,
        confidence_level: 'medium',
        notes: `Test assessment ${i}`,
        assessed_by: 'test-user'
      };

      testDb.insertTestData('assessments', assessment);
      assessments.push(assessment);
    }

    return assessments;
  }
};

describe('Performance Benchmarks', () => {
  let testDb: TestDatabase;
  let testOrgId: string;
  let testProfileId: string;
  let targetProfileId: string;
  let largeProfileId: string;

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    FAST: 500,        // Operations that should complete within 500ms
    MODERATE: 2000,   // Operations that should complete within 2s
    SLOW: 5000,       // Complex operations that should complete within 5s
    BATCH: 10000      // Batch operations that should complete within 10s
  };

  beforeAll(async () => {
    // Initialize TestDatabase for performance testing
    testDb = new TestDatabase('performance-test.db');
    
    // Setup test data for performance testing using direct database operations
    testOrgId = `perf-org-${Date.now()}`;
    testProfileId = `perf-profile-${Date.now()}`;
    targetProfileId = `perf-target-${Date.now()}`;
    largeProfileId = `perf-large-${Date.now()}`;

    // Create organization
    testDb.insertTestData('organization_profiles', {
      org_id: testOrgId,
      org_name: 'Performance Test Organization',
      industry: 'Technology',
      size: 'medium',
      current_tier: 'Tier1',
      target_tier: 'Tier3'
    });

    // Create profiles
    testDb.insertTestData('profiles', [
      {
        profile_id: testProfileId,
        org_id: testOrgId,
        profile_name: 'Performance Test Profile',
        profile_type: 'current',
        description: 'Performance testing profile',
        created_by: 'test-user',
        is_active: true
      },
      {
        profile_id: targetProfileId,
        org_id: testOrgId,
        profile_name: 'Performance Target Profile',
        profile_type: 'target',
        description: 'Target performance profile',
        created_by: 'test-user',
        is_active: true
      },
      {
        profile_id: largeProfileId,
        org_id: testOrgId,
        profile_name: 'Large Dataset Profile',
        profile_type: 'current',
        description: 'Large dataset performance profile',
        created_by: 'test-user',
        is_active: true
      }
    ]);

    // Populate with test data
    await setupPerformanceTestData();
  });

  afterAll(async () => {
    // Clean up test database
    testDb.close();
  });

  describe('Individual Tool Performance', () => {
    describe('Profile Management Performance', () => {
      test('should create profile within fast threshold', async () => {
        const benchmark = await performanceUtils.benchmark(
          'create_profile',
          async () => {
            await createProfile({
              org_name: `Perf Test Org ${Date.now()}`,
              profile_name: `Perf Test Profile ${Date.now()}`,
              industry: 'Technology',
              size: 'medium'
            }, testDb);
          },
          10
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
        expect(benchmark.maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        
        console.log(`Profile Creation Benchmark:`, benchmark);
      });

      test('should handle concurrent profile operations efficiently', async () => {
        const concurrentOperations = 5;
        const startTime = Date.now();
        
        const promises = Array.from({ length: concurrentOperations }, (_, i) =>
          createProfile({
            org_name: `Concurrent Org ${i}`,
            profile_name: `Concurrent Profile ${i}`,
            industry: 'Technology',
            size: 'small'
          }, testDb)
        );

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        expect(results.every(r => r.success)).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        expect(duration / concurrentOperations).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);

        console.log(`Concurrent Profile Creation: ${duration}ms for ${concurrentOperations} operations`);
      });
    });

    describe('Assessment Performance', () => {
      test('should create single assessment within fast threshold', async () => {
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await quickAssessment({
            profile_id: testProfileId,
            subcategory_id: `PERF-SINGLE-${Date.now()}`,
            implementation_level: 'Partially Implemented',
            maturity_score: 2
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);

        console.log(`Single Assessment: ${duration}ms`);
      });

      test('should handle bulk assessment operations', async () => {
        const assessmentCount = 50;
        const benchmark = await performanceUtils.benchmark(
          'bulk_assessments',
          async () => {
            const promises = Array.from({ length: 5 }, (_, i) =>
              quickAssessment.execute({
                profile_id: testProfileId,
                subcategory_id: `BULK-${Date.now()}-${i}`,
                implementation_level: 'Partially Implemented',
                maturity_score: 2
              }, testDb)
            );
            await Promise.all(promises);
          },
          10
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        console.log(`Bulk Assessment Benchmark:`, benchmark);
      });

      test('should assess maturity efficiently with large datasets', async () => {
        // Create many assessments for testing
        await testUtils.createTestAssessments(largeProfileId, 100);

        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await assessMaturity.execute({
            profile_id: largeProfileId,
            include_subcategory_breakdown: true,
            include_trends: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);

        console.log(`Maturity Assessment (100 records): ${duration}ms`);
      });
    });

    describe('Evidence Management Performance', () => {
      test('should upload evidence within fast threshold', async () => {
        const benchmark = await performanceUtils.benchmark(
          'evidence_upload',
          async () => {
            await uploadEvidence.execute({
              profile_id: testProfileId,
              subcategory_id: 'GV.OC-01',
              file_name: `perf-evidence-${Date.now()}.pdf`,
              file_hash: `perfhash${Date.now()}`,
              evidence_type: 'document'
            }, testDb);
          },
          20
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
        console.log(`Evidence Upload Benchmark:`, benchmark);
      });

      test('should handle concurrent evidence uploads', async () => {
        const concurrentUploads = 10;
        const startTime = Date.now();
        
        const promises = Array.from({ length: concurrentUploads }, (_, i) =>
          uploadEvidence.execute({
            profile_id: testProfileId,
            subcategory_id: `CONCURRENT-EVIDENCE-${i}`,
            file_name: `concurrent-${i}.pdf`,
            file_hash: `concurrenthash${i}${Date.now()}`,
            evidence_type: 'document'
          }, testDb)
        );

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        expect(results.every(r => r.success)).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);

        console.log(`Concurrent Evidence Uploads: ${duration}ms for ${concurrentUploads} uploads`);
      });
    });

    describe('Analysis Tools Performance', () => {
      test('should perform gap analysis within moderate threshold', async () => {
        // Ensure both profiles have assessments
        await testUtils.createTestAssessments(testProfileId, 20);
        await testUtils.createTestAssessments(targetProfileId, 20);

        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await generateGapAnalysis.execute({
            current_profile_id: testProfileId,
            target_profile_id: targetProfileId,
            include_recommendations: true,
            include_priority_ranking: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);

        console.log(`Gap Analysis (20+20 assessments): ${duration}ms`);
      });

      test('should calculate risk scores efficiently', async () => {
        const benchmark = await performanceUtils.benchmark(
          'risk_calculation',
          async () => {
            await calculateRiskScore.execute({
              profile_id: testProfileId,
              include_subcategory_risks: true,
              include_recommendations: true
            }, testDb);
          },
          15
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        console.log(`Risk Score Calculation Benchmark:`, benchmark);
      });

      test('should handle complex analysis with large datasets', async () => {
        // Create comprehensive data set
        await testUtils.createTestAssessments(largeProfileId, 150);
        
        const analysisOperations = [
          () => calculateRiskScore.execute({ profile_id: largeProfileId }, testDb),
          () => assessMaturity.execute({ profile_id: largeProfileId }, testDb),
          () => generateGapAnalysis.execute({ 
            current_profile_id: largeProfileId, 
            baseline_tier: 'Tier2' 
          }, testDb)
        ];

        const startTime = Date.now();
        const results = await Promise.all(analysisOperations.map(op => op()));
        const duration = Date.now() - startTime;

        expect(results.every(r => r.success)).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH);

        console.log(`Complex Analysis Suite (150 records): ${duration}ms`);
      });
    });

    describe('Reporting Performance', () => {
      test('should generate dashboard within moderate threshold', async () => {
        const benchmark = await performanceUtils.benchmark(
          'dashboard_generation',
          async () => {
            await generateDashboard.execute({
              profile_id: testProfileId,
              dashboard_type: 'executive',
              include_trends: true
            }, testDb);
          },
          10
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        console.log(`Dashboard Generation Benchmark:`, benchmark);
      });

      test('should export data efficiently', async () => {
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await exportData.execute({
            profile_id: testProfileId,
            export_format: 'json',
            include_assessments: true,
            include_evidence: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);

        console.log(`Data Export: ${duration}ms`);
      });

      test('should generate comprehensive audit report within threshold', async () => {
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await generateAuditReport.execute({
            profile_id: testProfileId,
            audit_type: 'comprehensive',
            include_evidence_summary: true,
            include_findings: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);

        console.log(`Comprehensive Audit Report: ${duration}ms`);
      });
    });

    describe('Search Performance', () => {
      test('should perform framework searches within fast threshold', async () => {
        const searchTerms = ['governance', 'identity', 'access', 'monitoring', 'response'];
        
        const benchmark = await performanceUtils.benchmark(
          'framework_search',
          async () => {
            const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
            await searchFramework.execute({
              keyword: term,
              limit: 20
            }, testDb);
          },
          25
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
        console.log(`Framework Search Benchmark:`, benchmark);
      });

      test('should handle complex search queries efficiently', async () => {
        const complexQueries = [
          { function: 'GV', keyword: 'governance', limit: 50 },
          { function: 'PR', keyword: 'access control', limit: 30 },
          { keyword: 'risk management assessment', limit: 100 }
        ];

        const results = [];
        for (const query of complexQueries) {
          const { result, duration } = await performanceUtils.measureTime(async () => {
            return await searchFramework.execute(query, testDb);
          });
          
          expect(result.success).toBe(true);
          expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
          results.push({ query, duration });
        }

        console.log('Complex Search Results:', results);
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle high-load concurrent operations', async () => {
      const operationTypes = [
        () => quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: `STRESS-${Date.now()}-${Math.random()}`,
          implementation_level: 'Partially Implemented'
        }, testDb),
        () => uploadEvidence.execute({
          profile_id: testProfileId,
          subcategory_id: 'GV.OC-01',
          file_name: `stress-${Date.now()}.pdf`,
          file_hash: `stresshash${Date.now()}${Math.random()}`,
          evidence_type: 'document'
        }, testDb),
        () => calculateRiskScore.execute({
          profile_id: testProfileId
        }, testDb)
      ];

      const concurrentOperations = 50;
      const operations = Array.from({ length: concurrentOperations }, () => {
        const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
        return operationType();
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const successRate = successCount / concurrentOperations;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH);

      console.log(`Stress Test: ${concurrentOperations} operations in ${duration}ms, ${(successRate * 100).toFixed(1)}% success rate`);
    });

    test('should maintain performance with large datasets', async () => {
      // Create a very large dataset
      const largeDataProfile = await testUtils.createTestProfile({
        profile_name: 'Very Large Dataset Profile'
      });

      // Create 500 assessments in batches to avoid timeout
      const batchSize = 50;
      const totalAssessments = 500;
      
      for (let i = 0; i < totalAssessments; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, totalAssessments - i) }, (_, j) =>
          quickAssessment.execute({
            profile_id: largeDataProfile.profile_id,
            subcategory_id: `LARGE-DATASET-${String(i + j).padStart(4, '0')}`,
            implementation_level: 'Partially Implemented',
            maturity_score: 2
          }, testDb)
        );
        
        await Promise.all(batch);
      }

      // Test performance with large dataset
      const operations = [
        () => assessMaturity.execute({ profile_id: largeDataProfile.profile_id }, testDb),
        () => calculateRiskScore.execute({ profile_id: largeDataProfile.profile_id }, testDb),
        () => exportData.execute({ 
          profile_id: largeDataProfile.profile_id, 
          export_format: 'json' 
        }, testDb)
      ];

      const results = [];
      for (const operation of operations) {
        const { result, duration } = await performanceUtils.measureTime(operation);
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH);
        results.push(duration);
      }

      console.log(`Large Dataset Performance (${totalAssessments} records):`, {
        maturityAssessment: `${results[0]}ms`,
        riskCalculation: `${results[1]}ms`,
        dataExport: `${results[2]}ms`
      });
    });
  });

  describe('Memory and Resource Performance', () => {
    test('should not exhibit memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        await quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: `MEMORY-TEST-${i}`,
          implementation_level: 'Partially Implemented'
        }, testDb);

        // Force garbage collection every 10 iterations if available
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerOperation = memoryIncrease / iterations;

      // Memory increase should be reasonable (less than 1KB per operation)
      expect(memoryIncreasePerOperation).toBeLessThan(1024);

      console.log(`Memory Usage:`, {
        initial: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
        final: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
        increase: `${Math.round(memoryIncrease / 1024)}KB`,
        perOperation: `${Math.round(memoryIncreasePerOperation)}B`
      });
    });

    test('should handle database connection pooling efficiently', async () => {
      // Test many concurrent database operations
      const connectionTests = Array.from({ length: 20 }, (_, i) =>
        performanceUtils.measureTime(async () => {
          return await searchFramework.execute({
            keyword: `test-${i}`,
            limit: 10
          }, testDb);
        })
      );

      const results = await Promise.all(connectionTests);
      const averageTime = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      const maxTime = Math.max(...results.map(r => r.duration));

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);

      console.log(`Database Connection Test:`, {
        averageTime: `${averageTime.toFixed(2)}ms`,
        maxTime: `${maxTime}ms`,
        operations: results.length
      });
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions in core operations', async () => {
      // Baseline measurements for key operations
      const baselineOperations = {
        createProfile: async () => createProfile.execute({
          org_name: `Baseline Org ${Date.now()}`,
          profile_name: `Baseline Profile ${Date.now()}`,
          industry: 'Technology',
          size: 'medium'
        }, testDb),
        
        createAssessment: async () => quickAssessment.execute({
          profile_id: testProfileId,
          subcategory_id: `BASELINE-${Date.now()}`,
          implementation_level: 'Partially Implemented'
        }, testDb),
        
        searchFramework: async () => searchFramework.execute({
          keyword: 'governance',
          limit: 20
        }, testDb)
      };

      const benchmarks = {};
      for (const [operation, func] of Object.entries(baselineOperations)) {
        const benchmark = await performanceUtils.benchmark(operation, func, 20);
        benchmarks[operation] = benchmark;
        
        // Ensure operations meet baseline thresholds
        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODERATE);
        expect(benchmark.maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);
      }

      console.log('Performance Baselines:', benchmarks);

      // Store these baselines for future regression testing
      // In a real scenario, you'd compare against stored historical data
    });
  });

  describe('Scalability Testing', () => {
    test('should scale performance with increasing data sizes', async () => {
      const dataSizes = [10, 50, 100, 250];
      const scalabilityResults = [];

      for (const size of dataSizes) {
        // Create profile with specific data size
        const scaleProfile = await testUtils.createTestProfile({
          profile_name: `Scale Test Profile ${size}`
        });

        // Create assessments
        await testUtils.createTestAssessments(scaleProfile.profile_id, size);

        // Test maturity assessment performance
        const { result, duration } = await performanceUtils.measureTime(async () => {
          return await assessMaturity.execute({
            profile_id: scaleProfile.profile_id,
            include_subcategory_breakdown: true
          }, testDb);
        });

        expect(result.success).toBe(true);
        scalabilityResults.push({ size, duration });
      }

      console.log('Scalability Results:', scalabilityResults);

      // Verify that performance doesn't degrade exponentially
      // Linear or sub-linear growth is acceptable
      for (let i = 1; i < scalabilityResults.length; i++) {
        const prev = scalabilityResults[i - 1];
        const current = scalabilityResults[i];
        const sizeRatio = current.size / prev.size;
        const timeRatio = current.duration / prev.duration;
        
        // Time growth should not exceed 3x the size growth
        expect(timeRatio).toBeLessThan(sizeRatio * 3);
      }
    });
  });
});

/**
 * Setup performance test data
 */
async function setupPerformanceTestData() {
  // Create comprehensive test dataset
  const scenario = EnhancedMockDataGenerator.generateCompleteScenario('performance-testing');
  
  // Insert framework data if needed
  for (const func of scenario.assessments.slice(0, 10)) {
    try {
      await quickAssessment.execute({
        profile_id: testProfileId,
        subcategory_id: func.subcategory_id,
        implementation_level: func.implementation_level,
        maturity_score: func.maturity_score
      }, testDb);
    } catch (error) {
      // Continue if assessment already exists
    }
  }

  // Add some evidence
  for (const evidence of scenario.evidence.slice(0, 5)) {
    try {
      await uploadEvidence.execute({
        profile_id: testProfileId,
        subcategory_id: evidence.subcategory_id,
        file_name: evidence.file_name,
        file_hash: evidence.file_hash,
        evidence_type: evidence.evidence_type
      }, testDb);
    } catch (error) {
      // Continue if evidence already exists
    }
  }

  console.log('Performance test data setup completed');
}