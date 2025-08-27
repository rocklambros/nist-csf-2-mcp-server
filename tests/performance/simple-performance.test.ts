/**
 * Simple performance tests to validate basic functionality
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createProfile } from '../../src/tools/create_profile.js';
import { quickAssessment } from '../../src/tools/quick_assessment.js';

describe('Simple Performance Tests', () => {
  let testProfileId: string;

  beforeAll(async () => {
    // Create a test profile
    const profileResult = await createProfile({
      org_name: 'Performance Test Org',
      sector: 'Technology',
      size: 'medium',
      profile_name: 'Performance Test Profile'
    });
    
    if (profileResult.success) {
      testProfileId = profileResult.profile_id;
    }
  });

  test('should create profile within reasonable time', async () => {
    const startTime = Date.now();
    
    const result = await createProfile({
      org_name: `Performance Test Org ${Date.now()}`,
      sector: 'Technology',
      size: 'medium',
      profile_name: 'Performance Test Profile'
    });
    
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      console.log('Profile creation failed:', result);
    }
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    
    console.log(`Profile creation took: ${duration}ms`);
  });

  test('should perform multiple profile creations efficiently', async () => {
    const startTime = Date.now();
    const iterations = 5;
    
    const promises = Array.from({ length: iterations }, (_, i) =>
      createProfile({
        org_name: `Concurrent Test Org ${Date.now()}-${i}`,
        sector: 'Technology',
        size: 'medium',
        profile_name: `Concurrent Test Profile ${i}`
      })
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    const averageTime = duration / iterations;
    
    // All should succeed
    expect(results.every(r => r.success)).toBe(true);
    
    // Total should be reasonable
    expect(duration).toBeLessThan(5000); // 5 seconds total
    expect(averageTime).toBeLessThan(1000); // 1 second per operation on average
    
    console.log(`${iterations} concurrent profile creations: ${duration}ms total, ${averageTime}ms average`);
  });

  test('should handle quick assessment with valid data', async () => {
    if (!testProfileId) {
      throw new Error('Test profile not created');
    }

    const startTime = Date.now();
    
    const result = await quickAssessment({
      profile_id: testProfileId,
      simplified_answers: {
        govern: 'partial',
        identify: 'yes',
        protect: 'no',
        detect: 'partial',
        respond: 'yes',
        recover: 'no'
      },
      confidence_level: 'medium'
    });
    
    const duration = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    
    console.log(`Quick assessment took: ${duration}ms`);
  });

  test('should perform database operations within acceptable limits', async () => {
    // Test basic database performance by creating and querying data
    const iterations = 10;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await createProfile({
        org_name: `DB Performance Test ${Date.now()}-${i}`,
        sector: 'Technology',
        size: 'small',
        profile_name: `DB Test Profile ${i}`
      });
    }
    
    const duration = Date.now() - startTime;
    const averageTime = duration / iterations;
    
    expect(duration).toBeLessThan(10000); // 10 seconds total
    expect(averageTime).toBeLessThan(1000); // 1 second per operation
    
    console.log(`${iterations} database operations: ${duration}ms total, ${averageTime}ms average`);
  });
});