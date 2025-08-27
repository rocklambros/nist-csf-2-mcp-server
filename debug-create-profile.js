/**
 * Debug script to test create profile tool
 */

import { jest } from '@jest/globals';
import { setupCompleteToolMocking } from './tests/helpers/database-mock.js';

// Setup complete mocking environment
const toolHelper = setupCompleteToolMocking('create_profile');

jest.clearAllMocks();
const testData = toolHelper.beforeEachSetup();

console.log('Test data created:', testData);

// Dynamic import after mocks are set up
const { createProfile } = await import('./src/tools/create_profile.js');

const params = {
  org_name: 'Test Organization',
  sector: 'Technology',
  size: 'medium',
  profile_name: 'Test Profile',
  current_tier: 'Tier1',
  target_tier: 'Tier3'
};

console.log('Calling createProfile with params:', params);

try {
  const result = await createProfile(params);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error);
}

// Cleanup
toolHelper.afterEachCleanup();