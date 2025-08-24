#!/usr/bin/env node
/**
 * Simple test runner for E2E tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building and running End-to-End tests...\n');

// Build the project first
console.log('📦 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  cwd: __dirname 
});

buildProcess.on('close', (buildCode) => {
  if (buildCode !== 0) {
    console.error('❌ Build failed with code', buildCode);
    process.exit(buildCode);
  }
  
  console.log('✅ Build completed successfully\n');
  
  // Run the E2E tests
  console.log('🎯 Running End-to-End tests...');
  const testProcess = spawn('node', ['dist/test-e2e-workflow.js'], { 
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ENABLE_MONITORING: 'true',
      USE_MONITORED_DB: 'true'
    }
  });
  
  testProcess.on('close', (testCode) => {
    console.log(`\n🏁 Tests completed with exit code: ${testCode}`);
    
    if (testCode === 0) {
      console.log('🎉 All end-to-end tests passed!');
    } else {
      console.log('❌ Some tests failed. Check the output above.');
    }
    
    process.exit(testCode);
  });
  
  testProcess.on('error', (error) => {
    console.error('💥 Failed to run tests:', error);
    process.exit(1);
  });
});

buildProcess.on('error', (error) => {
  console.error('💥 Failed to build project:', error);
  process.exit(1);
});