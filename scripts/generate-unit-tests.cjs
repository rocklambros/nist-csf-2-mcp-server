#!/usr/bin/env node

/**
 * Unit Test Generator Script
 * Automatically generates comprehensive unit tests for all MCP tools
 */

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', 'src', 'tools');
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'tools');

// Tool categories for specialized testing patterns
const TOOL_CATEGORIES = {
  framework: ['csf_lookup', 'search_framework', 'get_related_subcategories', 'get_implementation_guidance'],
  assessment: ['quick_assessment', 'assess_maturity', 'get_assessment_questions', 'validate_assessment_responses'],
  analysis: ['generate_gap_analysis', 'calculate_risk_score', 'calculate_maturity_trend', 'compare_profiles'],
  planning: ['create_implementation_plan', 'generate_priority_matrix', 'estimate_implementation_cost', 'suggest_next_actions'],
  reporting: ['generate_report', 'generate_executive_report', 'generate_audit_report', 'generate_compliance_report', 'create_custom_report'],
  dashboard: ['generate_dashboard', 'track_progress', 'get_industry_benchmarks'],
  profile: ['create_profile', 'clone_profile'],
  evidence: ['upload_evidence', 'validate_evidence', 'track_audit_trail'],
  import_export: ['import_assessment', 'export_data'],
  templates: ['generate_policy_template', 'get_implementation_template', 'generate_test_scenarios'],
  milestones: ['generate_milestone'],
  questions: ['get_question_context']
};

// Generate unit test template based on tool category
function generateUnitTestTemplate(toolName, category) {
  const camelCaseName = toolName.replace(/_/g, '');
  const kebabCaseName = toolName.replace(/_/g, '-');
  const functionName = toolName;
  const testClassName = toolName.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') + ' Tool';

  // Import pattern varies by category
  const importPattern = getImportPattern(category);
  const testCases = getTestCases(category, toolName);
  const mockSetup = getMockSetup(category);

  return `/**
 * ${testClassName} - Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ${functionName} } from '../../src/tools/${toolName}.js';
${importPattern}
import { createMockDatabase, testUtils } from '../helpers/jest-setup.js';

${getMockDeclarations(category)}

describe('${testClassName} - Unit Tests', () => {
  ${mockSetup}

  beforeEach(() => {
    jest.clearAllMocks();
    ${getMockInitialization(category)}
  });

  ${testCases}
});`;
}

function getImportPattern(category) {
  if (['framework', 'assessment', 'analysis'].includes(category)) {
    return `import { getDatabase } from '../../db/database.js';
import { getFrameworkLoader } from '../../services/framework-loader.js';`;
  }
  return `import { getDatabase } from '../../db/database.js';`;
}

function getMockDeclarations(category) {
  if (['framework', 'assessment', 'analysis'].includes(category)) {
    return `const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockGetFrameworkLoader = getFrameworkLoader as jest.MockedFunction<typeof getFrameworkLoader>;`;
  }
  return `const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;`;
}

function getMockSetup(category) {
  if (['framework', 'assessment', 'analysis'].includes(category)) {
    return `let mockDb: ReturnType<typeof createMockDatabase>;
  let mockFrameworkLoader: any;`;
  }
  return `let mockDb: ReturnType<typeof createMockDatabase>;`;
}

function getMockInitialization(category) {
  if (['framework', 'assessment', 'analysis'].includes(category)) {
    return `mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);
    mockFrameworkLoader = mockGetFrameworkLoader();`;
  }
  return `mockDb = createMockDatabase();
    mockGetDatabase.mockReturnValue(mockDb as any);`;
}

function getTestCases(category, toolName) {
  const baseTestCases = `describe('basic functionality', () => {
    it('should execute successfully with valid parameters', async () => {
      ${getSuccessTestCase(category, toolName)}
    });

    it('should handle missing required parameters', async () => {
      const result = await ${toolName}({});
      testUtils.assertErrorResponse(result);
    });
  });

  describe('input validation', () => {
    it('should validate required parameters', async () => {
      const result = await ${toolName}({
        invalid_param: 'test'
      });
      testUtils.assertErrorResponse(result);
    });

    it('should validate parameter types', async () => {
      const result = await ${toolName}({
        param: null
      });
      testUtils.assertErrorResponse(result);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      ${getDatabaseErrorTest(category, toolName)}
    });

    it('should handle unexpected errors', async () => {
      ${getUnexpectedErrorTest(category, toolName)}
    });
  });`;

  return baseTestCases;
}

function getSuccessTestCase(category, toolName) {
  switch (category) {
    case 'framework':
      return `const params = { query: 'governance' };
      
      mockFrameworkLoader.searchElements.mockReturnValue([
        testUtils.createMockFrameworkElement('function', {
          element_identifier: 'GV',
          title: 'GOVERN'
        })
      ]);

      const result = await ${toolName}(params);
      testUtils.assertSuccessResponse(result);`;

    case 'assessment':
      return `const params = { profile_id: 'profile-123' };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.getAssessments!.mockReturnValue([
        testUtils.createMockAssessment()
      ]);

      const result = await ${toolName}(params);
      testUtils.assertSuccessResponse(result);`;

    case 'analysis':
      return `const params = { 
        profile_id: 'profile-123',
        analysis_type: 'risk'
      };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      
      const result = await ${toolName}(params);
      testUtils.assertSuccessResponse(result);`;

    case 'reporting':
      return `const params = { 
        profile_id: 'profile-123',
        report_type: 'summary'
      };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      mockDb.getProfile!.mockReturnValue(testUtils.createMockProfile());
      mockDb.generateReport!.mockReturnValue({
        report_id: 'report-123',
        content: 'Generated report content'
      });
      
      const result = await ${toolName}(params);
      testUtils.assertSuccessResponse(result);`;

    default:
      return `const params = { id: 'test-123' };
      
      mockDb.transaction!.mockImplementation((callback: () => any) => callback());
      
      const result = await ${toolName}(params);
      testUtils.assertSuccessResponse(result);`;
  }
}

function getDatabaseErrorTest(category, toolName) {
  return `mockDb.transaction!.mockImplementation(() => {
    throw new Error('Database connection failed');
  });

  const result = await ${toolName}({ id: 'test-123' });
  testUtils.assertErrorResponse(result, 'Database connection failed');`;
}

function getUnexpectedErrorTest(category, toolName) {
  return `// Mock an unexpected error condition
  mockDb.getProfile!.mockImplementation(() => {
    throw new Error('Unexpected database error');
  });

  const result = await ${toolName}({ profile_id: 'test-123' });
  testUtils.assertErrorResponse(result);`;
}

// Get all existing unit test files
function getExistingTests() {
  const testFiles = fs.readdirSync(TESTS_DIR)
    .filter(file => file.endsWith('.unit.test.ts'))
    .map(file => file.replace('.unit.test.ts', '').replace(/-/g, '_'));
  
  return new Set(testFiles);
}

// Get all tool files that need testing
function getAllTools() {
  return fs.readdirSync(TOOLS_DIR)
    .filter(file => file.endsWith('.ts'))
    .map(file => file.replace('.ts', ''));
}

// Determine tool category
function getToolCategory(toolName) {
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if (tools.includes(toolName)) {
      return category;
    }
  }
  return 'generic';
}

// Main execution
function main() {
  console.log('🧪 Generating Unit Tests for NIST CSF 2.0 MCP Server\n');
  
  const existingTests = getExistingTests();
  const allTools = getAllTools();
  const missingTests = allTools.filter(tool => !existingTests.has(tool));
  
  console.log(`📊 Test Coverage Analysis:`);
  console.log(`• Total MCP tools: ${allTools.length}`);
  console.log(`• Existing unit tests: ${existingTests.size}`);
  console.log(`• Missing unit tests: ${missingTests.length}`);
  console.log(`• Coverage: ${Math.round((existingTests.size / allTools.length) * 100)}%\n`);
  
  if (missingTests.length === 0) {
    console.log('✅ All tools already have unit tests!');
    return;
  }
  
  console.log('🔧 Generating missing unit tests:\n');
  
  let generated = 0;
  missingTests.forEach(toolName => {
    const category = getToolCategory(toolName);
    const testContent = generateUnitTestTemplate(toolName, category);
    const testFileName = `${toolName.replace(/_/g, '-')}.unit.test.ts`;
    const testFilePath = path.join(TESTS_DIR, testFileName);
    
    try {
      fs.writeFileSync(testFilePath, testContent);
      console.log(`  ✅ Generated: ${testFileName} (category: ${category})`);
      generated++;
    } catch (error) {
      console.error(`  ❌ Failed to generate ${testFileName}:`, error);
    }
  });
  
  console.log(`\n🎯 Generation Complete:`);
  console.log(`• Generated: ${generated} new unit tests`);
  console.log(`• New coverage: ${Math.round(((existingTests.size + generated) / allTools.length) * 100)}%`);
  console.log(`\n🚀 Next steps:`);
  console.log('• Run npm run test:unit to validate generated tests');
  console.log('• Review and customize generated tests as needed');
  console.log('• Update test parameters to match actual tool signatures');
}

if (require.main === module) {
  main();
}

module.exports = {
  generateUnitTestTemplate,
  getToolCategory,
  TOOL_CATEGORIES
};