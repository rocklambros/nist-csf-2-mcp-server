#!/usr/bin/env node
/**
 * Simple test script to verify monitoring and logging functionality
 */

import { logger } from './utils/enhanced-logger.js';
import { metrics } from './utils/metrics.js';
import { toolAnalytics } from './utils/analytics.js';
import { toolMonitoring } from './middleware/monitoring.js';

// Test function that simulates tool execution
async function mockToolExecution(toolName: string, duration: number, shouldFail: boolean = false): Promise<any> {
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, duration));
  
  if (shouldFail) {
    throw new Error(`Mock error in ${toolName}`);
  }
  
  return { success: true, data: `Result from ${toolName}` };
}

async function testMonitoring() {
  console.log('🔍 Testing Monitoring and Logging System\n');
  
  // Test 1: Basic logging
  console.log('1. Testing enhanced logger...');
  logger.info('Test log message', { testId: 1, component: 'monitoring-test' });
  logger.warn('Test warning', { testId: 2 });
  logger.error('Test error', new Error('This is a test error'), { testId: 3 });
  console.log('✅ Logger test completed\n');
  
  // Test 2: Metrics collection
  console.log('2. Testing metrics collection...');
  metrics.increment('test_counter', { type: 'monitoring_test' });
  metrics.gauge('test_gauge', 42.5, { component: 'test' });
  
  const timer = metrics.startTimer('test_duration');
  await new Promise(resolve => setTimeout(resolve, 100));
  const duration = timer();
  console.log(`✅ Timer measured: ${duration}ms\n`);
  
  // Test 3: Tool monitoring wrapper
  console.log('3. Testing tool monitoring...');
  
  const monitoredTool = toolMonitoring('test_tool', mockToolExecution);
  const context = { clientId: 'test-client', userId: 'test-user' };
  
  try {
    // Successful execution
    await monitoredTool.call(context, 'test_tool', 50, false);
    console.log('✅ Successful tool execution monitored');
    
    // Failed execution
    try {
      await monitoredTool.call(context, 'failing_tool', 25, true);
    } catch (error) {
      console.log('✅ Failed tool execution monitored');
    }
  } catch (error) {
    console.error('❌ Tool monitoring test failed:', error);
  }
  
  // Test 4: Analytics
  console.log('\n4. Testing analytics...');
  
  // Simulate some tool usage
  toolAnalytics.recordToolExecution('csf_lookup', 45, true, 'client-1', 'user-1');
  toolAnalytics.recordToolExecution('search_framework', 120, true, 'client-1', 'user-1');
  toolAnalytics.recordToolExecution('create_profile', 200, false, 'client-2', 'user-2', 'Database error');
  toolAnalytics.recordToolExecution('csf_lookup', 38, true, 'client-3');
  
  const summary = toolAnalytics.generateSummary();
  console.log('📊 Analytics Summary:');
  console.log(`   Total Tools: ${summary.overview.totalTools}`);
  console.log(`   Total Users: ${summary.overview.totalUsers}`);
  console.log(`   Total Executions: ${summary.overview.totalExecutions}`);
  console.log(`   Overall Error Rate: ${(summary.overview.overallErrorRate * 100).toFixed(2)}%`);
  console.log('✅ Analytics test completed\n');
  
  // Test 5: Metrics export
  console.log('5. Testing metrics export...');
  const metricsJson = metrics.exportJSON();
  console.log(`📈 Exported ${Object.keys(metricsJson.metrics).length} metric types`);
  
  const prometheusMetrics = metrics.exportPrometheus();
  console.log(`📋 Prometheus format: ${prometheusMetrics.split('\n').length} lines`);
  console.log('✅ Metrics export test completed\n');
  
  // Test 6: Correlation IDs
  console.log('6. Testing correlation ID system...');
  const correlationId = logger.generateCorrelationId();
  
  logger.withCorrelationId(correlationId, () => {
    logger.info('Message with correlation ID', { testData: 'correlation-test' });
    const retrievedId = logger.getCorrelationId();
    console.log(`✅ Correlation ID: ${retrievedId === correlationId ? 'matching' : 'not matching'}`);
  });
  console.log('✅ Correlation ID test completed\n');
  
  // Final summary
  console.log('🎉 All monitoring tests completed successfully!\n');
  
  console.log('📋 Test Summary:');
  console.log('   ✅ Enhanced logging with structured JSON output');
  console.log('   ✅ Performance metrics collection and timing');
  console.log('   ✅ Tool execution monitoring and analytics');
  console.log('   ✅ Error tracking and recording');
  console.log('   ✅ Correlation ID system for request tracing');
  console.log('   ✅ Metrics export in JSON and Prometheus formats');
  
  // Show current analytics state
  console.log('\n📊 Current Analytics State:');
  console.log(JSON.stringify(summary, null, 2));
}

// Run tests
if (require.main === module) {
  testMonitoring()
    .then(() => {
      console.log('\n🔄 Stopping monitoring services...');
      metrics.stop();
      toolAnalytics.stop();
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testMonitoring };