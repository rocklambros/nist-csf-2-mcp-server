#!/usr/bin/env node

/**
 * Simple gap analysis test to validate the database fix
 */

import { generateGapAnalysis } from './dist/tools/generate_gap_analysis.js';
import { createProfile } from './dist/tools/create_profile.js';
import { quickAssessment } from './dist/tools/quick_assessment.js';

async function testGapAnalysis() {
  console.log('🧪 Testing Gap Analysis Database Fix');
  console.log('=====================================');
  
  try {
    // Step 1: Create current profile
    console.log('1. Creating current profile...');
    const currentProfile = await createProfile({
      org_name: 'Test Gap Analysis Corp',
      sector: 'technology',
      size: 'medium',
      profile_type: 'current',
      profile_name: 'Current State Profile'
    });
    console.log('   ✅ Current profile created:', currentProfile.profile_id);
    
    // Step 2: Create target profile
    console.log('2. Creating target profile...');
    const targetProfile = await createProfile({
      org_name: 'Test Gap Analysis Corp',
      sector: 'technology', 
      size: 'medium',
      profile_type: 'target',
      profile_name: 'Target State Profile'
    });
    console.log('   ✅ Target profile created:', targetProfile.profile_id);
    
    // Step 3: Add current assessments (lower maturity)
    console.log('3. Adding current state assessments (low maturity)...');
    await quickAssessment({
      profile_id: currentProfile.profile_id,
      simplified_answers: {
        govern: 'no',
        identify: 'no', 
        protect: 'partial',
        detect: 'no',
        respond: 'no',
        recover: 'no'
      },
      assessed_by: 'test',
      confidence_level: 'medium'
    });
    console.log('   ✅ Current assessments added');
    
    // Step 4: Add target assessments (higher maturity)
    console.log('4. Adding target state assessments (high maturity)...');
    await quickAssessment({
      profile_id: targetProfile.profile_id,
      simplified_answers: {
        govern: 'yes',
        identify: 'yes', 
        protect: 'yes',
        detect: 'yes',
        respond: 'yes',
        recover: 'yes'
      },
      assessed_by: 'test',
      confidence_level: 'high'
    });
    console.log('   ✅ Target assessments added');
    
    // Step 5: Generate gap analysis
    console.log('5. Generating gap analysis...');
    const gapResult = await generateGapAnalysis({
      current_profile_id: currentProfile.profile_id,
      target_profile_id: targetProfile.profile_id,
      include_priority_matrix: true,
      include_visualizations: false,
      minimum_gap_score: 0
    });
    
    console.log('📊 Gap Analysis Results:');
    console.log('   Analysis ID:', gapResult.analysis_id || 'MISSING!');
    console.log('   Success:', gapResult.success);
    console.log('   Total Gaps:', gapResult.gap_summary?.total_gaps || 0);
    console.log('   Critical Gaps:', gapResult.gap_summary?.critical_gaps || 0);
    console.log('   Gap Details Count:', gapResult.gap_details?.length || 0);
    console.log('   Priority Matrix:', gapResult.priority_matrix?.length || 0);
    
    if (!gapResult.analysis_id) {
      throw new Error('❌ Gap analysis failed - no analysis ID returned');
    }
    
    console.log('\n✅ SUCCESS: Gap analysis completed successfully!');
    console.log('🎯 Database fix is working correctly');
    
  } catch (error) {
    console.error('\n❌ FAILED: Gap analysis test failed');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testGapAnalysis();